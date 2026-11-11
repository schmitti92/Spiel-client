import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  BOARD_LAYOUT_ID,currentBoardLayout,saveBoardLayout,validateBoardLayout
} from '../DOG/board-layout.js';
import {
  EDITOR_DRAFT_KEY,clone,emptyDraft,fromCrossPreset,fromLayout,placedCount,
  fieldOf,selectedValid,snapXY,putField,eraseField,nextSlot,inspectDraft,asGameLayout,
  guidedPoint,directedPoint,previousTrackField,measureStepDistances,EIGHT_DIRECTIONS,alignTrackRun,
  translateTrackGroup,trackGroupBounds,firstUnplacedSlot
} from '../DOG/editor-model.js';
import {referencePoints,buildGoalLane,buildHomeGroup,getTrackConnections,straightGaps,connectStraightGap,SEAT_LABELS} from '../DOG/board-assistants.js';

function openBuilder(){
  const events=new Map(),elements=new Map(),storage=new Map();
  const fake=(id)=>{
    if(!elements.has(id))elements.set(id,{
      id, value:'', checked:false, disabled:false, textContent:'', innerHTML:'',
      className:'', style:{}, dataset:{}, classList:{toggle(){}},
      listeners:new Map(), setAttribute(){},
      addEventListener(type,callback){this.listeners.set(type,callback);}
    });
    return elements.get(id);
  };
  const board=fake('builder-board');
  board.getScreenCTM=()=>({inverse(){return {};}});
  board.createSVGPoint=()=>({x:0,y:0,matrixTransform(){return {x:this.x,y:this.y};}});
  board.setPointerCapture=()=>{};
  board.querySelector=()=>({setAttribute(){}});
  const directionButtons=[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]].map(([dx,dy])=>{
    const item=fake('path-'+dx+','+dy);item.dataset.pathDir=dx+','+dy;return item;
  });
  const groupButtons=[[-1,0],[1,0],[0,-1],[0,1]].map(([dx,dy])=>{
    const item=fake('group-'+dx+','+dy);item.dataset.groupDir=dx+','+dy;return item;
  });
  const document={
    getElementById:fake,
    querySelectorAll:selector=>selector==='[data-path-dir]'?directionButtons:selector==='[data-group-dir]'?groupButtons:[],
    body:{append(){}}
  };
  const window={addEventListener(){}};
  const localStorage={
    getItem:key=>storage.get(key)||null,
    setItem:(key,value)=>storage.set(key,String(value)),
    removeItem:key=>storage.delete(key)
  };
  const location={href:'https://example.org/Spiel-client/DOG/editor.html',assign(){}};
  const importNames=[
    'BOARD_LAYOUT_ID','currentBoardLayout','saveBoardLayout','validateBoardLayout',
    'EDITOR_DRAFT_KEY','clone','emptyDraft','fromCrossPreset','fromLayout','placedCount',
    'fieldOf','selectedValid','snapXY','putField','eraseField','nextSlot','inspectDraft','asGameLayout',
    'guidedPoint','directedPoint','previousTrackField','measureStepDistances','EIGHT_DIRECTIONS','alignTrackRun','translateTrackGroup','trackGroupBounds','firstUnplacedSlot',
    'referencePoints','buildGoalLane','buildHomeGroup','getTrackConnections','straightGaps','connectStraightGap','SEAT_LABELS'
  ];
  const imports=[
    BOARD_LAYOUT_ID,currentBoardLayout,saveBoardLayout,validateBoardLayout,
    EDITOR_DRAFT_KEY,clone,emptyDraft,fromCrossPreset,fromLayout,placedCount,
    fieldOf,selectedValid,snapXY,putField,eraseField,nextSlot,inspectDraft,asGameLayout,
  guidedPoint,directedPoint,previousTrackField,measureStepDistances,EIGHT_DIRECTIONS,alignTrackRun,translateTrackGroup,trackGroupBounds,firstUnplacedSlot,
    referencePoints,buildGoalLane,buildHomeGroup,getTrackConnections,straightGaps,connectStraightGap,SEAT_LABELS
  ];
  let source=readFileSync(new URL('../DOG/editor-builder.js',import.meta.url),'utf8');
  source=source.replace(/^import\s*\{[\s\S]*?\}\s*from '\.\/[^']+';\s*/gm,'');
  const args=['document','window','localStorage','location',...importNames];
  new Function(...args,source)(document,window,localStorage,location,...imports);
  const trigger=(id,type='click',data={})=>{
    const listener=fake(id).listeners.get(type);
    assert.ok(listener,'Missing '+id+' '+type+' listener');
    listener({target:fake(id),preventDefault(){},...data});
  };
  const touch=(x,y,hit=null,kind='touch')=>{
    const listener=board.listeners.get('pointerdown');assert.ok(listener);
    listener({pointerType:kind,button:0,pointerId:1,clientX:x,clientY:y,
      target:{closest(){return hit;}},preventDefault(){}});
  };
  const pointer=(type,x,y,id=1)=>{
    const listener=board.listeners.get(type);assert.ok(listener,'Missing '+type);
    listener({pointerType:'touch',button:0,pointerId:id,clientX:x,clientY:y,
      target:{closest(){return null;}},preventDefault(){}});
  };
  return {events,elements,storage,board,trigger,touch,pointer,
    dir:(dx,dy)=>trigger('path-'+dx+','+dy),
    groupDir:(dx,dy)=>trigger('group-'+dx+','+dy),get:id=>fake(id)};
}
test('touch pointer-down on empty SVG immediately places a DOG field',()=>{
 const ui=openBuilder();
 assert.match(ui.get('progress-total').textContent,/0\/96/);
 ui.touch(115,205);
 assert.equal(ui.get('track-progress').textContent,'1/64');
 assert.equal(ui.get('field-index').value,'1');
 assert.match(ui.board.innerHTML,/data-kind="track" data-index="0"/);
 ui.touch(147,205);
 assert.equal(ui.get('track-progress').textContent,'2/64');
 assert.match(ui.get('feedback').textContent,/Feld erfolgreich gesetzt/);
});
test('tapping an existing field arms replacement; next empty tap moves it without incrementing count',()=>{
 const ui=openBuilder();
 ui.touch(115,205);ui.touch(147,205);
 const item={dataset:{kind:'track',index:'0',owner:'0'}};
 ui.touch(115,205,item);
 assert.equal(ui.get('field-index').value,'0');
 assert.match(ui.get('feedback').textContent,/ausgewählt/);
 ui.touch(115,237);
 assert.equal(ui.get('track-progress').textContent,'2/64');
 assert.match(ui.get('feedback').textContent,/ersetzt/);
 const draft=JSON.parse(ui.storage.get(EDITOR_DRAFT_KEY));
 assert.deepEqual(draft.track[0],{x:124,y:252});
});
test('manual X/Y button places a field even if the tablet does not deliver a canvas pointer event',()=>{
 const ui=openBuilder();
 assert.equal(ui.get('coord-x').disabled,false);
 assert.equal(ui.get('coord-y').disabled,false);
 ui.get('coord-x').value='210';ui.get('coord-y').value='315';
 ui.trigger('place-coordinates');
 assert.equal(ui.get('track-progress').textContent,'1/64');
 assert.equal(ui.get('field-index').value,'1');
 assert.match(ui.get('feedback').textContent,/Feld erfolgreich gesetzt/);
});
test('tap-to-replace does not discard previous draft or change the active game board',()=>{
 const before=currentBoardLayout();
 const ui=openBuilder();
 ui.touch(110,110);ui.touch(142,110);
 ui.touch(110,110,{dataset:{kind:'track',index:'0',owner:'0'}});
 ui.touch(110,160);
 assert.equal(ui.get('track-progress').textContent,'2/64');
 assert.equal(ui.storage.has(EDITOR_DRAFT_KEY),true);
 assert.deepEqual(currentBoardLayout(),before);
});

