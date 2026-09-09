/**
 * Deterministic "near <place>" intent parser.
 *
 * Extracts an explicit location constraint from phrases like:
 *   "AI events near Lawson"
 *   "social events around the Union"
 *   "free food close to Krach"
 *
 * The place phrase is REMOVED from the content query: "near Lawson" is a hard
 * geo filter (filters.center + filters.radiusMiles), never semantic search text.
 */

/** Default hard radius applied to an NL "near <place>" constraint. */
export const NEAR_RADIUS_MILES = 0.75;

export interface ParsedNearIntent {
  /** True when a resolvable-looking "near <place>" phrase was found. */
  isNearQuery: boolean;
  /** Raw text after the proximity word — may include trailing non-place words. */
  placeTail?: string;
  /** Query text preceding the proximity phrase. */
  contentQuery: string;
}

// "by <x>" is deliberately excluded: "a talk by the president" is not a place.
const NEAR_PHRASE =
  /\b(?:near(?:by)?|nearest\s+to|around|close\s+to|closest\s+to|next\s+to|beside)\s+(.+)$/i;

/**
 * "near me" / "around campus" are not building lookups — leave them alone.
 * Anchored to the whole tail so "near the Purdue Memorial Union" still resolves.
 */
const NON_PLACE_TAIL =
  /^(?:me|us|you|here|there|my\s+location|current\s+location|campus|purdue|purdue\s+campus|town|anywhere|somewhere|noon|midnight|lunch|lunchtime|dinner|dinnertime|breakfast|now|then|today|tomorrow|tonight)$/i;

/** "around 5pm" / "close to 6" is a time phrase, not a location constraint. */
const TIME_TAIL = /^\d/;

function clean(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .replace(/^[\s,;:-]+/, "")
    .replace(/[\s?.!,;:]+$/, "")
    .trim();
}

/**
 * Parse a proximity phrase out of a query.
 * Non-proximity queries return `{ isNearQuery: false, contentQuery: original }`.
 */
export function parseNearIntent(query: string): ParsedNearIntent {
  const trimmed = clean(query ?? "");
  if (!trimmed) return { isNearQuery: false, contentQuery: "" };

  const match = trimmed.match(NEAR_PHRASE);
  if (!match) return { isNearQuery: false, contentQuery: trimmed };

  const placeTail = clean(match[1] ?? "").replace(/^the\s+/i, "");
  if (!placeTail || NON_PLACE_TAIL.test(placeTail) || TIME_TAIL.test(placeTail)) {
    return { isNearQuery: false, contentQuery: trimmed };
  }

  return {
    isNearQuery: true,
    placeTail,
    contentQuery: clean(trimmed.slice(0, match.index ?? 0)),
  };
}
