"use client";

import { useCallback, useSyncExternalStore } from "react";

const SIDEBAR_KEY = "vat-ledger:sidebar-collapsed";

const sidebarListeners = new Set<() => void>();

function getCollapsedPref(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SIDEBAR_KEY) === "1";
}

function setCollapsedPref(value: boolean) {
  localStorage.setItem(SIDEBAR_KEY, value ? "1" : "0");
  sidebarListeners.forEach((listener) => listener());
}

/**
 * Provides the collapse state for the desktop sidebar, persisted in
 * localStorage and kept hydration-safe via useSyncExternalStore.
 */
export function useSidebarCollapsed() {
  return useSyncExternalStore(
    useCallback((listener: () => void) => {
      sidebarListeners.add(listener);
      return () => sidebarListeners.delete(listener);
    }, []),
    getCollapsedPref,
    () => false,
  );
}

export function toggleSidebarCollapsed() {
  setCollapsedPref(!getCollapsedPref());
}
