"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import SearchBar from "@/components/SearchBar";
import ExampleQueries from "@/components/ExampleQueries";
import FilterBar from "@/components/FilterBar";
import EventList from "@/components/EventList";
import { searchEvents } from "@/lib/api/search";
import {
  CAMPUS_CENTER,
  DEFAULT_CATEGORIES,
  DEFAULT_FILTER_STATE,
  FilterState,
  buildSearchFilters,
  countActiveFilters,
} from "@/lib/filters";
import { Event } from "@/types/event";

// Leaflet + CSS tiles — keep the map off the critical path so search is
// interactive immediately. SSR is off because Leaflet touches `window`.
const EventMap = dynamic(() => import("@/components/EventMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-80 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-900/50 animate-pulse" />
  ),
});

/** Read `?q=` once on first client render so shared/reloaded links restore state. */
function initialQueryFromUrl(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("q") ?? "";
}

/** Reflect the current query in the URL without adding history entries. */
function syncQueryToUrl(query: string) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (query.trim()) {
    url.searchParams.set("q", query);
  } else {
    url.searchParams.delete("q");
  }
  window.history.replaceState(null, "", url.toString());
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTER_STATE);
  const [ready, setReady] = useState(false);

  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tookMs, setTookMs] = useState<number | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>();
  const [hoveredEventId, setHoveredEventId] = useState<string | undefined>();

  // Selecting from the map should bring the matching card into view;
  // selecting from the list obviously should not scroll.
  const handleSelectFromMap = useCallback((eventId: string | undefined) => {
    setSelectedEventId(eventId);
    if (!eventId) return;
    document
      .getElementById(`event-${eventId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  // Categories accumulate as results come in, so the picker never loses an
  // option just because the current result set no longer contains it.
  const [seenCategories, setSeenCategories] = useState<string[]>([]);
  const availableCategories = useMemo(
    () => Array.from(new Set([...DEFAULT_CATEGORIES, ...seenCategories])),
    [seenCategories]
  );

  // Guards against a slow earlier request overwriting a newer one.
  const requestIdRef = useRef(0);

  const runSearch = useCallback(async (q: string, f: FilterState) => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const response = await searchEvents({
        query: q,
        filters: buildSearchFilters(f),
      });
      if (requestId !== requestIdRef.current) return;

      setEvents(response.events);
      setTookMs(response.tookMs);
      setSelectedEventId((id) =>
        id && response.events.some((e) => e.id === id) ? id : undefined
      );
      setHoveredEventId((id) =>
        id && response.events.some((e) => e.id === id) ? id : undefined
      );
      setSeenCategories((prev) => {
        const merged = new Set(prev);
        response.events.forEach((e) => e.categories?.forEach((c) => merged.add(c)));
        return merged.size === prev.length ? prev : Array.from(merged);
      });
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      console.error("Search failed:", err);
      setError(err instanceof Error ? err.message : "Failed to load events");
      setEvents([]);
      setTookMs(null);
      setSelectedEventId(undefined);
      setHoveredEventId(undefined);
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
        setHasSearched(true);
      }
    }
  }, []);

  // Restore `?q=` before the first search fires.
  useEffect(() => {
    const restored = initialQueryFromUrl();
    if (restored) setQuery(restored);
    setReady(true);
  }, []);

  // Single source of truth: any query or filter change re-runs the search.
  useEffect(() => {
    if (!ready) return;
    syncQueryToUrl(query);
    runSearch(query, filters);
  }, [ready, query, filters, runSearch]);

  const activeFilterCount = countActiveFilters(filters);

  const handleQueryChange = useCallback(
    (q: string) => {
      // Same-string setState is a no-op, so re-submitting or re-clicking a
      // chip would otherwise not fire a search (bad after an error).
      if (q === query) {
        runSearch(q, filters);
        return;
      }
      setQuery(q);
    },
    [query, filters, runSearch]
  );

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black text-amber-500">🚂</span>
          <h1 className="text-3xl font-extrabold tracking-tight">BoilerScout</h1>
        </div>
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Purdue campus event discovery &mdash; search by meaning, time, and place
        </p>
      </header>

      {/* Search */}
      <section className="space-y-3">
        <SearchBar
          initialQuery={query}
          onSearch={handleQueryChange}
          isLoading={isLoading}
        />
        <ExampleQueries
          onSelect={handleQueryChange}
          activeQuery={query}
        />
      </section>

      {/* Filters */}
      <section>
        <FilterBar
          value={filters}
          onChange={setFilters}
          availableCategories={availableCategories}
        />
      </section>

      {/* Map */}
      <section>
        <EventMap
          events={events}
          selectedEventId={selectedEventId}
          hoveredEventId={hoveredEventId}
          onSelectEvent={handleSelectFromMap}
          onHoverEvent={setHoveredEventId}
          userLocation={filters.nearMe ? (filters.center ?? CAMPUS_CENTER) : undefined}
        />
      </section>

      {/* Results header */}
      <section className="flex items-center justify-between gap-3 pt-2">
        <h2 className="text-xl font-bold">
          {query ? `Results for "${query}"` : "Upcoming Events"}
        </h2>
        <div
          className="text-xs text-stone-500 dark:text-stone-400 text-right"
          aria-live="polite"
          role="status"
        >
          {isLoading
            ? "Searching…"
            : hasSearched && !error
              ? `${events.length} event${events.length === 1 ? "" : "s"} found` +
                (tookMs !== null ? ` in ${tookMs} ms` : "") +
                (activeFilterCount > 0
                  ? ` · ${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"}`
                  : "")
              : ""}
        </div>
      </section>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="p-4 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm flex items-center justify-between gap-3"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => runSearch(query, filters)}
            className="shrink-0 px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-semibold hover:bg-red-700 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Results */}
      <section>
        <EventList
          events={events}
          isLoading={isLoading}
          query={query}
          hasError={Boolean(error)}
          hasActiveFilters={activeFilterCount > 0}
          onClearFilters={() => setFilters({ ...DEFAULT_FILTER_STATE })}
          selectedEventId={selectedEventId}
          hoveredEventId={hoveredEventId}
          onSelectEvent={setSelectedEventId}
          onHoverEvent={setHoveredEventId}
        />
      </section>
    </main>
  );
}
