import type { Event } from "@/types/event";

/** Calibrated against the live corpus: useful matches reach 0.59; generic noise begins near 0.63. */
export const SEMANTIC_ADMISSION_DISTANCE = 0.6;

const TERM_EXPANSIONS: Record<string, string[]> = {
  ai: ["ai", "artificial intelligence", "machine learning", "ml", "data science"],
  social: [
    "social",
    "socials",
    "networking",
    "mixer",
    "meetup",
    "meet and greet",
    "reception",
    "hangout",
    "game night",
    "trivia night",
    "social hour",
    "cookout",
    "block party",
  ],
  entrepreneurship: [
    "entrepreneur",
    "entrepreneurship",
    "startup",
    "startups",
    "founder",
    "venture",
    "pitch",
    "innovation",
  ],
  networking: ["networking", "network", "mixer", "social", "meetup", "career fair"],
  ml: ["ml", "machine learning", "ai"],
  startup: [
    "startup",
    "startups",
    "entrepreneur",
    "entrepreneurship",
    "founder",
    "venture",
    "pitch",
    "innovation",
  ],
  startups: [
    "startup",
    "startups",
    "entrepreneur",
    "entrepreneurship",
    "founder",
    "venture",
    "pitch",
    "innovation",
  ],
  hackathon: ["hackathon", "hackathons", "hacking", "hack"],
  cs: ["cs", "computer science"],
  food: ["food", "lunch", "dinner", "boba", "snack", "refreshments", "luncheon"],
  free: ["free", "complimentary", "no-cost", "no cost"],
  robotics: ["robotics", "robot", "autonomous", "automation", "drone"],
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
  "near", "nearby", "around", "close", "next", "beside", "me", "about",
  "any", "some", "find", "show", "search", "looking", "want", "get",
  "something", "anything", "stuff", "happening", "going", "there", "here",
]);

/** Joins the previous topic into the same OR-group ("startups or AI"). */
const OR_TOKENS = new Set(["or", "either"]);

/**
 * Multi-word topics collapsed to a single token so OR/AND grouping stays
 * token-aligned. The collapsed token must exist in TERM_EXPANSIONS.
 */
const PHRASE_COLLAPSES: [RegExp, string][] = [
  [/\bartificial intelligence\b/g, "ai"],
  [/\bmachine learning\b/g, "ml"],
  [/\bcomputer science\b/g, "cs"],
  [/\bdata science\b/g, "ai"],
];

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

/**
 * Terms whose plain substring match produces false positives.
 * "social" must not fire on "social sciences" / "social media" / "social work".
 */
const TERM_MATCHERS: Record<string, RegExp> = {
  social:
    /\bsocials?\b(?!\s*(?:science|sciences|scientist|work|worker|media|security|studies|justice|policy))/i,
};

function termMatchesHay(term: string, hay: string): boolean {
  const matcher = TERM_MATCHERS[term];
  if (matcher) return matcher.test(hay);

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
  /**
   * Topic terms grouped by boolean intent: groups are AND-ed, terms inside a
   * group are OR-ed. "social events about startups or AI" yields
   * [[social…], [startup…, ai…]] → social AND (startup OR AI).
   */
  topicGroups: string[][];
  formatTerms: string[];
  hasTopicTerms: boolean;
  hasContentIntent: boolean;
}

/** Collapse multi-word topics to one token so OR/AND grouping stays aligned. */
function collapsePhrases(normalized: string): string {
  let out = ` ${normalized} `;
  for (const [pattern, token] of PHRASE_COLLAPSES) {
    out = out.replace(pattern, token);
  }
  return out.trim();
}

