/**
 * Purdue Campus Venues and Canonical Building Directory
 * Owned by: Backend / Typesense developer
 *
 * Provides authoritative building codes, aliases, and coordinates for campus venues.
 * Used by venue normalization and event ingestion to resolve missing coordinates.
 */

export interface CampusBuildingDefinition {
  name: string;
  shortName: string; // Official 3-4 letter building code
  aliases: string[];
  location: [number, number]; // [lat, lng]
  address: string;
  type: string; // "academic" | "student_center" | "athletic" | "residence" | "cultural_center" | "library" | "recreation"
}

export const CANONICAL_CAMPUS_BUILDINGS: CampusBuildingDefinition[] = [
  {
    name: "Thomas S. and Harvey D. Wilmeth Active Learning Center",
    shortName: "WALC",
    aliases: ["WALC", "Wilmeth Active Learning Center", "Wilmeth", "Active Learning Center"],
    location: [40.427339, -86.913848],
    address: "340 Centennial Mall Dr, West Lafayette, IN 47907",
    type: "academic",
  },
  {
    name: "Purdue Memorial Union",
    shortName: "PMU",
    aliases: ["PMU", "Memorial Union", "Purdue Union", "Union Rack and Roll"],
    location: [40.424724, -86.910546],
    address: "101 N Grant St, West Lafayette, IN 47906",
    type: "student_center",
  },
  {
    name: "Stewart Center",
    shortName: "STEW",
    aliases: [
      "STEW",
      "Stewart",
      "Fowler Hall",
      "Loeb Playhouse",
      "Fowler Hall - Stewart Center",
      "Loeb Playhouse - Stewart Center",
      "Robert L. Ringel Gallery - Stewart Center",
      "Ringel Gallery",
    ],
    location: [40.42476, -86.911951],
    address: "128 Memorial Mall, West Lafayette, IN 47907",
    type: "student_center",
  },
  {
    name: "Jerry S. Rawls Hall",
    shortName: "RAWL",
    aliases: ["RAWL", "Rawls Hall", "Rawls", "Jerry S Rawls Hall"],
    location: [40.4237, -86.9102],
    address: "100 S Grant St, West Lafayette, IN 47906",
    type: "academic",
  },
  {
    name: "Krannert Building",
    shortName: "KRAN",
    aliases: ["KRAN", "Krannert", "Krannert Building", "Krannert Center for Exec Educ & Research"],
    location: [40.4242, -86.9102],
    address: "403 W Mitch Daniels Blvd, West Lafayette, IN 47907",
    type: "academic",
  },
  {
    name: "Burton D. Morgan Center for Entrepreneurship",
    shortName: "MRGN",
    aliases: [
      "MRGN",
      "Burton D. Morgan Center",
      "Morgan Center",
      "Burton D. Morgan Ctr for Entrepreneurshp",
    ],
    location: [40.4237, -86.9212],
    address: "1201 W Mitch Daniels Blvd, West Lafayette, IN 47907",
    type: "academic",
  },
  {
    name: "Richard & Patricia Lawson Cmptr Sci Bldg",
    shortName: "LWSN",
    aliases: [
      "LWSN",
      "Lawson Computer Science Building",
      "Lawson Building",
      "Lawson Hall",
      "Lawson",
      "Richard and Patricia Lawson Computer Science Building",
    ],
    location: [40.42773, -86.916992],
    address: "305 N University St, West Lafayette, IN 47907",
    type: "academic",
  },
  {
    name: "Neil Armstrong Hall of Engineering",
    shortName: "ARMS",
    aliases: ["ARMS", "Armstrong Hall", "Armstrong Hall of Engineering", "Armstrong"],
    location: [40.431053, -86.914905],
    address: "701 W Stadium Ave, West Lafayette, IN 47907",
    type: "academic",
  },
  {
    name: "France A. Cordova Recreational Sports Center",
    shortName: "CREC",
    aliases: [
      "CREC",
      "Co-Rec",
      "Corec",
      "France A. Córdova Recreational Sports Center",
      "Cordova Recreational Sports Center",
    ],
    location: [40.4284, -86.9221],
    address: "355 N Martin Jischke Dr, West Lafayette, IN 47907",
    type: "recreation",
  },
  {
    name: "Edward C. Elliott Hall of Music",
    shortName: "ELLT",
    aliases: ["ELLT", "Elliott Hall of Music", "Elliott Hall", "Elliott"],
    location: [40.4281, -86.9158],
    address: "712 3rd St, West Lafayette, IN 47907",
    type: "cultural_center",
  },
  {
    name: "Yue-Kong Pao Hall of Visual & Perf Arts",
    shortName: "PAO",
    aliases: [
      "PAO",
      "Pao Hall",
      "Yue-Kong Pao Hall of Visual & Perf Arts, Carole & Gordon Mallett Theatre",
      "Carole & Gordon Mallett Theatre",
      "Mallett Theatre",
      "Pao Hall of Visual and Performing Arts",
      "Patti and Rusty Rueff Galleries - Pao Hall",
      "Rueff Galleries",
    ],
    location: [40.4235, -86.9100],
    address: "552 W Wood St, West Lafayette, IN 47907",
    type: "cultural_center",
  },
  {
    name: "Felix Haas Hall",
    shortName: "HAAS",
    aliases: ["HAAS", "Haas Hall", "Haas"],
    location: [40.4282, -86.914],
    address: "640 Oval Dr, West Lafayette, IN 47907",
    type: "academic",
  },
  {
    name: "Krach Leadership Center",
    shortName: "KRCH",
    aliases: ["KRCH", "Krach Leadership Center", "Krach"],
    location: [40.4294, -86.9213],
    address: "1198 3rd St, West Lafayette, IN 47906",
    type: "student_center",
  },
  {
    name: "University Hall",
    shortName: "UNIV",
    aliases: ["UNIV", "University Hall", "Purdue OWL Writers' Room", "Purdue OWL Writers' Room (UNIV 235)"],
    location: [40.4258, -86.9137],
    address: "672 Oval Dr, West Lafayette, IN 47907",
    type: "academic",
  },
  {
    name: "Stanley Coulter Hall",
    shortName: "SC",
    aliases: ["SC", "Stanley Coulter Hall", "Stanley Coulter"],
    location: [40.4252, -86.9137],
    address: "640 Oval Dr, West Lafayette, IN 47907",
    type: "academic",
  },
  {
    name: "Class of 1950 Lecture Hall",
    shortName: "CL50",
    aliases: ["CL50", "Class of 1950", "Class of 1950 Lecture Hall"],
    location: [40.4273, -86.9147],
    address: "250 N University St, West Lafayette, IN 47907",
    type: "academic",
  },
  {
    name: "Electrical Engineering Building",
    shortName: "EE",
    aliases: ["EE", "EE Building", "Max W & Maileen Brown Family Hall", "BHEE"],
    location: [40.4289, -86.9119],
    address: "465 Northwestern Ave, West Lafayette, IN 47907",
    type: "academic",
  },
  {
    name: "Mechanical Engineering Building",
    shortName: "ME",
    aliases: ["ME", "ME Building", "Mechanical Engineering"],
    location: [40.4293, -86.9127],
    address: "585 Purdue Mall, West Lafayette, IN 47907",
    type: "academic",
  },
  {
    name: "Materials and Electrical Engineering",
    shortName: "MSEE",
    aliases: ["MSEE", "Materials and Electrical Engineering Building"],
    location: [40.4295, -86.9115],
    address: "501 Northwestern Ave, West Lafayette, IN 47907",
    type: "academic",
  },
  {
    name: "Delon and Elizabeth Hampton Hall of Civil Engineering",
    shortName: "HAMP",
    aliases: ["HAMP", "Hampton Hall", "Civil Engineering"],
    location: [40.4300, -86.9148],
    address: "550 Stadium Mall Dr, West Lafayette, IN 47907",
    type: "academic",
  },
  {
    name: "Physics Building",
    shortName: "PHYS",
    aliases: ["PHYS", "Physics Building"],
    location: [40.4291, -86.9139],
    address: "525 Northwestern Ave, West Lafayette, IN 47907",
    type: "academic",
  },
  {
    name: "Richard Benbridge Wetherill Lab of Chem",
    shortName: "WTHR",
    aliases: ["WTHR", "Wetherill Laboratory of Chemistry", "Wetherill", "Wetherill Lab"],
    location: [40.4265, -86.9127],
    address: "560 Oval Dr, West Lafayette, IN 47907",
    type: "academic",
  },
  {
    name: "Herbert C. Brown Laboratory of Chemistry",
    shortName: "BRWN",
    aliases: ["BRWN", "Brown Laboratory of Chemistry", "Brown Lab"],
    location: [40.4262, -86.9122],
    address: "560 Oval Dr, West Lafayette, IN 47907",
    type: "academic",
  },
  {
    name: "Mathematical Sciences Building",
    shortName: "MATH",
    aliases: ["MATH", "Math Sciences", "Mathematical Sciences"],
    location: [40.4261, -86.9171],
    address: "150 N University St, West Lafayette, IN 47907",
    type: "academic",
  },
  {
    name: "Steven C. Beering Hall of Lib Arts & Ed",
    shortName: "BRNG",
    aliases: ["BRNG", "Beering Hall", "Beering"],
    location: [40.4258, -86.9161],
    address: "100 N University St, West Lafayette, IN 47907",
    type: "academic",
  },
  {
    name: "Heavilon Hall",
    shortName: "HEAV",
    aliases: ["HEAV", "Heavilon Hall"],
    location: [40.4264, -86.9114],
    address: "500 Oval Dr, West Lafayette, IN 47907",
    type: "academic",
  },
  {
    name: "John W. Hicks Undergraduate Library",
    shortName: "HIKS",
    aliases: ["HIKS", "Hicks Library", "Hicks Undergraduate Library"],
    location: [40.4243, -86.9115],
    address: "504 W Mitch Daniels Blvd, West Lafayette, IN 47907",
    type: "library",
  },
  {
    name: "Lilly Hall of Life Sciences",
    shortName: "LILY",
    aliases: ["LILY", "Lilly Hall", "Life Sciences"],
    location: [40.4226, -86.9168],
    address: "915 W Mitch Daniels Blvd, West Lafayette, IN 47907",
    type: "academic",
  },
  {
    name: "Smith Hall",
    shortName: "SMTH",
    aliases: ["SMTH", "Smith Hall"],
    location: [40.4226, -86.9155],
    address: "901 W Mitch Daniels Blvd, West Lafayette, IN 47907",
    type: "academic",
  },
  {
    name: "Robert E. Heine Pharmacy Building",
    shortName: "RHPH",
    aliases: ["RHPH", "Pharmacy Building", "Heine Pharmacy Building"],
    location: [40.4294, -86.9150],
    address: "575 Stadium Mall Dr, West Lafayette, IN 47907",
    type: "academic",
  },
  {
    name: "Charles J. Lynn Hall of Vet Medicine",
    shortName: "LYNN",
    aliases: ["LYNN", "Lynn Hall of Vet Medicine", "Lynn Hall", "Veterinary Medicine"],
    location: [40.4199, -86.9171],
    address: "625 Harrison St, West Lafayette, IN 47907",
    type: "academic",
  },
  {
    name: "Asian American and Asian Resource and Cultural Center",
    shortName: "AAARCC",
    aliases: [
      "AAARCC",
      "Asian American and Asian Resource and Cultural Center",
      "AAARCC Vegetable Pop-up",
      "AAARCC Language & Conversation Practice",
    ],
    location: [40.4292, -86.9103],
    address: "915 5th St, West Lafayette, IN 47906",
    type: "cultural_center",
  },
  {
    name: "Black Cultural Center",
    shortName: "BCC",
    aliases: ["BCC", "Black Cultural Center"],
    location: [40.4294, -86.9197],
    address: "1100 3rd St, West Lafayette, IN 47906",
    type: "cultural_center",
  },
  {
    name: "Latino Cultural Center at Purdue",
    shortName: "LCC",
    aliases: ["LCC", "Latino Cultural Center"],
    location: [40.4287, -86.9105],
    address: "426 Waldron St, West Lafayette, IN 47906",
    type: "cultural_center",
  },
  {
    name: "Native American Educational and Cultural Center",
    shortName: "NAECC",
    aliases: ["NAECC", "Native American Educational and Cultural Center"],
    location: [40.4290, -86.9105],
    address: "903 5th St, West Lafayette, IN 47906",
    type: "cultural_center",
  },
  {
    name: "Bechtel Innovation Design Center",
    shortName: "BIDC",
    aliases: ["BIDC", "Bechtel Center", "Bechtel Innovation Design Center"],
    location: [40.4288, -86.9200],
    address: "1090 3rd St, West Lafayette, IN 47906",
    type: "academic",
  },
  {
    name: "Purdue Memorial Mall",
    shortName: "MALL",
    aliases: ["Memorial Mall", "Purdue Memorial Mall", "Purdue Farmers Market"],
    location: [40.4250, -86.9125],
    address: "Memorial Mall Dr, West Lafayette, IN 47907",
    type: "student_center",
  },
  {
    name: "Guy J. Mackey Arena",
    shortName: "MACK",
    aliases: ["MACK", "Mackey Arena", "Mackey"],
    location: [40.4332, -86.9161],
    address: "900 John R Wooden Dr, West Lafayette, IN 47907",
    type: "athletic",
  },
  {
    name: "Ross-Ade Stadium",
    shortName: "ROSS",
    aliases: ["ROSS", "Ross-Ade Stadium", "Ross-Ade", "Ross Ade"],
    location: [40.4352, -86.9187],
    address: "850 Steven Beering Dr, West Lafayette, IN 47907",
    type: "athletic",
  },
  {
    name: "Honors College and Residences South",
    shortName: "HCRS",
    aliases: [
      "HCR",
      "Honors College",
      "Honors College and Residences",
      "Honors College and Residences South",
    ],
    location: [40.4275, -86.9215],
    address: "1101 1st St, West Lafayette, IN 47906",
    type: "residence",
  },
  {
    name: "Seng-Liang Wang Hall",
    shortName: "WANG",
    aliases: ["WANG", "Wang Hall"],
    location: [40.4296, -86.9105],
    address: "516 Northwestern Ave, West Lafayette, IN 47906",
    type: "academic",
  },
  {
    name: "Dudley Hall",
    shortName: "DUDL",
    aliases: ["DUDL", "Dudley Hall"],
    location: [40.4284, -86.9126],
    address: "Central Dr, West Lafayette, IN 47907",
    type: "academic",
  },
  {
    name: "Lambertus Hall",
    shortName: "LMBS",
    aliases: ["LMBS", "Lambertus Hall"],
    location: [40.4284, -86.9126],
    address: "Central Dr, West Lafayette, IN 47907",
    type: "academic",
  },
  {
    name: "Engineering and Technology Building - Purdue Indianapolis",
    shortName: "ET-INDY",
    aliases: [
      "Engineering and Technology Building - Purdue Indianapolis",
      "ET 333 - Purdue Indianapolis",
      "ET Building Indianapolis",
    ],
    location: [39.7744, -86.1752],
    address: "799 W Michigan St, Indianapolis, IN 46202",
    type: "academic",
  },
  {
    name: "16 Tech Innovation District - Purdue Indianapolis",
    shortName: "16TECH",
    aliases: [
      "16 Tech Innovation District - Purdue Indianapolis",
      "16 Tech",
      "16 Tech Innovation District",
    ],
    location: [39.784911, -86.184339],
    address: "1220 Waterway Blvd, Indianapolis, IN 46202",
    type: "academic",
  },
];

