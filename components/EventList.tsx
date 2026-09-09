import { Event } from "@/types/event";
import EventCard from "@/components/EventCard";

interface EventListProps {
  events: Event[];
  isLoading?: boolean;
  query?: string;
  hasError?: boolean;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  selectedEventId?: string;
  hoveredEventId?: string;
  onSelectEvent?: (eventId: string) => void;
  onHoverEvent?: (eventId: string | undefined) => void;
}

export default function EventList({
  events,
  isLoading = false,
  query = "",
  hasError = false,
  hasActiveFilters = false,
  onClearFilters,
  selectedEventId,
  hoveredEventId,
  onSelectEvent,
  onHoverEvent,
}: EventListProps) {
  // Keep the previous result set on screen while a new search is in flight so
  // the list and map don't flash empty. First load still needs a placeholder.
  if (isLoading && events.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500 dark:text-gray-400">
        <p className="text-base">Searching Purdue events...</p>
      </div>
    );
  }

  // Parent already shows the error banner + Retry; don't also say "no events".
  if (events.length === 0) {
    if (hasError) return null;
    return (
      <div className="py-12 text-center text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-800 rounded-xl p-8">
        <p className="text-base font-medium">No events found</p>
        {query ? (
          <p className="text-sm mt-1">
            No events matched &ldquo;{query}&rdquo;.
            {hasActiveFilters
              ? " Try widening your filters or a different search."
              : " Try a different search term."}
          </p>
        ) : hasActiveFilters ? (
          <p className="text-sm mt-1">No events match your current filters.</p>
        ) : (
          <p className="text-sm mt-1">No events currently available.</p>
        )}
        {hasActiveFilters && onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="mt-4 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-sm font-semibold cursor-pointer"
          >
            Clear all filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 gap-4"
      aria-busy={isLoading}
    >
      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          isSelected={event.id === selectedEventId}
          isHovered={event.id === hoveredEventId}
          onSelect={onSelectEvent}
          onHover={onHoverEvent}
        />
      ))}
    </div>
  );
}
