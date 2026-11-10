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
/**
 * 8-direction equidistant guide. Unlike a square grid, diagonal steps
 * are normalized: both straight and 45° diagonal steps have equal Euclidean
 * centre-to-centre length. The grid remains useful for the first field.
 */
export const EIGHT_DIRECTIONS=Object.freeze([
  Object.freeze({dx:-1,dy:-1,label:'↖'}),Object.freeze({dx:0,dy:-1,label:'↑'}),
  Object.freeze({dx:1,dy:-1,label:'↗'}),Object.freeze({dx:-1,dy:0,label:'←'}),
  Object.freeze({dx:1,dy:0,label:'→'}),Object.freeze({dx:-1,dy:1,label:'↙'}),
  Object.freeze({dx:0,dy:1,label:'↓'}),Object.freeze({dx:1,dy:1,label:'↘'})
]);
export function previousTrackField(draft,selection){
  if(!selectedValid(selection)||selection.kind!=='track')return null;
  const index=(selection.index+63)%64;
  const point=draft.track[index];
  return point?{index,point:{...point}}:null;
}
const normaliseStep=step=>{
  if(!Number.isFinite(step)||step<23||step>70)throw Error('Abstand muss zwischen 23 und 70 Einheiten liegen.');
  return step;
};
function exactDirectedPoint(anchor,dx,dy,step){
  const length=Math.hypot(dx,dy);
  if(length<.0001)return null;
  const x=Math.round((anchor.x+step*dx/length)*10)/10;
  const y=Math.round((anchor.y+step*dy/length)*10)/10;
  if(x<30||x>730||y<30||y>730)return null;
  return {x,y};
}
export function guidedPoint(draft,selection,target,{step=32}={}){
  normaliseStep(step);
  const predecessor=previousTrackField(draft,selection);
  if(!predecessor)return null; // first field or deliberately broken track: free placement
  const dx=Number(target?.x)-predecessor.point.x,dy=Number(target?.y)-predecessor.point.y;
  if(!Number.isFinite(dx)||!Number.isFinite(dy)||Math.hypot(dx,dy)<.0001)return null;
  const direction=EIGHT_DIRECTIONS.reduce((best,candidate)=>{
    const dot=(candidate.dx*dx+candidate.dy*dy)/Math.hypot(candidate.dx,candidate.dy);
    return !best||dot>best.score?{candidate,score:dot}:best;
  },null).candidate;
  const point=exactDirectedPoint(predecessor.point,direction.dx,direction.dy,step);
  return point?{...point,anchor:predecessor.point,from:predecessor.index,dx:direction.dx,dy:direction.dy,label:direction.label}:null;
}
export function directedPoint(draft,selection,dx,dy,{step=32}={}){
  normaliseStep(step);
  if(!EIGHT_DIRECTIONS.some(d=>d.dx===dx&&d.dy===dy))throw Error('Nur 8 Richtungen sind erlaubt.');
  const predecessor=previousTrackField(draft,selection);
  if(!predecessor)return null;
  const point=exactDirectedPoint(predecessor.point,dx,dy,step);
  return point?{...point,anchor:predecessor.point,from:predecessor.index,dx,dy}:null;
}
/**
 * Re-space a previously drawn straight or diagonal run in a single edit.
 * Anchor field remains fixed, followed by 1–8 fields at identical Euclidean
 * distance. Never changes the numbering or any other field. All-or-nothing.
 * Symmetry applies the same run to the corresponding four colour sectors.
 */
export function alignTrackRun(draft,selection,{
  dx=1,dy=0,step=32,count=3,symmetry=false
}={}){
 if(!selectedValid(selection)||selection.kind!=='track')throw Error('Wähle ein vorhandenes Lauffeld als Anfang aus.');
 if(!Number.isInteger(count)||count<1||count>8)throw Error('Bitte 1 bis 8 folgende Felder wählen.');
 normaliseStep(step);
 if(!EIGHT_DIRECTIONS.some(d=>d.dx===dx&&d.dy===dy))throw Error('Nur acht Richtungen sind erlaubt.');
 const start=selection.index;
 if(start+count>63)throw Error('Der Abschnitt würde über Feld 63 hinausreichen. Wähle einen früheren Startpunkt.');
 if(!draft.track[start])throw Error('Das Ausgangsfeld ist noch nicht gesetzt.');
 const sectors=symmetry?[0,1,2,3]:[Math.floor(start/16)];
 const local=start%16;
 if(symmetry&&local+count>=16)throw Error('Gespiegelte Abschnitte dürfen nicht über einen Farbwechsel hinausgehen.');
 const next=clone(draft);
 const changed=new Set();
 const candidates=[];
 const baseSeat=Math.floor(start/16);
 const norm=Math.hypot(dx,dy);
 for(const seat of sectors){
   const idx=symmetry?seat*16+local:start;
   const anchor=next.track[idx];
   if(!anchor)throw Error('Das Ausgangsfeld '+idx+' ist noch nicht gesetzt.');
   const turn=symmetry?((seat-baseSeat+4)%4):0;
   const rotated=rotatePoint({x:380+dx,y:380+dy},turn);
   const stepx=step*(rotated.x-380)/norm,stepy=step*(rotated.y-380)/norm;
   for(let i=1;i<=count;i++){
     const x=Math.round((anchor.x+stepx*i)*10)/10;
     const y=Math.round((anchor.y+stepy*i)*10)/10;
     if(x<30||x>730||y<30||y>730)throw Error('Das Feld '+(idx+i)+' würde außerhalb der Spielfläche liegen.');
     changed.add(idx+i);
     candidates.push({index:idx+i,point:{x,y}});
   }
 }
 const untouched=[];
 for(let i=0;i<64;i++)if(next.track[i]&&!changed.has(i))untouched.push({id:'track '+i,point:next.track[i]});
 for(const kind of ['goals','homes'])for(let seat=0;seat<4;seat++)for(let i=0;i<4;i++){
   const p=next[kind][seat][i];
   if(p)untouched.push({id:kind+' '+seat+'-'+i,point:p});
 }
 // Two equal-radius fields must not land on an existing unrelated field.
 for(const candidate of candidates){
   for(const other of untouched){
     if(Math.hypot(candidate.point.x-other.point.x,candidate.point.y-other.point.y)<23){
       throw Error('Feld '+candidate.index+' würde '+other.id+' überlappen. Bitte andere Richtung oder Feldanzahl wählen.');
     }
   }
 }
 for(let i=0;i<candidates.length;i++)for(let j=i+1;j<candidates.length;j++){
   if(Math.hypot(candidates[i].point.x-candidates[j].point.x,candidates[i].point.y-candidates[j].point.y)<23)
     throw Error('Die korrigierten Felder würden sich überlappen.');
 }
 for(const item of candidates)next.track[item.index]=item.point;
 return next;
}

export function measureStepDistances(draft,step,{tolerance=.25}={}){
  normaliseStep(step);
  const edges=[];
  for(let i=0;i<64;i++){
    const a=draft.track[i],b=draft.track[(i+1)%64];
    if(!a||!b)continue;
    const distance=Math.hypot(a.x-b.x,a.y-b.y);
    const diff=Math.abs(distance-step);
    edges.push({from:i,to:(i+1)%64,distance:Math.round(distance*10)/10,
      even:diff<=tolerance});
  }
  const even=edges.filter(e=>e.even).length;
  return {measured:edges.length,even,uneven:edges.length-even,edges};
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
