/**
 * Cleaning and Deduplication Utilities for Purdue Data
 * Owned by: Backend / Typesense developer
 */

const HTML_ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
  "&rsquo;": "'",
  "&lsquo;": "'",
  "&rdquo;": '"',
  "&ldquo;": '"',
  "&ndash;": "–",
  "&mdash;": "—",
  "&bull;": "•",
  "&hellip;": "…",
  "&copy;": "©",
  "&reg;": "®",
  "&trade;": "™",
  "&cent;": "¢",
  "&pound;": "£",
  "&yen;": "¥",
  "&euro;": "€",
  "&frac12;": "1/2",
  "&frac14;": "1/4",
  "&frac34;": "3/4",
};

/**
 * Decodes standard and numerical HTML entities into utf-8 characters.
 */
export function decodeHtmlEntities(raw?: string): string {
  if (!raw) return "";

  let result = raw;

  // Replace common named entities
  for (const [entity, replacement] of Object.entries(HTML_ENTITY_MAP)) {
    if (result.includes(entity)) {
      result = result.replaceAll(entity, replacement);
    }
  }

  // Replace decimal numerical entities &#123;
  result = result.replace(/&#(\d+);/g, (_, dec) => {
    try {
      return String.fromCharCode(parseInt(dec, 10));
    } catch {
      return "";
    }
  });

  // Replace hexadecimal entities &#x1a;
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
    try {
      return String.fromCharCode(parseInt(hex, 16));
    } catch {
      return "";
    }
  });

  return result;
}

/**
 * Strips HTML tags cleanly, converts block elements to spaces, and normalizes whitespace.
 */
export function stripHtml(raw?: string): string {
  if (!raw) return "";

  const decoded = decodeHtmlEntities(raw);

  // Replace line breaks and paragraph ends with whitespace
  const withSpaces = decoded
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, " ")
    .replace(/<[^>]*>/g, " ");

  // Normalize excessive spaces and clean up
  return withSpaces.replace(/\s+/g, " ").trim();
}

/**
 * Cleans event or venue title:
 * - Decodes HTML entities
 * - Strips any residual HTML tags
 * - Fixes formatting quirks like double spaces ("Soccer -  Purdue" -> "Soccer - Purdue")
 * - Trims extraneous punctuation
 */
export function cleanTitle(raw?: string): string {
  if (!raw) return "";

  let title = stripHtml(raw);

  // Collapse spaces around hyphens: " -  " -> " - "
  title = title.replace(/\s*-\s+/g, " - ");

  // Collapse multiple whitespace
  title = title.replace(/\s+/g, " ").trim();

  return title;
}

/**
 * Known organization canonicalization map for common variations found in Purdue events
 */
const ORG_CANONICAL_MAP: Record<string, string> = {
  "daniels school of business": "Mitch Daniels School of Business",
  "mitch daniels school of business": "Mitch Daniels School of Business",
  "mitch daniels school of business department of strategic management": "Mitch Daniels School of Business",
  "krannert school of management": "Mitch Daniels School of Business",
  "krannert": "Mitch Daniels School of Business",
  "center for career opportunities": "Center for Career Opportunities",
  "center for career opportunities (cco)": "Center for Career Opportunities",
  "cco": "Center for Career Opportunities",
  "asian american and asian resource and cultural center": "Asian American and Asian Resource and Cultural Center",
  "asian american and asian resource and cultural center, counseling and psychological services": "Asian American and Asian Resource and Cultural Center",
  "black cultural center": "Black Cultural Center",
  "latino cultural center": "Latino Cultural Center",
  "native american educational and cultural center": "Native American Educational and Cultural Center",
  "purdue student union board": "Purdue Student Union Board",
  "purdue research foundation": "Purdue Research Foundation",
  "purdue innovates": "Purdue Innovates",
  "purdue owl": "Purdue Online Writing Lab (OWL)",
  "office of the provost": "Office of the Provost",
  "provost": "Office of the Provost",
  "purdue convocations": "Purdue Convocations",
  "purdue musical organizations": "Purdue Musical Organizations",
  "burton d. morgan center for entrepreneurship": "Burton D. Morgan Center for Entrepreneurship",
  "burton d. morgan ctr for entrepreneurshp": "Burton D. Morgan Center for Entrepreneurship",
};

