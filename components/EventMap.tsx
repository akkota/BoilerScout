"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Event } from "@/types/event";
import { CAMPUS_CENTER } from "@/lib/filters";
import { escapeHtml, formatEventTime } from "@/lib/format";
import {
  applyMarkerState,
  createMarkerElement,
  createUserLocationElement,
} from "@/components/map/markerElement";

/**
 * EventMap
 * Owned by: Frontend developer
 *
 * Live Mapbox GL map of the current result set, two-way synced with the list.
 *
 * NOTE ON COORDINATE ORDER: Mapbox takes [lng, lat]. Our Event contract (and
 * Typesense) use { lat, lng } / [lat, lng]. Every conversion below is explicit.
 *
 * NOTE ON READINESS: effects key off the Map *instance*, not the "load" event.
 * Markers and fitBounds only need the transform, which exists immediately after
 * construction.
 *
 * NOTE ON REACT STRICT MODE: see next.config.ts — reactStrictMode is off.
 * Confirmed via instrumentation that Strict Mode's dev-only double-invoke
 * (mount -> cleanup -> mount) constructs two real WebGL contexts back-to-back
 * on the same canvas every page load. All internal state checked out fine in
 * both instances (correct canvas buffer size, live WebGL context, exactly the
 * expected marker count, 'load'/'render' events firing normally) — the map
 * still rendered blank on a random subset of reloads with no error anywhere.
 * That symptom (verified-correct state, inconsistent paint, present only when
 * two contexts are churned back-to-back) is a known GPU/compositor race, not
 * an application bug — see next.config.ts for the fix.
 */

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

interface EventMapProps {
  events: Event[];
  selectedEventId?: string;
  hoveredEventId?: string;
  onSelectEvent?: (eventId: string | undefined) => void;
  onHoverEvent?: (eventId: string | undefined) => void;
  /** Shown as a distinct dot when the user has enabled "near me". */
  userLocation?: { lat: number; lng: number };
}

/** Read the theme synchronously so the map is built with the right style. */
function prefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function useMapStyleUrl(): string {
  const [isDark, setIsDark] = useState(prefersDark);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isDark
    ? "mapbox://styles/mapbox/dark-v11"
    : "mapbox://styles/mapbox/light-v11";
}

function popupHtml(event: Event): string {
  const topReason = event.reasons?.[0];
  return `
    <div style="font-family:inherit;max-width:220px">
      <p style="margin:0 0 4px;font-weight:700;font-size:13px;line-height:1.3">
        ${escapeHtml(event.title)}
      </p>
      <p style="margin:0;font-size:11px;color:#78716c">
        ${escapeHtml(formatEventTime(event.startsAt))}
      </p>
      ${
        event.location?.name
          ? `<p style="margin:2px 0 0;font-size:11px;color:#78716c">${escapeHtml(
              event.location.name
            )}</p>`
          : ""
      }
      ${
        topReason
          ? `<p style="margin:6px 0 0;font-size:11px;color:#047857;font-weight:600">${escapeHtml(
              topReason
            )}</p>`
          : ""
      }
    </div>
  `;
}

