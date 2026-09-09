import { Event } from "@/types/event";

const now = Date.now();
const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;

export const mockEvents: Event[] = [
  {
    id: "evt-001",
    title: "Boiler Startup Pitch Night",
    description:
      "Join student founders and local startup mentors for lightning pitches, feedback sessions, and networking with Purdue entrepreneurs. Refreshments provided.",
    organization: "Burton D. Morgan Center for Entrepreneurship",
    categories: ["Entrepreneurship", "Tech", "Networking"],
    startsAt: now + ONE_HOUR_MS * 2,
    endsAt: now + ONE_HOUR_MS * 4,
    location: {
      name: "Burton D. Morgan Center (MRGN) 121",
      lat: 40.4237,
      lng: -86.9212,
    },
    imageUrl: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=600&q=80",
    // No fabricated Localist slug — fake /event/... paths 404 on Concept3D.
    source: "seed",
    distanceMiles: 0.3,
    detourMinutes: 4,
    reasons: ["Strong match for startups", "Starts in 2 hours", "Free refreshments"],
  },
  {
    id: "evt-002",
    title: "AI & Machine Learning Tech Talk: Autonomous Drones",
    description:
      "Deep dive into real-time computer vision and autonomous flight algorithms hosted by Purdue CS and Robotics researchers. Q&A and demo included.",
    organization: "Purdue Computer Science Club",
    categories: ["AI", "Tech", "Workshops"],
    startsAt: now + ONE_HOUR_MS * 5,
    endsAt: now + ONE_HOUR_MS * 7,
    location: {
      name: "Lawson Computer Science Building (LWSN) B155",
      lat: 40.4278,
      lng: -86.917,
    },
    imageUrl: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=600&q=80",
    source: "seed",
    distanceMiles: 0.2,
    detourMinutes: 2,
    reasons: ["Matches AI & tech keywords", "Campus landmark location"],
  },
  {
    id: "evt-003",
    title: "Purdue Space Program: Liquid Rocket Showcase",
    description:
      "See Purdue's record-breaking collegiate liquid rocket hardware up close and meet student propulsion engineers leading the next orbital mission.",
    organization: "Purdue Space Program (PSP)",
    categories: ["Engineering", "Aerospace", "Exhibitions"],
    startsAt: now + ONE_DAY_MS,
    endsAt: now + ONE_DAY_MS + ONE_HOUR_MS * 3,
    location: {
      name: "Neil Armstrong Hall of Engineering (ARMS) Atrium",
      lat: 40.4309,
      lng: -86.9157,
    },
    imageUrl: "https://images.unsplash.com/photo-1517976487502-5f69c5e3f5e5?auto=format&fit=crop&w=600&q=80",
    source: "seed",
    distanceMiles: 0.5,
    detourMinutes: 6,
    reasons: ["High engagement campus event", "Engineering highlight"],
  },
  {
    id: "evt-004",
    title: "BoilerMake Hackathon Opening Ceremony",
    description:
      "36 hours of building, hacking, and workshops. Kickoff ceremony, sponsor keynote, API demos, team formation mixer, and dinner.",
    organization: "BoilerMake",
    categories: ["Hackathon", "Tech", "Social"],
    startsAt: now + ONE_DAY_MS * 2,
    endsAt: now + ONE_DAY_MS * 3.5,
    location: {
      name: "France A. Córdova Recreational Sports Center (Co-Rec) Feature Gym",
      lat: 40.4285,
      lng: -86.9224,
    },
    imageUrl: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=600&q=80",
    url: "https://boilermake.org",
    source: "seed",
    distanceMiles: 0.4,
    detourMinutes: 5,
    reasons: ["Major campus hackathon", "Team formation mixer"],
  },
  {
    id: "evt-005",
    title: "Purdue Memorial Union Late Night Live Music & Board Games",
    description:
      "Wind down with acoustic student performances, giant board games, mocktails, and fresh snacks in the Union Commons.",
    organization: "Purdue Student Union Board (PSUB)",
    categories: ["Social", "Music", "Campus Life"],
    startsAt: now + ONE_HOUR_MS * 6,
    endsAt: now + ONE_HOUR_MS * 9,
    location: {
      name: "Purdue Memorial Union (PMU) Great Hall",
      lat: 40.425,
      lng: -86.9114,
    },
    imageUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
    source: "seed",
    distanceMiles: 0.6,
    detourMinutes: 7,
    reasons: ["Evening social event", "Free food & live music"],
  },
  {
    id: "evt-006",
    title: "Krach Study Jam & Boba Social",
    description:
      "Bring your laptops and group projects! Complimentary boba for the first 100 students, whiteboards, quiet study corners, and collaboration rooms.",
    organization: "Asian Student Union Board",
    categories: ["Social", "Food", "Study"],
    startsAt: now + ONE_HOUR_MS * 3,
    endsAt: now + ONE_HOUR_MS * 6,
    location: {
      name: "Krach Leadership Center (KRACH) 2nd Floor Lounge",
      lat: 40.4272,
      lng: -86.9208,
    },
    imageUrl: "https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=600&q=80",
    source: "seed",
    distanceMiles: 0.25,
    detourMinutes: 3,
    reasons: ["Starts soon", "Free boba provided"],
  },
];
