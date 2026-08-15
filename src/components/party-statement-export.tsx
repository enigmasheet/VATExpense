"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

interface PartyStatementExportProps {
  partyId: string;
  fiscalYearId: string;
}

export function PartyStatementExport({ partyId, fiscalYearId }: PartyStatementExportProps) {
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);
  const { toast } = useToast();

  async function handleExport(format: "xlsx" | "csv") {
    const params = new URLSearchParams({ fiscalYearId, format });
    setExportingFormat(format);
    try {
      const res = await fetch(`/api/export/parties/${partyId}?${params.toString()}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Export failed" }));
        throw new Error(errorData.error || "Export failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `party-statement.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast("Export downloaded successfully", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Export failed", "error");
    } finally {
      setExportingFormat(null);
    }
  }

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => handleExport("xlsx")}
        disabled={exportingFormat !== null}
      >
        {exportingFormat === "xlsx" ? "Exporting…" : "Export Excel"}
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => handleExport("csv")}
        disabled={exportingFormat !== null}
      >
        {exportingFormat === "csv" ? "Exporting…" : "Export CSV"}
      </Button>
    </>
  );
}