test('eight direction buttons give identical centre spacing straight and diagonally',()=>{
 const ui=openBuilder();
 ui.touch(115,205);
 assert.equal(ui.get('field-index').value,'1');
 ui.dir(1,0); // horizontal step
 ui.dir(1,-1); // 45° diagonal step
 const d=JSON.parse(ui.storage.get(EDITOR_DRAFT_KEY));
 assert.equal(placedCount(d).track,3);
 const straight=Math.hypot(d.track[1].x-d.track[0].x,d.track[1].y-d.track[0].y);
 const diagonal=Math.hypot(d.track[2].x-d.track[1].x,d.track[2].y-d.track[1].y);
 assert.ok(Math.abs(straight-32)<.15,'straight '+straight);
 assert.ok(Math.abs(diagonal-32)<.15,'diagonal '+diagonal);
 assert.ok(Math.abs(straight-diagonal)<.15);
 assert.match(ui.get('gap-report').textContent,/2 von 2 Verbindungen/);
});
test('a previously placed DOG field can be re-aligned diagonally without changing the count',()=>{
 const ui=openBuilder();
 ui.touch(115,205);ui.dir(1,0);ui.dir(1,0);
 const before=JSON.parse(ui.storage.get(EDITOR_DRAFT_KEY));
 ui.touch(before.track[2].x,before.track[2].y,{dataset:{kind:'track',index:'2',owner:'0'}});
 ui.dir(1,-1);
 const after=JSON.parse(ui.storage.get(EDITOR_DRAFT_KEY));
 assert.equal(placedCount(after).track,3);
 assert.notDeepEqual(after.track[2],before.track[2]);
 assert.ok(Math.abs(Math.hypot(after.track[2].x-after.track[1].x,after.track[2].y-after.track[1].y)-32)<.15);
});

