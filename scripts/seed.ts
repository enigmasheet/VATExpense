import { db } from "../src/lib/db";
import { companies, fiscalYears, locations, categories, parties, expenses } from "../src/lib/db/schema";
import { parseMiti } from "../src/lib/nepali-date";
import { normalizeName, normalizeVatNumber } from "../src/lib/normalize";
import { eq, and, isNull } from "drizzle-orm";

async function getOrCreateCompany() {
  const existing = await db.select().from(companies).limit(1);
  if (existing.length > 0) return existing[0];

  const [company] = await db
    .insert(companies)
    .values({
      name: "Nepal Hardware Pvt. Ltd.",
      vatNumber: "302456789",
      address: "New Baneshwor, Kathmandu",
      phone: "01-4567890",
      email: "accounts@nephardware.com.np",
      defaultVatRate: "13.00",
    })
    .returning();
  return company;
}

async function getOrCreateLocation(companyId: string, name: string) {
  const normalizedName = normalizeName(name);
  const existing = await db
    .select()
    .from(locations)
    .where(and(eq(locations.companyId, companyId), eq(locations.normalizedName, normalizedName)))
    .limit(1);
  if (existing.length > 0) return existing[0];
  const [created] = await db
    .insert(locations)
    .values({ companyId, name, normalizedName })
    .returning();
  return created;
}

async function getOrCreateCategory(companyId: string, name: string) {
  const normalizedName = normalizeName(name);
  const existing = await db
    .select()
    .from(categories)
    .where(and(eq(categories.companyId, companyId), eq(categories.normalizedName, normalizedName)))
    .limit(1);
  if (existing.length > 0) return existing[0];
  const [created] = await db
    .insert(categories)
    .values({ companyId, name, normalizedName })
    .returning();
  return created;
}

async function getOrCreateParty(
  companyId: string,
  seed: { name: string; vatNumber: string | null; locationId: string | null },
) {
  const normalizedName = normalizeName(seed.name);
  const normalizedVatNumber = normalizeVatNumber(seed.vatNumber);
  const existing = await db
    .select()
    .from(parties)
    .where(
      and(
        eq(parties.companyId, companyId),
        eq(parties.normalizedName, normalizedName),
        normalizedVatNumber === null
          ? isNull(parties.normalizedVatNumber)
          : eq(parties.normalizedVatNumber, normalizedVatNumber),
      ),
    )
    .limit(1);
  if (existing.length > 0) return existing[0];
  const [created] = await db
    .insert(parties)
    .values({
      companyId,
      name: seed.name,
      normalizedName,
      vatNumber: seed.vatNumber,
      normalizedVatNumber,
      locationId: seed.locationId,
    })
    .returning();
  return created;
}

async function getOrCreateFiscalYear(
  companyId: string,
  seed: { name: string; startYear: number; endYear: number; isActive: boolean },
) {
  const existing = await db
    .select()
    .from(fiscalYears)
    .where(and(eq(fiscalYears.companyId, companyId), eq(fiscalYears.name, seed.name)))
    .limit(1);
  if (existing.length > 0) return existing[0];
  const [created] = await db.insert(fiscalYears).values({ companyId, ...seed }).returning();
  return created;
}

