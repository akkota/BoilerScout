import { TypesenseOrganizationDocument } from "@/lib/typesense/schema";
import { cleanOrganizationName, cleanTitle, stripHtml } from "./cleanPurdueData";

export interface RawPurdueDepartmentWrapper {
  department?: RawPurdueDepartment;
  id?: number | string;
  name?: string;
  description?: string;
  description_text?: string;
  url?: string;
  localist_url?: string;
  photo_url?: string;
}

export type RawPurdueDepartment = Omit<RawPurdueDepartmentWrapper, "department">;

export interface RawPurdueGroupWrapper {
  group?: RawPurdueGroup;
  id?: number | string;
  name?: string;
  description?: string;
  description_text?: string;
  url?: string;
  localist_url?: string;
  photo_url?: string;
  filters?: {
    group_types?: Array<{ id?: number | string; name?: string }>;
  };
}

export type RawPurdueGroup = Omit<RawPurdueGroupWrapper, "group">;

/**
 * Curated metadata for major Purdue organizations, academic units, and cultural centers.
 */
interface KnownOrgMeta {
  canonicalName: string;
  shortName?: string;
  aliases: string[];
  type: string;
  description?: string;
  categories: string[];
}

const KNOWN_ORGANIZATIONS: Record<string, KnownOrgMeta> = {
  "agriculture": {
    canonicalName: "College of Agriculture",
    shortName: "Ag",
    aliases: ["Agriculture", "Purdue Agriculture", "College of Agriculture"],
    type: "department",
    categories: ["Agriculture", "Academics", "Research"],
  },
  "business": {
    canonicalName: "Mitch Daniels School of Business",
    shortName: "DSOB",
    aliases: [
      "Daniels School of Business",
      "Krannert",
      "Krannert School of Management",
      "Business",
      "Purdue Business",
    ],
    type: "department",
    categories: ["Business", "Management", "Finance", "Academics"],
  },
  "education": {
    canonicalName: "College of Education",
    shortName: "EDU",
    aliases: ["Education", "Purdue Education"],
    type: "department",
    categories: ["Education", "Academics", "Teaching"],
  },
  "engineering": {
    canonicalName: "College of Engineering",
    shortName: "ENGR",
    aliases: ["Engineering", "Purdue Engineering"],
    type: "department",
    categories: ["Engineering", "STEM", "Academics", "Research"],
  },
  "liberal arts": {
    canonicalName: "College of Liberal Arts",
    shortName: "CLA",
    aliases: ["Liberal Arts", "Purdue Liberal Arts"],
    type: "department",
    categories: ["Liberal Arts", "Humanities", "Arts", "Academics"],
  },
  "health and human sciences": {
    canonicalName: "College of Health and Human Sciences",
    shortName: "HHS",
    aliases: ["Health and Human Sciences", "HHS"],
    type: "department",
    categories: ["Health", "Human Sciences", "Academics", "Wellness"],
  },
  "pharmacy": {
    canonicalName: "College of Pharmacy",
    shortName: "PHARM",
    aliases: ["Pharmacy", "Purdue Pharmacy"],
    type: "department",
    categories: ["Pharmacy", "Health", "Academics", "Medicine"],
  },
  "polytechnic institute": {
    canonicalName: "Purdue Polytechnic Institute",
    shortName: "PPI",
    aliases: ["Polytechnic Institute", "Purdue Polytechnic", "Polytechnic"],
    type: "department",
    categories: ["Technology", "Aviation", "Computing", "Academics"],
  },
  "science": {
    canonicalName: "College of Science",
    shortName: "SCI",
    aliases: ["Science", "Purdue Science", "College of Science"],
    type: "department",
    categories: ["Science", "STEM", "Computer Science", "Physics", "Chemistry"],
  },
  "veterinary medicine": {
    canonicalName: "College of Veterinary Medicine",
    shortName: "PVM",
    aliases: ["Veterinary Medicine", "Vet Med", "Purdue Veterinary Medicine"],
    type: "department",
    categories: ["Veterinary Medicine", "Animal Health", "Academics"],
  },
  "intercollegiate athletics": {
    canonicalName: "Purdue Intercollegiate Athletics",
    shortName: "Athletics",
    aliases: ["Intercollegiate Athletics", "Purdue Sports", "Boilermaker Athletics"],
    type: "athletic",
    categories: ["Athletics", "Sports", "Football", "Basketball"],
  },
  "student life": {
    canonicalName: "Purdue Student Life",
    shortName: "Student Life",
    aliases: ["Student Life", "Office of Student Life", "VPSL"],
    type: "administrative",
    categories: ["Student Life", "Campus Activities", "Clubs"],
  },
  "center for career opportunities": {
    canonicalName: "Center for Career Opportunities",
    shortName: "CCO",
    aliases: ["CCO", "Center for Career Opportunities (CCO)", "Career Opportunities"],
    type: "administrative",
    categories: ["Career", "Internships", "Jobs", "Resume", "Networking"],
  },
  "asian american and asian resource and cultural center": {
    canonicalName: "Asian American and Asian Resource and Cultural Center",
    shortName: "AAARCC",
    aliases: ["AAARCC", "Asian American and Asian Resource and Cultural Center"],
    type: "cultural_center",
    categories: ["Culture", "Diversity", "Asian American", "Community"],
  },
  "black cultural center": {
    canonicalName: "Black Cultural Center",
    shortName: "BCC",
    aliases: ["BCC", "Purdue Black Cultural Center"],
    type: "cultural_center",
    categories: ["Culture", "Diversity", "Black Cultural Center", "Community"],
  },
  "latino cultural center": {
    canonicalName: "Latino Cultural Center",
    shortName: "LCC",
    aliases: ["LCC", "Latino Cultural Center at Purdue"],
    type: "cultural_center",
    categories: ["Culture", "Diversity", "Latino Cultural Center", "Community"],
  },
  "native american educational and cultural center": {
    canonicalName: "Native American Educational and Cultural Center",
    shortName: "NAECC",
    aliases: ["NAECC", "Native American Educational and Cultural Center"],
    type: "cultural_center",
    categories: ["Culture", "Diversity", "Indigenous", "Community"],
  },
  "purdue student union board": {
    canonicalName: "Purdue Student Union Board",
    shortName: "PSUB",
    aliases: ["PSUB", "Union Board"],
    type: "student_org",
    categories: ["Student Life", "Campus Events", "Traditions"],
  },
  "purdue innovates": {
    canonicalName: "Purdue Innovates",
    shortName: "Innovates",
    aliases: ["Purdue Innovates", "Purdue Research Foundation", "PRF"],
    type: "administrative",
    categories: ["Innovation", "Startups", "Commercialization", "Entrepreneurship"],
  },
  "purdue convocations": {
    canonicalName: "Purdue Convocations",
    shortName: "Convos",
    aliases: ["Purdue Convocations", "Convos"],
    type: "cultural_center",
    categories: ["Concerts", "Performing Arts", "Theater", "Music"],
  },
  "purdue musical organizations": {
    canonicalName: "Purdue Musical Organizations",
    shortName: "PMO",
    aliases: ["PMO", "Purdue Musical Organizations", "Glee Club", "Purduettes"],
    type: "cultural_center",
    categories: ["Music", "Choir", "Performing Arts"],
  },
  "burton d. morgan center for entrepreneurship": {
    canonicalName: "Burton D. Morgan Center for Entrepreneurship",
    shortName: "MRGN",
    aliases: ["Burton D. Morgan Center", "Morgan Center for Entrepreneurship"],
    type: "academic",
    categories: ["Entrepreneurship", "Startups", "Business"],
  },
  "purdue online writing lab (owl)": {
    canonicalName: "Purdue Online Writing Lab (OWL)",
    shortName: "OWL",
    aliases: ["Purdue OWL", "Purdue Writing Lab", "OWL"],
    type: "academic",
    categories: ["Writing", "Academics", "Tutoring"],
  },
};