test('changing an existing 28-unit raster also uses 28-unit straight and diagonal steps',()=>{
 const ui=openBuilder();
 ui.get('grid-size').value='28';ui.trigger('grid-size','change');
 assert.equal(ui.get('step-size').value,'28');
 ui.touch(115,205);ui.dir(1,0);ui.dir(1,-1);
 const d=JSON.parse(ui.storage.get(EDITOR_DRAFT_KEY));
 const first=Math.hypot(d.track[1].x-d.track[0].x,d.track[1].y-d.track[0].y);
 const second=Math.hypot(d.track[2].x-d.track[1].x,d.track[2].y-d.track[1].y);
 assert.ok(Math.abs(first-28)<.15);
 assert.ok(Math.abs(second-28)<.15);
});
test('player-selected equal spacing is independent after choosing a separate guide distance',()=>{
 const ui=openBuilder();
 ui.get('step-size').value='36';ui.trigger('step-size','change');
 ui.get('grid-size').value='28';ui.trigger('grid-size','change');
 assert.equal(ui.get('grid-size').value,'28');
 assert.equal(ui.get('step-size').value,'36');
 ui.touch(115,205);ui.dir(0,1);
 const d=JSON.parse(ui.storage.get(EDITOR_DRAFT_KEY));
 const distance=Math.hypot(d.track[1].x-d.track[0].x,d.track[1].y-d.track[0].y);
 assert.ok(Math.abs(distance-36)<.15);
});


test('re-align selected existing DOG segment and undo it in one operation',()=>{
 const ui=openBuilder();
 ui.touch(115,205);ui.dir(1,0);ui.dir(1,0);ui.dir(1,0);
 const before=JSON.parse(ui.storage.get(EDITOR_DRAFT_KEY));
 assert.equal(placedCount(before).track,4);
 ui.touch(before.track[0].x,before.track[0].y,{dataset:{kind:'track',index:'0',owner:'0'}});
 ui.get('align-count').value='3';
 ui.get('align-direction').value='1,1';
 ui.trigger('align-run');
 const after=JSON.parse(ui.storage.get(EDITOR_DRAFT_KEY));
 assert.equal(placedCount(after).track,4);
 assert.deepEqual(after.track[0],before.track[0]);
 assert.equal(ui.get('field-index').value,'3');
 for(let i=0;i<3;i++){
   const distance=Math.hypot(after.track[i+1].x-after.track[i].x,after.track[i+1].y-after.track[i].y);
   assert.ok(Math.abs(distance-32)<.15,'Re-aligned segment '+i);
 }
 assert.match(ui.get('feedback').textContent,/Felder 1 bis 3/);
 ui.trigger('undo');
 assert.deepEqual(JSON.parse(ui.storage.get(EDITOR_DRAFT_KEY)),before);
});
test('batch alignment does not change the draft if the run would leave the board',()=>{
 const ui=openBuilder();
 ui.touch(699,699);
 ui.get('align-count').value='3';
 ui.get('align-direction').value='1,1';
 const before=ui.storage.get(EDITOR_DRAFT_KEY);
 ui.touch(699,699,{dataset:{kind:'track',index:'0',owner:'0'}});
 ui.trigger('align-run');
 assert.equal(ui.storage.get(EDITOR_DRAFT_KEY),before);
 assert.match(ui.get('feedback').textContent,/außerhalb|unverändert/);
});

