"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Party, CellField } from "@/lib/expenses/ledger-types";

interface PartyAutocompleteProps {
  allParties: Party[];
  value: string;
  partyId: string;
  partyResolved: boolean;
  rowId: string;
  onSelect: (party: Party) => void;
  onSearchChange: (partyName: string) => void;
  onGridKeyDown: (e: React.KeyboardEvent, field: CellField) => void;
}

/**
 * Provides searchable party selection with keyboard navigation and resolved-party status.
 */
export function PartyAutocomplete({
  allParties,
  value,
  partyId,
  partyResolved,
  rowId,
  onSelect,
  onSearchChange,
  onGridKeyDown,
}: PartyAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<Party[]>([]);
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (prevValueRef.current !== value) {
      prevValueRef.current = value;
      setQuery(value);
    }
  }, [value]);

  const updatePosition = useCallback(() => {
    const rect = inputRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, []);

  const search = useCallback(
    (q: string) => {
      if (q.length < 1) {
        setResults([]);
        setOpen(false);
        return;
      }
      const lower = q.toLowerCase();
      const isVat = /\d{5,}/.test(q);
      let matched: Party[];
      if (isVat) {
        matched = allParties.filter((p) => p.vatNumber?.includes(q));
      } else {
        matched = allParties.filter(
          (p) =>
            p.name.toLowerCase().includes(lower) ||
            (p.vatNumber && p.vatNumber.includes(q)),
        );
      }
      setResults(matched.slice(0, 8));
      setOpen(matched.length > 0);
      setHighlightIdx(-1);
    },
    [allParties],
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      )
        setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (open) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIdx((i) => Math.min(i + 1, results.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIdx((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" && highlightIdx >= 0) {
        e.preventDefault();
        e.stopPropagation();
        selectParty(results[highlightIdx]);
        return;
      }
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key === "Tab") {
        setOpen(false);
      }
    }
    onGridKeyDown(e, "partySearch");
  }

  function selectParty(party: Party) {
    setQuery(party.name);
    setOpen(false);
    onSelect(party);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    search(val);
    onSearchChange(val);
  }

  function handleFocus() {
    if (results.length > 0) {
      updatePosition();
      setOpen(true);
    } else if (query.length > 0) {
      search(query);
      updatePosition();
      setOpen(results.length > 0);
    }
  }

  const showDropdown = open && results.length > 0 && position;

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          data-row={rowId}
          data-field="partySearch"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder="Search party..."
          className={`h-10 w-full rounded border bg-transparent px-3 pr-8 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 ${
            !partyResolved && query
              ? "border-destructive bg-destructive/5 focus:ring-destructive/40"
              : "border-border/50"
          }`}
        />
        {partyResolved && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500">
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
          </span>
        )}
      </div>
      {showDropdown &&
        createPortal(
          <div
            role="listbox"
            className="fixed max-h-48 overflow-y-auto rounded-lg border border-border/50 bg-surface py-1 shadow-lg"
            style={{
              top: position.top,
              left: position.left,
              width: position.width,
              zIndex: 50,
            }}
          >
            {results.map((party, idx) => (
              <button
                key={party.id}
                type="button"
                role="option"
                aria-selected={party.id === partyId}
                className={`block w-full px-3 py-2.5 text-left text-sm hover:bg-surface-hover ${
                  idx === highlightIdx ? "bg-surface-hover" : ""
                } ${party.id === partyId ? "font-medium text-primary" : "text-foreground"}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectParty(party);
                }}
              >
                <span className="font-medium">{party.name}</span>
                {party.vatNumber && (
                  <span className="ml-2 text-muted">
                    VAT: {party.vatNumber}
                  </span>
                )}
                {party.locationName && (
                  <span className="ml-2 text-muted">
                    &middot; {party.locationName}
                  </span>
                )}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
