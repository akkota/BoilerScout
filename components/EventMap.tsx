"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "@/components/map/leaflet.css";
import { Event } from "@/types/event";
import type { NearPlace, RouteScoutResponse } from "@/types/search";
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
 * Leaflet + Mapbox Static Tiles (plain <img> rasters, DOM markers). Mapbox GL
 * JS was replaced because WebGL compositing rendered a blank canvas despite
 * valid tiles/context. We still use NEXT_PUBLIC_MAPBOX_TOKEN — for these
 * raster tiles and later for the Directions API (RouteScout). CARTO was
 * tried first but now requires its own API key; Mapbox keys do not unlock it.
 *
 * NOTE ON COORDINATE ORDER: Leaflet uses [lat, lng], matching Event.location
 * and Typesense. This is the opposite of Mapbox GL's [lng, lat]. Conversions
 * below are explicit so a future Mapbox call site cannot silently swap them.
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
  /** Reused server-resolved Mapbox walking geometry for RouteScout. */
  routeScout?: RouteScoutResponse;
  /** Resolved "near <place>" anchor — kept in view so the radius reads clearly. */
  nearPlace?: NearPlace;
}

type MarkerEntry = { marker: L.Marker; el: HTMLButtonElement };

const MAPBOX_ATTR =
  '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

function hasPlottableLocation(
  event: Event
): event is Event & { location: { name: string; lat: number; lng: number } } {
  const loc = event.location;
  return Boolean(
    loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)
  );
}

/** Leaflet LatLng is [lat, lng] — same as Event.location, unlike Mapbox. */
function toLatLng(loc: { lat: number; lng: number }): L.LatLngExpression {
  return [loc.lat, loc.lng];
}

/** Mapbox Static Tiles API — raster PNGs keyed by the same pk. token. */
function createBasemapLayer(isDark: boolean, token: string): L.TileLayer {
  const style = isDark ? "dark-v11" : "light-v11";
  return L.tileLayer(
    `https://api.mapbox.com/styles/v1/mapbox/${style}/tiles/512/{z}/{x}/{y}@2x?access_token=${token}`,
    {
      attribution: MAPBOX_ATTR,
      tileSize: 512,
      zoomOffset: -1,
      maxZoom: 22,
    }
  );
}