/**
 * Normalizes organization name:
 * - Filters out sentences entered in the unit field (e.g. "This talk is co-sponsored by...")
 * - Strips whitespace and decodes entities
 * - Maps known variations to canonical organization names
 */
export function cleanOrganizationName(raw?: string): string | undefined {
  if (!raw) return undefined;

  const cleaned = stripHtml(raw);
  if (!cleaned || cleaned.length < 2) return undefined;

  // Filter out descriptive sentences or paragraphs entered in unit fields
  if (
    /^(this talk is|in partnership with|co-sponsored by|sponsored by|presented by)/i.test(cleaned) ||
    cleaned.length > 80 && cleaned.includes(".")
  ) {
    return undefined;
  }

  const lower = cleaned.toLowerCase().trim();
  if (ORG_CANONICAL_MAP[lower]) {
    return ORG_CANONICAL_MAP[lower];
  }

  return cleaned;
}

/**
 * Normalizes a list of category tags:
 * - Decodes entities
 * - Trims whitespace
 * - Deduplicates case-insensitively while preserving readable casing
 */
export function normalizeCategories(rawCategories: (string | undefined | null)[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const cat of rawCategories) {
    if (!cat) continue;
    const clean = stripHtml(cat);
    if (!clean) continue;

    const lower = clean.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      result.push(clean);
    }
  }

  return result;
}

/**
 * Deduplicates events based on normalized title and start time.
 * When duplicate events are identified, keeps the highest-quality record
 * (preferring records with coordinates, longer descriptions, images, and richer metadata)
 * and merges categories.
 */
export function deduplicateEvents<
  T extends {
    id: string;
    title: string;
    starts_at: number;
    description?: string;
    location?: [number, number];
    image_url?: string;
    organization?: string;
    categories?: string[];
  }
>(events: T[]): { uniqueEvents: T[]; duplicateCount: number } {
  const map = new Map<string, T>();
  let duplicateCount = 0;

  for (const event of events) {
    const normTitle = event.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .trim();

    // Group within a 30-minute window for identical titles on the same day
    const timeWindow = Math.floor(event.starts_at / (30 * 60 * 1000));
    const dedupKey = `${normTitle}_${timeWindow}`;

    const existing = map.get(dedupKey);
    if (!existing) {
      map.set(dedupKey, { ...event });
    } else {
      duplicateCount++;

      // Score existing vs new event to keep the best one
      const score = (item: T): number => {
        let pts = 0;
        if (item.location && item.location[0] !== 0) pts += 10;
        if (item.description && item.description.length > 50) pts += 5;
        if (item.image_url) pts += 3;
        if (item.organization) pts += 2;
        if (item.categories && item.categories.length > 0) pts += item.categories.length;
        return pts;
      };

      const existingScore = score(existing);
      const currentScore = score(event);

      const winner = currentScore > existingScore ? event : existing;
      const loser = currentScore > existingScore ? existing : event;

      // Merge unique categories from loser into winner
      const mergedCategories = normalizeCategories([
        ...(winner.categories || []),
        ...(loser.categories || []),
      ]);

      const mergedDoc: T = {
        ...winner,
        categories: mergedCategories,
        // Fill in missing fields from loser if winner lacked them
        location: winner.location || loser.location,
        image_url: winner.image_url || loser.image_url,
        organization: winner.organization || loser.organization,
        description:
          (winner.description?.length || 0) >= (loser.description?.length || 0)
            ? winner.description
            : loser.description,
      };

      map.set(dedupKey, mergedDoc);
    }
  }

  return {
    uniqueEvents: Array.from(map.values()),
    duplicateCount,
  };
}
