import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const source=await fs.readFile('dist/server/index.js','utf8');
const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
async function rpc(method,params={}) {const r=await worker.fetch(new Request('https://example.com/mcp',{method:'POST',headers:{'oai-authenticated-user-id':'test-user','content-type':'application/json','accept':'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})}));assert.equal(r.status,200);return (await r.json()).result;}
const base={campaignId:'test',encounterId:'test-1',stateRevision:'r1',round:1,phase:'DECLARATION',combatants:[]};
const fighter={entityId:'f1',name:'Visible guard',side:'hostile',x:25,y:30,z:0,positionCertainty:'exact',positionBasis:'DM SECRET',playerVisible:true,movementFt:99};
test('MCP initialization, primary tool, and embedded resource',async()=>{
 const init=await rpc('initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'test',version:'1'}});assert.equal(init.serverInfo.name,'dnd-combat-widget');
 const list=await rpc('tools/list');assert.deepEqual(list.tools.map(t=>t.name),['open_dnd_combat']);assert.deepEqual(list.tools[0]._meta.ui.visibility,['model']);
 const resource=await rpc('resources/read',{uri:list.tools[0]._meta.ui.resourceUri});assert.match(resource.contents[0].text,/LIVE COMBAT COMMAND/);assert.doesNotMatch(resource.contents[0].text,/Combat widget paused|recovery-mode/);assert.match(resource.contents[0].text,/autoResize:!1/);
});
test('filter hidden entities, strip secrets, conceal undisclosed coordinates and enemy mechanics',async()=>{
 const input={...base,dmNotes:'SECRET',notes:['SECRET'],combatants:[fighter,{...fighter,entityId:'hidden',name:'SECRET',playerVisible:false,positionPlayerVisible:true}]};
 const before=JSON.stringify(input);
 const r=await rpc('tools/call',{name:'open_dnd_combat',arguments:{combatState:input}});
 const safe=r.structuredContent.combatState;assert.equal(safe.combatants.length,1);assert.equal(safe.combatants[0].x,null);assert.equal(safe.combatants[0].y,null);assert.equal(safe.combatants[0].z,null);assert.equal(safe.combatants[0].movementFt,null);assert.ok(!JSON.stringify(r).includes('SECRET'));assert.equal(JSON.stringify(input),before);
});
test('explicit player-known coordinates remain unchanged; result isolated per call',async()=>{
 const r=await rpc('tools/call',{name:'open_dnd_combat',arguments:{combatState:{...base,combatants:[{...fighter,positionPlayerVisible:true}]}}});assert.equal(r.structuredContent.combatState.combatants[0].x,25);
 const next=await rpc('tools/call',{name:'open_dnd_combat',arguments:{combatState:{...base,stateRevision:'r2'}}});assert.equal(next.structuredContent.combatState.combatants.length,0);
});
test('invalid state is rejected',async()=>{const r=await rpc('tools/call',{name:'open_dnd_combat',arguments:{combatState:{...base,round:0}}});assert.equal(r.isError,true)});

test('data-bearing MCP calls require a trusted Sites identity',async()=>{
 const r=await worker.fetch(new Request('https://example.com/mcp',{method:'POST',headers:{'content-type':'application/json','accept':'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'open_dnd_combat',arguments:{combatState:base}}})}));assert.equal(r.status,401);
});
test('tool is read-only and declares a ChatGPT widget',async()=>{
 const list=await rpc('tools/list');const t=list.tools[0];assert.ok(t.outputSchema.properties.combatState);assert.equal(t.annotations.readOnlyHint,true);assert.equal(t.annotations.destructiveHint,false);assert.equal(t._meta['openai/resultCanProduceWidget'],true);assert.equal(t._meta['openai/outputTemplate'],t._meta.ui.resourceUri);
});
