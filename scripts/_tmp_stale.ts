import * as dotenv from "dotenv"; dotenv.config();
import * as fs from "fs";
import { getTypesenseAdminClient } from "@/lib/typesense/client";
import { normalizePurdueEvent } from "@/lib/data/normalizePurdueEvent";
import { deduplicateEvents } from "@/lib/data/cleanPurdueData";
const RAW="/private/tmp/claude-501/-Users-akhilkota-Documents-Purdue-Documents--2026-Hackathon/6d527184-abd1-4dc1-8532-87ed3b892c55/scratchpad/raw.json";
(async()=>{
  const raws=JSON.parse(fs.readFileSync(RAW,"utf8"));
  const {uniqueEvents}=deduplicateEvents(raws.map((r:any)=>normalizePurdueEvent(r)).filter(Boolean) as any[]);
  const ids=new Set(uniqueEvents.map(e=>e.id));
  const now=Date.now();
  const c=getTypesenseAdminClient();
  let page=1; const stalePast:any[]=[], staleFuture:any[]=[], fresh:string[]=[];
  while(true){
    const r:any=await c.collections("events").documents().search({q:"*",per_page:250,page,include_fields:"id,title,starts_at,location_name"},{});
    if(!r.hits?.length)break;
    for(const h of r.hits){const d=h.document;
      if(ids.has(d.id)){fresh.push(d.id);continue;}
      (d.starts_at<now?stalePast:staleFuture).push(d);
    }
    if(r.hits.length<250)break; page++;
  }
  console.log(`fresh=${fresh.length} stalePast=${stalePast.length} staleFuture=${staleFuture.length}`);
  const fmt=(t:number)=>new Date(t).toISOString().slice(0,10);
  console.log(`\nstalePast date range: ${stalePast.length?fmt(Math.min(...stalePast.map(d=>d.starts_at))):"-"} .. ${stalePast.length?fmt(Math.max(...stalePast.map(d=>d.starts_at))):"-"}`);
  console.log(`staleFuture date range: ${staleFuture.length?fmt(Math.min(...staleFuture.map(d=>d.starts_at))):"-"} .. ${staleFuture.length?fmt(Math.max(...staleFuture.map(d=>d.starts_at))):"-"}`);
  console.log("\nstaleFuture sample (20):");
  staleFuture.sort((a,b)=>a.starts_at-b.starts_at).slice(0,20).forEach(d=>console.log(`  ${fmt(d.starts_at)}  ${d.title?.slice(0,50)} | ${d.location_name}`));
  fs.writeFileSync("/private/tmp/claude-501/-Users-akhilkota-Documents-Purdue-Documents--2026-Hackathon/6d527184-abd1-4dc1-8532-87ed3b892c55/scratchpad/stale.json", JSON.stringify({stalePast:stalePast.map(d=>d.id), staleFuture:staleFuture.map(d=>d.id)}));
})();
