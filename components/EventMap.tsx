"use client";

import { Event } from "@/types/event";

interface EventMapProps {
  events: Event[];
  selectedEventId?: string;
  onSelectEvent?: (eventId: string) => void;
}

/**
 * EventMap Component
 * Owned by: Frontend developer
 *
 * Placeholder for Mapbox integration:
 * - Will render map with event markers using NEXT_PUBLIC_MAPBOX_TOKEN
 * - Will display campus locations (MRGN, LWSN, ARMS, PMU, Co-Rec, etc.)
 * - Will support RouteScout walking corridor polygons
 */
export default function EventMap({
  events,
  selectedEventId,
  onSelectEvent,
}: EventMapProps) {
  const eventsWithCoords = events.filter((e) => e.location?.lat && e.location?.lng);

  return (
    <div className="w-full h-80 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800/50 p-4 flex flex-col justify-between overflow-hidden relative">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
          Campus Map (Mapbox Placeholder)
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {eventsWithCoords.length} mapped events
        </span>
      </div>

      <div className="text-center py-6">
        <div className="inline-block p-3 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 mb-2">
          📍
        </div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Interactive Map Coming Soon
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto mt-1">
          Frontend developer will integrate Mapbox GL JS with RouteScout walking corridors.
        </p>
      </div>

      {eventsWithCoords.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-gray-400 whitespace-nowrap">Locations:</span>
          {eventsWithCoords.slice(0, 4).map((evt) => (
            <button
              key={evt.id}
              onClick={() => onSelectEvent?.(evt.id)}
              className={`px-2 py-1 rounded text-xs whitespace-nowrap transition-colors ${
                selectedEventId === evt.id
                  ? "bg-amber-500 text-black font-semibold"
                  : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {evt.location?.name.split(" ")[0]}
            </button>
          ))}
          {eventsWithCoords.length > 4 && (
            <span className="text-gray-400 whitespace-nowrap">
              +{eventsWithCoords.length - 4} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}
