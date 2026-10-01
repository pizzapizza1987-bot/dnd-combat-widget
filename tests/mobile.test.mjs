import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
const html=await fs.readFile('public/combat-widget-interactive.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
function mount(graphics){
 const events={},els=new Map(),metrics={contexts:0,allocations:0,draws:0};
 const ctx=new Proxy({}, {get:(_,key)=>()=>{if(key==='clearRect')metrics.draws++},set:()=>true});
 function el(id){if(!els.has(id)){const e={value:'',hidden:true,textContent:'',classList:{add(){},remove(){}},append(){},replaceChildren(){},addEventListener(){},getContext(){metrics.contexts++;return ctx},getBoundingClientRect:()=>({width:412,height:190})};for(const key of ['width','height'])Object.defineProperty(e,key,{set(v){metrics.allocations++;metrics[key]=v},get(){return metrics[key]}});els.set(id,e)}return els.get(id)}
 const window={location:{search:graphics?'':'?graphics=off'},devicePixelRatio:3.5,addEventListener:(n,f)=>events[n]=f,openai:{toolInput:{combatState:{stateRevision:'SECRET',combatants:[]}}}};
 const document={documentElement:{dataset:{}},querySelector:el,querySelectorAll:()=>[],createElement:()=>el('button')};
 vm.runInNewContext(script,{window,document,URLSearchParams,setTimeout,clearTimeout});
 return {metrics,events,el,document};
}
test('bare widget initializes without any canvas context, allocation, or drawing',()=>{const h=mount(false);assert.equal(h.metrics.contexts,0);assert.equal(h.metrics.allocations,0);assert.equal(h.metrics.draws,0);assert.ok(!h.el('#subtitle').textContent.includes('SECRET'))});
test('canvas enabled: cap Samsung DPR and avoid resize reallocations',async()=>{const h=mount(true);assert.equal(h.metrics.width,824);assert.equal(h.metrics.height,380);assert.equal(h.metrics.allocations,2);const draws=h.metrics.draws;for(let i=0;i<100;i++)h.events.resize();await new Promise(r=>setTimeout(r,150));assert.equal(h.metrics.allocations,2);assert.equal(h.metrics.draws,draws+1);h.events['dnd:mode']({detail:'fullscreen'});assert.equal(h.document.documentElement.dataset.mode,'fullscreen')});
test('global failures are visible in the widget',()=>{const h=mount(false);h.events.error({message:'test graphics failure'});assert.equal(h.el('#widgetError').hidden,false);assert.match(h.el('#widgetError').textContent,/test graphics failure/);h.events.unhandledrejection({reason:new Error('bridge failure')});assert.match(h.el('#widgetError').textContent,/bridge failure/)});
