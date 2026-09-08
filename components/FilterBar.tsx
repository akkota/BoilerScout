"use client";

import { useEffect, useRef, useState } from "react";
import {
  CAMPUS_CENTER,
  DEFAULT_FILTER_STATE,
  FilterState,
  RADIUS_OPTIONS,
  TIME_PRESETS,
  TimePreset,
  countActiveFilters,
} from "@/lib/filters";

/**
 * FilterBar
 * Owned by: Frontend developer
 *
 * Controlled component: it never searches on its own, it just reports a new
 * FilterState upward. `app/page.tsx` re-runs the search on every change.
 */

type GeoStatus = "idle" | "locating" | "precise" | "fallback";

interface FilterBarProps {
  value: FilterState;
  onChange: (next: FilterState) => void;
  /** Categories to offer — seed list unioned with whatever results have shown. */
  availableCategories: string[];
  disabled?: boolean;
}

const chipBase =
  "text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
const chipOn = "bg-amber-500 border-amber-500 text-black font-semibold";
const chipOff =
  "bg-white dark:bg-stone-900 border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:border-amber-400";

export default function FilterBar({
  value,
  onChange,
  availableCategories,
  disabled = false,
}: FilterBarProps) {
  const [geoStatus, setGeoStatus] = useState<GeoStatus>("idle");
  const [showAllCategories, setShowAllCategories] = useState(false);
  const valueRef = useRef(value);
  valueRef.current = value;
  const geoRequestRef = useRef(0);
  const prevFiltersRef = useRef(value);

  const activeCount = countActiveFilters(value);

  useEffect(() => {
    const prev = prevFiltersRef.current;
    prevFiltersRef.current = value;
    if (geoStatus !== "locating") return;
    const prevHadFilters = countActiveFilters(prev) > 0 || prev.nearMe;
    const nowClear = countActiveFilters(value) === 0 && !value.nearMe;
    if (prevHadFilters && nowClear) {
      geoRequestRef.current += 1;
      setGeoStatus("idle");
    }
  }, [value, geoStatus]);

  const setTime = (time: TimePreset) => onChange({ ...value, time });

  const toggleCategory = (category: string) => {
    const next = value.categories.includes(category)
      ? value.categories.filter((c) => c !== category)
      : [...value.categories, category];
    onChange({ ...value, categories: next });
  };

  const toggleNearMe = () => {
    // Turning it off is simple; turning it on needs a location first.
    if (value.nearMe) {
      geoRequestRef.current += 1;
      setGeoStatus("idle");
      onChange({ ...value, nearMe: false, center: undefined });
      return;
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoStatus("fallback");
      onChange({ ...valueRef.current, nearMe: true, center: CAMPUS_CENTER });
      return;
    }

    const requestId = ++geoRequestRef.current;
    setGeoStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (requestId !== geoRequestRef.current) return;
        setGeoStatus("precise");
        onChange({
          ...valueRef.current,
          nearMe: true,
          center: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        });
      },
      () => {
        if (requestId !== geoRequestRef.current) return;
        // Denied, timed out, or blocked (common on conference wifi) —
        // fall back to campus center so the demo never stalls.
        setGeoStatus("fallback");
        onChange({ ...valueRef.current, nearMe: true, center: CAMPUS_CENTER });
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
    );
  };

  const visibleCategories = showAllCategories
    ? availableCategories
    : availableCategories.slice(0, 8);

  return (
    <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/60 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
          Filters
          {activeCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-amber-500 text-black text-[11px] font-bold">
              {activeCount}
            </span>
          )}
        </h2>
        {activeCount > 0 && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              geoRequestRef.current += 1;
              setGeoStatus("idle");
              onChange({ ...DEFAULT_FILTER_STATE });
            }}
            className="text-xs text-stone-500 dark:text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 underline underline-offset-2 cursor-pointer"
          >
            Clear all
          </button>
        )}
      </div>

      {/* When */}
      <fieldset className="flex flex-wrap items-center gap-2">
        <legend className="sr-only">When</legend>
        <span className="text-xs font-medium text-stone-500 dark:text-stone-400 w-12">
          When
        </span>
        {TIME_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            disabled={disabled}
            aria-pressed={value.time === preset.id}
            onClick={() => setTime(preset.id)}
            className={`${chipBase} ${value.time === preset.id ? chipOn : chipOff}`}
          >
            {preset.label}
          </button>
        ))}
      </fieldset>

      {/* Where */}
      <fieldset className="flex flex-wrap items-center gap-2">
        <legend className="sr-only">Where</legend>
        <span className="text-xs font-medium text-stone-500 dark:text-stone-400 w-12">
          Where
        </span>
        <button
          type="button"
          disabled={disabled || geoStatus === "locating"}
          aria-pressed={value.nearMe}
          onClick={toggleNearMe}
          className={`${chipBase} ${value.nearMe ? chipOn : chipOff}`}
        >
          {geoStatus === "locating" ? "Locating…" : "📍 Near me"}
        </button>

        {value.nearMe && (
          <>
            <label htmlFor="radius-select" className="sr-only">
              Search radius in miles
            </label>
            <select
              id="radius-select"
              disabled={disabled}
              value={value.radiusMiles}
              onChange={(e) =>
                onChange({ ...value, radiusMiles: Number(e.target.value) })
              }
              className="text-xs px-2 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              {RADIUS_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  within {r} mi
                </option>
              ))}
            </select>
            <span className="text-[11px] text-stone-400 dark:text-stone-500">
              {geoStatus === "fallback"
                ? "using campus center"
                : geoStatus === "precise"
                  ? "using your location"
                  : ""}
            </span>
          </>
        )}

        <button
          type="button"
          disabled={disabled}
          aria-pressed={value.freeOnly}
          onClick={() => onChange({ ...value, freeOnly: !value.freeOnly })}
          className={`${chipBase} ${value.freeOnly ? chipOn : chipOff}`}
        >
          🎟️ Free only
        </button>
      </fieldset>

      {/* Categories */}
      <fieldset className="flex flex-wrap items-center gap-2">
        <legend className="sr-only">Categories</legend>
        <span className="text-xs font-medium text-stone-500 dark:text-stone-400 w-12">
          Topics
        </span>
        {visibleCategories.map((category) => {
          const on = value.categories.includes(category);
          return (
            <button
              key={category}
              type="button"
              disabled={disabled}
              aria-pressed={on}
              onClick={() => toggleCategory(category)}
              className={`${chipBase} ${on ? chipOn : chipOff}`}
            >
              {category}
            </button>
          );
        })}
        {availableCategories.length > 8 && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setShowAllCategories((s) => !s)}
            className="text-xs text-stone-500 dark:text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 underline underline-offset-2 cursor-pointer"
          >
            {showAllCategories
              ? "Show fewer"
              : `+${availableCategories.length - 8} more`}
          </button>
        )}
      </fieldset>
    </div>
  );
}