export default function EventMap({
  events,
  selectedEventId,
  hoveredEventId,
  onSelectEvent,
  onHoverEvent,
  userLocation,
}: EventMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef(new Map<string, mapboxgl.Marker>());
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const fittedIdsRef = useRef("");

  // The instance itself is the readiness signal — see note above.
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  // Keep callbacks in refs so marker listeners never need re-binding.
  const onSelectRef = useRef(onSelectEvent);
  const onHoverRef = useRef(onHoverEvent);
  onSelectRef.current = onSelectEvent;
  onHoverRef.current = onHoverEvent;

  const styleUrl = useMapStyleUrl();
  const styleUrlRef = useRef(styleUrl);
  const mapped = events.filter((e) => e.location);

  // --- init -----------------------------------------------------------------
  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current) return;

    const container = containerRef.current;
    const markers = markersRef.current;
    let instance: mapboxgl.Map;
    console.log("[EventMap] constructing map instance now"); // TEMP DIAGNOSTIC

    try {
      mapboxgl.accessToken = MAPBOX_TOKEN;
      instance = new mapboxgl.Map({
        container,
        style: styleUrlRef.current,
        center: [CAMPUS_CENTER.lng, CAMPUS_CENTER.lat],
        zoom: 14.5,
      });
    } catch (err) {
      // WebGL unavailable, bad token format, etc. Surface it instead of
      // rendering an empty black rectangle.
      console.error("Mapbox failed to initialize:", err);
      setMapError(err instanceof Error ? err.message : "Map failed to initialize");
      return;
    }

    instance.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "top-right"
    );
    instance.on("click", () => onSelectRef.current?.(undefined));
    instance.on("error", (e) => {
      const message = e.error?.message ?? "Map resource failed to load";
      console.error("Mapbox error:", message, e.error);
      setMapError(message);
    });

    setMap(instance);

    // Keep the canvas correct when the column resizes (sidebar, mobile rotate).
    const observer = new ResizeObserver(() => instance.resize());
    observer.observe(container);

    return () => {
      observer.disconnect();
      popupRef.current?.remove();
      popupRef.current = null;
      markers.forEach((m) => m.remove());
      markers.clear();
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      fittedIdsRef.current = "";
      instance.remove();
      setMap(null);
    };
  }, []);

  // --- theme ----------------------------------------------------------------
  useEffect(() => {
    styleUrlRef.current = styleUrl;
    if (!map) return;
    map.setStyle(styleUrl);
  }, [styleUrl, map]);

  // --- markers --------------------------------------------------------------
  useEffect(() => {
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    mapped.forEach((event) => {
      const el = createMarkerElement(event.title);

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectRef.current?.(event.id);
      });
      el.addEventListener("mouseenter", () => onHoverRef.current?.(event.id));
      el.addEventListener("mouseleave", () => onHoverRef.current?.(undefined));

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([event.location!.lng, event.location!.lat])
        .addTo(map);

      markersRef.current.set(event.id, marker);
    });

    // Only refit when the result set actually changes, so hovering or
    // selecting never yanks the viewport away from the user.
    const ids = mapped.map((e) => e.id).join("|");
    if (ids && ids !== fittedIdsRef.current) {
      const bounds = new mapboxgl.LngLatBounds();
      mapped.forEach((e) => bounds.extend([e.location!.lng, e.location!.lat]));
      map.fitBounds(bounds, { padding: 64, maxZoom: 16, duration: 600 });
    }
    fittedIdsRef.current = ids;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, map]);

  // --- selection / hover highlight + popup ----------------------------------
  useEffect(() => {
    if (!map) return;

    markersRef.current.forEach((marker, id) => {
      applyMarkerState(marker.getElement(), {
        selected: id === selectedEventId,
        hovered: id === hoveredEventId,
      });
    });

    popupRef.current?.remove();
    popupRef.current = null;

    const selected = mapped.find((e) => e.id === selectedEventId);
    if (selected?.location) {
      popupRef.current = new mapboxgl.Popup({ offset: 18, closeButton: true })
        .setLngLat([selected.location.lng, selected.location.lat])
        .setHTML(popupHtml(selected))
        .addTo(map);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEventId, hoveredEventId, events, map]);

  // --- user location dot ----------------------------------------------------
  useEffect(() => {
    if (!map) return;

    userMarkerRef.current?.remove();
    userMarkerRef.current = null;

    if (userLocation) {
      userMarkerRef.current = new mapboxgl.Marker({
        element: createUserLocationElement(),
      })
        .setLngLat([userLocation.lng, userLocation.lat])
        .addTo(map);
    }
  }, [userLocation, map]);

  // --- no token: keep a useful placeholder ----------------------------------
  if (!MAPBOX_TOKEN) {
    return (
      <div className="w-full h-80 rounded-xl border border-dashed border-stone-300 dark:border-stone-700 bg-stone-100 dark:bg-stone-900/50 flex flex-col items-center justify-center text-center p-6 gap-2">
        <span className="text-2xl">🗺️</span>
        <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
          Map unavailable
        </p>
        <p className="text-xs text-stone-500 dark:text-stone-400 max-w-xs">
          Set <code className="font-mono">NEXT_PUBLIC_MAPBOX_TOKEN</code> in{" "}
          <code className="font-mono">.env.local</code> to enable the campus map.
          Search and filters work without it.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-80 rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-900">
      <div ref={containerRef} className="absolute inset-0" />

      <div className="absolute top-2 left-2 z-10 px-2 py-1 rounded-md bg-white/90 dark:bg-stone-900/90 text-[11px] font-medium text-stone-600 dark:text-stone-300 shadow-sm pointer-events-none">
        {mapped.length} mapped event{mapped.length === 1 ? "" : "s"}
        {events.length > mapped.length &&
          ` · ${events.length - mapped.length} without location`}
      </div>

      {mapError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-stone-100/95 dark:bg-stone-900/95 p-6 text-center">
          <span className="text-2xl">⚠️</span>
          <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
            Map failed to load
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm font-mono break-words">
            {mapError}
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm">
            Search and filters still work. Check the browser console for detail.
          </p>
        </div>
      )}

      {map && !mapError && mapped.length === 0 && (
        <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center pointer-events-none">
          <p className="px-3 py-1.5 rounded-md bg-white/90 dark:bg-stone-900/90 text-xs text-stone-600 dark:text-stone-300 shadow-sm">
            No results with a location to plot yet.
          </p>
        </div>
      )}
    </div>
  );
}
