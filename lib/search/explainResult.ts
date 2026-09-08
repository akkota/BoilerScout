import { TypesenseEventDocument } from "@/lib/typesense/schema";

/**
 * Typesense search hit metadata passed from search execution
 */
export interface SearchHighlight {
  field?: string;
  snippet?: string;
  matched_tokens?: string[];
}

export interface TypesenseHitMeta {
  highlights?: SearchHighlight[];
  text_match?: number;
  vector_distance?: number;
}

export interface ExplainResultParams {
  doc: TypesenseEventDocument;
  hit?: TypesenseHitMeta;
  query?: string;
  distanceMiles?: number;
  selectedCategories?: string[];
}

/**
 * Generates factual "Why this result?" reasons without hallucinated percentages.
 * Adheres to Typesense metadata, time facts, and geo proximity.
 *
 * Possible output reasons include:
 * - "Strong search match"
 * - "Semantic match"
 * - "Starts soon"
 * - "Nearby"
 * - "Matches selected category"
 * - "Free event"
 */
export function explainResult({
  doc,
  hit,
  query,
  distanceMiles,
  selectedCategories,
}: ExplainResultParams): string[] {
  const reasons: string[] = [];
  const normalizedQuery = query?.trim().toLowerCase() || "";

  // 1. Search Relevance (Keyword / Exact match)
  const highlights = hit?.highlights || [];
  const matchedFields = highlights
    .map((h) => h.field)
    .filter((f): f is string => typeof f === "string");

  const isTitleMatch =
    matchedFields.includes("title") ||
    (normalizedQuery.length > 2 && doc.title.toLowerCase().includes(normalizedQuery));

  if (isTitleMatch) {
    reasons.push("Strong search match");
  } else if (matchedFields.includes("description") || (hit?.text_match && hit.text_match > 0)) {
    reasons.push("Strong search match");
  }

  // 2. Semantic Vector Match (Typesense auto-embedding vector distance)
  // Distance < 0.65 represents a strong conceptual/semantic affinity in MiniLM-L6-v2 space
  const vectorDistance = hit?.vector_distance;
  if (typeof vectorDistance === "number" && vectorDistance < 0.68) {
    reasons.push("Semantic match");
  }

  // 3. Proximity / Geo Proximity
  if (distanceMiles !== undefined) {
    if (distanceMiles <= 1.0) {
      reasons.push("Nearby");
    } else if (distanceMiles <= 2.5) {
      reasons.push(`${distanceMiles} miles away`);
    }
  }

  // 4. Time Awareness
  const now = Date.now();
  const startsAt = doc.starts_at;
  const diffMs = startsAt - now;

  // Starts within 2 hours
  if (diffMs > 0 && diffMs <= 2 * 60 * 60 * 1000) {
    reasons.push("Starts soon");
  } else if (diffMs > 0 && diffMs <= 24 * 60 * 60 * 1000) {
    reasons.push("Happening today");
  } else if (diffMs > 0 && diffMs <= 48 * 60 * 60 * 1000) {
    reasons.push("Happening tomorrow");
  }

  // 5. Category Match
  if (selectedCategories && selectedCategories.length > 0) {
    const hasCategoryMatch = doc.categories?.some((c) =>
      selectedCategories.some((sel) => sel.toLowerCase() === c.toLowerCase())
    );
    if (hasCategoryMatch) {
      reasons.push("Matches selected category");
    }
  } else if (normalizedQuery) {
    const matchedCat = doc.categories?.find((c) =>
      c.toLowerCase().includes(normalizedQuery) || normalizedQuery.includes(c.toLowerCase())
    );
    if (matchedCat) {
      reasons.push(`Matches ${matchedCat}`);
    }
  }

  // 6. Free Admission
  if (doc.free === true) {
    reasons.push("Free event");
  }

  // 7. Fallback if no specific condition triggered
  if (reasons.length === 0) {
    if (normalizedQuery) {
      reasons.push("Campus discovery match");
    } else {
      reasons.push("Upcoming campus event");
    }
  }

  // Return deduplicated list capped to 3 crisp reasons
  return Array.from(new Set(reasons)).slice(0, 3);
}
