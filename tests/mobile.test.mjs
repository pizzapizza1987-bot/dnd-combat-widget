import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const source=await fs.readFile('public/combat-widget.html','utf8');
const generated=await fs.readFile('build/widget.html','utf8');

test('current inline widget uses a bounded 500px surface',()=>{
  assert.match(source,/height:500px/);
  assert.doesNotMatch(source,/100vh|56vh|min-height\s*:\s*360px|position\s*:\s*sticky/i);
});

test('current native-app recovery path allocates no graphics',()=>{
  assert.doesNotMatch(source,/<canvas|<svg|ResizeObserver|devicePixelRatio|getContext\(/i);
  assert.doesNotMatch(generated,/<canvas|<svg|ResizeObserver|devicePixelRatio|getContext\(/i);
});

test('recovery bridge avoids every optional host action during startup',()=>{
  assert.doesNotMatch(generated,/sendSizeChanged|requestDisplayMode|sendFollowUpMessage|sendMessage\(/);
  assert.match(generated,/Bridge parsed/);
  assert.match(generated,/Connecting/);
  assert.match(generated,/MCP initialized/);
});
