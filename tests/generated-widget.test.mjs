import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const html=await fs.readFile('build/widget.html','utf8');
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];

test('generated widget contains one UI script and one real bridge bundle',()=>{
  assert.equal(scripts.length,2);
  assert.match(html,/data-mcp-bridge="v5"/);
  assert.doesNotMatch(html,/<!-- MCP_BRIDGE -->/);
});

test('every generated inline script parses as JavaScript',()=>{
  scripts.forEach((match,index)=>{
    assert.doesNotThrow(()=>new vm.Script(match[1],{filename:`widget-script-${index+1}.js`}));
  });
});

test('generated bridge includes startup handshake but no restored features yet',()=>{
  const bridge=scripts[1][1];
  assert.match(bridge,/ui\/initialize|MCP initialized|Bridge parsed/);
  assert.doesNotMatch(bridge,/sendSizeChanged|requestDisplayMode|sendFollowUpMessage/);
});
