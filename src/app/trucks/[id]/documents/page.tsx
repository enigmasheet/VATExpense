import { redirect, notFound } from "next/navigation";
import { getCompanyId } from "@/lib/server-data";
import { PATH_LOGIN } from "@/lib/constants";
import { db } from "@/lib/db";
import { trucks } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { TruckDocumentsPage } from "@/components/truck-documents-page";

export default async function TruckDocumentsRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const companyId = await getCompanyId();
  if (!companyId) redirect(PATH_LOGIN);

  const { id } = await params;
  const [truck] = await db
    .select({ id: trucks.id, name: trucks.name })
    .from(trucks)
    .where(and(eq(trucks.id, id), eq(trucks.companyId, companyId)))
    .limit(1);
  if (!truck) notFound();

  return <TruckDocumentsPage truckId={truck.id} truckName={truck.name} />;
}
