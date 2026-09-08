/**
 * Imperative marker DOM for Leaflet DivIcons.
 * Owned by: Frontend developer
 *
 * Markers live outside React's tree, so their styling is applied directly
 * rather than through Tailwind classes (which would also risk being purged,
 * since these class names never appear in JSX).
 */

export interface MarkerVisualState {
  selected: boolean;
  hovered: boolean;
}

const BASE_SIZE = 20;
const ACTIVE_SIZE = 28;

const AMBER_500 = "#f59e0b";
const AMBER_400 = "#fbbf24";

export function createMarkerElement(label: string): HTMLButtonElement {
  const el = document.createElement("button");
  el.type = "button";
  el.setAttribute("aria-label", label);
  el.style.cssText = [
    "display:block",
    "padding:0",
    "border-radius:9999px",
    "cursor:pointer",
    "transition:width 120ms ease,height 120ms ease,box-shadow 120ms ease",
  ].join(";");
  applyMarkerState(el, { selected: false, hovered: false });
  return el;
}

export function applyMarkerState(el: HTMLElement, state: MarkerVisualState) {
  const active = state.selected || state.hovered;
  const size = active ? ACTIVE_SIZE : BASE_SIZE;

  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.backgroundColor = state.selected ? AMBER_500 : AMBER_400;
  el.style.border = `${state.selected ? 3 : 2}px solid #ffffff`;
  el.style.boxShadow = active
    ? "0 0 0 4px rgba(245,158,11,0.35),0 2px 6px rgba(0,0,0,0.35)"
    : "0 1px 4px rgba(0,0,0,0.35)";
  el.style.zIndex = active ? "10" : "1";
}

/** Distinct dot for the viewer's own location, so it never reads as an event. */
export function createUserLocationElement(): HTMLDivElement {
  const el = document.createElement("div");
  el.setAttribute("aria-hidden", "true");
  el.style.cssText = [
    "width:14px",
    "height:14px",
    "border-radius:9999px",
    "background-color:#2563eb",
    "border:2px solid #ffffff",
    "box-shadow:0 0 0 4px rgba(37,99,235,0.25)",
  ].join(";");
  return el;
}
