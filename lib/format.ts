/**
 * Small display helpers shared between cards and map popups.
 * Owned by: Frontend developer
 */

export function formatEventTime(startsAt: number): string {
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Convert stable source IDs into judge-facing labels without changing data. */
export function formatSourceLabel(source: string | undefined): string {
  const normalized = source?.trim().toLowerCase();
  const labels: Record<string, string> = {
    "purdue-events": "Purdue Events",
    boilerlink: "BoilerLink",
    seed: "Demo data",
  };
  return (normalized && labels[normalized]) || source?.trim() || "";
}

/** Map popups take an HTML string, so anything interpolated must be escaped. */
export function escapeHtml(value: string | undefined | null): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
