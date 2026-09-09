/**
 * Restrict BoilerScout results to Purdue West Lafayette / nearby campus.
 * Does NOT require the word "Purdue". Keeps events that lack coordinates
 * unless their location text clearly points off-campus.
 */

/** Purdue WL campus center — shared with geo filters / map. */
export const WEST_LAFAYETTE_CAMPUS_CENTER = { lat: 40.4237, lng: -86.9212 };

/** Miles from campus center — covers WL + nearby parks/ag facilities, not Indy. */
export const CAMPUS_RADIUS_MILES = 12;

const OFF_CAMPUS_PLACE_PATTERNS: RegExp[] = [
  /\bindianapolis\b/i,
  /\bindy\b/i,
  /\bfort\s*wayne\b/i,
  /\bbloomington\b/i,
  /\bsouth\s*bend\b/i,
  /\bevanston\b/i,
  /\bchicago\b/i,
  /\bann\s*arbor\b/i,
  /\bseattle\b/i,
  /\bmadison,\s*wis/i,
  /\biowa\s*city\b/i,
  /\buniversity\s*park,\s*pa/i,
  /\blos\s*angeles\b/i,
  /\blahaina\b/i,
  /\bnassau\b/i,
  /\bhawaii\b/i,
  /\bhawai['']i\b/i,
  /\bbahamas\b/i,
  // Localist away style: "Franklin, Tenn." / "Seattle, Wash."
  // (West Lafayette, Ind. is kept earlier via CAMPUS_PLACE_HINTS.)
  /,\s*(Ala|Ariz|Ark|Calif|Colo|Conn|Del|Fla|Ga|Ill|Kan|Ky|La|Md|Mass|Mich|Minn|Miss|Mo|Mont|Neb|Nev|N\.?\s*H\.?|N\.?\s*J\.?|N\.?\s*M\.?|N\.?\s*Y\.?|N\.?\s*C\.?|N\.?\s*D\.?|Ohio|Okla|Ore|Pa|R\.?\s*I\.?|S\.?\s*C\.?|S\.?\s*D\.?|Tenn|Texas|Utah|Vt|Va|Wash|W\.?\s*Va\.?|Wis|Wyo)\.?\b/i,
  /,\s*(pa|oh|il|mi|wi|ca|tx|fl|ny|ia|hi|wa|or|mn|co|tn|al|az|ga|nc|sc|va|md|nj)\.?\b/i,
];

const CAMPUS_PLACE_HINTS: RegExp[] = [
  /\bwest\s*lafayette\b/i,
  /\bpurdue\s+(memorial|university|campus|mall|park)\b/i,
  /\b(lawson|stewart|krach|rawls|arms|mrgn|pmu|co-?rec|krannert|beering|walc|hicks)\b/i,
];

function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3958.8;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function textLooksOffCampus(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (CAMPUS_PLACE_HINTS.some((re) => re.test(trimmed))) return false;
  return OFF_CAMPUS_PLACE_PATTERNS.some((re) => re.test(trimmed));
}

export interface CampusScopeFields {
  title?: string;
  locationName?: string;
  location?: {
    name?: string;
    lat?: number;
    lng?: number;
  };
}

/**
 * True when an event belongs in normal West Lafayette campus discovery.
 */
export function isWestLafayetteCampusEvent(event: CampusScopeFields): boolean {
  const lat = event.location?.lat;
  const lng = event.location?.lng;
  const locationText = [event.location?.name, event.locationName]
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .join(" | ");
  const titleText = typeof event.title === "string" ? event.title : "";

  if (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  ) {
    const miles = haversineMiles(
      WEST_LAFAYETTE_CAMPUS_CENTER.lat,
      WEST_LAFAYETTE_CAMPUS_CENTER.lng,
      lat,
      lng
    );
    if (miles > CAMPUS_RADIUS_MILES) {
      return false;
    }
    // Near campus by coordinates — keep.
    return true;
  }

  // Prefer location fields for off-campus detection so titles like
  // "vs. IU Indy" do not drop home games hosted in West Lafayette.
  if (locationText.trim()) {
    if (CAMPUS_PLACE_HINTS.some((re) => re.test(locationText))) return true;
    if (textLooksOffCampus(locationText)) return false;
    return true;
  }

  // No location metadata: only drop when the title itself is clearly away.
  if (!titleText.trim()) return true;
  return !textLooksOffCampus(titleText);
}

export function filterCampusEvents<T extends CampusScopeFields>(events: T[]): T[] {
  return events.filter(isWestLafayetteCampusEvent);
}
