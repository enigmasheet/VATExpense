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
import { useSession } from "next-auth/react";
import { api } from "@/lib/api-client";

export interface Company {
  id: string;
  name: string;
  vatNumber: string | null;
  defaultVatRate: string;
  brandName: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
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
  activeCompany: Company | null;
  fiscalYears: FiscalYear[];
  fiscalYearId: string | null;
  setFiscalYearId: (id: string) => void;
  activeFiscalYear: FiscalYear | null;
  loading: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

const FY_KEY = "vat-ledger:fiscalYearId";

/**
 * Provides authenticated company and fiscal-year state to descendant components.
 *
 * @returns The application context provider containing its children.
 */
export function AppProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [fiscalYearId, setFiscalYearIdState] = useState<string | null>(
    () => (typeof window !== "undefined" ? localStorage.getItem(FY_KEY) : null),
  );
  const [loading, setLoading] = useState(true);

  const companyId = (session?.user as { companyId?: string })?.companyId ?? null;

  useEffect(() => {
    if (status === "loading" || !companyId) return;
    let cancelled = false;
    api<{ data: Company[] }>(`/api/companies?id=${companyId}`)
      .then(({ data }) => {
        if (cancelled) return;
        setCompanies(data);
        setLoading(false);
      })
      .catch((e) => {
        console.error("Failed to load companies:", e);
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, status]);

  useEffect(() => {
    if (!companyId) return;
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
      .catch((e) => console.error("Failed to load fiscal years:", e));
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const setFiscalYearId = useCallback((id: string) => {
    setFiscalYearIdState(id);
    localStorage.setItem(FY_KEY, id);
  }, []);

  const activeFiscalYear = useMemo(
    () => fiscalYears.find((fy) => fy.id === fiscalYearId) ?? null,
    [fiscalYears, fiscalYearId],
  );

  const activeCompany = useMemo(
    () => companies.find((c) => c.id === companyId) ?? null,
    [companies, companyId],
  );

  const value = useMemo(
    () => ({
      companies,
      companyId,
      activeCompany,
      fiscalYears,
      fiscalYearId,
      setFiscalYearId,
      activeFiscalYear,
      loading,
    }),
    [companies, companyId, activeCompany, fiscalYears, fiscalYearId, setFiscalYearId, activeFiscalYear, loading],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/**
 * Provides access to the application context.
 *
 * @returns The current application context value
 */
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
