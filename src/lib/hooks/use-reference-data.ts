import { useQuery } from "@tanstack/react-query";
import { api, apiUrl } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { Category, Location, Truck, Party, ItemCategoryLink } from "@/lib/types/entities";

export type { Category, Location, Truck, Party, ItemCategoryLink };

export function useLocations(companyId: string) {
  return useQuery({
    queryKey: queryKeys.locations(companyId),
    queryFn: async () => {
      const res = await api<{ data: Location[] }>(
        apiUrl("/api/locations", { companyId })
      );
      return res.data;
    },
    enabled: !!companyId,
    staleTime: 30 * 60 * 1000,
    gcTime: 10 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}

export function useCategories(companyId: string) {
  return useQuery({
    queryKey: queryKeys.categories(companyId),
    queryFn: async () => {
      const res = await api<{ data: Category[] }>(
        apiUrl("/api/categories", { companyId })
      );
      return res.data;
    },
    enabled: !!companyId,
    staleTime: 30 * 60 * 1000,
    gcTime: 10 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}

export function useItemCategories(companyId: string) {
  return useQuery({
    queryKey: queryKeys.itemCategories(companyId),
    queryFn: async () => {
      const res = await api<{ data: ItemCategoryLink[] }>(
        apiUrl("/api/item-categories", { companyId })
      );
      return res.data;
    },
    enabled: !!companyId,
    staleTime: 30 * 60 * 1000,
    gcTime: 10 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}

export function useTrucks(companyId: string) {
  return useQuery({
    queryKey: queryKeys.trucks(companyId),
    queryFn: async () => {
      const res = await api<{ data: Truck[] }>(
        apiUrl("/api/trucks", { companyId })
      );
      return res.data;
    },
    enabled: !!companyId,
    staleTime: 30 * 60 * 1000,
    gcTime: 10 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}

export function useParties(companyId: string) {
  return useQuery({
    queryKey: queryKeys.parties(companyId),
    queryFn: async () => {
      const res = await api<{ data: Party[] }>(
        apiUrl("/api/parties", { companyId })
      );
      return res.data;
    },
    enabled: !!companyId,
    staleTime: 30 * 60 * 1000,
    gcTime: 10 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}
