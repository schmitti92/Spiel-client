/**
 * DOG board builder state, independent of DOM and gameplay.
 * A draft may contain null holes; the live board never may.
 * All coordinates use a 760x760 SVG viewBox.
 */
import {BOARD_LAYOUT_ID,makeDefaultLayout,validateBoardLayout,rotatePoint} from './board-layout.js';
export const EDITOR_DRAFT_KEY='spielportal:dog:editor-draft:v2';
export const FIELD_TOTAL=96;
export const GRID_SIZES=Object.freeze([28,32,36,40,48]);
export const clone=value=>JSON.parse(JSON.stringify(value));
const blankFour=()=>Array.from({length:4},()=>Array(4).fill(null));
const rawPoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=26&&p.x<=734&&p.y>=26&&p.y<=734?{x:Math.round(p.x*10)/10,y:Math.round(p.y*10)/10}:null;
export function emptyDraft(){
  return {schemaVersion:2,kind:'dog-board-draft',title:'Mein DOG-Spielfeld',track:Array(64).fill(null),goals:blankFour(),homes:blankFour()};
}
export function fromLayout(layout){
  if(!layout||!Array.isArray(layout.track)||layout.track.length!==64
    ||!Array.isArray(layout.goals)||layout.goals.length!==4
    ||!Array.isArray(layout.homes)||layout.homes.length!==4)throw Error('Die Brettdatei hat keine gültige Struktur.');
  const out=emptyDraft();
  if(typeof layout.title==='string')out.title=layout.title.slice(0,80);
  out.track=layout.track.map(p=>p===null?null:rawPoint(p));
  for(const kind of ['goals','homes'])for(let seat=0;seat<4;seat++){
    const arr=layout[kind][seat];
    if(!Array.isArray(arr)||arr.length!==4)throw Error('Die '+kind+'-Plätze müssen vier Felder je Farbe enthalten.');
    out[kind][seat]=arr.map(p=>p===null?null:rawPoint(p));
  }
  const count=placedCount(out);
  // Reject malformed coordinates, do not silently make them unplaced.
  let claimed=layout.track.filter(p=>p!==null).length;
  for(const kind of ['goals','homes'])for(const a of layout[kind])claimed+=a.filter(p=>p!==null).length;
  if(count.total!==claimed)throw Error('Die Datei enthält ungültige oder außerhalb liegende Koordinaten.');
  return out;
}
export function fromCrossPreset(){return fromLayout(makeDefaultLayout());}
export function placedCount(draft){
  const track=draft.track.filter(Boolean).length;
  const goals=draft.goals.flat().filter(Boolean).length;
  const homes=draft.homes.flat().filter(Boolean).length;
  return {track,goals,homes,total:track+goals+homes,complete:track===64&&goals===16&&homes===16};
}
export function fieldOf(draft,kind,index,owner=0){
  if(kind==='track')return draft.track[index]??null;
  return draft[kind]?.[owner]?.[index]??null;
}
export function selectedValid({kind,index,owner=0}){
 return (kind==='track'&&Number.isInteger(index)&&index>=0&&index<64)
  ||(['goals','homes'].includes(kind)&&Number.isInteger(owner)&&owner>=0&&owner<4&&Number.isInteger(index)&&index>=0&&index<4);
}
export function snapXY(point,spacing=32,snap=true){
 let x=Number(point?.x),y=Number(point?.y);
 if(!Number.isFinite(x)||!Number.isFinite(y))throw Error('Ungültige Feldposition');
 if(snap){
  if(!Number.isInteger(spacing)||spacing<20||spacing>64)throw Error('Ungültige Rastergröße');
  x=380+Math.round((x-380)/spacing)*spacing;
  y=380+Math.round((y-380)/spacing)*spacing;
 }
 x=Math.max(30,Math.min(730,x));y=Math.max(30,Math.min(730,y));
 return {x:Math.round(x*10)/10,y:Math.round(y*10)/10};
}
export function putField(draft,selection,position,{symmetry=false,spacing=32,snap=true}={}){
 if(!selectedValid(selection))throw Error('Wähle zuerst ein gültiges Feld.');
 const point=snapXY(position,spacing,snap),next=clone(draft);
 if(symmetry){
  const fromSeat=selection.kind==='track'?Math.floor(selection.index/16):selection.owner;
  const base=rotatePoint(point,(4-fromSeat)%4);
  for(let seat=0;seat<4;seat++){
   const rotated=rotatePoint(base,seat);
   if(selection.kind==='track')next.track[seat*16+(selection.index%16)]=rotated;
   else next[selection.kind][seat][selection.index]=rotated;
  }
 }else if(selection.kind==='track')next.track[selection.index]=point;
 else next[selection.kind][selection.owner][selection.index]=point;
 return next;
}
export function eraseField(draft,selection,{symmetry=false}={}){
 if(!selectedValid(selection))throw Error('Wähle zuerst ein gültiges Feld.');
 const next=clone(draft);
 if(symmetry){
  for(let seat=0;seat<4;seat++){
   if(selection.kind==='track')next.track[seat*16+(selection.index%16)]=null;
   else next[selection.kind][seat][selection.index]=null;
  }
 }else if(selection.kind==='track')next.track[selection.index]=null;
 else next[selection.kind][selection.owner][selection.index]=null;
 return next;
}
export function nextSlot(draft,selection,{symmetry=false}={}){
 const kind=selection.kind;
 if(kind==='track'){
  if(symmetry){
   for(let step=1;step<=16;step++){
    const pos=(selection.index%16+step)%16;
    if([0,1,2,3].some(seat=>!draft.track[seat*16+pos]))return {kind:'track',index:pos,owner:0};
   }
  }else for(let step=1;step<=64;step++){
   const pos=(selection.index+step)%64;
   if(!draft.track[pos])return {kind:'track',index:pos,owner:Math.floor(pos/16)};
  }
 }else{
  if(symmetry){
   for(let step=1;step<=4;step++){
    const idx=(selection.index+step)%4;
    if([0,1,2,3].some(seat=>!draft[kind][seat][idx]))return {kind,index:idx,owner:0};
   }
  }else{
   for(let step=1;step<=16;step++){
    const flat=(selection.owner*4+selection.index+step)%16;
    const owner=Math.floor(flat/4),index=flat%4;
    if(!draft[kind][owner][index])return {kind,index,owner};
   }
  }
 }
 return {...selection};
}
export function inspectDraft(draft){
 const count=placedCount(draft),errors=[],warnings=[];
 const present=[];
 const add=(p,kind,index,owner=0)=>{if(p)present.push({p,kind,index,owner})};
 draft.track.forEach((p,i)=>add(p,'track',i,Math.floor(i/16)));
 for(const kind of ['goals','homes'])for(let owner=0;owner<4;owner++)
  draft[kind][owner].forEach((p,index)=>add(p,kind,index,owner));
 for(let i=0;i<present.length;i++)for(let j=i+1;j<present.length;j++){
  const a=present[i],b=present[j];
  if(Math.hypot(a.p.x-b.p.x,a.p.y-b.p.y)<23){
   if(errors.length<12)errors.push('Zwei Spielfelder überlappen: '+a.kind+' '+a.index+' / '+b.kind+' '+b.index);
  }
 }
 for(let i=0;i<64;i++){
  const a=draft.track[i],b=draft.track[(i+1)%64];
  if(!a||!b)continue;
  const d=Math.hypot(a.x-b.x,a.y-b.y);
  if(d<20||d>75){
   if(warnings.length<10)warnings.push('Laufweg zwischen '+i+' und '+((i+1)%64)+' prüfen ('+Math.round(d)+' Einheiten).');
  }
 }
 if(count.complete){
  const layout=asGameLayout(draft,false);
  errors.push(...validateBoardLayout(layout));
 }else{
  warnings.unshift('Noch '+(FIELD_TOTAL-count.total)+' von 96 Positionen setzen, bevor das Brett übernommen werden kann.');
 }
 return {count,errors:[...new Set(errors)],warnings,ready:count.complete&&errors.length===0&&warnings.length===0};
}
export function asGameLayout(draft,validate=true){
 const c=placedCount(draft);
 if(validate&&!c.complete)throw Error('Erst alle 64 Lauffelder, 16 Ziel- und 16 Startplätze setzen.');
 const out={schemaVersion:1,preset:BOARD_LAYOUT_ID,title:String(draft.title||'Mein DOG-Brett').slice(0,80),track:clone(draft.track),goals:clone(draft.goals),homes:clone(draft.homes)};
 if(validate){
  const errs=validateBoardLayout(out);
  if(errs.length)throw Error(errs.slice(0,3).join(' · '));
 }
 return out;
}
