import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  getCompanyId,
  getActiveFiscalYear,
  getFiscalYears,
} from "@/lib/server-data";
import { getPartyStatement } from "@/lib/server-data/party-statement";
import { formatAmount } from "@/lib/format";
import { StatCard } from "@/components/ui/stat-card";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { PATH_LOGIN } from "@/lib/constants";
import { PartyStatementExport } from "@/components/party-statement-export";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fiscalYearId?: string }>;
}

/**
 * Party Statement Report — shows all transactions for a party in a fiscal year
 * with running totals, useful for reconciliation with suppliers.
 */
export default async function PartyStatementPage({ params, searchParams }: Props) {
  const { id: partyId } = await params;
  const companyId = await getCompanyId();
  if (!companyId) redirect(PATH_LOGIN);

  const sp = await searchParams;
  const activeFiscalYear = await getActiveFiscalYear(companyId);
  if (!activeFiscalYear) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Party Statement
        </h1>
        <p className="text-sm text-muted">No fiscal year configured — create one first.</p>
      </div>
    );
  }

  const fiscalYears = await getFiscalYears(companyId);
  const selectedFiscalYearId = sp.fiscalYearId || activeFiscalYear.id;
  const selectedFiscalYear =
    fiscalYears.find((fy) => fy.id === selectedFiscalYearId) ?? activeFiscalYear;

  const statement = await getPartyStatement(
    companyId,
    partyId,
    selectedFiscalYear.id,
  ).catch(() => null);

  if (!statement) notFound();

  const { summary, rows } = statement;

  // Compute running totals
  const rowsWithRunning = rows.reduce<
    Array<
      (typeof rows)[number] & {
        runningTaxable: number;
        runningVat: number;
        runningTotal: number;
      }
    >
  >((acc, row) => {
    const prev = acc.length > 0 ? acc[acc.length - 1] : null;
    acc.push({
      ...row,
      runningTaxable: (prev?.runningTaxable ?? 0) + Number(row.taxableAmount),
      runningVat: (prev?.runningVat ?? 0) + Number(row.vatAmount),
      runningTotal: (prev?.runningTotal ?? 0) + Number(row.totalAmount),
    });
    return acc;
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <nav className="mb-2 text-sm text-muted">
            <Link href="/reports/parties" className="hover:text-foreground">
              Party Report
            </Link>
            <span className="mx-1">/</span>
            <span className="text-foreground">{summary.partyName}</span>
          </nav>
          <h1 className="font-display text-2xl font-semibold text-foreground">
            {summary.partyName}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {summary.vatNumber && `VAT ${summary.vatNumber} · `}
            Party Statement · FY {summary.fiscalYearName}
          </p>
        </div>
        <div className="flex gap-2">
          <PartyStatementExport
            partyId={partyId}
            fiscalYearId={selectedFiscalYear.id}
          />
          <Link href={`/reports/parties?fiscalYearId=${selectedFiscalYear.id}`}>
            <Button variant="secondary" size="sm">
              Back to Party Report
            </Button>
          </Link>
        </div>
      </div>

      {/* FY Selector */}
      <div className="flex flex-wrap gap-2">
        {fiscalYears.map((fy) => (
          <Link
            key={fy.id}
            href={`/reports/parties/${partyId}?fiscalYearId=${fy.id}`}
          >
            <Button
              variant={fy.id === selectedFiscalYear.id ? "primary" : "secondary"}
              size="sm"
            >
              {fy.name}
            </Button>
          </Link>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard label="Transactions" value={summary.expenseCount} />
        <StatCard label="Taxable" value={formatAmount(summary.totalTaxableAmount)} />
        <StatCard label="VAT" value={formatAmount(summary.totalVatAmount)} />
        <StatCard
          label="Total"
          value={formatAmount(summary.totalAmount)}
          accent
        />
      </div>

      {/* Transaction Table */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Transactions
        </h2>
        {rowsWithRunning.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-8 text-center">
            <p className="text-sm text-muted">
              No transactions found for this party in FY {summary.fiscalYearName}.
            </p>
          </div>
        ) : (
          <DataTable
            columns={[
              {
                header: "Miti",
                cell: (row) => (
                  <span className="font-mono text-sm">{row.miti}</span>
                ),
              },
              {
                header: "Invoice",
                cell: (row) => row.invoiceNumber ?? "—",
              },
              {
                header: "Item",
                cell: (row) => (
                  <div className="flex flex-col">
                    <span>{row.itemName}</span>
                    {row.categoryName && (
                      <span className="text-xs text-muted">{row.categoryName}</span>
                    )}
                  </div>
                ),
              },
              {
                header: "Taxable",
                align: "right",
                cell: (row) => (
                  <span className="tabular-amount">{formatAmount(row.taxableAmount)}</span>
                ),
              },
              {
                header: "VAT",
                align: "right",
                cell: (row) => (
                  <span className="tabular-amount">{formatAmount(row.vatAmount)}</span>
                ),
              },
              {
                header: "Total",
                align: "right",
                cell: (row) => (
                  <span className="tabular-amount font-medium">
                    {formatAmount(row.totalAmount)}
                  </span>
                ),
              },
              {
                header: "Running Total",
                align: "right",
                cell: (row) => (
                  <span className="tabular-amount font-semibold text-primary">
                    {formatAmount(String(row.runningTotal))}
                  </span>
                ),
              },
            ]}
            rows={rowsWithRunning}
            getKey={(row) => row.id}
            mobileCard={(row) => (
              <>
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <span className="font-mono text-sm">{row.miti}</span>
                    <span className="font-medium">{row.itemName}</span>
                    {row.invoiceNumber && (
                      <span className="text-xs text-muted">Inv: {row.invoiceNumber}</span>
                    )}
                  </div>
                  <span className="tabular-amount font-medium">
                    {formatAmount(row.totalAmount)}
                  </span>
                </div>
                <div className="mt-1 flex gap-4 text-xs text-muted">
                  <span>Taxable {formatAmount(row.taxableAmount)}</span>
                  <span>VAT {formatAmount(row.vatAmount)}</span>
                </div>
                <div className="mt-1 text-xs">
                  <span className="text-primary font-medium">
                    Running: {formatAmount(String(row.runningTotal))}
                  </span>
                </div>
              </>
            )}
          />
        )}
      </section>
    </div>
  );
}