/**
 * Normalizes a raw Purdue Localist department into a TypesenseOrganizationDocument.
 */
export function normalizeDepartment(
  raw: RawPurdueDepartmentWrapper
): TypesenseOrganizationDocument | null {
  const item: RawPurdueDepartment = raw.department ? raw.department : raw;

  if (!item.id || !item.name) return null;

  const rawName = cleanTitle(item.name);
  const lowerKey = rawName.toLowerCase();
  const known = KNOWN_ORGANIZATIONS[lowerKey];

  const name = known?.canonicalName || rawName;
  const short_name = known?.shortName;

  const aliasSet = new Set<string>();
  if (short_name) aliasSet.add(short_name);
  if (known) {
    for (const a of known.aliases) {
      if (a.toLowerCase() !== name.toLowerCase()) aliasSet.add(a);
    }
  }

  // Description
  let description = "";
  if (item.description_text) {
    description = stripHtml(item.description_text);
  } else if (item.description) {
    description = stripHtml(item.description);
  }
  if (!description && known?.description) {
    description = known.description;
  }
  if (!description) {
    description = `${name} at Purdue University.`;
  }

  const categories = known?.categories || ["Academics", "Departments"];

  return {
    id: `dept-${item.id}`,
    name,
    short_name,
    aliases: Array.from(aliasSet),
    type: known?.type || "department",
    description,
    categories,
    photo_url: item.photo_url?.trim() || undefined,
    url: item.url?.trim() || undefined,
    localist_url: item.localist_url?.trim() || undefined,
    source: "purdue-departments",
  };
}

