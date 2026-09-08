import { Event } from "@/types/event";

interface EventCardProps {
  event: Event;
}

export default function EventCard({ event }: EventCardProps) {
  const formattedDate = new Date(event.startsAt).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <article className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          {event.organization && (
            <p className="text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400 font-semibold mb-1">
              {event.organization}
            </p>
          )}
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight">
            {event.title}
          </h3>
        </div>
        <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
          {event.source}
        </span>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
        {event.description}
      </p>

      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-gray-700 dark:text-gray-300">Time:</span>
          <span>{formattedDate}</span>
        </div>
        {event.location?.name && (
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-gray-700 dark:text-gray-300">Location:</span>
            <span>{event.location.name}</span>
          </div>
        )}
        {event.distanceMiles !== undefined && (
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-gray-700 dark:text-gray-300">Distance:</span>
            <span>{event.distanceMiles} miles away</span>
          </div>
        )}
      </div>

      {event.categories && event.categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {event.categories.map((category) => (
            <span
              key={category}
              className="text-xs px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-medium"
            >
              {category}
            </span>
          ))}
        </div>
      )}

      {/* "Why this result?" Factual Reasons */}
      {event.reasons && event.reasons.length > 0 && (
        <div className="mt-1 pt-2 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
            Why this result:
          </p>
          <div className="flex flex-wrap gap-1">
            {event.reasons.map((reason, index) => (
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

      {event.url && (
        <div className="pt-1">
          <a
            href={event.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1 font-medium"
          >
            View event details &rarr;
          </a>
        </div>
      )}
    </article>
  );
}