function markerIcon(el: HTMLElement, size: number): L.DivIcon {
  return L.divIcon({
    className: "bs-marker",
    html: el,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/** Read the theme synchronously so the first tile layer is the right variant. */
function prefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function usePrefersDark(): boolean {
  const [isDark, setIsDark] = useState(prefersDark);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isDark;
}

function popupHtml(event: Event): string {
  const topReason = event.reasons?.find((r) => r?.trim());
  const when = formatEventTime(event.startsAt);
  return `
    <div style="font-family:inherit;max-width:220px">
      <p style="margin:0 0 4px;font-weight:700;font-size:13px;line-height:1.3">
        ${escapeHtml(event.title?.trim() || "Untitled event")}
      </p>
      ${
        when
          ? `<p style="margin:0;font-size:11px;color:#78716c">${escapeHtml(when)}</p>`
          : ""
      }
      ${
        event.location?.name?.trim()
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
  routeScout,
  nearPlace,
}: EventMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef(new Map<string, MarkerEntry>());
  const popupRef = useRef<L.Popup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const tilesRef = useRef<L.TileLayer | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const nearCircleRef = useRef<L.Circle | null>(null);
  const fittedIdsRef = useRef("");

  const [map, setMap] = useState<L.Map | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  const onSelectRef = useRef(onSelectEvent);
  const onHoverRef = useRef(onHoverEvent);
  onSelectRef.current = onSelectEvent;
  onHoverRef.current = onHoverEvent;

  const isDark = usePrefersDark();
  const mapped = events.filter(hasPlottableLocation);

  // --- init -----------------------------------------------------------------
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const markers = markersRef.current;
    let instance: L.Map;

    try {
      instance = L.map(container, {
        // Leaflet: [lat, lng] — matches CAMPUS_CENTER / Event.location.
        center: [CAMPUS_CENTER.lat, CAMPUS_CENTER.lng],
        zoom: 14.5,
        zoomControl: false,
        // Popup open/close is driven by selectedEventId, not Leaflet defaults.
        closePopupOnClick: false,
      });
    } catch (err) {
      console.error("Leaflet failed to initialize:", err);
      setMapError(
        err instanceof Error ? err.message : "Map failed to initialize"
      );
      return;
    }

    L.control.zoom({ position: "topright" }).addTo(instance);
    instance.on("click", () => onSelectRef.current?.(undefined));

    const observer = new ResizeObserver(() => {
      instance.invalidateSize({ animate: false });
    });
    observer.observe(container);
    requestAnimationFrame(() => instance.invalidateSize({ animate: false }));

    setMap(instance);

    return () => {
      observer.disconnect();
      popupRef.current?.remove();
      popupRef.current = null;
      markers.forEach(({ marker }) => marker.remove());
      markers.clear();
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      tilesRef.current = null;
      routeLayerRef.current?.remove();
      routeLayerRef.current = null;
      nearCircleRef.current?.remove();
      nearCircleRef.current = null;
      fittedIdsRef.current = "";
      instance.remove();
      setMap(null);
    };
  }, []);

  // --- theme: swap Mapbox light/dark rasters without rebuilding the map -----
  useEffect(() => {
    if (!map || !MAPBOX_TOKEN) return;
    tilesRef.current?.remove();
    tilesRef.current = createBasemapLayer(isDark, MAPBOX_TOKEN).addTo(map);
  }, [isDark, map]);

  // --- markers --------------------------------------------------------------
  useEffect(() => {
    if (!map) return;

    markersRef.current.forEach(({ marker }) => marker.remove());
    markersRef.current.clear();

    mapped.forEach((event) => {
      const loc = event.location!;
      const el = createMarkerElement(event.title?.trim() || "Event");

      L.DomEvent.disableClickPropagation(el);
      el.addEventListener("click", () => onSelectRef.current?.(event.id));
      el.addEventListener("mouseenter", () => onHoverRef.current?.(event.id));
      el.addEventListener("mouseleave", () => onHoverRef.current?.(undefined));

      const marker = L.marker(toLatLng(loc), {
        icon: markerIcon(el, 36),
        keyboard: false,
        title: event.title?.trim() || "Event",
      }).addTo(map);

      const iconEl = marker.getElement();
      if (iconEl) L.DomEvent.disableClickPropagation(iconEl);

      markersRef.current.set(event.id, { marker, el });
    });

    // Only refit when the result set actually changes, so hovering or
    // selecting never yanks the viewport away from the user.
    const routePoints = routeScout?.points ?? [];
    const anchor = nearPlace ? [toLatLng(nearPlace)] : [];
    const viewPoints = [
      ...mapped.map((event) => toLatLng(event.location!)),
      ...routePoints.map((point) => toLatLng(point)),
      ...anchor,
    ];
    const ids = `${mapped.map((e) => e.id).join("|")}::${routePoints
      .map((point) => `${point.lat},${point.lng}`)
      .join("|")}::${nearPlace ? `${nearPlace.lat},${nearPlace.lng}` : ""}`;
    if (viewPoints.length > 1 && ids !== fittedIdsRef.current) {
      const bounds = L.latLngBounds(
        viewPoints
      );
      map.fitBounds(bounds, {
        padding: [64, 64],
        maxZoom: 16,
        animate: true,
        duration: 0.6,
      });
    }
    fittedIdsRef.current = ids;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, map, routeScout, nearPlace]);

  // --- "near <place>" radius circle ----------------------------------------
  useEffect(() => {
    if (!map) return;

    nearCircleRef.current?.remove();
    nearCircleRef.current = null;

    if (!nearPlace) return;

    nearCircleRef.current = L.circle(toLatLng(nearPlace), {
      // Leaflet circles are metres; the contract radius is miles.
      radius: nearPlace.radiusMiles * 1609.344,
      color: "#0d9488",
      weight: 2,
      opacity: 0.8,
      fillColor: "#0d9488",
      fillOpacity: 0.06,
      interactive: false,
    }).addTo(map);
  }, [map, nearPlace]);

  // --- RouteScout geometry -------------------------------------------------
  useEffect(() => {
    if (!map) return;

    routeLayerRef.current?.remove();
    routeLayerRef.current = null;

    if (!routeScout?.points || routeScout.points.length < 2) return;

    routeLayerRef.current = L.polyline(
      routeScout.points.map((point) => toLatLng(point)),
      {
        color: "#d97706",
        weight: 5,
        opacity: 0.9,
        lineCap: "round",
        lineJoin: "round",
        interactive: false,
      }
    ).addTo(map);
  }, [map, routeScout]);

  // --- selection / hover highlight + popup ----------------------------------
  useEffect(() => {
    if (!map) return;

    markersRef.current.forEach(({ marker, el }, id) => {
      const selected = id === selectedEventId;
      const hovered = id === hoveredEventId;
      applyMarkerState(el, { selected, hovered });
      marker.setZIndexOffset(selected || hovered ? 1000 : 0);
    });

    popupRef.current?.remove();
    popupRef.current = null;

    const selected = mapped.find((e) => e.id === selectedEventId);
    if (selected?.location) {
      popupRef.current = L.popup({
        offset: [0, -18],
        closeButton: true,
        autoPan: false,
        closeOnClick: false,
        className: "bs-popup",
      })
        .setLatLng(toLatLng(selected.location))
        .setContent(popupHtml(selected))
        .openOn(map);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEventId, hoveredEventId, events, map]);

  // --- user location dot ----------------------------------------------------
  useEffect(() => {
    if (!map) return;

    userMarkerRef.current?.remove();
    userMarkerRef.current = null;

    if (
      userLocation &&
      Number.isFinite(userLocation.lat) &&
      Number.isFinite(userLocation.lng)
    ) {
      userMarkerRef.current = L.marker(toLatLng(userLocation), {
        icon: markerIcon(createUserLocationElement(), 28),
        interactive: false,
        keyboard: false,
        zIndexOffset: 500,
      }).addTo(map);
    }
  }, [userLocation, map]);

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
    <div className="bs-map relative w-full h-80 rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-900">
      <div ref={containerRef} className="absolute inset-0" />

      <div className="absolute top-2 left-2 z-10 px-2 py-1 rounded-md bg-white/90 dark:bg-stone-900/90 text-[11px] font-medium text-stone-600 dark:text-stone-300 shadow-sm pointer-events-none">
        {mapped.length} mapped event{mapped.length === 1 ? "" : "s"}
        {events.length > mapped.length &&
          ` · ${events.length - mapped.length} without location`}
      </div>

      {nearPlace && (
        <div className="absolute top-10 left-2 z-10 px-2 py-1 rounded-md bg-teal-100/95 dark:bg-teal-950/95 text-[11px] font-semibold text-teal-900 dark:text-teal-100 shadow-sm pointer-events-none">
          Within {nearPlace.radiusMiles} mi of {nearPlace.name}
        </div>
      )}

      {routeScout && (
        <div className="absolute top-10 left-2 z-10 px-2 py-1 rounded-md bg-amber-100/95 dark:bg-amber-950/95 text-[11px] font-semibold text-amber-900 dark:text-amber-100 shadow-sm pointer-events-none">
          RouteScout{routeScout.originName && routeScout.destinationName
            ? `: ${routeScout.originName} → ${routeScout.destinationName}`
            : " active"}
        </div>
      )}

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
