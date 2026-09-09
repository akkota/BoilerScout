import * as dotenv from "dotenv";
dotenv.config();

import { ingestVenues } from "./ingest-venues";
import { ingestOrganizations } from "./ingest-organizations";
import { ingestEvents } from "./ingest-events";

async function ingestAll() {
  const overallStart = Date.now();
  console.log("######################################################################");
  console.log("# BoilerScout Full Data Ingestion Pipeline (Venues, Orgs, Events)");
  console.log("######################################################################\n");

  try {
    // 1. Ingest Venues first so events can benefit from venue references
    console.log(">>> STEP 1: Ingesting Campus Venues and Landmarks...");
    await ingestVenues();

    // 2. Ingest Organizations
    console.log("\n>>> STEP 2: Ingesting Departments and Student Organizations...");
    await ingestOrganizations();

    // 3. Ingest Events with cleaning, deduplication, and venue coordinate resolution
    console.log("\n>>> STEP 3: Ingesting Purdue Events with Cleaning & Deduplication...");
    await ingestEvents();

    const totalSeconds = ((Date.now() - overallStart) / 1000).toFixed(2);
    console.log("\n######################################################################");
    console.log(`# Full Ingestion Pipeline Completed Successfully in ${totalSeconds}s!`);
    console.log("######################################################################");
  } catch (error) {
    console.error("\nFull ingestion failed:", error);
    process.exit(1);
  }
}

const entryScript = (process.argv[1] ?? "").replace(/\\/g, "/");
if (/(^|\/)ingest-all(\.[cm]?[jt]s)?$/.test(entryScript)) {
  ingestAll();
}
