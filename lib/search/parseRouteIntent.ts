/**
 * Deterministic RouteScout intent parser.
 * Extracts origin/destination from phrases like:
 *   "from X to Y"
 *   "while walking from X to Y"
 *   "on my way from X to Y"
 * Leaves a residual content query (e.g. "AI") for hybrid search.
 */

export interface ParsedRouteIntent {
  /** True when a from→to route phrase was found. */
  isRouteQuery: boolean;
  originName?: string;
  destinationName?: string;
  /**
   * Remaining search text after stripping the route phrase.
   * Empty string means browse-style (`*`) for pure route discovery.
   */
  contentQuery: string;
}

const ROUTE_PHRASE =
  /\b(?:(?:while|when)\s+)?(?:walking\s+)?(?:on\s+(?:my|the)\s+way\s+)?from\s+(.+?)\s+to\s+(.+?)\s*$/i;

/** Filler words that are not real search intent once the route is extracted. */
const CONTENT_STOP =
  /^(?:events?|event|find|show|me|nearby|along|the|route|walk|walking|way)?$/i;

function cleanPlaceName(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .replace(/[?.!,;:]+$/g, "")
    .trim();
}

function cleanContentQuery(raw: string): string {
  let text = raw.replace(/\s+/g, " ").trim();
  // Drop leading filler like "events" / "find me"
  text = text.replace(/^(?:find(?:\s+me)?|show(?:\s+me)?|search(?:\s+for)?)\s+/i, "");
  text = text.replace(/\b(?:events?|along\s+(?:the\s+)?(?:way|route)|nearby)\b/gi, " ");
  text = text.replace(/\s+/g, " ").trim();
  if (!text || CONTENT_STOP.test(text)) {
    return "";
  }
  return text;
}

/**
 * Parse a user query for RouteScout intent.
 * Non-route queries return `{ isRouteQuery: false, contentQuery: original }`.
 */
export function parseRouteIntent(query: string): ParsedRouteIntent {
  const trimmed = (query ?? "").trim();
  if (!trimmed) {
    return { isRouteQuery: false, contentQuery: "" };
  }

  const match = trimmed.match(ROUTE_PHRASE);
  if (!match) {
    return { isRouteQuery: false, contentQuery: trimmed };
  }

  const originName = cleanPlaceName(match[1] ?? "");
  const destinationName = cleanPlaceName(match[2] ?? "");
  if (!originName || !destinationName) {
    return { isRouteQuery: false, contentQuery: trimmed };
  }

  const before = trimmed.slice(0, match.index ?? 0);
  const contentQuery = cleanContentQuery(before);

  return {
    isRouteQuery: true,
    originName,
    destinationName,
    contentQuery,
  };
}
