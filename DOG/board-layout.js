/**
 * DOG 4-seat cross board · geometry only.
 * The numbered circuit is immutable in meaning (0..63), but its coordinates
 * may be customized. The classic-cross preset resembles the physical board's
 * four-armed course without copying any publisher artwork.
 *
 * No client-supplied coordinates are ever used by the rules engine.
 */
export const BOARD_LAYOUT_ID='dog-classic-cross-v3';
export const BOARD_VIEWBOX=760;
export const CUSTOM_BOARD_KEY='spielportal:dog:board-layout:v1';
export const START_INDICES=Object.freeze([0,16,32,48]);
export const TRACK_COUNT=64,SEAT_COUNT=4,GOAL_COUNT=4,HOME_COUNT=4;
export const COLORS_CLASSIC=Object.freeze(['#e85b54','#58a9ed','#50bf80','#ecc354']);
const SECTOR=Object.freeze([
 [95,380],[127,380],[159,380],[191,380],
 [215,356],[239,332],[263,308],[287,284],
 [287,252],[287,220],[287,188],[287,156],
 [287,124],[287,92],[319,92],[351,92]
]);
const BASE_GOAL=Object.freeze([[127,420],[159,420],[191,420],[223,420]]);
const BASE_HOME=Object.freeze([[110,540],[142,540],[174,540],[206,540]]);
const rotate=(p,quarter)=>{
 const {x,y}=Array.isArray(p)?{x:p[0],y:p[1]}:p;
 switch((quarter%4+4)%4){
  case 0:return {x,y};
  case 1:return {x:760-y,y:x};
  case 2:return {x:760-x,y:760-y};
  default:return {x:y,y:760-x};
 }
};
const original=()=>({
 schemaVersion:1,preset:BOARD_LAYOUT_ID,title:'DOG · Kreuz-Spielplan',
 track:Array.from({length:64},(_,i)=>rotate(SECTOR[i%16],Math.floor(i/16))),
 goals:Array.from({length:4},(_,owner)=>BASE_GOAL.map(p=>rotate(p,owner))),
 homes:Array.from({length:4},(_,owner)=>BASE_HOME.map(p=>rotate(p,owner)))
});
const clone=x=>JSON.parse(JSON.stringify(x));
export const DEFAULT_LAYOUT=original();
export const TRACK_POINTS=clone(DEFAULT_LAYOUT.track);
export const GOAL_POINTS=clone(DEFAULT_LAYOUT.goals);
export const HOME_POINTS=clone(DEFAULT_LAYOUT.homes);
export const trackPoint=i=>TRACK_POINTS[(i%64+64)%64]||null;
export const goalPoint=(owner,i)=>GOAL_POINTS[owner]?.[i]||null;
export const homePoint=(owner,i)=>HOME_POINTS[owner]?.[i]||null;
export const isStartField=i=>Number.isInteger(i)&&i>=0&&i<64&&i%16===0;
export const makeDefaultLayout=()=>clone(DEFAULT_LAYOUT);
export const rotatePoint=(p,quarter)=>rotate(p,quarter);
export function validateBoardLayout(input,{strict=true}={}){
 const errors=[];
 if(!input||typeof input!=='object'||Array.isArray(input))return ['Ungültige Layoutdaten.'];
 const sets=[['track',input.track,64],['goals',input.goals,4],['homes',input.homes,4]];
 for(const [name,arr,size] of sets){
  if(!Array.isArray(arr)||arr.length!==size)errors.push(name+': falsche Anzahl');
 }
 if(errors.length)return errors;
 for(const name of ['goals','homes'])for(let i=0;i<4;i++)
  if(!Array.isArray(input[name][i])||input[name][i].length!==4)errors.push(name+'['+i+']: 4 Positionen nötig');
 if(errors.length)return errors;
 const points=[...input.track,...input.goals.flat(),...input.homes.flat()];
 for(const [i,p] of points.entries()){
  if(!p||typeof p!=='object'||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<26||p.x>734||p.y<26||p.y>734){
   errors.push('Punkt '+i+' liegt außerhalb der Spielfläche');if(errors.length>8)return errors;
  }
 }
 if(errors.length)return errors;
 if(strict){
  for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){
   if(Math.hypot(points[i].x-points[j].x,points[i].y-points[j].y)<23){
    errors.push('Felder '+(i+1)+' und '+(j+1)+' überlappen (< 23 Einheiten)');
    if(errors.length>7)return errors;
   }
  }
  for(let i=0;i<64;i++){
   const a=input.track[i],b=input.track[(i+1)%64],d=Math.hypot(a.x-b.x,a.y-b.y);
   if(d<20||d>75){
    errors.push('Abstand im Laufweg: Feld '+i+' → '+((i+1)%64)+' ('+Math.round(d)+')');
    if(errors.length>7)return errors;
   }
  }
 }
 return errors;
}
export function setBoardLayout(input){
 const errors=validateBoardLayout(input);
 if(errors.length)throw Error(errors.join('; '));
 const next=clone(input);
 for(let i=0;i<64;i++)TRACK_POINTS[i]=next.track[i];
 for(let owner=0;owner<4;owner++)for(let i=0;i<4;i++){
  GOAL_POINTS[owner][i]=next.goals[owner][i];
  HOME_POINTS[owner][i]=next.homes[owner][i];
 }
 return next;
}
export function currentBoardLayout(){
 return {schemaVersion:1,preset:BOARD_LAYOUT_ID,title:'Mein DOG-Brett',track:clone(TRACK_POINTS),goals:clone(GOAL_POINTS),homes:clone(HOME_POINTS)};
}
export function loadSavedBoardLayout(storage=typeof window!=='undefined'?window.localStorage:null){
 if(!storage)return false;
 try{
  const item=storage.getItem(CUSTOM_BOARD_KEY);
  if(!item)return false;
  setBoardLayout(JSON.parse(item));
  return true;
 }catch(err){
  console.warn('[DOG] Eigener Spielfeldplan konnte nicht geladen werden:',err);
  return false;
 }
}
export function saveBoardLayout(layout,storage=typeof window!=='undefined'?window.localStorage:null){
 if(!storage)throw Error('Dein Browser erlaubt gerade keine lokale Speicherung.');
 const next=setBoardLayout(layout);
 storage.setItem(CUSTOM_BOARD_KEY,JSON.stringify(next));
 return next;
}
export function resetBoardLayout(storage=typeof window!=='undefined'?window.localStorage:null){
 const next=setBoardLayout(DEFAULT_LAYOUT);
 if(storage)storage.removeItem(CUSTOM_BOARD_KEY);
 return next;
}
export function assertBoardLayout(){
 const errors=validateBoardLayout(currentBoardLayout());
 if(errors.length)throw Error(errors.join('; '));
 return true;
}
assertBoardLayout();
loadSavedBoardLayout();
