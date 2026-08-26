"use server";

import { requireCompanyId, type ActionResult } from "./common";
import {
  createTruckDocument as createTruckDocumentService,
  updateTruckDocument as updateTruckDocumentService,
  deleteTruckDocument as deleteTruckDocumentService,
  listTruckDocuments,
  type TruckDocument,
} from "@/lib/services/truck-documents";
import { ERR_NOT_AUTHENTICATED } from "@/lib/status-constants";

export type { ActionResult };
export type { TruckDocument };

export async function createTruckDocument(input: {
  truckId: string;
  documentType: string;
  documentNumber?: string | null;
  expiryDate?: string | null;
  reminderDate?: string | null;
}): Promise<ActionResult<TruckDocument>> {
  let companyId: string;
  try { companyId = await requireCompanyId(); } catch { return { ok: false, error: ERR_NOT_AUTHENTICATED }; }
  const result = await createTruckDocumentService(companyId, input);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}

export async function updateTruckDocument(
  id: string,
  changes: {
    documentType?: string;
    documentNumber?: string | null;
    expiryDate?: string | null;
    reminderDate?: string | null;
    isActive?: boolean;
  },
): Promise<ActionResult<TruckDocument>> {
  let companyId: string;
  try { companyId = await requireCompanyId(); } catch { return { ok: false, error: ERR_NOT_AUTHENTICATED }; }
  const result = await updateTruckDocumentService(id, companyId, changes);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}

export async function deleteTruckDocument(id: string): Promise<ActionResult<{ id: string }>> {
  let companyId: string;
  try { companyId = await requireCompanyId(); } catch { return { ok: false, error: ERR_NOT_AUTHENTICATED }; }
  const result = await deleteTruckDocumentService(id, companyId);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}

export async function getTruckDocuments(
  truckId: string,
): Promise<ActionResult<TruckDocument[]>> {
  let companyId: string;
  try { companyId = await requireCompanyId(); } catch { return { ok: false, error: ERR_NOT_AUTHENTICATED }; }
  const data = await listTruckDocuments(companyId, truckId);
  return { ok: true, data };
}
