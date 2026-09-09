"use client";

/**
 * ExampleQueries
 * Owned by: Frontend developer
 *
 * One-click "golden" demo queries. These are the queries we rehearse and
 * demo — keep them phrased in natural language so they show off hybrid
 * (meaning + keyword) search, not just keyword matching.
 */

export const EXAMPLE_QUERIES: string[] = [
  "something social about startups or AI near Lawson",
  "AI talk tonight",
  "free food today",
  "live music this weekend",
  "meet people building companies",
];

interface ExampleQueriesProps {
  onSelect: (query: string) => void;
  activeQuery?: string;
  disabled?: boolean;
}

export default function ExampleQueries({
  onSelect,
  activeQuery,
  disabled = false,
}: ExampleQueriesProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
        Try:
      </span>
      {EXAMPLE_QUERIES.map((q) => {
        const isActive = activeQuery?.trim().toLowerCase() === q.toLowerCase();
        return (
          <button
            key={q}
            type="button"
            disabled={disabled}
            aria-pressed={isActive}
            onClick={() => onSelect(q)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
              isActive
                ? "bg-amber-500 border-amber-500 text-black font-semibold"
                : "bg-white dark:bg-stone-900 border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:border-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
            }`}
          >
            {q}
          </button>
        );
      })}
    </div>
  );
}