/**
 * Normalizes a raw Purdue Localist group into a TypesenseOrganizationDocument.
 */
export function normalizeGroup(raw: RawPurdueGroupWrapper): TypesenseOrganizationDocument | null {
  const item: RawPurdueGroup = raw.group ? raw.group : raw;

  if (!item.id || !item.name) return null;

  const rawName = cleanTitle(item.name);
  const lowerKey = rawName.toLowerCase();
  const known = KNOWN_ORGANIZATIONS[lowerKey];

  const name = known?.canonicalName || rawName;
  const short_name = known?.shortName;

  const aliasSet = new Set<string>();
  if (short_name) aliasSet.add(short_name);
  if (known) {
    for (const a of known.aliases) {
      if (a.toLowerCase() !== name.toLowerCase()) aliasSet.add(a);
    }
  }

  let description = "";
  if (item.description_text) {
    description = stripHtml(item.description_text);
  } else if (item.description) {
    description = stripHtml(item.description);
  }
  if (!description && known?.description) {
    description = known.description;
  }
  if (!description) {
    description = `${name} student organization or interest group at Purdue University.`;
  }

  const categories = known?.categories || ["Student Life", "Groups"];

  return {
    id: `group-${item.id}`,
    name,
    short_name,
    aliases: Array.from(aliasSet),
    type: known?.type || "group",
    description,
    categories,
    photo_url: item.photo_url?.trim() || undefined,
    url: item.url?.trim() || undefined,
    localist_url: item.localist_url?.trim() || undefined,
    source: "purdue-groups",
  };
}

/**
 * Creates an organization document from an event's unit/organization field.
 */
export function normalizeEventUnit(
  rawUnit: string
): TypesenseOrganizationDocument | null {
  const cleaned = cleanOrganizationName(rawUnit);
  if (!cleaned) return null;

  const lowerKey = cleaned.toLowerCase();
  const known = KNOWN_ORGANIZATIONS[lowerKey];

  const name = known?.canonicalName || cleaned;
  const short_name = known?.shortName;

  const aliasSet = new Set<string>();
  if (short_name) aliasSet.add(short_name);
  if (cleaned.toLowerCase() !== name.toLowerCase()) aliasSet.add(cleaned);
  if (known) {
    for (const a of known.aliases) {
      if (a.toLowerCase() !== name.toLowerCase()) aliasSet.add(a);
    }
  }

  // Deterministic ID based on canonical name
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const categories = known?.categories || ["Campus Organization"];
  const description = known?.description || `${name} organizing events at Purdue University.`;

  return {
    id: `org-${slug}`,
    name,
    short_name,
    aliases: Array.from(aliasSet),
    type: known?.type || "organization",
    description,
    categories,
    source: "purdue-events",
  };
}

/**
 * Deduplicates organizations by canonical name, merging aliases, categories, and metadata.
 */
export function deduplicateOrganizations(
  orgs: TypesenseOrganizationDocument[]
): TypesenseOrganizationDocument[] {
  const map = new Map<string, TypesenseOrganizationDocument>();

  for (const org of orgs) {
    const key = org.name.toLowerCase().trim();
    const existing = map.get(key);

    if (!existing) {
      map.set(key, { ...org });
    } else {
      // Merge aliases
      const combinedAliases = new Set<string>([
        ...(existing.aliases || []),
        ...(org.aliases || []),
      ]);
      // Remove self-name from aliases
      combinedAliases.delete(existing.name);

      // Merge categories
      const combinedCategories = new Set<string>([
        ...(existing.categories || []),
        ...(org.categories || []),
      ]);

      const merged: TypesenseOrganizationDocument = {
        ...existing,
        short_name: existing.short_name || org.short_name,
        aliases: Array.from(combinedAliases),
        categories: Array.from(combinedCategories),
        description:
          existing.description.length >= org.description.length
            ? existing.description
            : org.description,
        photo_url: existing.photo_url || org.photo_url,
        url: existing.url || org.url,
        localist_url: existing.localist_url || org.localist_url,
      };

      map.set(key, merged);
    }
  }

  return Array.from(map.values());
}
