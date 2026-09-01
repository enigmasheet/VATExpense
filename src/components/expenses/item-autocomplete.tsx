"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

export interface ItemMapping {
  id: string;
  itemName: string;
  categoryId: string;
  categoryName: string | null;
}

export interface ItemAutocompleteProps {
  itemMappings: ItemMapping[];
  value: string;
  resolved: boolean;
  onChange: (itemName: string, categoryId: string | null) => void;
  onSearchChange: (search: string) => void;
  onResolvedChange: (resolved: boolean) => void;
  onLinkNew: () => void;
}

export function ItemAutocomplete({
  itemMappings,
  value,
  resolved,
  onChange,
  onSearchChange,
  onResolvedChange,
  onLinkNew,
}: ItemAutocompleteProps) {
  const [results, setResults] = useState<ItemMapping[]>([]);
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const updateDropdownPos = useCallback(() => {
    const rect = inputRef.current?.getBoundingClientRect();
    if (!rect) return;
    const vw = window.innerWidth;
    const width = Math.min(rect.width, vw - 16);
    const left = Math.min(Math.max(rect.left, 8), vw - width - 8);
    setDropdownPos({ top: rect.bottom + 4, left, width });
  }, []);

  function search(q: string) {
    if (q.length < 1) {
      setResults([]);
      setOpen(false);
      return;
    }
    const lower = q.toLowerCase();
    const matched = itemMappings.filter((m) => m.itemName.toLowerCase().includes(lower));
    setResults(matched.slice(0, 8));
    setOpen(matched.length > 0);
    setHighlightIdx(-1);
  }

  function select(mapping: ItemMapping) {
    onSearchChange(mapping.itemName);
    onChange(mapping.itemName, mapping.categoryId);
    onResolvedChange(true);
    setOpen(false);
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    updateDropdownPos();
    window.addEventListener("resize", updateDropdownPos);
    window.addEventListener("scroll", updateDropdownPos, true);
    return () => {
      window.removeEventListener("resize", updateDropdownPos);
      window.removeEventListener("scroll", updateDropdownPos, true);
    };
  }, [open, updateDropdownPos]);

  return (
    <div className="flex gap-2" ref={dropdownRef}>
      <div className="relative flex-1">
        <input
          ref={inputRef}
          id="e-item"
          type="text"
          required
          value={value}
          onChange={(e) => {
            const val = e.target.value;
            onSearchChange(val);
            onChange(val, null);
            onResolvedChange(false);
            search(val);
          }}
          onFocus={() => {
            updateDropdownPos();
            if (results.length > 0) setOpen(true);
            else if (value.length > 0) search(value);
          }}
          onKeyDown={(e) => {
            if (!open) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlightIdx((i) => Math.min(i + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlightIdx((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter" && highlightIdx >= 0) {
              e.preventDefault();
              e.stopPropagation();
              select(results[highlightIdx]);
            } else if (e.key === "Escape") {
              setOpen(false);
            } else if (e.key === "Tab") {
              setOpen(false);
            }
          }}
          placeholder="Type item name..."
          className={`h-10 w-full rounded border bg-transparent px-3 pr-8 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 ${
            !resolved && value
              ? "border-danger/40 bg-danger/5"
              : "border-border/50"
          }`}
        />
        {resolved && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </span>
        )}
        {open && results.length > 0 && createPortal(
          <div
            role="listbox"
            className="fixed max-h-48 overflow-y-auto rounded-lg border border-border/50 bg-surface py-1 shadow-lg z-50"
            style={dropdownPos ? {
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
            } : { top: 0, left: 0, width: 0 }}
          >
            {results.map((mapping, idx) => (
              <button
                key={mapping.id}
                type="button"
                role="option"
                aria-selected={mapping.itemName === value && resolved}
                className={`block w-full px-3 py-2.5 text-left text-sm hover:bg-surface-hover ${
                  idx === highlightIdx ? "bg-surface-hover" : ""
                } ${mapping.itemName === value && resolved ? "font-medium text-primary" : "text-foreground"}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(mapping);
                }}
              >
                <span className="font-medium">{mapping.itemName}</span>
                {mapping.categoryName && (
                  <span className="ml-2 text-muted">{mapping.categoryName}</span>
                )}
              </button>
            ))}
          </div>,
          document.body,
        )}
      </div>
      <Button type="button" variant="secondary" size="sm" onClick={onLinkNew}>
        Link
      </Button>
    </div>
  );
}
