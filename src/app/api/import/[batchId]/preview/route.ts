import { db } from "@/lib/db";
import { importBatches, importBatchRows, parties, categories, locations } from "@/lib/db/schema";
import { apiOk, badRequest, internalError, notFound, forbidden } from "@/lib/api-response";
import { requireCompanyIdFromSession } from "@/lib/api-auth";
import { loadActiveMasterData } from "@/lib/db-helpers/masters";
import { parseMiti } from "@/lib/nepali-date";
import { normalizeName, normalizeVatNumber, findSimilarNames } from "@/lib/normalize";
import { VAT_RATE } from "@/lib/constants";
import { eq } from "drizzle-orm";

function inferCategoryFromItem(item: string): string {
  const normalized = item.toLowerCase().trim();
  if (["diesel", "hsd", "petrol", "fuel", "oil"].some((k) => normalized.includes(k))) {
    return "Fuel";
  }
  if (["parts", "spare", "filter", "belt", "bearing"].some((k) => normalized.includes(k))) {
    return "Spare Parts";
  }
  if (["tyre", "tire", "tube"].some((k) => normalized.includes(k))) {
    return "Tyres";
  }
  return "General";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ batchId: string }> },
) {
  const { batchId } = await params;
  const companyId = await requireCompanyIdFromSession(request);
  if (typeof companyId !== "string") return companyId;

  const url = new URL(request.url);
  const autoCreate = url.searchParams.get("autoCreate") === "true";

  try {
    const batch = (
      await db.select().from(importBatches).where(eq(importBatches.id, batchId)).limit(1)
    )[0];

    if (!batch) return notFound("Import batch not found");
    if (batch.companyId !== companyId) return forbidden("Access denied");
    if (batch.status !== "pending") {
      return badRequest(`Batch is already ${batch.status}`);
    }

    const rows = await db
      .select()
      .from(importBatchRows)
      .where(eq(importBatchRows.batchId, batchId))
      .orderBy(importBatchRows.rowIndex);

    const {
      parties: existingParties,
      categories: existingCategories,
      locations: existingLocations,
    } = await loadActiveMasterData(batch.companyId);

    const partyMap = new Map(existingParties.map((p) => [p.normalizedName, p]));
    const categoryMap = new Map(existingCategories.map((c) => [c.normalizedName, c]));
    const locationMap = new Map(existingLocations.map((l) => [l.normalizedName, l]));

    // Candidate lists for fuzzy matching
    const existingPartyNames = existingParties.map((p) => p.name);
    const existingCategoryNames = existingCategories.map((c) => c.name);

    const createdParties: typeof existingParties = [];
    const createdCategories: typeof existingCategories = [];
    const createdLocations: typeof existingLocations = [];

    const resolvedRows = await Promise.all(
      rows.map(async (row) => {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Resolve party
        let party = partyMap.get(normalizeName(row.rawPartyName ?? ""));
        const partySuggestions: string[] = [];
        if (!party && autoCreate && row.rawPartyName) {
          const partyNorm = normalizeName(row.rawPartyName);
          const [newParty] = await db
            .insert(parties)
            .values({
              companyId: batch.companyId,
              name: row.rawPartyName!,
              normalizedName: partyNorm,
              vatNumber: normalizeVatNumber(row.rawVatNumber),
            })
            .returning();
          party = newParty;
          partyMap.set(partyNorm, newParty);
          createdParties.push(newParty);
          warnings.push(`Party "${row.rawPartyName}" will be created`);
        } else if (!party) {
          errors.push(`Party "${row.rawPartyName}" not found`);
          // Find fuzzy suggestions
          if (row.rawPartyName) {
            const matches = findSimilarNames(row.rawPartyName, existingPartyNames);
            partySuggestions.push(...matches);
          }
        }

        // Resolve category
        let category = categoryMap.get(normalizeName(row.rawCategoryName ?? ""));
        const categorySuggestions: string[] = [];
        if (!category && autoCreate) {
          const inferredName = row.rawCategoryName || inferCategoryFromItem(row.rawItem ?? "");
          const categoryNorm = normalizeName(inferredName);
          category = categoryMap.get(categoryNorm);
          if (!category) {
            const [newCategory] = await db
              .insert(categories)
              .values({
                companyId: batch.companyId,
                name: inferredName,
                normalizedName: categoryNorm,
              })
              .returning();
            category = newCategory;
            categoryMap.set(categoryNorm, newCategory);
            createdCategories.push(newCategory);
            warnings.push(`Category "${inferredName}" will be created`);
          }
        } else if (!category) {
          errors.push(`Category "${row.rawCategoryName}" not found`);
          // Find fuzzy suggestions
          if (row.rawCategoryName) {
            const matches = findSimilarNames(row.rawCategoryName, existingCategoryNames);
            categorySuggestions.push(...matches);
          }
        }

        // Resolve location if provided
        let resolvedLocationId: string | null = null;
        let resolvedLocationName: string | null = null;
        if (row.rawLocationName) {
          const locationNorm = normalizeName(row.rawLocationName);
          let location = locationMap.get(locationNorm);
          if (!location && autoCreate) {
            const [newLocation] = await db
              .insert(locations)
              .values({
                companyId: batch.companyId,
                name: row.rawLocationName!,
                normalizedName: locationNorm,
              })
              .returning();
            location = newLocation;
            locationMap.set(locationNorm, newLocation);
            createdLocations.push(newLocation);
          }
          if (location) {
            resolvedLocationId = location.id;
            resolvedLocationName = location.name;
          }
        }

        const mitiResult = parseMiti(row.rawMiti ?? "");
        if (!mitiResult.ok) {
          errors.push(`Invalid miti: ${mitiResult.error}`);
        }

        const taxable = parseFloat(row.rawTaxableAmount ?? "0") || 0;
        const vat = parseFloat(row.rawVatAmount ?? "0") || 0;
        const total = parseFloat(row.rawTotalAmount ?? "0") || 0;

        if (taxable <= 0) errors.push("Taxable amount must be positive");
        if (vat < 0) errors.push("VAT amount cannot be negative");
        if (total <= 0) errors.push("Total amount must be positive");

        // Amount consistency check (warning, not error)
        if (taxable > 0 && vat >= 0 && total > 0) {
          const expectedTotal = Math.round((taxable + vat) * 100) / 100;
          if (Math.abs(expectedTotal - total) > 0.02) {
            warnings.push(`Amount mismatch: ${taxable} + ${vat} = ${expectedTotal}, but total is ${total}`);
          }
        }

        const status = errors.length > 0 ? "error" : "valid";

        return {
          id: row.id,
          rowIndex: row.rowIndex,
          status,
          raw: {
            miti: row.rawMiti,
            invoiceNumber: row.rawInvoiceNumber,
            partyName: row.rawPartyName,
            categoryName: row.rawCategoryName,
            item: row.rawItem,
            quantity: row.rawQuantity,
            rate: row.rawRate,
            taxableAmount: row.rawTaxableAmount,
            vatAmount: row.rawVatAmount,
            totalAmount: row.rawTotalAmount,
            remarks: row.rawRemarks,
          },
          resolved: {
            partyId: party?.id ?? null,
            partyName: party?.name ?? null,
            categoryId: category?.id ?? null,
            categoryName: category?.name ?? null,
            locationId: resolvedLocationId,
            locationName: resolvedLocationName,
            miti: mitiResult.ok ? row.rawMiti : null,
            nepaliMonth: mitiResult.ok ? mitiResult.monthName : null,
            taxableAmount: String(taxable),
            vatAmount: String(vat),
            totalAmount: String(total),
            vatRate: row.rawVatRate || String(VAT_RATE),
          },
          errors,
          warnings,
          suggestions: {
            party: partySuggestions.length > 0 ? partySuggestions[0] : undefined,
            category: categorySuggestions.length > 0 ? categorySuggestions[0] : undefined,
          },
          _dbUpdate: {
            status,
            resolvedPartyId: party?.id ?? null,
            resolvedCategoryId: category?.id ?? null,
            resolvedLocationId,
            resolvedMiti: mitiResult.ok ? row.rawMiti : null,
            resolvedNepaliMonth: mitiResult.ok ? mitiResult.monthName : null,
            resolvedTaxableAmount: String(taxable),
            resolvedVatAmount: String(vat),
            resolvedTotalAmount: String(total),
            resolvedVatRate: row.rawVatRate || String(VAT_RATE),
            errors: errors.length > 0 ? JSON.stringify(errors) : null,
          },
        };
      }),
    );

    // Duplicate invoice detection
    const invoiceMap = new Map<string, number[]>();
    for (const row of resolvedRows) {
      const inv = row.raw.invoiceNumber?.trim();
      if (inv) {
        const rowIndices = invoiceMap.get(inv) || [];
        rowIndices.push(row.rowIndex);
        invoiceMap.set(inv, rowIndices);
      }
    }
    for (const [inv, rowIndices] of invoiceMap) {
      if (rowIndices.length > 1) {
        for (const row of resolvedRows) {
          if (row.raw.invoiceNumber?.trim() === inv) {
            const others = rowIndices.filter((i) => i !== row.rowIndex);
            row.warnings.push(
              `Duplicate invoice "${inv}" also in row${others.length > 1 ? "s" : ""} ${others.join(", ")}`,
            );
          }
        }
      }
    }

    // Batch update all rows at once
    const updateData = resolvedRows.map((r) => ({
      id: r.id,
      ...r._dbUpdate,
    }));

    await Promise.all(
      updateData.map((item) =>
        db
          .update(importBatchRows)
          .set({
            status: item.status,
            resolvedPartyId: item.resolvedPartyId,
            resolvedCategoryId: item.resolvedCategoryId,
            resolvedLocationId: item.resolvedLocationId,
            resolvedMiti: item.resolvedMiti,
            resolvedNepaliMonth: item.resolvedNepaliMonth,
            resolvedTaxableAmount: item.resolvedTaxableAmount,
            resolvedVatAmount: item.resolvedVatAmount,
            resolvedTotalAmount: item.resolvedTotalAmount,
            resolvedVatRate: item.resolvedVatRate,
            errors: item.errors,
          })
          .where(eq(importBatchRows.id, item.id)),
      ),
    );

    const errorCount = resolvedRows.filter((r) => r.status === "error").length;
    const warningCount = resolvedRows.filter((r) => r.warnings.length > 0 && r.status !== "error").length;

    await db
      .update(importBatches)
      .set({ errorCount })
      .where(eq(importBatches.id, batchId));

    return apiOk({
      data: {
        batchId: batch.id,
        filename: batch.filename,
        status: batch.status,
        rowCount: batch.rowCount,
        errorCount,
        warningCount,
        rows: resolvedRows.map((r) => ({
          id: r.id,
          rowIndex: r.rowIndex,
          status: r.status,
          raw: r.raw,
          resolved: r.resolved,
          errors: r.errors,
          warnings: r.warnings,
          suggestions: r.suggestions,
        })),
        created: {
          parties: createdParties.length,
          categories: createdCategories.length,
          locations: createdLocations.length,
        },
      },
    });
  } catch (err) {
    console.error("GET /api/import/[batchId]/preview failed", err);
    return internalError();
  }
}
