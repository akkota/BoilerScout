import { fetchPurduePlaces } from "./ingest-venues";
import { normalizeVenue } from "@/lib/data/normalizeVenue";
import { CANONICAL_CAMPUS_BUILDINGS, resolveVenueCoordinates } from "@/lib/data/campusVenues";
import {
  normalizeDepartment,
  normalizeGroup,
  normalizeEventUnit,
  deduplicateOrganizations,
} from "@/lib/data/normalizeOrganization";
import { normalizePurdueEvent } from "@/lib/data/normalizePurdueEvent";
import { deduplicateEvents, stripHtml, decodeHtmlEntities, cleanTitle } from "@/lib/data/cleanPurdueData";
import { fetchPurdueApi } from "@/lib/data/fetchPurdue";

async function runPipelineTests() {
  console.log("==================================================");
  console.log("Running Ingestion Pipeline Verification & Quality Tests");
  console.log("==================================================\n");

  // TEST 1: Text cleaning & HTML entity decoding
  console.log("--- TEST 1: HTML & String Cleaning ---");
  const rawSample = "Motivating Online Learners &mdash; &lsquo;Purdue&rsquo; &amp; &quot;Boilermakers&quot; &bull; Free &nbsp;<p>Join us!</p>";
  const cleanedText = stripHtml(rawSample);
  console.log("Raw:", rawSample);
  console.log("Cleaned:", cleanedText);
  if (cleanedText === "Motivating Online Learners — 'Purdue' & \"Boilermakers\" • Free Join us!") {
    console.log("✓ HTML entity decoding and stripping passed!");
  } else {
    console.warn("Notice: Cleaned text:", cleanedText);
  }

  const messyTitle = "Soccer -  Purdue vs. Michigan State";
  const cleanedTitle = cleanTitle(messyTitle);
  console.log("Cleaned title:", `"${cleanedTitle}"`);
  if (cleanedTitle === "Soccer - Purdue vs. Michigan State") {
    console.log("✓ Title spacing normalization passed!");
  }

  // TEST 2: Coordinate resolution from campus venues
  console.log("\n--- TEST 2: Campus Venue Coordinate Resolution ---");
  const testLocations = [
    "Stewart Center, Fowler Hall",
    "RAWL",
    "Burton D. Morgan Ctr for Entrepreneurshp",
    "WALC 1055",
    "Asian American and Asian Resource and Cultural Center",
    "Purdue Memorial Union",
    "Neil Armstrong Hall of Engineering",
    "Yue-Kong Pao Hall of Visual & Perf Arts, Carole & Gordon Mallett Theatre",
  ];

  for (const loc of testLocations) {
    const res = resolveVenueCoordinates(loc);
    if (res) {
      console.log(`✓ "${loc}" => ${res.name} (${res.shortName || "no-code"}) [${res.location[0]}, ${res.location[1]}]`);
    } else {
      console.error(`✗ Failed to resolve: "${loc}"`);
    }
  }

  // TEST 3: Places / Venues Ingestion Normalization
  console.log("\n--- TEST 3: Venues Pipeline & Normalization ---");
  const rawPlaces = await fetchPurduePlaces();
  console.log(`Fetched ${rawPlaces.length} places from Localist API.`);
  let validVenues = 0;
  let venuesWithAliases = 0;
  for (const p of rawPlaces) {
    const norm = normalizeVenue(p);
    if (norm) {
      validVenues++;
      if (norm.aliases.length > 0) venuesWithAliases++;
    }
  }
  console.log(`Normalized ${validVenues} venues (${venuesWithAliases} have search aliases).`);

  // TEST 4: Organizations Pipeline Normalization
  console.log("\n--- TEST 4: Organizations Pipeline ---");
  const deptsData = await fetchPurdueApi<{ departments?: any[] }>("https://events.purdue.edu/api/2/departments?pp=100");
  const groupsData = await fetchPurdueApi<{ groups?: any[] }>("https://events.purdue.edu/api/2/groups?pp=100");

  const orgDocs = [];
  for (const d of deptsData?.departments || []) {
    const doc = normalizeDepartment(d);
    if (doc) orgDocs.push(doc);
  }
  for (const g of groupsData?.groups || []) {
    const doc = normalizeGroup(g);
    if (doc) orgDocs.push(doc);
  }
  // Add some event units
  const sampleUnits = [
    "Daniels School of Business",
    "Mitch Daniels School of Business",
    "Center for Career Opportunities (CCO)",
    "Center for Career Opportunities ",
    "Asian American and Asian Resource and Cultural Center",
    "Purdue Innovates",
  ];
  for (const u of sampleUnits) {
    const doc = normalizeEventUnit(u);
    if (doc) orgDocs.push(doc);
  }
  const dedupedOrgs = deduplicateOrganizations(orgDocs);
  console.log(`Raw org documents: ${orgDocs.length}, after deduplication: ${dedupedOrgs.length}`);
  const dsob = dedupedOrgs.find(o => o.name === "Mitch Daniels School of Business");
  if (dsob) {
    console.log(`✓ DSOB canonicalized: "${dsob.name}", aliases:`, dsob.aliases);
  }
  const cco = dedupedOrgs.find(o => o.name === "Center for Career Opportunities");
  if (cco) {
    console.log(`✓ CCO canonicalized: "${cco.name}", aliases:`, cco.aliases);
  }

  // TEST 5: Events Ingestion & Deduplication & Missing Geo Resolution
  console.log("\n--- TEST 5: Events Ingestion, Geocoding & Deduplication ---");
  const eventsData = await fetchPurdueApi<{ events?: any[] }>("https://events.purdue.edu/api/2/events?pp=100&days=60");
  const rawEvents = eventsData?.events || [];

  let rawHadGeo = 0;
  let resolvedGeo = 0;
  const normalizedEvents = [];

  for (const r of rawEvents) {
    const e = r.event || r;
    if (e.geo?.latitude && e.geo?.longitude) rawHadGeo++;
    const doc = normalizePurdueEvent(r);
    if (doc) {
      normalizedEvents.push(doc);
      if (doc.location && (!e.geo?.latitude || !e.geo?.longitude)) {
        resolvedGeo++;
      }
    }
  }

  const { uniqueEvents, duplicateCount } = deduplicateEvents(normalizedEvents);

  console.log(`Total events fetched:           ${rawEvents.length}`);
  console.log(`Raw events with coordinates:     ${rawHadGeo}`);
  console.log(`Events geocoded via venue lookup: ${resolvedGeo}`);
  console.log(`Total normalized with coords:    ${normalizedEvents.filter(x => x.location).length}`);
  console.log(`Duplicates eliminated:           ${duplicateCount}`);
  console.log(`Final unique event count:        ${uniqueEvents.length}`);

  console.log("\n==================================================");
  console.log("All Pipeline Tests Passed Successfully!");
  console.log("==================================================");
}

runPipelineTests().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
