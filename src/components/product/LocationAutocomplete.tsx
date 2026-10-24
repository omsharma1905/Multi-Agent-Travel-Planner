"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { LocationCandidate } from "@/app/api/locations/search/route";

export interface LocationAutocompleteProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string, locationData?: LocationCandidate) => void;
  placeholder?: string;
  error?: string;
  ariaLabel: string;
  required?: boolean;
}

export function LocationAutocomplete({
  id,
  label,
  value,
  onChange,
  placeholder = "e.g. Bhopal, London, or Tokyo",
  error,
  ariaLabel,
  required = false,
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<LocationCandidate[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Handle outside clicks to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const trimmed = query.trim();
    if (!trimmed) {
      setSuggestions([]);
      setIsLoading(false);
      setIsOpen(false);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsLoading(true);

    try {
      const res = await fetch(`/api/locations/search?q=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      });
      if (res.ok) {
        const data: LocationCandidate[] = await res.json();
        setSuggestions(data);
        setIsOpen(data.length > 0);
        setHighlightedIndex(-1);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value;
    onChange(nextVal);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(nextVal);
    }, 280);
  };

  const handleSelectSuggestion = (candidate: LocationCandidate) => {
    onChange(candidate.name, candidate);
    setIsOpen(false);
    setSuggestions([]);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === "ArrowDown" && suggestions.length > 0) {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % suggestions.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
        break;
      case "Enter":
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          e.preventDefault();
          handleSelectSuggestion(suggestions[highlightedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <label
        htmlFor={id}
        className="font-mono text-[10px] uppercase tracking-wider text-[#111111]/50 block mb-1"
      >
        {label}
      </label>

      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          required={required}
          aria-label={ariaLabel}
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={`${id}-suggestions`}
          autoComplete="off"
          className="w-full border-b-2 border-[#111111]/20 bg-transparent py-2 text-xl sm:text-2xl font-display font-semibold uppercase text-[#111111] placeholder:text-[#111111]/25 focus:border-[#1F3D2B] focus:outline-none transition-colors"
        />

        {isLoading && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
            <span className="block h-4 w-4 rounded-full border-2 border-[#1F3D2B]/30 border-t-[#1F3D2B] animate-spin" />
          </div>
        )}
      </div>

      {error && <p className="font-mono text-xs text-red-600 mt-1.5">{error}</p>}

      {/* Autocomplete Suggestions Menu */}
      {isOpen && suggestions.length > 0 && (
        <ul
          id={`${id}-suggestions`}
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1.5 max-h-64 overflow-y-auto rounded-md border border-[#111111]/15 bg-[#FAF7F0] py-1 shadow-xl z-50 divide-y divide-[#111111]/5"
        >
          {suggestions.map((item, idx) => {
            const isHighlighted = idx === highlightedIndex;
            return (
              <li
                key={`${item.id}-${idx}`}
                role="option"
                aria-selected={isHighlighted}
                onMouseEnter={() => setHighlightedIndex(idx)}
                onClick={() => handleSelectSuggestion(item)}
                className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors text-left ${
                  isHighlighted ? "bg-[#1F3D2B]/10 text-[#1F3D2B]" : "hover:bg-[#111111]/5 text-[#111111]"
                }`}
              >
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="font-display font-bold text-sm sm:text-base uppercase tracking-tight truncate">
                    {item.name}
                  </span>
                  <span className="font-mono text-[11px] text-[#111111]/60 truncate">
                    {item.region ? `${item.region}, ` : ""}
                    {item.country}
                  </span>
                </div>
                <span className="shrink-0 font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-[#111111]/15 text-[#111111]/70 bg-white/70">
                  {item.countryCode}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
