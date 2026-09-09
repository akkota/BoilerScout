/**
 * Detect tonight / today / this evening in free-text queries and turn them
 * into startAfter / startBefore windows (epoch ms).
 */

export type TimeWordPreset = "today" | "tonight";

export interface ParsedTimeWords {
  preset?: TimeWordPreset;
  /** Query with time phrases removed for Typesense content search. */
  contentQuery: string;
  startAfter?: number;
  startBefore?: number;
}

function endOfLocalDay(now: Date): Date {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * tonight ≈ later today (from max(now, 17:00) through end of day).
 * today / this evening ≈ now through end of day.
 */
export function timeWordsToRange(
  preset: TimeWordPreset,
  now: Date = new Date()
): { startAfter: number; startBefore: number } {
  const nowMs = now.getTime();
  const endMs = endOfLocalDay(now).getTime();

  if (preset === "tonight") {
    const fivePm = new Date(now);
    fivePm.setHours(17, 0, 0, 0);
    return {
      startAfter: Math.max(nowMs, fivePm.getTime()),
      startBefore: endMs,
    };
  }

  return { startAfter: nowMs, startBefore: endMs };
}

/**
 * Parse and strip time words from a query. Does not invent filters when none match.
 */
export function parseTimeWords(
  query: string,
  now: Date = new Date()
): ParsedTimeWords {
  const original = (query ?? "").trim();
  if (!original) {
    return { contentQuery: "" };
  }

  let preset: TimeWordPreset | undefined;
  let contentQuery = original;

  if (/\btonight\b/i.test(contentQuery) || /\bthis\s+evening\b/i.test(contentQuery)) {
    preset = "tonight";
  } else if (/\btoday\b/i.test(contentQuery)) {
    preset = "today";
  }

  contentQuery = contentQuery
    .replace(/\bthis\s+evening\b/gi, " ")
    .replace(/\btonight\b/gi, " ")
    .replace(/\btoday\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!preset) {
    return { contentQuery: contentQuery || original };
  }

  const range = timeWordsToRange(preset, now);
  return {
    preset,
    contentQuery,
    startAfter: range.startAfter,
    startBefore: range.startBefore,
  };
}
