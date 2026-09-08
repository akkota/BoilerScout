import { Event } from "@/types/event";
import { SearchRequest, SearchResponse } from "@/types/search";

/**
 * Local mock layer — FRONTEND dev only.
 *
 * Lets us build/demo the UI when the backend `/api/search` is unavailable or
 * still returning stub data. Activated by:
 *   - `?mock=1` in the URL, or
 *   - `localStorage.setItem("boilerscout:mock", "1")`
 * See `lib/api/search.ts`.
 *
 * These objects match the frozen SearchResponse contract exactly. Reasons are
 * written the way the backend is expected to phrase them — plain language, no
 * percentages.
 */

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
// Recompute "now" on each read so time-based UI (chips, "starts soon") stays fresh.
const now = () => Date.now();

function baseEvents(): Event[] {
  const t = now();
  return [
    {
      id: "evt-001",
      title: "Boiler Startup Pitch Night",
      description:
        "Student founders and local mentors run lightning pitches, feedback rounds, and open networking. Refreshments provided.",
      organization: "Burton D. Morgan Center for Entrepreneurship",
      categories: ["Entrepreneurship", "Tech", "Networking", "Social"],
      startsAt: t + 2 * HOUR,
      endsAt: t + 4 * HOUR,
      location: { name: "Burton D. Morgan Center (MRGN) 121", lat: 40.4237, lng: -86.9212 },
      imageUrl:
        "https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=600&q=80",
      url: "https://events.purdue.edu/event/boiler_startup_pitch_night",
      source: "purdue-events",
      distanceMiles: 0.3,
      reasons: ["Strong meaning match", "Starts soon", "0.3 miles away", "Matches startups"],
    },
    {
      id: "evt-002",
      title: "AI & Machine Learning Tech Talk: Autonomous Drones",
      description:
        "Purdue CS and Robotics researchers walk through real-time computer vision and autonomous flight. Live demo and Q&A.",
      organization: "Purdue Computer Science Club",
      categories: ["AI", "Tech", "Workshops"],
      startsAt: t + 5 * HOUR,
      endsAt: t + 7 * HOUR,
      location: { name: "Lawson Computer Science Building (LWSN) B155", lat: 40.4278, lng: -86.917 },
      imageUrl:
        "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=600&q=80",
      url: "https://events.purdue.edu/event/ai_ml_tech_talk",
      source: "purdue-events",
      distanceMiles: 0.2,
      reasons: ["Strong meaning match", "Matches AI", "0.2 miles away"],
    },
    {
      id: "evt-003",
      title: "Krach Study Jam & Boba Social",
      description:
        "Bring your group projects. Free boba for the first 100 students, whiteboards, quiet corners, and collaboration rooms.",
      organization: "Asian Student Union Board",
      categories: ["Social", "Food", "Study"],
      startsAt: t + 3 * HOUR,
      endsAt: t + 6 * HOUR,
      location: { name: "Krach Leadership Center (KRACH) 2nd Floor Lounge", lat: 40.4272, lng: -86.9208 },
      imageUrl:
        "https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=600&q=80",
      url: "https://events.purdue.edu/event/krach_boba_social",
      source: "purdue-events",
      distanceMiles: 0.25,
      reasons: ["Starts soon", "Free event", "0.25 miles away"],
    },
    {
      id: "evt-004",
      title: "PMU Late Night: Live Music & Board Games",
      description:
        "Acoustic student performances, giant board games, mocktails, and snacks in the Union Commons.",
      organization: "Purdue Student Union Board (PSUB)",
      categories: ["Social", "Music", "Campus Life"],
      startsAt: t + 6 * HOUR,
      endsAt: t + 9 * HOUR,
      location: { name: "Purdue Memorial Union (PMU) Great Hall", lat: 40.4250, lng: -86.9114 },
      imageUrl:
        "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
      url: "https://events.purdue.edu/event/pmu_late_night",
      source: "purdue-events",
      distanceMiles: 0.6,
      reasons: ["Related by topic", "Free event", "Starts today"],
    },
    {
      id: "evt-005",
      title: "Purdue Space Program: Liquid Rocket Showcase",
      description:
        "See Purdue's record-breaking collegiate liquid rocket hardware up close and meet the student propulsion team.",
      organization: "Purdue Space Program (PSP)",
      categories: ["Engineering", "Aerospace", "Exhibitions"],
      startsAt: t + DAY,
      endsAt: t + DAY + 3 * HOUR,
      location: { name: "Neil Armstrong Hall of Engineering (ARMS) Atrium", lat: 40.4309, lng: -86.9157 },
      imageUrl:
        "https://images.unsplash.com/photo-1517976487502-5f69c5e3f5e5?auto=format&fit=crop&w=600&q=80",
      url: "https://events.purdue.edu/event/psp_rocket_showcase",
      source: "purdue-events",
      distanceMiles: 0.5,
      reasons: ["Matches engineering", "Popular campus event"],
    },
    {
      id: "evt-006",
      title: "BoilerMake Hackathon Opening Ceremony",
      description:
        "36 hours of building. Kickoff, sponsor keynote, API demos, team-formation mixer, and dinner.",
      organization: "BoilerMake",
      categories: ["Hackathon", "Tech", "Social"],
      startsAt: t + 2 * DAY,
      endsAt: t + 2 * DAY + 4 * HOUR,
      location: { name: "France A. Córdova Recreational Sports Center (Co-Rec)", lat: 40.4285, lng: -86.9224 },
      imageUrl:
        "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=600&q=80",
      url: "https://boilermake.org",
      source: "seed",
      distanceMiles: 0.4,
      reasons: ["Matches tech", "Team-formation mixer"],
    },
  ];
}

