import type { Event } from "@/types/event";

/** Calibrated against the live corpus: useful matches reach 0.59; generic noise begins near 0.63. */
export const SEMANTIC_ADMISSION_DISTANCE = 0.6;

const TERM_EXPANSIONS: Record<string, string[]> = {
  ai: ["ai", "artificial intelligence", "machine learning", "ml", "data science"],
  ml: ["ml", "machine learning", "ai"],
  startup: ["startup", "startups", "entrepreneur", "entrepreneurship", "founder"],
  startups: ["startup", "startups", "entrepreneur", "entrepreneurship", "founder"],
  hackathon: ["hackathon", "hackathons", "hacking", "hack"],
  cs: ["cs", "computer science"],
  food: ["food", "lunch", "dinner", "boba", "snack", "refreshments", "luncheon"],
  free: ["free", "complimentary", "no-cost", "no cost"],
  robotics: ["robotics", "robot", "autonomous", "automation", "drone"],
};

const PHRASE_EXPANSIONS: Record<string, string[]> = {
  "computer science": ["computer science", "cs"],
  "artificial intelligence": ["artificial intelligence", "ai"],
  "machine learning": ["machine learning", "ml", "ai"],
};

const TYPO_VOCABULARY = Array.from(
  new Set([
    ...Object.keys(TERM_EXPANSIONS),
    "entrepreneurship",
    "networking",
    "computer",
    "science",
  ])
).filter((term) => term.length >= 5);

const FORMAT_TERMS = new Set([
  "talk", "talks", "lecture", "lectures", "seminar", "seminars", "workshop",
  "workshops", "series", "overview", "session", "sessions", "meeting",
  "meetings", "panel", "panels", "night", "nights", "show", "shows",
  "presentation", "presentations", "demo", "demos", "class", "classes",
  "course", "courses",
]);

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "of", "for", "to", "in", "on", "at",
  "with", "events", "event", "today", "tonight", "evening", "this", "week",
  "near", "me",
]);

/** These terms describe a semantic intent, but are too generic to be lexical gates. */
const GENERIC_INTENT_TERMS = new Set([
  "meet", "people", "building", "build", "companies", "company", "things",
]);

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9+]+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 1);
}

function termMatchesHay(term: string, hay: string): boolean {
  if (term.length <= 2) {
    return new RegExp(
      `\\b${term.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\b`,
      "i"
    ).test(hay);
  }
  return hay.includes(term);
}

function isOneEditOrTransposition(input: string, candidate: string): boolean {
  if (input === candidate) return false;

  if (input.length === candidate.length) {
    const differences: number[] = [];
    for (let index = 0; index < input.length; index++) {
      if (input[index] !== candidate[index]) differences.push(index);
    }
    if (differences.length === 1) return true;
    if (differences.length !== 2 || differences[1] !== differences[0] + 1) {
      return false;
    }
    const [first, second] = differences;
    return input[first] === candidate[second] && input[second] === candidate[first];
  }

  if (Math.abs(input.length - candidate.length) !== 1) return false;
  const longer = input.length > candidate.length ? input : candidate;
  const shorter = input.length > candidate.length ? candidate : input;
  let longerIndex = 0;
  let shorterIndex = 0;
  let skipped = false;
  while (longerIndex < longer.length && shorterIndex < shorter.length) {
    if (longer[longerIndex] === shorter[shorterIndex]) {
      longerIndex++;
      shorterIndex++;
    } else if (!skipped) {
      skipped = true;
      longerIndex++;
    } else {
      return false;
    }
  }
  return true;
}

/** Correct only unambiguous one-edit domain-topic typos; names and places stay untouched. */
export function normalizeContentQuery(query: string): string {
  return tokenize(query)
    .map((token) => {
      if (token.length < 5 || TYPO_VOCABULARY.includes(token)) return token;
      const matches = TYPO_VOCABULARY.filter((candidate) =>
        isOneEditOrTransposition(token, candidate)
      );
      return matches.length === 1 ? matches[0] : token;
    })
    .join(" ");
}

/**
 * Translate one common campus-discovery paraphrase into the concrete topic
 * language that Purdue events actually use. This remains deterministic and is
 * deliberately narrower than a general natural-language/LLM rewrite.
 */
export function expandSemanticIntent(query: string): string {
  const normalized = normalizeContentQuery(query);
  if (/\b(?:build|building) compan(?:y|ies)\b/i.test(normalized)) {
    return `${normalized} startup entrepreneurship networking`;
  }
  return normalized;
}

export interface QueryTermBuckets {
  topicTerms: string[];
  formatTerms: string[];
  hasTopicTerms: boolean;
  hasContentIntent: boolean;
}

/** Split content into phrase-aware topic, format, and semantic-only intent. */
export function analyzeQueryTerms(query: string): QueryTermBuckets {
  const normalized = normalizeContentQuery(query);
  const topicTerms = new Set<string>();
  const formatTerms = new Set<string>();
  let remaining = normalized;

  for (const [phrase, expansions] of Object.entries(PHRASE_EXPANSIONS)) {
    if (remaining.includes(phrase)) {
      expansions.forEach((term) => topicTerms.add(term));
      remaining = remaining.replaceAll(phrase, " ");
    }
  }

  const contentTokens = tokenize(remaining).filter((term) => !STOPWORDS.has(term));
  for (const token of contentTokens) {
    if (FORMAT_TERMS.has(token)) {
      formatTerms.add(token);
    } else if (!GENERIC_INTENT_TERMS.has(token)) {
      (TERM_EXPANSIONS[token] ?? [token]).forEach((term) => topicTerms.add(term));
    }
  }

  return {
    topicTerms: Array.from(topicTerms),
    formatTerms: Array.from(formatTerms),
    hasTopicTerms: topicTerms.size > 0,
    hasContentIntent: contentTokens.length > 0 || topicTerms.size > 0 || formatTerms.size > 0,
  };
}

function searchableText(event: Event): string {
  return [
    event.title,
    event.description,
    event.organization,
    event.locationName,
    event.location?.name,
    ...(event.categories ?? []),
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();
}

/** True when an event has direct lexical evidence for the content query. */
export function eventMatchesContentQuery(event: Event, query: string): boolean {
  const { topicTerms, formatTerms, hasTopicTerms } = analyzeQueryTerms(query);
  const hay = searchableText(event);
  if (hasTopicTerms) return topicTerms.some((term) => termMatchesHay(term, hay));
  return formatTerms.some((term) => termMatchesHay(term, hay));
}

export interface RelevanceMetadata {
  textMatch?: number;
  vectorDistance?: number;
}

/** Admit lexical/typo evidence or a strong semantic hit; browse queries are unrestricted. */
export function eventPassesContentRelevance(
  event: Event,
  query: string,
  metadata?: RelevanceMetadata
): boolean {
  if (!query.trim()) return true;
  if (typeof metadata?.textMatch === "number" && metadata.textMatch > 0) return true;
  if (eventMatchesContentQuery(event, query)) return true;
  return (
    typeof metadata?.vectorDistance === "number" &&
    metadata.vectorDistance <= SEMANTIC_ADMISSION_DISTANCE
  );
}

export function applyContentRelevance<T extends Event>(
  events: T[],
  query: string,
  metadata: RelevanceMetadata[] = []
): T[] {
  return events.filter((event, index) =>
    eventPassesContentRelevance(event, query, metadata[index])
  );
}
