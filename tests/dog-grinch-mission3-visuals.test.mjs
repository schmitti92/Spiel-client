import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const base=new URL('../DOG/grinch-campaign/',import.meta.url);
const src=file=>readFileSync(new URL(file,base),'utf8');

test('Mission 3 has a reusable local winter art pack and an original Grinch crest',()=>{
 const svg=src('mission-3-background.svg');
 const board=src('mission-3-board.js');
 assert.match(svg,/<svg /);
 assert.match(svg,/id="sky"/);
 assert.match(svg,/id="fir"/);
 assert.match(svg,/caveGlow/);
 assert.doesNotMatch(svg,/https?:\/\//);
 assert.match(board,/mission-3-background\.svg/);
 assert.match(board,/class="m3-crest"/);
 assert.match(board,/m3-objective/);
 assert.match(board,/m3-pawn-hit/);
 assert.match(board,/r="25"/);
});
test('zoom controls and status layer live outside the zoomed SVG and do not affect the DOG track',()=>{
 const html=src('mission-3.html'),board=src('mission-3-board.js');
 const js=src('mission-3.js');
 for(const id of ['m3-board-viewport','m3-board','m3-zoom-out','m3-zoom-in',
  'm3-zoom-reset','m3-zoom-level','m3-effect-banner'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/<div id="m3-board-viewport"[\s\S]*?<svg id="m3-board"/);
 assert.match(js,/createMission3BoardTouch/);
 assert.match(js,/showMission3VisualEffects/);
 assert.match(js,/mission3VisualEvents\(before,game\)/);
 assert.match(board,/TRACK_POINTS\.map/);
 assert.match(board,/for\(let i=0;i<64;i\+\+\)/);
});
test('touch math clamps zoom to 100–340 percent and clamps dragging within board',()=>{
 const text=src('mission-3-touch.js').replace(/\bexport (const|function) /g,'$1 ');
 const api=new Function(text+';return {clampMission3View,zoomMission3At,MISSION3_MIN_ZOOM,MISSION3_MAX_ZOOM}')();
 assert.equal(api.MISSION3_MIN_ZOOM,1);
 assert.equal(api.MISSION3_MAX_ZOOM,3.4);
 assert.deepEqual(api.clampMission3View({scale:1,x:999,y:-999},500,400),{scale:1,x:0,y:0});
 assert.deepEqual(api.clampMission3View({scale:100,x:999,y:-999},500,400),{scale:3.4,x:600,y:-480});
 const zoomed=api.zoomMission3At({scale:1,x:0,y:0},2,{x:250,y:200},500,400);
 assert.deepEqual(zoomed,{scale:2,x:0,y:0});
 const corner=api.zoomMission3At({scale:1,x:0,y:0},2,{x:100,y:90},500,400);
 assert.ok(corner.x>0&&corner.y>0,'zoom stays focused around finger pinch centroid');
 assert.equal(api.zoomMission3At(zoomed,1,{x:250,y:200},500,400).scale,1);
});
test('two-finger pan/zoom is isolated to the board; reduced motion is supported',()=>{
 const code=src('mission-3-touch.js'),css=src('mission-3.css');
 assert.match(code,/pointerdown/);assert.match(code,/pointermove/);
 assert.match(code,/touches\.size===2/);
 assert.match(code,/Math\.hypot/);
 assert.match(code,/ctrlKey\|\|ev\.metaKey/);
 assert.match(code,/removeEventListener/);
 assert.match(css,/\.m3-board-viewport\{[^}]*touch-action:none/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/\.m3-zoom-controls/);
 assert.match(css,/\.m3-effect-banner/);
 assert.match(css,/\.m3-vfx-ring/);
});
test('visual event detection handles frost, knockback, captivity, task change, victory',()=>{
 const module=src('mission-3-effects.js')
  .replace(/^import[^\n]*\n/gm,'')
  .replace(/\bexport (const|function) /g,'$1 ');
 const {mission3VisualEvents}=new Function('const trackPoint=n=>({x:n,y:n});'+module+';return {mission3VisualEvents}')();
 const state=(rev=0)=>({
  mission:3,revision:rev,
  current:0,stage:0,complete:false,
  players:[{name:'Rot'},{name:'Blau'},{name:'Gelb'},{name:'Grinch'}],
  tasks:{stage:0,progress:[0,0,0],objectives:[{id:'l0',collected:false,kind:'light',field:5}]},
  lastCurse:null,lastCapture:null,
  pieces:[
   {id:'r0',owner:0,place:'track',pos:4,frozenTurns:0},
   {id:'g0',owner:3,place:'track',pos:10,frozenTurns:0}
  ]
 });
 const before=state(),frozen=state(1);
 frozen.lastCurse={type:'freeze',owner:0,pieceId:'r0',phase:1};
 frozen.pieces[0].frozenTurns=2;
 assert.ok(mission3VisualEvents(before,frozen).some(e=>e.type==='freeze'));
 const knocked=state(2);knocked.lastCurse={type:'knockback',owner:0,pieceId:'r0',distance:4,phase:2};knocked.pieces[0].pos=0;
 assert.ok(mission3VisualEvents(before,knocked).some(e=>e.type==='knockback'));
 const capture=state(3);
 capture.pieces[0].place='captured';capture.pieces[0].pos=-1;
 capture.lastCapture={type:'abduction',owner:0,pieceId:'r0',stage:0,phase:1};
 assert.ok(mission3VisualEvents(before,capture).some(e=>e.type==='capture'));
 const stage=state(4);stage.stage=1;stage.tasks.stage=1;
 assert.ok(mission3VisualEvents(before,stage).some(e=>e.type==='stage'));
 const win=state(5);win.complete=true;
 assert.ok(mission3VisualEvents(before,win).some(e=>e.type==='win'));
 assert.equal(mission3VisualEvents(before,before).length,0);
});
test('research thaw remains available and visual effects do not modify official campaigns',()=>{
 const ui=src('mission-3.js'),vfx=src('mission-3-effects.js');
 assert.match(ui,/myThawResearch/);
 assert.match(ui,/frozen\.frozenTurns=0/);
 assert.match(ui,/researchThaws/);
 assert.match(ui,/if\(game\.complete/);
 assert.doesNotMatch(vfx,/fetch\(|localStorage|Firebase|awardCoins|grantReward/);
});
test('Mission 3 UI and visual modules are syntactically valid JavaScript',()=>{
 for(const file of ['mission-3.js','mission-3-board.js','mission-3-touch.js','mission-3-effects.js']){
  const code=src(file).replace(/^import[^\n]*\n/gm,'').replace(/\bexport (const|function) /g,'$1 ');
  assert.doesNotThrow(()=>new Function(code),file);
 }
});
