"use client";

import { useState, useEffect, useCallback } from "react";
import SearchBar from "@/components/SearchBar";
import ExampleQueries from "@/components/ExampleQueries";
import EventList from "@/components/EventList";
import EventMap from "@/components/EventMap";
import { searchEvents } from "@/lib/api/search";
import { Event } from "@/types/event";

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
  const [events, setEvents] = useState<Event[]>([]);
  const [currentQuery, setCurrentQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tookMs, setTookMs] = useState<number | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>();

  const handleSearch = useCallback(async (query: string) => {
    setIsLoading(true);
    setError(null);
    setCurrentQuery(query);
    syncQueryToUrl(query);

    try {
      const response = await searchEvents({ query });
      setEvents(response.events);
      setTookMs(response.tookMs);
    } catch (err) {
      console.error("Search failed:", err);
      setError(err instanceof Error ? err.message : "Failed to load events");
      setEvents([]);
      setTookMs(null);
    } finally {
      setIsLoading(false);
      setHasSearched(true);
    }
  }, []);

  // Initial load: restore `?q=` if present, otherwise show upcoming events.
  useEffect(() => {
    handleSearch(initialQueryFromUrl());
  }, [handleSearch]);

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
          initialQuery={currentQuery}
          onSearch={handleSearch}
          isLoading={isLoading}
        />
        <ExampleQueries
          onSelect={handleSearch}
          activeQuery={currentQuery}
          disabled={isLoading}
        />
      </section>

      {/* Map */}
      <section>
        <EventMap
          events={events}
          selectedEventId={selectedEventId}
          onSelectEvent={setSelectedEventId}
        />
      </section>

      {/* Results header */}
      <section className="flex items-center justify-between pt-2">
        <h2 className="text-xl font-bold">
          {currentQuery ? `Results for "${currentQuery}"` : "Upcoming Events"}
        </h2>
        <div
          className="text-xs text-stone-500 dark:text-stone-400"
          aria-live="polite"
          role="status"
        >
          {isLoading
            ? "Searching…"
            : hasSearched && !error
              ? `${events.length} event${events.length === 1 ? "" : "s"} found` +
                (tookMs !== null ? ` in ${tookMs} ms` : "")
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
            onClick={() => handleSearch(currentQuery)}
            className="shrink-0 px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-semibold hover:bg-red-700 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Results */}
      <section>
        <EventList events={events} isLoading={isLoading} query={currentQuery} />
      </section>
    </main>
  );
}
