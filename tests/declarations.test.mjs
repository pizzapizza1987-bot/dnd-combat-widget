import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
const html=await fs.readFile('public/combat-widget-interactive.html','utf8');
function harness(){
 const events={},elements=new Map(),sent=[];
 const ctx=new Proxy({}, {get:()=>()=>{},set:()=>true});
 function el(id){if(!elements.has(id))elements.set(id,{value:'',textContent:'',classList:{add(){},remove(){}},append(){},replaceChildren(){},addEventListener(){},getContext:()=>ctx,getBoundingClientRect:()=>({width:700,height:600})});return elements.get(id)}
 const win={addEventListener:(n,f)=>events[n]=f,openai:{sendFollowUpMessage:async p=>sent.push(p)}};
 const sandbox={window:win,document:{querySelector:el,querySelectorAll:()=>[],createElement:()=>el('button')},crypto:{randomUUID:()=> 'proposal-test'},devicePixelRatio:1,URLSearchParams,setTimeout,clearTimeout};
 vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],sandbox);
 return {events,el,sent,receive:state=>events['dnd:result']({detail:{combatState:state}})};
}
const base={campaignId:'test',encounterId:'one',stateRevision:'r1',round:1,phase:'DECLARATION',combatants:[]};
for(const [id,text] of [['#commitMove','Move to the visible doorway'],['#attack','Attack the visible guard'],['#endTurn',''],['#nextRound','']]){
 test(id+' sends a revision-bound proposal without advancing combat',async()=>{
  const h=harness();const state=structuredClone(base);h.receive(state);h.el('#command').value=text;
  await h.el(id).onclick();assert.equal(h.sent.length,1);const action=JSON.parse(h.sent[0].prompt.replace('DND_COMBAT_ACTION ',''));assert.equal(action.kind,'proposal');assert.equal(action.stateRevision,'r1');assert.deepEqual(state,base);assert.equal(h.el('#roundPill').textContent,'ROUND 1');
  await h.el(id).onclick();assert.equal(h.sent.length,1);
  h.receive({...base,stateRevision:'r2'});h.el('#command').value=text;await h.el(id).onclick();assert.equal(h.sent.length,2);
 });
}
test('no declaration is sent before authoritative state arrives',async()=>{const h=harness();await h.el('#nextRound').onclick();assert.equal(h.sent.length,0)});