/** Split content into AND/OR topic groups, format terms, and general intent. */
export function analyzeQueryTerms(query: string): QueryTermBuckets {
  const normalized = collapsePhrases(normalizeContentQuery(query));
  const topicTerms = new Set<string>();
  const formatTerms = new Set<string>();
  const topicGroups: string[][] = [];
  let contentTokenCount = 0;
  let joinPrevious = false;

  for (const token of tokenize(normalized)) {
    if (OR_TOKENS.has(token)) {
      joinPrevious = topicGroups.length > 0;
      continue;
    }
    if (STOPWORDS.has(token)) continue;

    contentTokenCount++;

    if (FORMAT_TERMS.has(token)) {
      formatTerms.add(token);
      continue;
    }
    if (GENERIC_INTENT_TERMS.has(token)) continue;

    const expansions = TERM_EXPANSIONS[token] ?? [token];
    expansions.forEach((term) => topicTerms.add(term));

    if (joinPrevious) {
      topicGroups[topicGroups.length - 1].push(...expansions);
    } else {
      topicGroups.push([...expansions]);
    }
    joinPrevious = false;
  }

  return {
    topicTerms: Array.from(topicTerms),
    topicGroups: topicGroups.map((group) => Array.from(new Set(group))),
    formatTerms: Array.from(formatTerms),
    hasTopicTerms: topicGroups.length > 0,
    hasContentIntent:
      contentTokenCount > 0 || topicGroups.length > 0 || formatTerms.size > 0,
  };
}

/**
 * The text actually sent to Typesense: original wording minus filler, so the
 * embedding and keyword sides both see topic words only ("social startups ai")
 * instead of "social events about startups or AI near Lawson".
 */
export function buildSearchQueryText(query: string): string {
  const normalized = collapsePhrases(normalizeContentQuery(query));
  const kept = tokenize(normalized).filter(
    (token) => !STOPWORDS.has(token) && !OR_TOKENS.has(token)
  );
  return kept.length > 0 ? kept.join(" ") : "";
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

function categoryText(event: Event): string {
  return (event.categories ?? []).join(" ").toLowerCase();
}

/** True when an event has direct lexical evidence for the content query. */
export function eventMatchesContentQuery(event: Event, query: string): boolean {
  const { topicGroups, formatTerms, hasTopicTerms } = analyzeQueryTerms(query);
  const hay = searchableText(event);
  if (hasTopicTerms) {
    // Every AND-group must be satisfied by at least one of its OR-terms.
    return topicGroups.every((group) =>
      group.some((term) => termMatchesHay(term, hay))
    );
  }
  return formatTerms.some((term) => termMatchesHay(term, hay));
}

/**
 * Ranking signal: how strongly an event matches the content intent.
 * Category hits count double — a Localist "Entrepreneurship" tag is stronger
 * evidence than the same word buried in a description.
 */
export function scoreContentMatch(event: Event, query: string): number {
  const { topicGroups, formatTerms } = analyzeQueryTerms(query);
  if (topicGroups.length === 0 && formatTerms.length === 0) return 0;

  const hay = searchableText(event);
  const categories = categoryText(event);
  const title = (event.title ?? "").toLowerCase();
  let score = 0;

  for (const group of topicGroups) {
    const matched = group.filter((term) => termMatchesHay(term, hay));
    if (matched.length === 0) continue;
    score += 2;
    if (matched.some((term) => termMatchesHay(term, categories))) score += 2;
    if (matched.some((term) => termMatchesHay(term, title))) score += 1;
  }

  for (const term of formatTerms) {
    if (termMatchesHay(term, hay)) score += 1;
  }

  return score;
}

export interface RelevanceMetadata {
  textMatch?: number;
  vectorDistance?: number;
}

/**
 * Content gate.
 *
 * - Browse queries (no text) are unrestricted.
 * - Multi-topic queries ("social … startups or AI") require every AND-group to
 *   have lexical evidence: weak semantic similarity may not fill the list.
 * - Single-topic queries also admit a strong semantic hit, so "AI" can still
 *   surface a "Machine Intelligence" talk that uses none of the query words.
 */
export function eventPassesContentRelevance(
  event: Event,
  query: string,
  metadata?: RelevanceMetadata
): boolean {
  if (!query.trim()) return true;

  const { topicGroups } = analyzeQueryTerms(query);

  if (topicGroups.length > 0) {
    if (eventMatchesContentQuery(event, query)) return true;
    if (topicGroups.length > 1) return false;
    return (
      typeof metadata?.vectorDistance === "number" &&
      metadata.vectorDistance <= SEMANTIC_ADMISSION_DISTANCE
    );
  }

  // Format-only / generic intent: keyword evidence or a strong semantic hit.
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
