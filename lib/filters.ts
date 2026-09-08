import { SearchFilters } from "@/types/search";

/**
 * Filter state + translation to the frozen `SearchFilters` contract.
 * Owned by: Frontend developer
 *
 * The UI keeps a friendlier shape (time presets, a "near me" toggle) and this
 * module converts it into the exact fields `POST /api/search` expects.
 */

export type TimePreset = "any" | "next2h" | "today" | "weekend";

export const TIME_PRESETS: { id: TimePreset; label: string }[] = [
  { id: "any", label: "Any time" },
  { id: "next2h", label: "Next 2 hours" },
  { id: "today", label: "Today" },
  { id: "weekend", label: "This weekend" },
];

/** Purdue campus center — fallback when geolocation is denied or unavailable. */
export const CAMPUS_CENTER = { lat: 40.4237, lng: -86.9212 };

export const RADIUS_OPTIONS = [0.25, 0.5, 1, 2] as const;

/** Seed list so the category picker is useful before any results come back. */
export const DEFAULT_CATEGORIES = [
  "AI",
  "Tech",
  "Entrepreneurship",
  "Social",
  "Music",
  "Engineering",
  "Workshops",
  "Food",
  "Networking",
  "Campus Life",
];

export interface FilterState {
  time: TimePreset;
  nearMe: boolean;
  /** Resolved once geolocation succeeds (or the campus fallback is applied). */
  center?: { lat: number; lng: number };
  radiusMiles: number;
  categories: string[];
  freeOnly: boolean;
}

export const DEFAULT_FILTER_STATE: FilterState = {
  time: "any",
  nearMe: false,
  radiusMiles: 1,
  categories: [],
  freeOnly: false,
};

/** Epoch-ms window for a time preset. Empty object means "no time bounds". */
export function timePresetToRange(
  preset: TimePreset,
  now: Date = new Date()
): { startAfter?: number; startBefore?: number } {
  const nowMs = now.getTime();

  switch (preset) {
    case "next2h":
      return { startAfter: nowMs, startBefore: nowMs + 2 * 60 * 60 * 1000 };

    case "today": {
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      return { startAfter: nowMs, startBefore: endOfDay.getTime() };
    }

    case "weekend": {
      const day = now.getDay(); // 0 = Sun … 6 = Sat
      const saturday = new Date(now);
      if (day === 0) {
        saturday.setDate(now.getDate() - 1); // already in the weekend
      } else if (day !== 6) {
        saturday.setDate(now.getDate() + (6 - day));
      }
      saturday.setHours(0, 0, 0, 0);

      const monday = new Date(saturday);
      monday.setDate(saturday.getDate() + 2);
      monday.setHours(0, 0, 0, 0);

      return {
        startAfter: Math.max(saturday.getTime(), nowMs),
        startBefore: monday.getTime(),
      };
    }

    case "any":
    default:
      return {};
  }
}

/** Convert UI state into the request contract. Returns undefined when nothing is set. */
export function buildSearchFilters(state: FilterState): SearchFilters | undefined {
  const filters: SearchFilters = {};

  const { startAfter, startBefore } = timePresetToRange(state.time);
  if (startAfter !== undefined) filters.startAfter = startAfter;
  if (startBefore !== undefined) filters.startBefore = startBefore;

  if (state.nearMe) {
    filters.center = state.center ?? CAMPUS_CENTER;
    filters.radiusMiles = state.radiusMiles;
  }

  if (state.categories.length > 0) filters.categories = state.categories;
  if (state.freeOnly) filters.freeOnly = true;

  return Object.keys(filters).length > 0 ? filters : undefined;
}

export function countActiveFilters(state: FilterState): number {
  return (
    (state.time !== "any" ? 1 : 0) +
    (state.nearMe ? 1 : 0) +
    state.categories.length +
    (state.freeOnly ? 1 : 0)
  );
}
