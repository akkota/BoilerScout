/**
 * Purdue West Lafayette building-name / abbreviation → coordinates lookup.
 *
 * Coordinates sourced from OpenStreetMap (Overpass) building footprints /
 * amenity centroids on the West Lafayette campus. Do not invent values.
 *
 * Typesense geopoints use [latitude, longitude].
 */

export interface PurdueBuildingCoords {
  lat: number;
  lng: number;
  /** Canonical building name for debugging / logging */
  name: string;
}

interface BuildingEntry {
  name: string;
  lat: number;
  lng: number;
  /** Lowercase aliases and abbreviations that resolve to this building */
  aliases: string[];
}

/**
 * Core campus buildings frequently used as Localist venues.
 * Aliases include official codes, short names, and common Localist spellings.
 */
const PURDUE_BUILDINGS: BuildingEntry[] = [
  {
    name: "Wilmeth Active Learning Center",
    lat: 40.427389,
    lng: -86.913229,
    aliases: [
      "walc",
      "wilmeth",
      "wilmeth active learning center",
      "thomas s and harvey d wilmeth active learning center",
      "thomas s. and harvey d. wilmeth active learning center",
    ],
  },
  {
    name: "Lawson Computer Science Building",
    lat: 40.427796,
    lng: -86.916995,
    aliases: [
      "lwsn",
      "lawson",
      "lawson hall",
      "lawson computer science",
      "lawson computer science building",
      "richard and patricia lawson computer science building",
    ],
  },
  {
    name: "Purdue Memorial Union",
    lat: 40.425029,
    lng: -86.911156,
    aliases: [
      "pmu",
      "memorial union",
      "purdue memorial union",
      "purdue student union",
      "union club hotel",
    ],
  },
  {
    name: "Stewart Center",
    lat: 40.425084,
    lng: -86.912711,
    aliases: [
      "stew",
      "stewart",
      "stewart center",
      "fowler hall",
      "fowler hall stewart center",
      "loeb playhouse",
      "loeb playhouse stewart center",
    ],
  },
  {
    name: "Krach Leadership Center",
    lat: 40.427589,
    lng: -86.921245,
    aliases: [
      "krach",
      "krch",
      "krach leadership center",
      "krach center",
    ],
  },
  {
    name: "Rawls Hall",
    lat: 40.423689,
    lng: -86.909783,
    aliases: [
      "rawl",
      "rawls",
      "rawls hall",
      "jerry s rawls hall",
      "jerry s. rawls hall",
    ],
  },
  {
    name: "Neil Armstrong Hall of Engineering",
    lat: 40.430918,
    lng: -86.914984,
    aliases: [
      "arms",
      "armstrong",
      "armstrong hall",
      "neil armstrong hall",
      "neil armstrong hall of engineering",
    ],
  },
  {
    name: "Burton D. Morgan Center for Entrepreneurship",
    lat: 40.423753,
    lng: -86.922846,
    aliases: [
      "mrgn",
      "morgan",
      "morgan center",
      "burton d morgan",
      "burton d. morgan",
      "burton d morgan center",
      "burton d. morgan center",
      "burton d morgan ctr for entrepreneurshp",
      "burton d. morgan ctr for entrepreneurshp",
      "morgan center for entrepreneurship",
      "burton d morgan center for entrepreneurship",
    ],
  },
  {
    name: "Turf Recreation Exercise Center",
    lat: 40.428507,
    lng: -86.924269,
    aliases: [
      "trec",
      "turf",
      "turf recreation",
      "turf recreation exercise center",
    ],
  },
  {
    name: "France A. Córdova Recreational Sports Center",
    lat: 40.428422,
    lng: -86.922447,
    aliases: [
      "corec",
      "cordova",
      "córdova",
      "france a cordova recreational sports center",
      "france a. córdova recreational sports center",
      "recreational sports center",
    ],
  },
  {
    name: "Hicks Undergraduate Library",
    lat: 40.424535,
    lng: -86.912657,
    aliases: ["hiks", "hicks", "hicks library", "hicks undergraduate library"],
  },
  {
    name: "Beering Hall",
    lat: 40.425575,
    lng: -86.916061,
    aliases: ["brng", "beering", "beering hall", "steven c beering hall"],
  },
  {
    name: "Mathematical Sciences Building",
    lat: 40.426254,
    lng: -86.91583,
    aliases: ["math", "mathematical sciences", "mathematical sciences building"],
  },
  {
    name: "Materials Science and Electrical Engineering",
    lat: 40.429341,
    lng: -86.91267,
    aliases: [
      "msee",
      "materials science and electrical engineering",
      "materials and electrical engineering",
    ],
  },
  {
    name: "Electrical Engineering Building",
    lat: 40.428637,
    lng: -86.911964,
    aliases: ["ee", "electrical engineering", "electrical engineering building"],
  },
  {
    name: "Mechanical Engineering Building",
    lat: 40.428296,
    lng: -86.912879,
    aliases: ["me", "mechanical engineering", "mechanical engineering building"],
  },
  {
    name: "Physics Building",
    lat: 40.430102,
    lng: -86.913451,
    aliases: ["phys", "physics", "physics building"],
  },
  {
    name: "Forney Hall of Chemical Engineering",
    lat: 40.429519,
    lng: -86.914008,
    aliases: ["frny", "forney", "forney hall", "forney hall of chemical engineering"],
  },
  {
    name: "Grissom Hall",
    lat: 40.426439,
    lng: -86.910917,
    aliases: ["grissom", "grissom hall"],
  },
  {
    name: "Krannert Building",
    lat: 40.423682,
    lng: -86.910936,
    aliases: ["krannert", "krannert building", "krannert school of management"],
  },
  {
    name: "Stanley Coulter Hall",
    lat: 40.426528,
    lng: -86.914382,
    aliases: ["sc", "coulter", "stanley coulter", "stanley coulter hall"],
  },
  {
    name: "Wetherill Laboratory of Chemistry",
    lat: 40.426469,
    lng: -86.9131,
    aliases: [
      "wthr",
      "wetherill",
      "wetherill lab",
      "wetherill laboratory",
      "richard benbridge wetherill lab of chem",
      "r b wetherill laboratory of chemistry",
    ],
  },
  {
    name: "Brown Laboratory of Chemistry",
    lat: 40.426583,
    lng: -86.911963,
    aliases: ["brwn", "brown lab", "brown laboratory", "brown laboratory of chemistry"],
  },
  {
    name: "Lilly Hall of Life Sciences",
    lat: 40.423225,
    lng: -86.918253,
    aliases: ["lilly", "lilly hall", "lilly hall of life sciences"],
  },
  {
    name: "Hall for Discovery and Learning Research",
    lat: 40.421224,
    lng: -86.92244,
    aliases: ["dlr", "discovery learning research", "hall for discovery and learning research"],
  },
  {
    name: "Wang Hall",
    lat: 40.430461,
    lng: -86.912541,
    aliases: ["wang", "wang hall"],
  },
  {
    name: "Honors College and Residences",
    lat: 40.426777,
    lng: -86.919743,
    aliases: [
      "honors college",
      "honors college and residences",
      "honors college and residences south",
      "honors college and residences north",
    ],
  },
  {
    name: "Elliott Hall of Music",
    lat: 40.427896,
    lng: -86.915007,
    aliases: ["ellt", "elliott", "elliott hall", "elliott hall of music"],
  },
  {
    name: "Mackey Arena",
    lat: 40.433323,
    lng: -86.916171,
    aliases: ["mackey", "mackey arena"],
  },
  {
    name: "Ross–Ade Stadium",
    lat: 40.434652,
    lng: -86.918454,
    aliases: ["ross-ade", "ross ade", "ross–ade", "ross-ade stadium", "ross ade stadium"],
  },
  {
    name: "Lambert Fieldhouse",
    lat: 40.432186,
    lng: -86.915937,
    aliases: [
      "lambert",
      "lambert fieldhouse",
      "ward l lambert fieldhouse",
      "lambert fieldhouse and gymnasium",
    ],
  },
  {
    name: "Lynn Hall of Veterinary Medicine",
    lat: 40.419498,
    lng: -86.91483,
    aliases: [
      "lynn",
      "lynn hall",
      "lynn hall of veterinary medicine",
      "charles j lynn hall of vet medicine",
      "charles j. lynn hall of vet medicine",
    ],
  },
  {
    name: "Creighton Hall of Animal Sciences",
    lat: 40.421102,
    lng: -86.918869,
    aliases: ["crtn", "creighton", "creighton hall", "creighton hall of animal sciences"],
  },
  {
    name: "Dauch Alumni Center",
    lat: 40.421822,
    lng: -86.910873,
    aliases: ["dauch", "dauch alumni center", "alumni center"],
  },
  {
    name: "Potter Engineering Center",
    lat: 40.427539,
    lng: -86.912403,
    aliases: ["potr", "potter", "potter engineering", "potter engineering center"],
  },
  {
    name: "Knoy Hall of Technology",
    lat: 40.427808,
    lng: -86.911091,
    aliases: ["knoy", "knoy hall", "knoy hall of technology"],
  },
  {
    name: "Hampton Hall of Civil Engineering",
    lat: 40.430237,
    lng: -86.914766,
    aliases: ["hamp", "hampton", "hampton hall", "hampton hall of civil engineering"],
  },
  {
    name: "Chaney-Hale Hall of Science",
    lat: 40.428592,
    lng: -86.915524,
    aliases: ["chas", "chaney-hale", "chaney hale", "chaney-hale hall of science"],
  },
  {
    name: "Class of 1950 Lecture Hall",
    lat: 40.426347,
    lng: -86.915058,
    aliases: ["cl50", "class of 1950", "class of 1950 lecture hall"],
  },
  {
    name: "Matthews Hall",
    lat: 40.424746,
    lng: -86.916379,
    aliases: ["mthw", "matthews", "matthews hall"],
  },
  {
    name: "Marriott Hall",
    lat: 40.424605,
    lng: -86.917003,
    aliases: ["marriott", "marriott hall", "marriot hall"],
  },
  {
    name: "University Hall",
    lat: 40.42527,
    lng: -86.915193,
    aliases: ["univ", "university hall"],
  },
  {
    name: "Hovde Hall of Administration",
    lat: 40.428237,
    lng: -86.914441,
    aliases: ["hovd", "hovde", "hovde hall", "hovde hall of administration"],
  },
  {
    name: "Schleman Hall",
    lat: 40.425807,
    lng: -86.915209,
    aliases: ["schm", "schleman", "schleman hall"],
  },
  {
    name: "Heavilon Hall",
    lat: 40.426823,
    lng: -86.916311,
    aliases: ["haas", "heavilon", "heavilon hall", "felix haas hall"],
  },
  {
    name: "Young Hall",
    lat: 40.422848,
    lng: -86.910646,
    aliases: ["yong", "young", "young hall"],
  },
  {
    name: "Yue-Kong Pao Hall of Visual and Performing Arts",
    lat: 40.422547,
    lng: -86.912984,
    aliases: [
      "pao",
      "pao hall",
      "yue-kong pao",
      "yue kong pao",
      "yue-kong pao hall",
      "yue-kong pao hall of visual & perf arts",
      "mallett theatre",
    ],
  },
  {
    name: "Pfendler Hall of Agriculture",
    lat: 40.423683,
    lng: -86.915303,
    aliases: [
      "pfendler",
      "pfendler hall",
      "david c pfendler hall of agriculture",
      "david c. pfendler hall of agriculture",
    ],
  },
  {
    name: "Convergence Center",
    lat: 40.423751,
    lng: -86.927041,
    aliases: [
      "conv",
      "convergence",
      "convergence center",
      "the convergence center",
      "convergence center for innovation and collaboration",
    ],
  },
  {
    name: "Smalley Center",
    lat: 40.427035,
    lng: -86.923229,
    aliases: [
      "smalley",
      "smalley center",
      "john c smalley ctr for hsg & fd srv adm",
      "john c. smalley ctr for hsg & fd srv adm",
    ],
  },
  {
    name: "Student Health Center",
    lat: 40.430364,
    lng: -86.91607,
    aliases: ["push", "student health", "student health center", "purdue student health center"],
  },
  {
    name: "Asian American and Asian Resource and Cultural Center",
    lat: 40.42913,
    lng: -86.917654,
    aliases: [
      "aacc",
      "asian american and asian resource and cultural center",
      "asian american resource and cultural center",
    ],
  },
  {
    name: "Black Cultural Center",
    lat: 40.427525,
    lng: -86.919517,
    aliases: ["bcc", "black cultural center"],
  },
  {
    name: "Memorial Mall",
    lat: 40.425064,
    lng: -86.914327,
    aliases: [
      "memorial mall",
      "purdue memorial mall",
      "memorial mall north side",
      "memorial mall - north side",
      "centennial mall",
    ],
  },
  {
    name: "Purdue Mall",
    lat: 40.428723,
    lng: -86.913667,
    aliases: ["purdue mall", "engineering mall"],
  },
  {
    name: "Purdue Bell Tower",
    lat: 40.42728,
    lng: -86.914068,
    aliases: ["bell tower", "purdue bell tower", "bell tower area"],
  },
  {
    name: "Horticulture Park",
    lat: 40.426319,
    lng: -86.933424,
    aliases: ["horticulture park", "purdue horticulture park"],
  },
  {
    name: "Alexander Field",
    lat: 40.437747,
    lng: -86.941213,
    aliases: ["alexander field", "ross alexander field"],
  },
  {
    name: "Purdue University Airport",
    lat: 40.416245,
    lng: -86.930974,
    aliases: [
      "purdue airport",
      "purdue university airport",
      "niswonger aviation technology building",
    ],
  },
];