/** Very small local approximation of the backend search, good enough for UI dev. */
function localFilter(events: Event[], req: SearchRequest): Event[] {
  const q = req.query?.trim().toLowerCase() ?? "";
  const f = req.filters;
  let out = events;

  if (q) {
    const terms = q.split(/\s+/);
    out = out.filter((e) => {
      const hay = [
        e.title,
        e.description,
        e.organization ?? "",
        e.location?.name ?? "",
        e.categories.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return terms.some((term) => hay.includes(term));
    });
    // Nothing matched the keywords? Fake "semantic" by returning everything,
    // so the UI still has cards to render during a demo.
    if (out.length === 0) out = events;
  }

  if (f?.startAfter !== undefined) out = out.filter((e) => e.startsAt >= f.startAfter!);
  if (f?.startBefore !== undefined) out = out.filter((e) => e.startsAt <= f.startBefore!);
  if (f?.categories?.length) {
    const want = f.categories.map((c) => c.toLowerCase());
    out = out.filter((e) => e.categories.some((c) => want.includes(c.toLowerCase())));
  }
  if (f?.freeOnly) {
    out = out.filter((e) => e.reasons.some((r) => r.toLowerCase().includes("free")));
  }
  if (f?.center && f.radiusMiles !== undefined) {
    out = out.filter((e) => (e.distanceMiles ?? Infinity) <= f.radiusMiles! + 0.001);
  }

  // RouteScout: pretend the corridor keeps only events near Lawson→PMU.
  if (req.route?.points?.length) {
    const onRoute = new Set(["evt-002", "evt-003", "evt-004", "evt-001"]);
    out = out
      .filter((e) => onRoute.has(e.id))
      .map((e) => ({
        ...e,
        detourMinutes: { "evt-002": 2, "evt-003": 3, "evt-001": 4, "evt-004": 1 }[e.id],
        reasons: ["On your route", ...e.reasons].slice(0, 4),
      }));
  }

  return out;
}

/** Drop-in replacement for the real `/api/search` call. */
export async function mockSearch(req: SearchRequest): Promise<SearchResponse> {
  const start =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  // Simulate a little network + search latency.
  await new Promise((r) => setTimeout(r, 180 + Math.random() * 120));
  const events = localFilter(baseEvents(), req);
  const end = typeof performance !== "undefined" ? performance.now() : Date.now();
  return {
    events,
    found: events.length,
    tookMs: Math.round(end - start),
  };
}

/** Named fixtures for component stories / manual testing. */
export const sampleResponses = {
  normal: (): SearchResponse => {
    const events = baseEvents();
    return { events, found: events.length, tookMs: 41 };
  },
  route: (): SearchResponse =>
    ({
      events: localFilter(baseEvents(), {
        query: "",
        route: { points: [{ lat: 40.4278, lng: -86.917 }, { lat: 40.425, lng: -86.9114 }], corridorMeters: 150 },
      }),
      found: 4,
      tookMs: 53,
    }) as SearchResponse,
  empty: (): SearchResponse => ({ events: [], found: 0, tookMs: 22 }),
};
