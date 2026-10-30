import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../hub-game-bridge.js',import.meta.url),'utf8');
const match=source.match(/if\(!\/(\^\(\?:\[0-9\]\{3\}\|\[A-HJ-NP-Z2-9\]\{6\}\)\$)\/\.test\(hub\)/);

test('return bridge accepts current 3-digit and legacy 6-character hub codes',()=>{
  assert.ok(match,'Hub code validation must explicitly support both formats');
  const valid=new RegExp(match[1]);
  for(const code of ['000','294','999','ABC23D'])assert.equal(valid.test(code),true,code);
  for(const code of ['29','1234','A294AAAAAA','ABCDEF7',''])assert.equal(valid.test(code),false,code);
});

test('return bridge keeps the same hub code in lobby navigation',()=>{
  assert.match(source,/spielauswahl-online\\.html\\?room='\\+encodeURIComponent\\(hub\\)/);
  assert.match(source,/const gotoHub=\\(\\)=>location\\.assign\\(hubUrl\\)/);
});
