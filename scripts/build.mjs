import { build } from 'esbuild';
import fs from 'node:fs/promises';
import vm from 'node:vm';

await fs.mkdir('build',{recursive:true});

const bridgeBuild=await build({
  entryPoints:['src/bridge.ts'],
  bundle:true,
  format:'iife',
  platform:'browser',
  minify:true,
  write:false,
});

const bridgeSource=bridgeBuild.outputFiles[0].text;
new vm.Script(bridgeSource,{filename:'generated-mcp-bridge.js'});

let html=await fs.readFile('public/combat-widget.html','utf8');
if(!html.includes('<!-- MCP_BRIDGE -->')){
  throw new Error('combat-widget.html is missing the MCP bridge insertion marker');
}

const escapedBridge=bridgeSource
  .replace(/<\/script/gi,'<\\/script')
  .replace(/\u2028/g,'\\u2028')
  .replace(/\u2029/g,'\\u2029');

html=html.replace(
  '<!-- MCP_BRIDGE -->',
  `<script data-mcp-bridge="v5">${escapedBridge}</script>`,
);

const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
if(scripts.length!==2){
  throw new Error(`Expected exactly 2 inline scripts in generated widget, found ${scripts.length}`);
}
for(const [index,match] of scripts.entries()){
  new vm.Script(match[1],{filename:`generated-widget-script-${index+1}.js`});
}
if(html.includes('<!-- MCP_BRIDGE -->')){
  throw new Error('Generated widget still contains MCP bridge insertion marker');
}
if(!html.includes('data-mcp-bridge="v5"')){
  throw new Error('Generated widget is missing the v5 MCP bridge marker');
}

await fs.writeFile('build/widget.html',html);

console.log(JSON.stringify({
  generatedWidgetBytes:Buffer.byteLength(html),
  generatedBridgeBytes:Buffer.byteLength(bridgeSource),
  inlineScriptCount:scripts.length,
}));

await build({
  entryPoints:['src/worker.ts'],
  bundle:true,
  format:'esm',
  platform:'browser',
  target:'es2022',
  outfile:'dist/server/index.js',
  loader:{'.html':'text'},
  minify:true,
});
await fs.mkdir('dist/client',{recursive:true});
await fs.writeFile('dist/client/index.html',html);
await fs.writeFile('dist/server/wrangler.json',JSON.stringify({
  name:'dnd-combat-widget',
  main:'index.js',
  compatibility_date:'2026-09-01',
  compatibility_flags:['nodejs_compat'],
},null,2));
