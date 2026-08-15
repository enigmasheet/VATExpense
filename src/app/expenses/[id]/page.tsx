import { redirect, notFound } from "next/navigation";
import { getCompanyId, getExpenseById } from "@/lib/server-data";
import { PATH_LOGIN } from "@/lib/constants";
import { ExpenseDetailClient } from "@/components/expense-detail-client";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Renders the detail view for an expense identified by the route parameter.
 *
 * @param params - Route parameters containing the expense ID.
 */
export default async function ExpenseDetailPage({ params }: Props) {
  const companyId = await getCompanyId();
  if (!companyId) redirect(PATH_LOGIN);

  const { id } = await params;
  const expense = await getExpenseById(id, companyId);

  if (!expense) notFound();

  return (
    <ExpenseDetailClient
      id={id}
      initial={{
        miti: expense.miti,
        invoiceNumber: expense.invoiceNumber,
        partyId: expense.partyId,
        categoryId: expense.categoryId,
        locationId: expense.locationId,
        truckId: expense.truckId,
        item: expense.item,
        quantity: expense.quantity,
        rate: expense.rate,
        taxableAmount: expense.taxableAmount,
        vatAmount: expense.vatAmount,
        totalAmount: expense.totalAmount,
        vatRate: expense.vatRate,
        remarks: expense.remarks,
        rowVersion: expense.rowVersion,
      }}
    />
  );
}
