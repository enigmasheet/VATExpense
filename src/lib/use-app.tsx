"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { api } from "@/lib/api-client";

export interface Company {
  id: string;
  name: string;
  vatNumber: string | null;
  defaultVatRate: string;
}

export interface FiscalYear {
  id: string;
  name: string;
  startYear: number;
  endYear: number;
  isActive: boolean;
}

interface AppContextValue {
  companies: Company[];
  companyId: string | null;
  setCompanyId: (id: string) => void;
  fiscalYears: FiscalYear[];
  fiscalYearId: string | null;
  setFiscalYearId: (id: string) => void;
  activeFiscalYear: FiscalYear | null;
  loading: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

const COMPANY_KEY = "vat-ledger:companyId";
const FY_KEY = "vat-ledger:fiscalYearId";

export function AppProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyIdState] = useState<string | null>(null);
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [fiscalYearId, setFiscalYearIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api<{ data: Company[] }>("/api/companies")
      .then(({ data }) => {
        if (cancelled) return;
        setCompanies(data);
        const stored = localStorage.getItem(COMPANY_KEY);
        const first = data[0]?.id ?? null;
        const chosen = stored && data.some((c) => c.id === stored) ? stored : first;
        if (chosen) setCompanyIdState(chosen);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!companyId) {
      setFiscalYears([]);
      setFiscalYearIdState(null);
      return;
    }
    let cancelled = false;
    api<{ data: FiscalYear[] }>(`/api/fiscal-years?companyId=${companyId}`)
      .then(({ data }) => {
        if (cancelled) return;
        setFiscalYears(data);
        setFiscalYearIdState((prev) => {
          if (prev && data.some((fy) => fy.id === prev)) return prev;
          return data.find((fy) => fy.isActive)?.id ?? data[0]?.id ?? null;
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const setCompanyId = useCallback((id: string) => {
    setCompanyIdState(id);
    localStorage.setItem(COMPANY_KEY, id);
  }, []);

  const setFiscalYearId = useCallback((id: string) => {
    setFiscalYearIdState(id);
    localStorage.setItem(FY_KEY, id);
  }, []);

  const activeFiscalYear = useMemo(
    () => fiscalYears.find((fy) => fy.id === fiscalYearId) ?? null,
    [fiscalYears, fiscalYearId],
  );

  const value = useMemo(
    () => ({
      companies,
      companyId,
      setCompanyId,
      fiscalYears,
      fiscalYearId,
      setFiscalYearId,
      activeFiscalYear,
      loading,
    }),
    [companies, companyId, setCompanyId, fiscalYears, fiscalYearId, setFiscalYearId, activeFiscalYear, loading],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}