test('DOG assistant selects house exit without losing existing positions',()=>{
 const ui=openBuilder();
 ui.get('assist-seat').value='2';
 ui.trigger('assist-seat','change');
 ui.trigger('choose-exit');
 assert.equal(ui.get('field-index').value,'32');
 assert.match(ui.get('assist-reference').innerHTML,/Ausstieg Feld 32/);
 ui.touch(380,160);
 const d=JSON.parse(ui.storage.get(EDITOR_DRAFT_KEY));
 assert.ok(d.track[32]);
 assert.equal(d.track[0],null);
});
test('DOG assistant previews goal lane without persisting, then generates four equally spaced goals',()=>{
 const ui=openBuilder();
 // Set red's start square 0, where the goal lane branches.
 ui.get('field-index').value='0';ui.trigger('field-index','input');
 ui.touch(115,310);
 const before=ui.storage.get(EDITOR_DRAFT_KEY);
 ui.trigger('preview-goals');
 assert.equal(ui.storage.get(EDITOR_DRAFT_KEY),before);
 assert.match(ui.board.innerHTML,/stroke="#fff0bd"/);
 ui.trigger('build-goals');
 const d=JSON.parse(ui.storage.get(EDITOR_DRAFT_KEY));
 assert.equal(placedCount(d).goals,4);
 for(let i=1;i<4;i++){
  const dist=Math.hypot(d.goals[0][i].x-d.goals[0][i-1].x,d.goals[0][i].y-d.goals[0][i-1].y);
  assert.ok(Math.abs(dist-28)<.15);
 }
});
test('DOG assistant groups four house slots and preserves existing circuit',()=>{
 const ui=openBuilder();
 ui.touch(115,205);
 const initial=JSON.parse(ui.storage.get(EDITOR_DRAFT_KEY));
 ui.get('assist-home-dir').value='1,0';
 ui.get('assist-home-layout').value='square';
 ui.get('assist-home-distance').value='100';
 ui.trigger('build-homes');
 const updated=JSON.parse(ui.storage.get(EDITOR_DRAFT_KEY));
 assert.equal(placedCount(updated).homes,4);
 assert.deepEqual(updated.track,initial.track);
 assert.equal(updated.homes[0][1].x-updated.homes[0][0].x,28);
 assert.equal(updated.homes[0][2].y-updated.homes[0][0].y,28);
 ui.trigger('undo');
 assert.deepEqual(JSON.parse(ui.storage.get(EDITOR_DRAFT_KEY)),initial);
});
test('DOG track connector fills only safe straight gaps, preserving both endpoints',()=>{
 const ui=openBuilder();
 ui.touch(115,115); // #0 snapped to 124,124.
 ui.get('field-index').value='3';ui.trigger('field-index','input');
 ui.touch(220,115); // #3 at 220,124, 96 apart -> two 32 gaps.
 const start=JSON.parse(ui.storage.get(EDITOR_DRAFT_KEY));
 assert.equal(placedCount(start).track,2);
 ui.get('gap-select').value='0';
 ui.trigger('check-connections');
 assert.match(ui.get('track-summary').textContent,/Nachbarschaften verbunden/);
 ui.trigger('fill-track-gap');
 const finished=JSON.parse(ui.storage.get(EDITOR_DRAFT_KEY));
 assert.equal(placedCount(finished).track,4);
 assert.deepEqual(finished.track[0],start.track[0]);
 assert.deepEqual(finished.track[3],start.track[3]);
 assert.equal(finished.track[1].x,156);
 assert.equal(finished.track[2].x,188);
 assert.match(ui.get('feedback').textContent,/gleichmäßig verbunden/);
});