/** Abbreviations that are too short / ambiguous for bare token matching alone. */
const AMBIGUOUS_ABBREVIATIONS = new Set(["ee", "me", "sc", "math", "phys", "turf", "pao"]);

function normalizeVenueText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type AliasRecord = {
  alias: string;
  building: BuildingEntry;
  /** True when alias is a short building code (e.g. WALC, LWSN). */
  isAbbrev: boolean;
};

const ALIAS_RECORDS: AliasRecord[] = (() => {
  const records: AliasRecord[] = [];
  for (const building of PURDUE_BUILDINGS) {
    for (const rawAlias of building.aliases) {
      const alias = normalizeVenueText(rawAlias);
      if (!alias) continue;
      const isAbbrev = /^[a-z0-9]{2,6}$/.test(alias) && !alias.includes(" ");
      records.push({ alias, building, isAbbrev });
    }
  }
  // Prefer longer aliases when scoring matches
  records.sort((a, b) => b.alias.length - a.alias.length);
  return records;
})();

const EXACT_ALIAS_MAP = new Map<string, BuildingEntry>();
for (const record of ALIAS_RECORDS) {
  if (!EXACT_ALIAS_MAP.has(record.alias)) {
    EXACT_ALIAS_MAP.set(record.alias, record.building);
  }
}

