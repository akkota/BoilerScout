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
  // key = title + start time  (same real-world occurrence)
  const freshKey=new Set(uniqueEvents.map(e=>`${e.title}|${e.starts_at}`));
  const freshRawId=new Set(uniqueEvents.map(e=>e.id.split("_")[0]));
  const c=getTypesenseAdminClient();
  let page=1; let sameOccurrence=0, sameEventDiffInstance=0, trulyGone=0; const goneSamples:any[]=[];
  while(true){
    const r:any=await c.collections("events").documents().search({q:"*",per_page:250,page,include_fields:"id,title,starts_at,location_name"},{});
    if(!r.hits?.length)break;
    for(const h of r.hits){const d=h.document; if(ids.has(d.id))continue;
      if(freshKey.has(`${d.title}|${d.starts_at}`)) sameOccurrence++;
      else if(freshRawId.has(String(d.id).split("_")[0])) sameEventDiffInstance++;
      else { trulyGone++; if(goneSamples.length<15) goneSamples.push(d); }
    }
    if(r.hits.length<250)break; page++;
  }
  console.log(`stale docs breakdown:`);
  console.log(`  exact duplicate of a current doc (same title+start, different id): ${sameOccurrence}`);
  console.log(`  same source event, obsolete instance id:                          ${sameEventDiffInstance}`);
  console.log(`  not in current fetch at all:                                      ${trulyGone}`);
  console.log("\n'not in current fetch' samples:");
  goneSamples.forEach(d=>console.log(`  ${new Date(d.starts_at).toISOString().slice(0,10)}  ${d.title?.slice(0,50)} | ${d.location_name}`));
})();
