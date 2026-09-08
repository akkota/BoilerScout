"use client";

import { useState, useEffect, useCallback } from "react";
import SearchBar from "@/components/SearchBar";
import EventList from "@/components/EventList";
import EventMap from "@/components/EventMap";
import { searchEvents } from "@/lib/api/search";
import { Event } from "@/types/event";

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [currentQuery, setCurrentQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tookMs, setTookMs] = useState<number | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>();

  const handleSearch = useCallback(async (query: string) => {
    setIsLoading(true);
    setError(null);
    setCurrentQuery(query);

    try {
      const response = await searchEvents({ query });
      setEvents(response.events);
      setTookMs(response.tookMs);
    } catch (err) {
      console.error("Search failed:", err);
      setError(err instanceof Error ? err.message : "Failed to load events");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load: fetch all mock events
  useEffect(() => {
    handleSearch("");
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
          Purdue Campus Event Discovery Engine &bull; Initial Scaffolding
        </p>
      </header>

      {/* Search Bar */}
      <section>
        <SearchBar onSearch={handleSearch} isLoading={isLoading} />
      </section>

      {/* Map Placeholder */}
      <section>
        <EventMap
          events={events}
          selectedEventId={selectedEventId}
          onSelectEvent={setSelectedEventId}
        />
      </section>

      {/* Results Header */}
      <section className="flex items-center justify-between pt-2">
        <h2 className="text-xl font-bold">
          {currentQuery ? `Results for "${currentQuery}"` : "Upcoming Events"}
        </h2>
        <div className="text-xs text-stone-500 dark:text-stone-400">
          {events.length} event{events.length === 1 ? "" : "s"} found
          {tookMs !== null && ` (${tookMs} ms)`}
        </div>
      </section>

      {/* Error message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Event List */}
      <section>
        <EventList events={events} isLoading={isLoading} query={currentQuery} />
      </section>
    </main>
  );
}
