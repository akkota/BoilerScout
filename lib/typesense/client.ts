import { Client } from "typesense";

/**
 * Server-side Typesense Client Module
 * Owned by: Backend / Typesense developer
 *
 * IMPORTANT:
 * - This module must only be used on the server (API routes, server actions, ingestion scripts).
 * - Never expose TYPESENSE_ADMIN_KEY to browser code.
 */

function parseHostConfig(rawHost?: string) {
  if (!rawHost) {
    throw new Error(
      "TYPESENSE_HOST environment variable is missing. Please check your .env file."
    );
  }

  let protocol = "https";
  let host = rawHost.trim();
  let port = 443;

  if (host.startsWith("http://")) {
    protocol = "http";
    host = host.slice(7);
    port = 8108;
  } else if (host.startsWith("https://")) {
    protocol = "https";
    host = host.slice(8);
    port = 443;
  }

  // Remove trailing slash or path if present
  if (host.includes("/")) {
    host = host.split("/")[0];
  }

  // Check if port is explicitly in host (e.g. localhost:8108)
  if (host.includes(":")) {
    const [h, p] = host.split(":");
    host = h;
    const parsedPort = parseInt(p, 10);
    if (!isNaN(parsedPort)) {
      port = parsedPort;
    }
  }

  return { host, protocol, port };
}

let adminClientInstance: Client | null = null;
let searchClientInstance: Client | null = null;

/**
 * Returns an authenticated Typesense Admin Client.
 * Used exclusively for administrative tasks (collection schema migrations, data ingestion).
 */
export function getTypesenseAdminClient(): Client {
  const adminKey = process.env.TYPESENSE_ADMIN_KEY;
  if (!adminKey) {
    throw new Error(
      "TYPESENSE_ADMIN_KEY is not defined. Server administrative operations require the admin key."
    );
  }

  if (!adminClientInstance) {
    const { host, protocol, port } = parseHostConfig(process.env.TYPESENSE_HOST);

    adminClientInstance = new Client({
      nodes: [
        {
          host,
          port,
          protocol,
        },
      ],
      apiKey: adminKey,
      connectionTimeoutSeconds: 15,
    });
  }

  return adminClientInstance;
}

/**
 * Returns an authenticated Typesense Search Client.
 * Used for querying events with read-only search permissions.
 */
export function getTypesenseSearchClient(): Client {
  const searchKey = process.env.TYPESENSE_SEARCH_KEY || process.env.TYPESENSE_ADMIN_KEY;
  if (!searchKey) {
    throw new Error(
      "TYPESENSE_SEARCH_KEY (or TYPESENSE_ADMIN_KEY) is not defined. Cannot initialize search client."
    );
  }

  if (!searchClientInstance) {
    const { host, protocol, port } = parseHostConfig(process.env.TYPESENSE_HOST);

    searchClientInstance = new Client({
      nodes: [
        {
          host,
          port,
          protocol,
        },
      ],
      apiKey: searchKey,
      connectionTimeoutSeconds: 10,
    });
  }

  return searchClientInstance;
}
