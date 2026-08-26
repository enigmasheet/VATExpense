import { QueryClient } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { queryKeys } from "./query-keys";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 60 * 1000,
      gcTime: 10 * 60 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 2,
    },
    mutations: {
      retryOnError: false,
    },
  },
});

if (typeof window !== "undefined") {
  const persister = createSyncStoragePersister({
    storage: window.localStorage,
    // Only persist stable reference data
    // Keys that start with "stable-" will be persisted
    throttleTime: 1000,
  });

  persistQueryClient({
    queryClient,
    persister,
    maxAge: 24 * 60 * 60 * 1000,
    // Filter: only persist queries with key[0] === "stable-categories"
    buster: "vat-expense-v1",
    // Only persist specific query keys
    filter: (query) => {
      const queryKey = query.queryKey;
      return (
        queryKey[0] === "stable-categories" ||
        queryKey[0] === "categories"
      );
    },
  });
}

export { queryClient };
export { queryKeys } from "./query-keys";