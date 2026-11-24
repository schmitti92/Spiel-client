import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=name=>readFileSync(new URL('../DOG/grinch-campaign/'+name,import.meta.url),'utf8');
test('Grinch tactical AI is active on the local preview and actions render separately',()=>{
 const script=src('mission-3.js');
 const page=src('mission-3.html');
 assert.match(script,/mission3ChooseGrinchMove\(game\)/);
 assert.match(script,/mission3Play\(game,3,selected\)/);
 assert.match(script,/if\(game\.current===3\)bot\(\)/);
 assert.match(script,/520\)/);
 assert.doesNotMatch(script,/game=mission3AutoGrinch\(game\)/);
 assert.match(page,/Die taktische KI, zufällige Flüche am Kartenphasenende/);
});
test('Grinch tactical evaluator reads only its own hand and visible track state',()=>{
 const rule=src('mission-3-rules.js');
 assert.match(rule,/export const MISSION3_AI_VERSION='tactical-beam-v1'/);
 assert.match(rule,/export function mission3PlanGrinchTurn\(s\)/);
 assert.match(rule,/s\.hands\[3\]/);
 assert.match(rule,/const values=s\.tasks\?\.activeFields/);
 assert.match(rule,/const depth=Math\.min\(5,s\.grinchActionsLeft\+2\)/);
 const body=rule.slice(rule.indexOf('export const MISSION3_AI_VERSION='),rule.indexOf('export function mission3Projection('));
 assert.doesNotMatch(body,/s\.hands\[0\]|s\.hands\[1\]|s\.hands\[2\]/);
 assert.doesNotMatch(body,/Math\.random|fetch\(|WebSocket/);
});

test('phase curse and permanent prisoners are visible, with frozen pawns marked on board',()=>{
 const script=src('mission-3.js'),page=src('mission-3.html');
 const board=src('mission-3-board.js'),css=src('mission-3.css');
 assert.match(page,/id="m3-curse-status"/);
 assert.match(script,/game\.lastCurse/);
 assert.match(script,/p\.place==='captured'/);
 assert.match(script,/frozenTurns>0/);
 assert.match(board,/piece\.frozenTurns>0/);
 assert.match(board,/stroke="#9eeaff"/);
 assert.match(css,/\.m3-curse-status/);
 assert.match(page,/mission-3\.js\?v=10/);
 assert.match(page,/mission-3\.css\?v=4/);
});


test('three real tasks are represented by board targets and a live shared mission progress UI',()=>{
 const js=src('mission-3.js'),html=src('mission-3.html'),board=src('mission-3-board.js');
 const css=src('mission-3.css'),rules=src('mission-3-rules.js');
 for(const id of ['m3-objective-title','m3-task-count','m3-progress-track','m3-progress-fill',
  'm3-task-instructions','m3-target-fields','m3-task-timeline','m3-complete'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(js,/mission3TaskStatus\(game\)/);
 assert.match(js,/game\.complete/);
 assert.match(js,/task\.remaining/);
 assert.match(js,/task\.progress/);
 assert.match(html,/id="m3-next-deal"/);
 assert.doesNotMatch(html,/id="m3-change-stage"/);
 assert.match(rules,/export function mission3TaskStatus/);
 assert.match(rules,/MISSION3_TASK_TARGETS=Object\.freeze\(\[3,4,3\]\)/);
 assert.match(rules,/function mission3OnLanding/);
 assert.match(board,/m3-objective/);
 assert.match(board,/s\.tasks\.objectives/);
 assert.match(css,/\.m3-progress-track/);
 assert.match(css,/\.m3-complete/);
});
