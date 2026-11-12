import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=x=>fs.readFileSync(new URL('../'+x,import.meta.url),'utf8');
const ui=read('dog-boss-mini-ui.js');
const arena=read('dog-boss10.js');
const group=read('dog-group-boss.js');
const html=read('dog-boss10.html'),groupHtml=read('dog-group-boss.html');
const css=read('dog-boss10.css');
test('All ten arenas display the same tactical three-round widget',()=>{
 for(const page of [html,groupHtml]){
  assert.match(page,/id="mini-game"/);
  assert.match(page,/dog-boss-mini-ui\.js/);
  assert.ok(page.includes('Taktisches Boss-Minispiel'));
 }
 for(const client of [arena,group]){
  assert.ok(client.includes("DogBossMinigames?.create($('mini-game')"));
  assert.ok(client.includes("command('minigame',false,{"));
  assert.ok(client.includes("['ready','start','react','minigame','finish']"));
  assert.ok(client.includes('miniUi?.update(view,frameNow'));
  assert.ok(client.includes('req.payload||{}'));
  assert.ok(client.includes("request.command==='minigame'"));
  assert.ok(client.includes('state?.miniGames?.myAnswers?.[request.payload?.round]'));
  assert.ok(client.includes("reaction.hidden=state!=='fighting'||!!view?.miniGames"));
 }
});
test('Interface offers all four input types without locally deciding success',()=>{
 for(const kind of ["dodge","reaction","math","target"])
  assert.ok(ui.includes("round.kind==='"+kind+"'"),kind+' minigame missing');
 assert.ok(ui.includes('rounds.find(r=>elapsed>=r.startMs&&elapsed<r.endMs)'));
 assert.ok(ui.includes('round.targetMs'));
 assert.ok(ui.includes('round.initialIndex'));
 assert.ok(ui.includes('round.dangerIndex'));
 assert.ok(ui.includes('const submittedRound=roundView.round;'),
  'M-08 pins the original round before a deferred network request');
 assert.ok(ui.includes('onSubmit(submittedRound,value,step,tappedAt)'),
  'the captured server round is transmitted, never an updated roundView');
 assert.ok(!ui.includes('Math.random('));
 assert.ok(!ui.includes('correctIndex'));
 assert.ok(ui.includes('games.myAnswers'));
 assert.match(css,/\.mini-tactical\{/);
 assert.match(css,/\.mini-target\.mini-weakpoint/);
 assert.match(css,/touch-action:manipulation/);
});
test('Difficulty indicators, limited response time and mobile targets are visible',()=>{
 assert.ok(ui.includes("'⏱️ '+remaining+' Sek."));
 assert.ok(ui.includes("round.toleranceMs"));
 assert.ok(ui.includes("round.stepMs"));
 assert.ok(ui.includes("value!==round.dangerIndex")===false,
  'client never decides right or wrong by trusting user input');
 assert.ok(ui.includes('button.disabled=!!mine||!canPlay||localSubmitting'));
 assert.match(ui,/round\.puzzles\[Math\.min\(step,7\)\]/);
 assert.match(ui,/mini-dodge-lanes/);
 assert.match(ui,/anchor=\{round,elapsed,stamp:/);
 assert.ok(ui.includes('DogBossMinigames={create}'));
});
