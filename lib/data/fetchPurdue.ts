/**
 * Reliable Fetch Utility for Purdue Localist API
 * Owned by: Backend / Typesense developer
 */

const USER_AGENT = "BoilerScout/1.0 (Purdue Event Discovery Engine; Typesense Hackathon)";

export async function fetchPurdueApi<T>(url: string, retries = 3, delayMs = 1000): Promise<T | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": USER_AGENT,
        },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "Unknown error");
        console.warn(`[HTTP ${res.status}] Attempt ${attempt}/${retries} failed for ${url}: ${text}`);
        if (attempt === retries) return null;
        await new Promise((r) => setTimeout(r, delayMs * attempt));
        continue;
      }

      return (await res.json()) as T;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[Network] Attempt ${attempt}/${retries} error for ${url}: ${msg}`);
      if (attempt === retries) {
        return null;
      }
      await new Promise((r) => setTimeout(r, delayMs * attempt));
    }
  }

  return null;
}