// In-memory index for fast coordinate resolution
const venueLookupMap = new Map<string, CampusBuildingDefinition>();

for (const bldg of CANONICAL_CAMPUS_BUILDINGS) {
  // Add lowercase building name
  venueLookupMap.set(bldg.name.toLowerCase(), bldg);
  // Add lowercase short name
  venueLookupMap.set(bldg.shortName.toLowerCase(), bldg);
  // Add all lowercase aliases
  for (const alias of bldg.aliases) {
    venueLookupMap.set(alias.toLowerCase(), bldg);
  }
}

/**
 * Given an event location string (e.g. "Stewart Center, Fowler Hall", "RAWL", "WALC 1055"),
 * resolves and returns the corresponding campus building, coordinates, and canonical name.
 */
export function resolveVenueCoordinates(
  rawLocation?: string
): { name: string; shortName?: string; location: [number, number]; address: string } | undefined {
  if (!rawLocation) return undefined;

  const trimmed = rawLocation.trim();
  if (!trimmed) return undefined;

  const lower = trimmed.toLowerCase();

  // 1. Direct exact lookup
  if (venueLookupMap.has(lower)) {
    const bldg = venueLookupMap.get(lower)!;
    return {
      name: bldg.name,
      shortName: bldg.shortName,
      location: bldg.location,
      address: bldg.address,
    };
  }

  // 2. Sub-string / prefix match (e.g. "WALC 1055" or "Stewart Center, Fowler Hall")
  // First check if string begins with a known building code like "WALC " or "RAWL "
  const firstWord = lower.split(/[\s,–-]+/)[0];
  if (firstWord && venueLookupMap.has(firstWord)) {
    const b = venueLookupMap.get(firstWord)!;
    return {
      name: b.name,
      shortName: b.shortName,
      location: b.location,
      address: b.address,
    };
  }

  // 3. Match against known aliases contained inside the string
  for (const bldg of CANONICAL_CAMPUS_BUILDINGS) {
    for (const alias of bldg.aliases) {
      if (alias.length >= 3 && lower.includes(alias.toLowerCase())) {
        return {
          name: bldg.name,
          shortName: bldg.shortName,
          location: bldg.location,
          address: bldg.address,
        };
      }
    }
  }

  return undefined;
}
