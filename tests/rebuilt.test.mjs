import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';

const html=await fs.readFile('public/combat-widget.html','utf8');
const uiScript=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)][0][1];

function harness(){
  const events={};
  const elements=new Map();
  function el(id){
    if(!elements.has(id)){
      elements.set(id,{
        hidden:true,
        textContent:'',
        children:[],
        append(child){this.children.push(child)},
        replaceChildren(){this.children=[]},
      });
    }
    return elements.get(id);
  }
  const window={addEventListener:(name,fn)=>events[name]=fn};
  const document={
    getElementById:el,
    createElement:()=>({textContent:''}),
  };
  vm.runInNewContext(uiScript,{window,document});
  return {events,el};
}

test('recovery UI starts with no graphics or action controls',()=>{
  const h=harness();
  assert.match(h.el('status').textContent||'Widget loaded',/Widget loaded|waiting/);
  assert.doesNotMatch(html,/<canvas|<svg|ResizeObserver|requestAnimationFrame|sendFollowUpMessage/);
  assert.match(html,/MCP handshake only/);
});

test('startup checkpoints remain visible in order',()=>{
  const h=harness();
  for(const label of ['Bridge parsed','Connecting','MCP initialized','Tool result received']){
    h.events['dnd:checkpoint']({detail:label});
  }
  assert.deepEqual(h.el('checkpoints').children.map(x=>x.textContent),[
    'Bridge parsed','Connecting','MCP initialized','Tool result received',
  ]);
  assert.equal(h.el('status').textContent,'Tool result received');
});

test('player-safe tool result renders plain text only',()=>{
  const h=harness();
  h.events['dnd:result']({detail:{combatState:{
    campaignId:'test',encounterId:'test',stateRevision:'r1',round:1,phase:'TEST',
    combatants:[{name:'Player',side:'party',playerVisible:true}],
  }}});
  assert.match(h.el('summary').textContent,/Round 1 · TEST · revision r1/);
  assert.deepEqual(h.el('fighters').children.map(x=>x.textContent),['Player · party']);
});

test('global failures are rendered instead of disappearing',()=>{
  const h=harness();
  h.events.error({message:'Unexpected end of input'});
  assert.equal(h.el('error').hidden,false);
  assert.match(h.el('error').textContent,/Unexpected end of input/);
  assert.equal(h.el('status').textContent,'Startup failed');
});
