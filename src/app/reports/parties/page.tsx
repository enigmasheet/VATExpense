import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getCompanyId,
  getActiveFiscalYear,
  getFiscalYears,
  getPartyPurchaseReport,
} from "@/lib/server-data";
import { formatAmount } from "@/lib/format";
import { PartyReportExport } from "@/components/party-report-export";
import { FiscalYearSelector } from "@/components/fiscal-year-selector";
import { StatCard } from "@/components/ui/stat-card";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { PATH_LOGIN, PARTY_PURCHASE_THRESHOLD } from "@/lib/constants";

interface Props {
  searchParams: Promise<{ fiscalYearId?: string; basis?: string }>;
}

const THRESHOLD = PARTY_PURCHASE_THRESHOLD;

/**
 * Displays the parties whose purchases in a fiscal year exceed the threshold.
 *
 * @param searchParams - URL parameters containing the fiscal year and amount basis.
 * @returns The party purchase report page, or a fiscal-year setup message when no fiscal year exists.
 */
export default async function PartyPurchaseReportPage({ searchParams }: Props) {
  const companyId = await getCompanyId();
  if (!companyId) redirect(PATH_LOGIN);

  const params = await searchParams;
  const basis = params.basis === "total" ? "total" : "taxable";

  const activeFiscalYear = await getActiveFiscalYear(companyId);
  if (!activeFiscalYear) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Party Purchase Report"
          subtitle="No fiscal year configured — create one first."
        />
      </div>
    );
  }

  const fiscalYears = await getFiscalYears(companyId);
  const selectedFiscalYearId = params.fiscalYearId || activeFiscalYear.id;
  const selectedFiscalYear =
    fiscalYears.find((fy) => fy.id === selectedFiscalYearId) ?? activeFiscalYear;

  const report = await getPartyPurchaseReport(
    companyId,
    selectedFiscalYear.id,
    basis,
    THRESHOLD,
  );

  const totals = report.reduce(
    (acc, row) => ({
      taxable: acc.taxable + Number(row.totalTaxableAmount),
      vat: acc.vat + Number(row.totalVatAmount),
      total: acc.total + Number(row.totalAmount),
    }),
    { taxable: 0, vat: 0, total: 0 },
  );

  const basisLabel = basis === "taxable" ? "Taxable (excl. VAT)" : "Total (incl. VAT)";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Party Purchase Report"
        subtitle={`Parties with purchases over Rs. 1,00,000 (${basisLabel}) · FY ${selectedFiscalYear.name}`}
        actions={
          <PartyReportExport
            companyId={companyId}
            fiscalYearId={selectedFiscalYear.id}
            basis={basis}
          />
        }
      />

      <FiscalYearSelector
        fiscalYears={fiscalYears}
        currentFiscalYearId={selectedFiscalYear.id}
        basis={basis}
      />

      <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1 text-sm">
        <a
          href={`/reports/parties?fiscalYearId=${selectedFiscalYear.id}&basis=taxable`}
          className={`rounded-md px-3 py-1.5 font-medium ${
            basis === "taxable"
              ? "bg-primary text-white"
              : "text-muted hover:text-foreground"
          }`}
        >
          Taxable (excl. VAT)
        </a>
        <a
          href={`/reports/parties?fiscalYearId=${selectedFiscalYear.id}&basis=total`}
          className={`rounded-md px-3 py-1.5 font-medium ${
            basis === "total"
              ? "bg-primary text-white"
              : "text-muted hover:text-foreground"
          }`}
        >
          Total (incl. VAT)
        </a>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard label="Parties" value={report.length} />
        <StatCard label="Taxable" value={formatAmount(totals.taxable)} />
        <StatCard label="VAT input credit" value={formatAmount(totals.vat)} />
        <StatCard label="Total purchases" value={formatAmount(totals.total)} accent />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold text-foreground">By Party</h2>
        {report.length === 0 ? (
          <EmptyState
            icon="parties"
            title="No parties over the threshold"
            description={`No parties exceed Rs. 1,00,000 in ${basisLabel} purchases this fiscal year.`}
          />
        ) : (
          <DataTable
              columns={[
                {
                  header: "Party",
                  cell: (row) => (
                    <Link
                      href={`/reports/parties/${row.partyId}?fiscalYearId=${selectedFiscalYear.id}`}
                      className="hover:underline"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-primary">{row.partyName}</span>
                        {row.vatNumber && (
                          <span className="text-xs text-muted">VAT {row.vatNumber}</span>
                        )}
                      </div>
                    </Link>
                  ),
                },
              {
                header: "Transactions",
                align: "right",
                cell: (row) => <span className="tabular-amount">{row.expenseCount}</span>,
              },
              {
                header: "Taxable",
                align: "right",
                cell: (row) => (
                  <span className="tabular-amount">{formatAmount(row.totalTaxableAmount)}</span>
                ),
              },
              {
                header: "VAT",
                align: "right",
                cell: (row) => (
                  <span className="tabular-amount">{formatAmount(row.totalVatAmount)}</span>
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
            ]}
            rows={report}
            getKey={(row) => row.partyId}
            mobileCard={(row) => (
              <Link
                href={`/reports/parties/${row.partyId}?fiscalYearId=${selectedFiscalYear.id}`}
                className="block"
              >
                <>
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col">
                      <span className="font-medium text-primary">{row.partyName}</span>
                      {row.vatNumber && (
                        <span className="text-xs text-muted">VAT {row.vatNumber}</span>
                      )}
                    </div>
                    <span className="tabular-amount font-medium">
                      {formatAmount(row.totalAmount)}
                    </span>
                  </div>
                  <div className="mt-1 flex gap-4 text-xs text-muted">
                    <span>
                      {row.expenseCount} transaction{row.expenseCount === 1 ? "" : "s"}
                    </span>
                    <span>Taxable {formatAmount(row.totalTaxableAmount)}</span>
                    <span>VAT {formatAmount(row.totalVatAmount)}</span>
                  </div>
                </>
              </Link>
            )}
          />
        )}
      </section>
    </div>
  );
}