async function main() {
  const company = await getOrCreateCompany();
  console.log(`Company: ${company.name} (${company.id})`);

  const previousFy = await getOrCreateFiscalYear(company.id, {
    name: "2081/82",
    startYear: 2081,
    endYear: 2082,
    isActive: false,
  });
  const activeFy = await getOrCreateFiscalYear(company.id, {
    name: "2082/83",
    startYear: 2082,
    endYear: 2083,
    isActive: true,
  });
  console.log(`Fiscal years: ${previousFy.name} (inactive), ${activeFy.name} (active)`);

  const [kathmandu, lalitpur, pokhara] = await Promise.all([
    getOrCreateLocation(company.id, "Kathmandu"),
    getOrCreateLocation(company.id, "Lalitpur"),
    getOrCreateLocation(company.id, "Pokhara"),
  ]);

  const [officeSupplies, travel, utilities, rent, equipment] = await Promise.all([
    getOrCreateCategory(company.id, "Office Supplies"),
    getOrCreateCategory(company.id, "Travel"),
    getOrCreateCategory(company.id, "Utilities"),
    getOrCreateCategory(company.id, "Rent"),
    getOrCreateCategory(company.id, "Equipment"),
  ]);

  const partySeeds = [
    { name: "ABC Stationers", vatNumber: "305123456", locationId: kathmandu.id },
    { name: "DHL Nepal", vatNumber: "305654321", locationId: kathmandu.id },
    { name: "Lalitpur Properties", vatNumber: "306789012", locationId: lalitpur.id },
    { name: "Nepal Telecom", vatNumber: null, locationId: kathmandu.id },
    { name: "NEA", vatNumber: null, locationId: pokhara.id },
    { name: "Supermart", vatNumber: null, locationId: kathmandu.id },
    { name: "NOC", vatNumber: null, locationId: kathmandu.id },
    { name: "Techno Hub", vatNumber: "307890123", locationId: lalitpur.id },
  ];

  const partyRows = new Map<string, (typeof parties.$inferSelect)>();
  for (const seed of partySeeds) {
    const party = await getOrCreateParty(company.id, seed);
    partyRows.set(seed.name, party);
  }

  const categoryByName = new Map([
    ["Office Supplies", officeSupplies],
    ["Travel", travel],
    ["Utilities", utilities],
    ["Rent", rent],
    ["Equipment", equipment],
  ]);

  const expenseSeeds: Array<{
    party: string;
    category: string;
    location: (typeof locations.$inferSelect) | null;
    miti: string;
    invoiceNumber: string | null;
    item: string;
    quantity: string | null;
    rate: string | null;
    taxableAmount: string;
    vatAmount: string;
    totalAmount: string;
    vatRate: string;
    remarks?: string;
  }> = [
    {
      party: "ABC Stationers",
      category: "Office Supplies",
      location: kathmandu,
      miti: "2082-04-05",
      invoiceNumber: "HH-001",
      item: "Photocopy paper (A4, 80gsm)",
      quantity: "20",
      rate: "450.0000",
      taxableAmount: "9000.00",
      vatAmount: "1170.00",
      totalAmount: "10170.00",
      vatRate: "13.00",
    },
    {
      party: "DHL Nepal",
      category: "Travel",
      location: kathmandu,
      miti: "2082-05-12",
      invoiceNumber: "HH-002",
      item: "Courier charges",
      quantity: "1",
      rate: "1500.0000",
      taxableAmount: "1500.00",
      vatAmount: "195.00",
      totalAmount: "1695.00",
      vatRate: "13.00",
    },
    {
      party: "Lalitpur Properties",
      category: "Rent",
      location: lalitpur,
      miti: "2082-07-20",
      invoiceNumber: "HH-003",
      item: "Office rent for the month",
      quantity: "1",
      rate: "80000.0000",
      taxableAmount: "80000.00",
      vatAmount: "10400.00",
      totalAmount: "90400.00",
      vatRate: "13.00",
    },
    {
      party: "Nepal Telecom",
      category: "Utilities",
      location: kathmandu,
      miti: "2082-08-03",
      invoiceNumber: "HH-004",
      item: "Internet connection",
      quantity: "1",
      rate: "2500.0000",
      taxableAmount: "2500.00",
      vatAmount: "325.00",
      totalAmount: "2825.00",
      vatRate: "13.00",
    },
    {
      party: "NEA",
      category: "Utilities",
      location: pokhara,
      miti: "2082-10-15",
      invoiceNumber: "HH-005",
      item: "Electricity bill",
      quantity: "1",
      rate: "4200.0000",
      taxableAmount: "4200.00",
      vatAmount: "546.00",
      totalAmount: "4746.00",
      vatRate: "13.00",
    },
    {
      party: "Supermart",
      category: "Office Supplies",
      location: kathmandu,
      miti: "2082-12-28",
      invoiceNumber: null,
      item: "Tea, coffee and biscuits",
      quantity: "4",
      rate: "250.0000",
      taxableAmount: "1000.00",
      vatAmount: "130.00",
      totalAmount: "1130.00",
      vatRate: "13.00",
      remarks: "Cash memo",
    },
    {
      party: "ABC Stationers",
      category: "Equipment",
      location: kathmandu,
      miti: "2083-01-10",
      invoiceNumber: "HH-006",
      item: "Printer drum replacement",
      quantity: "1",
      rate: "9500.0000",
      taxableAmount: "9500.00",
      vatAmount: "1235.00",
      totalAmount: "10735.00",
      vatRate: "13.00",
    },
    {
      party: "NOC",
      category: "Travel",
      location: kathmandu,
      miti: "2083-02-22",
      invoiceNumber: null,
      item: "Vehicle fuel",
      quantity: "40",
      rate: "168.0000",
      taxableAmount: "6720.00",
      vatAmount: "873.60",
      totalAmount: "7593.60",
      vatRate: "13.00",
    },
    {
      party: "Techno Hub",
      category: "Equipment",
      location: lalitpur,
      miti: "2083-03-18",
      invoiceNumber: "HH-007",
      item: "Laptop repair service",
      quantity: "1",
      rate: "12000.0000",
      taxableAmount: "12000.00",
      vatAmount: "1560.00",
      totalAmount: "13560.00",
      vatRate: "13.00",
    },
  ];

  let createdCount = 0;
  for (const seed of expenseSeeds) {
    const party = partyRows.get(seed.party)!;
    const category = categoryByName.get(seed.category)!;
    const parsed = parseMiti(seed.miti);
    if (!parsed.ok) throw new Error(`Seed Miti invalid: ${seed.miti} (${parsed.error})`);

    const duplicate = await db
      .select({ id: expenses.id })
      .from(expenses)
      .where(
        and(
          eq(expenses.companyId, company.id),
          eq(expenses.fiscalYearId, activeFy.id),
          eq(expenses.partyId, party.id),
          seed.invoiceNumber ? eq(expenses.invoiceNumber, seed.invoiceNumber) : undefined,
        ),
      )
      .limit(1);

    if (duplicate.length > 0) {
      console.log(`Skip existing expense: ${seed.invoiceNumber ?? seed.item}`);
      continue;
    }

    await db.insert(expenses).values({
      companyId: company.id,
      fiscalYearId: activeFy.id,
      partyId: party.id,
      categoryId: category.id,
      locationId: seed.location?.id ?? null,
      miti: seed.miti,
      nepaliMonth: parsed.monthName,
      invoiceNumber: seed.invoiceNumber,
      item: seed.item,
      quantity: seed.quantity,
      rate: seed.rate,
      taxableAmount: seed.taxableAmount,
      vatAmount: seed.vatAmount,
      totalAmount: seed.totalAmount,
      vatRate: seed.vatRate,
      remarks: seed.remarks ?? null,
    });
    createdCount++;
    console.log(`Created expense: ${seed.invoiceNumber ?? "no-invoice"} – ${seed.item}`);
  }

  console.log(`Seed complete. Created ${createdCount} new expenses.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => process.exit(0));