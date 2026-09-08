import { Event } from "@/types/event";
import { formatEventTime } from "@/lib/format";

interface EventCardProps {
  event: Event;
  isSelected?: boolean;
  isHovered?: boolean;
  onSelect?: (eventId: string) => void;
  onHover?: (eventId: string | undefined) => void;
}

export default function EventCard({
  event,
  isSelected = false,
  isHovered = false,
  onSelect,
  onHover,
}: EventCardProps) {
  const formattedDate = formatEventTime(event.startsAt);
  const categories = (event.categories ?? []).filter((c) => c?.trim());
  const reasons = (event.reasons ?? []).filter((r) => r?.trim());
  const hasDistance =
    typeof event.distanceMiles === "number" && Number.isFinite(event.distanceMiles);
  const hasDetour =
    typeof event.detourMinutes === "number" && Number.isFinite(event.detourMinutes);

  const highlight = isSelected
    ? "border-amber-500 ring-2 ring-amber-400/60 shadow-md"
    : isHovered
      ? "border-amber-400 shadow-md"
      : "border-gray-200 dark:border-gray-800 shadow-sm";

  return (
    <article
      // Anchor for scroll-into-view when a marker is clicked on the map.
      id={`event-${event.id}`}
      onMouseEnter={() => onHover?.(event.id)}
      onMouseLeave={() => onHover?.(undefined)}
      onClick={() => onSelect?.(event.id)}
      className={`border bg-white dark:bg-gray-900 rounded-xl p-5 transition-shadow hover:shadow-md flex flex-col gap-3 scroll-mt-24 cursor-pointer ${highlight}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          {event.organization?.trim() && (
            <p className="text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400 font-semibold mb-1">
              {event.organization}
            </p>
          )}
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight">
            {event.title?.trim() || "Untitled event"}
          </h3>
        </div>
        {event.source?.trim() && (
          <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded shrink-0">
            {event.source}
          </span>
        )}
      </div>

      {event.description?.trim() && (
        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
          {event.description}
        </p>
      )}

      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
        {formattedDate && (
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-gray-700 dark:text-gray-300">Time:</span>
            <span>{formattedDate}</span>
          </div>
        )}
        {event.location?.name?.trim() && (
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-gray-700 dark:text-gray-300">Location:</span>
            <span>{event.location.name}</span>
          </div>
        )}
        {hasDistance && (
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-gray-700 dark:text-gray-300">Distance:</span>
            <span>{event.distanceMiles} miles away</span>
          </div>
        )}
        {hasDetour && (
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-gray-700 dark:text-gray-300">Detour:</span>
            <span>+{event.detourMinutes} min off your route</span>
          </div>
        )}
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {categories.map((category) => (
            <span
              key={category}
              className="text-xs px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-medium"
            >
              {category}
            </span>
          ))}
        </div>
      )}

      {/* "Why this result?" — reasons come from the backend, rendered verbatim */}
      {reasons.length > 0 && (
        <div className="mt-1 pt-2 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
            Why this result:
          </p>
          <div className="flex flex-wrap gap-1">
            {reasons.map((reason, index) => (
              <span
                key={index}
                className="text-[11px] px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              >
                {reason}
              </span>
            ))}
          </div>
        </div>
      )}

      {event.url?.trim() && (
        <div className="pt-1">
          <a
            href={event.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1 font-medium"
          >
            View event details &rarr;
          </a>
        </div>
      )}
    </article>
  );
}
