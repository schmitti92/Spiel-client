import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  BOARD_LAYOUT_ID,currentBoardLayout,saveBoardLayout,validateBoardLayout
} from '../DOG/board-layout.js';
import {
  EDITOR_DRAFT_KEY,clone,emptyDraft,fromCrossPreset,fromLayout,placedCount,
  fieldOf,selectedValid,snapXY,putField,eraseField,nextSlot,inspectDraft,asGameLayout
} from '../DOG/editor-model.js';

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
  const document={
    getElementById:fake,
    querySelectorAll:()=>[],
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
    'fieldOf','selectedValid','snapXY','putField','eraseField','nextSlot','inspectDraft','asGameLayout'
  ];
  const imports=[
    BOARD_LAYOUT_ID,currentBoardLayout,saveBoardLayout,validateBoardLayout,
    EDITOR_DRAFT_KEY,clone,emptyDraft,fromCrossPreset,fromLayout,placedCount,
    fieldOf,selectedValid,snapXY,putField,eraseField,nextSlot,inspectDraft,asGameLayout
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
  return {events,elements,storage,board,trigger,touch,get:id=>fake(id)};
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