/**
 * Resolve a Localist venue / location name to Purdue building coordinates.
 * Returns undefined when no confident match exists (never guesses).
 */
export function resolvePurdueBuilding(
  locationName: string | undefined | null
): PurdueBuildingCoords | undefined {
  if (!locationName || !locationName.trim()) {
    return undefined;
  }

  const normalized = normalizeVenueText(locationName);
  if (!normalized) {
    return undefined;
  }

  // Skip vague city-level labels — not a specific building.
  if (
    normalized === "west lafayette" ||
    normalized === "west lafayette ind" ||
    normalized === "west lafayette indiana" ||
    normalized === "purdue university west lafayette campus" ||
    normalized === "purdue university" ||
    normalized === "campus" ||
    normalized === "tbd" ||
    normalized === "to be announced" ||
    normalized === "virtual event" ||
    normalized === "online" ||
    normalized === "zoom"
  ) {
    return undefined;
  }

  // 1) Exact alias match
  const exact = EXACT_ALIAS_MAP.get(normalized);
  if (exact) {
    return { lat: exact.lat, lng: exact.lng, name: exact.name };
  }

  // 2) Contained alias / abbreviation token match (longest first)
  const tokens = new Set(normalized.split(" "));
  let best: { building: BuildingEntry; score: number } | undefined;

  for (const record of ALIAS_RECORDS) {
    const { alias, building, isAbbrev } = record;

    if (isAbbrev) {
      // Require a whole-token abbreviation hit.
      if (!tokens.has(alias)) continue;
      // Ambiguous short codes need a supporting campus cue or exact-only (already handled).
      if (AMBIGUOUS_ABBREVIATIONS.has(alias)) {
        const hasCampusCue =
          tokens.has("purdue") ||
          tokens.has("hall") ||
          tokens.has("building") ||
          tokens.has("center") ||
          tokens.has("lab") ||
          tokens.has("laboratory") ||
          normalized.includes(building.name.toLowerCase().slice(0, 8));
        if (!hasCampusCue && normalized !== alias) continue;
      }
      const score = alias.length + 100; // prefer abbrev token hits slightly
      if (!best || score > best.score) {
        best = { building, score };
      }
      continue;
    }

    // Longer phrase aliases: require contiguous phrase presence.
    if (alias.length < 5) continue;
    if (!normalized.includes(alias)) continue;

    const score = alias.length;
    if (!best || score > best.score) {
      best = { building, score };
    }
  }

  if (!best) {
    return undefined;
  }

  return {
    lat: best.building.lat,
    lng: best.building.lng,
    name: best.building.name,
  };
}

/** Exposed for tests / coverage scripts. */
export function listPurdueBuildings(): ReadonlyArray<BuildingEntry> {
  return PURDUE_BUILDINGS;
}
