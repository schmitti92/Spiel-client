import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const path=new URL('../Skyjo/skyjo_action-logic-part-09.txt',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('../Skyjo/skyjo_action-manifest.json',import.meta.url),'utf8'));
const source=readFileSync(path,'utf8');

test('SKYJO integrity manifest matches new deliberately slower poll loop',()=>{
 const digest=createHash('sha256').update(source,'utf8').digest('hex');
 assert.equal(manifest.parts['skyjo_action-logic-part-09.txt'],digest,
  'loader must accept the updated polling module');
});
test('SKYJO passive clients no longer poll at 650ms and hidden tabs never query Render',()=>{
 assert.match(source,/function cloudPollDelay\(\)/);
 assert.match(source,/if\(document\.hidden\)return 30000/);
 assert.match(source,/let base=4000/);
 assert.match(source,/base=5500/);
 assert.match(source,/base=20000/);
 assert.doesNotMatch(source,/base=650(?:\D|$)/);
 assert.match(source,/if\(!document\.hidden&&!cloud\.inFlight/);
 assert.match(source,/document\.addEventListener\('visibilitychange',\(\)=>\{if\(cloud\.enabled&&cloud\.room\)startCloudPolling\(\)\}/);
});