test('DOG group mode moves all created track circles together, preserving spacing and undo',()=>{
 const ui=openBuilder();
 ui.touch(115,205);ui.dir(1,0);ui.dir(1,0);
 const original=JSON.parse(ui.storage.get(EDITOR_DRAFT_KEY));
 assert.equal(placedCount(original).track,3);
 ui.trigger('select-track-group');
 assert.equal(ui.get('group-count').textContent,'3');
 assert.equal(ui.get('group-move-panel').hidden,false);
 ui.groupDir(1,0);
 const changed=JSON.parse(ui.storage.get(EDITOR_DRAFT_KEY));
 for(let i=0;i<3;i++){
   assert.equal(changed.track[i].x-original.track[i].x,5);
   assert.equal(changed.track[i].y-original.track[i].y,0);
 }
 assert.deepEqual(changed.goals,original.goals);
 ui.trigger('undo');
 assert.deepEqual(JSON.parse(ui.storage.get(EDITOR_DRAFT_KEY)),original);
});
test('DOG group drag previews all fields, then saves one translation on pointer release',()=>{
 const ui=openBuilder();
 ui.touch(115,205);ui.dir(1,0);
 const original=JSON.parse(ui.storage.get(EDITOR_DRAFT_KEY));
 ui.trigger('select-track-group');
 ui.pointer('pointerdown',130,210,77);
 ui.pointer('pointermove',160,238,77);
 assert.deepEqual(JSON.parse(ui.storage.get(EDITOR_DRAFT_KEY)),original);
 ui.pointer('pointerup',160,238,77);
 const moved=JSON.parse(ui.storage.get(EDITOR_DRAFT_KEY));
 assert.equal(moved.track[0].x-original.track[0].x,30);
 assert.equal(moved.track[0].y-original.track[0].y,28);
 assert.equal(moved.track[1].x-original.track[1].x,30);
 assert.equal(moved.track[1].y-original.track[1].y,28);
 ui.trigger('undo');
 assert.deepEqual(JSON.parse(ui.storage.get(EDITOR_DRAFT_KEY)),original);
});
test('DOG manual goal and home creation advances across all four spots in a colour',()=>{
 const ui=openBuilder();
 ui.trigger('choose-goal-first');
 assert.equal(ui.get('field-index').value,'0');
 ui.touch(120,120);
 assert.equal(ui.get('field-index').value,'1');
 ui.touch(160,120);
 assert.equal(ui.get('field-index').value,'2');
 ui.touch(200,120);
 assert.equal(ui.get('field-index').value,'3');
 ui.touch(240,120);
 let d=JSON.parse(ui.storage.get(EDITOR_DRAFT_KEY));
 assert.equal(d.goals[0].filter(Boolean).length,4);
 ui.trigger('choose-home-first');
 assert.equal(ui.get('field-index').value,'0');
 ui.touch(120,250);ui.touch(160,250);ui.touch(200,250);ui.touch(240,250);
 d=JSON.parse(ui.storage.get(EDITOR_DRAFT_KEY));
 assert.equal(d.homes[0].filter(Boolean).length,4);
 assert.equal(placedCount(d).total,8);
});
test('DOG assistant chooses the next empty goal/home slot rather than replacing first',()=>{
 const ui=openBuilder();
 ui.trigger('choose-goal-first');ui.touch(120,120);
 ui.trigger('choose-goal-first');
 assert.equal(ui.get('field-index').value,'1');
 ui.trigger('choose-home-first');ui.touch(120,240);
 ui.trigger('choose-home-first');
 assert.equal(ui.get('field-index').value,'1');
});
