import { Event } from "@/types/event";
import EventCard from "@/components/EventCard";

interface EventListProps {
  events: Event[];
  isLoading?: boolean;
  query?: string;
}

export default function EventList({
  events,
  isLoading = false,
  query = "",
}: EventListProps) {
  if (isLoading) {
    return (
      <div className="py-12 text-center text-gray-500 dark:text-gray-400">
        <p className="text-base">Searching Purdue events...</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-800 rounded-xl p-8">
        <p className="text-base font-medium">No events found</p>
        {query ? (
          <p className="text-sm mt-1">
            No events matched &ldquo;{query}&rdquo;. Try another search term or clear the filter.
          </p>
        ) : (
          <p className="text-sm mt-1">No events currently available.</p>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
