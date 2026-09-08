/* WO-WK11 · put the seeded fixture back to the state seed-fixture.mjs leaves it
 * in. The counterexample suite deliberately disables resources and moves
 * policies, so a screenshot taken after it would show that suite's leftovers
 * rather than the fixture. Run this between verify.mjs and shots.mjs.
 *
 *   node .../wk11/rc/reset-fixture.mjs     # app on 8883
 */
const port=8883, base=`http://127.0.0.1:${port}/api/v5`;
let token=null;
async function api(m,p,b){const h={Origin:`http://127.0.0.1:${port}`};if(token)h["x-work-token"]=token;if(b!==undefined)h["content-type"]="application/json";const r=await fetch(base+p,{method:m,headers:h,body:b!==undefined?JSON.stringify(b):undefined});const t=await r.text();return {status:r.status,json:t?JSON.parse(t):null};}
token=(await api("GET","/bootstrap")).json.sessionToken;
const projects=(await api("GET","/projects")).json.projects;
const pr=projects.find(p=>p.name.includes("Runtime control"))||projects[0];
const s=(await api("GET",`/sessions?projectId=${pr.id}`)).json.sessions.find(x=>x.title==="Runtime control");
const q=`?sessionId=${s.id}`;
const snap=async()=>(await api("GET","/runtime-control"+q)).json;
const ops=[
 {operation:"policy",scope:{type:"user",id:"local"},rules:[]},
 {operation:"policy",scope:{type:"session",id:s.id},rules:[]},
 {operation:"policy",scope:{type:"workspace",id:pr.id},rules:[{action:"ws_write",resource:"materials/*",effect:"deny"},{action:"ws_write",resource:"out/*",effect:"ask"}]},
 {operation:"profile",id:null,scope:{type:"session",id:s.id}},
 {operation:"exposure",id:"tool:ws_grep",scope:{type:"user",id:"local"},exposed:null},
 {operation:"exposure",id:"tool:ws_grep",scope:{type:"session",id:s.id},exposed:null},
 {operation:"exposure",id:"tool:ws_write",scope:{type:"session",id:s.id},exposed:null},
 {operation:"exposure",id:"local:conventions",scope:{type:"session",id:s.id},exposed:null},
 {operation:"exposure",id:"local:docs-mcp",scope:{type:"session",id:s.id},exposed:null},
];
for(const op of ops){const r=await api("PUT","/runtime-control"+q,{revision:(await snap()).revision,...op});if(r.status!==200)console.log("skip",op.operation,op.id,r.status,r.json?.error?.code);}
const c=await api("POST",`/mcp/${encodeURIComponent("local:docs-mcp")}/lifecycle`+q,{action:"connect",revision:(await snap()).revision});
const fin=await snap();
console.log(JSON.stringify({session:s.id, project:pr.id, revision:fin.revision, mcp:c.status, policies:fin.policies, composition:fin.composition.id, activeRuns:fin.activeRuns},null,1));
