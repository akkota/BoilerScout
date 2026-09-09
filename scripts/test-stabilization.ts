import assert from "node:assert/strict";
import { prepareSearchRequest } from "@/lib/search/prepareSearchRequest";
import {
  buildRouteCorridor,
  isPointInRouteCorridor,
} from "@/lib/search/buildRouteCorridor";
import type { Event } from "@/types/event";
import type { DiscoverResponse } from "@/types/discover";
import type { SearchResponse } from "@/types/search";

const baseUrl = process.env.BOILERSCOUT_TEST_URL ?? "http://127.0.0.1:3000";

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  assert.equal(response.status, 200, `${path} should return HTTP 200`);
  return (await response.json()) as T;
}

function hasCoordinates(event: Event): event is Event & {
  location: { lat: number; lng: number; name: string };
} {
  return Boolean(
    event.location &&
      typeof event.location.lat === "number" &&
      typeof event.location.lng === "number"
  );
}

async function run(): Promise<void> {
  const purePrepared = await prepareSearchRequest({
    query: "events while walking from Purdue Memorial Union to Hillenbrand Hall",
  });
  assert.equal(purePrepared.request.query, "", "pure route content must stay empty");
  assert.equal(purePrepared.originName, "Purdue Memorial Union");
  assert.equal(purePrepared.destinationName, "Hillenbrand Hall");

  const aiPrepared = await prepareSearchRequest({
    query: "AI events while walking from Lawson to PMU",
  });
  assert.equal(aiPrepared.request.query, "AI", "AI must remain the content query");

  const pureRoute = await postJson<SearchResponse>("/api/search", {
    query: "events while walking from Purdue Memorial Union to Hillenbrand Hall",
  });
  assert.ok(pureRoute.routeScout, "pure RouteScout must return route geometry");
  assert.ok(pureRoute.routeScout.points.length >= 2);
  const corridor = buildRouteCorridor({
    points: pureRoute.routeScout.points,
    corridorMeters: pureRoute.routeScout.corridorMeters,
  });
  assert.ok(corridor, "returned route geometry must build a corridor");
  pureRoute.events.forEach((event) => {
    assert.ok(hasCoordinates(event), "RouteScout events require coordinates");
    assert.ok(
      isPointInRouteCorridor(event.location.lat, event.location.lng, corridor!),
      `${event.title} must be in the route corridor`
    );
  });

  const aiRoute = await postJson<SearchResponse>("/api/search", {
    query: "AI events while walking from Lawson to PMU",
  });
  assert.ok(aiRoute.routeScout, "AI RouteScout must retain route metadata");
  aiRoute.events.forEach((event) => {
    assert.ok(hasCoordinates(event), "AI RouteScout events require coordinates");
  });

  const robotics = await postJson<SearchResponse>("/api/search", { query: "robtoics" });
  assert.ok(robotics.events.length > 0, "robtoics should return a relevant result");
  assert.ok(
    robotics.events.some((event) => /ai|robot|autonom|drone/i.test(event.title)),
    "robtoics should return a robotics/AI-adjacent result"
  );

  const startupIntent = await postJson<SearchResponse>("/api/search", {
    query: "meet people building companies",
  });
  assert.ok(startupIntent.events.length > 0, "startup paraphrase should return events");
  assert.ok(
    startupIntent.events.every((event) => /realtalk|startup|entrepreneur|founder/i.test(
      `${event.title} ${event.description}`
    )),
    "startup paraphrase results should remain entrepreneurship-focused"
  );

  const computerScience = await postJson<SearchResponse>("/api/search", {
    query: "computer science",
  });
  assert.ok(computerScience.events.length > 0, "computer science should return events");
  assert.ok(
    computerScience.events.every((event) => /computer science/i.test(
      `${event.title} ${event.description}`
    )),
    "computer science must not drift to generic science"
  );

  const foodToday = await postJson<SearchResponse>("/api/search", {
    query: "free food today",
  });
  assert.ok(foodToday.events.length > 0, "free food today should return normal events");

  const now = Date.now();
  const filtered = await postJson<SearchResponse>("/api/search", {
    query: "",
    filters: {
      startAfter: now,
      startBefore: now + 7 * 24 * 60 * 60 * 1000,
      center: { lat: 40.4237, lng: -86.9212 },
      radiusMiles: 2,
      categories: ["Lecture/talk"],
      freeOnly: true,
    },
  });
  assert.ok(filtered.events.length > 0, "combined filters should retain qualifying events");
  filtered.events.forEach((event) => {
    assert.ok(event.startsAt >= now && event.startsAt <= now + 7 * 24 * 60 * 60 * 1000);
    assert.equal(event.free, true);
    assert.ok(event.categories.includes("Lecture/talk"));
    assert.ok(hasCoordinates(event), "radius-filtered events require coordinates");
  });

  const discover = await postJson<DiscoverResponse>("/api/discover", { query: "robotics" });
  assert.equal(discover.groups.events.status, "ok");
  assert.equal(discover.groups.organizations.status, "ok");
  assert.equal(discover.groups.venues.status, "ok");
  assert.ok(discover.groups.events.items.length > 0);
  assert.ok(discover.groups.organizations.items.length > 0);
  assert.ok(discover.groups.venues.items.length > 0);

  console.log("Stabilization regression checks passed.");
}

run().catch((error) => {
  console.error("Stabilization regression failure:", error);
  process.exit(1);
});
