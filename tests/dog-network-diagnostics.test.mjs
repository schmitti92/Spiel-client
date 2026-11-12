import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(import.meta.dirname,'..');
const source=fs.readFileSync(path.join(root,'dog-network-diagnostics.js'),'utf8');

function sandbox(query='?netdiag=1'){
 let tick=0,wall=2_000_000;
 const ctx={
  window:{location:{search:query}},
  document:{readyState:'loading',addEventListener(){}},
  URLSearchParams,
  Date:class Clock extends Date{static now(){return wall}},
  performance:{now(){return tick}},
  // Deliberately prohibit outbound diagnostic calls.
  fetch(){throw Error('diagnostics must never fetch')},
 };
 vm.runInNewContext(source,ctx);
 return {diag:ctx.window.DogBossNetDiag,advance(ms){tick+=ms;wall+=ms}};
}

test('A-02 diagnostics disabled by default with zero network overhead',()=>{
 const s=sandbox('?gate=20');
 assert.equal(s.diag,undefined);
});

test('A-02 local measurements: HTTP count/minute, latency, timeout and privacy',()=>{
 const s=sandbox();
 assert.ok(s.diag);
 const first=s.diag.begin('boss10','GET','');
 s.advance(70);
 first.finish('ok',200);
 first.finish('failed',500); // repeated completion must not be counted twice
 const second=s.diag.begin('boss10','POST','/minigame');
 s.advance(4500);
 second.finish('aborted',0);
 const third=s.diag.begin('boss10','POST','/ready');
 s.advance(45);
 third.finish('failed',409);
 const result=s.diag.report();
 assert.equal(result.totalRequests,3);
 assert.equal(result.abortedRequests,1);
 assert.equal(result.failedRequests,1);
 assert.equal(result.requestGroups.find(g=>g.kind==='status').p95Ms,70);
 assert.equal(result.requestGroups.find(g=>g.kind==='minigame').p95Ms,4500);
 assert.equal(result.requestGroups.find(g=>g.kind==='ready').failures,1);
 const csv=s.diag.csv();
 assert.match(csv,/request/);
 assert.match(csv,/aborted/);
 for(const secret of ['Authorization','Bearer','requestId','uid','playerName'])
  assert.equal(csv.includes(secret),false,'diagnostic must not retain '+secret);
});

test('A-02 observation delays: first fight, round, confirmed hit, result, deduplicated',()=>{
 const s=sandbox();
 const boss={
  phase:'fighting',startedAt:1_000_000,serverNow:1_000_600,
  miniGames:{rounds:[{startMs:300,endMs:900}],
   exchange:{strikes:[{round:0,slot:0,atMs:500,kind:'hero-strike',
    uid:'SENSITIVE-UID-MUST-NOT-BE-LOGGED',amount:150}]}}
 };
 s.diag.observe('boss10',boss);
 s.diag.observe('boss10',boss);
 let result=s.diag.report();
 assert.equal(result.eventGroups.find(g=>g.kind==='fight-start').observations,1);
 assert.equal(result.eventGroups.find(g=>g.kind==='round-start').p95DelayMs,300);
 assert.equal(result.eventGroups.find(g=>g.kind==='hero-hit').p95DelayMs,100);
 s.diag.observe('boss10',{
  ...boss,phase:'cooldown',serverNow:1_002_000,endsAt:1_001_000
 });
 result=s.diag.report();
 assert.equal(result.eventGroups.find(g=>g.kind==='result-after-end').p95DelayMs,1000);
 assert.equal(s.diag.csv().includes('SENSITIVE-UID-MUST-NOT-BE-LOGGED'),false);
 s.diag.reset();
 assert.equal(s.diag.report().totalRequests,0);
 assert.equal(s.diag.report().eventGroups.length,0);
});

test('A-02 integration: opt-in JS loaded before both battle clients and no changes to request shape',()=>{
 for(const [html,script,arena] of [
  ['dog-boss10.html','dog-boss10.js','boss10'],
  ['dog-group-boss.html','dog-group-boss.js','group']]){
  const page=fs.readFileSync(path.join(root,html),'utf8');
  const client=fs.readFileSync(path.join(root,script),'utf8');
  assert.ok(page.indexOf('dog-network-diagnostics.js')>=0);
  assert.ok(page.indexOf('dog-network-diagnostics.js')<page.indexOf('src="./'+script));
  assert.ok(client.includes("DogBossNetDiag?.begin?.('"+arena+"'"));
  assert.ok(client.includes("DogBossNetDiag?.observe?.('"+arena+"'"));
  assert.ok(client.includes("error?.name==='AbortError'?'aborted':'failed'"));
  assert.ok(client.includes("const response=await fetch("));
  assert.ok(client.includes('Authorization:\'Bearer \'+token'));
 }
});
