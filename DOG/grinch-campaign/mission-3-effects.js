/**
 * DOG Grinch Mission 3 – purely visual event interpretation and scene effects.
 * Does not mutate campaign state or alter the card engine.
 */
import {trackPoint} from '../board-layout.js?v=11';
const labels={light:'✨ Weihnachtslicht',ice:'🧊 Eisbarriere',rune:'🔮 Rune'};
const icon={move:'✦',hit:'💥',freeze:'❄',knockback:'↶',capture:'🔒',objective:'✧',stage:'★',win:'🏆',thaw:'☀'};
const safeOwner=(state,id)=>state?.players?.[id]?.name||['Rot','Blau','Gelb','Grinch'][id]||'Spieler';
const onTrack=p=>p?.place==='track'&&Number.isInteger(p.pos)&&p.pos>=0&&p.pos<64;
const fromPosition=p=>onTrack(p)?p.pos:null;
const sameEvent=(a,b)=>JSON.stringify(a||null)===JSON.stringify(b||null);
export function mission3VisualEvents(before,after){
 if(!before||!after||before.mission!==3||after.mission!==3)return [];
 const events=[];
 const oldPawns=new Map(before.pieces.map(p=>[p.id,p]));
 for(const piece of after.pieces){
  const prev=oldPawns.get(piece.id);
  if(!prev)continue;
  if(prev.frozenTurns>0&&piece.frozenTurns===0&&piece.place==='track')
   events.push({type:'thaw',pieceId:piece.id,field:piece.pos,message:'☀ '+safeOwner(after,piece.owner)+'s Figur ist wieder aufgetaut.'});
  if(piece.owner===3&&onTrack(prev)&&onTrack(piece)&&prev.pos!==piece.pos)
   events.push({type:'move',pieceId:piece.id,field:piece.pos,previousField:prev.pos,message:'😈 Grinch rückt vor.'});
  if(piece.owner<3&&onTrack(prev)&&piece.place==='home')
   events.push({type:'hit',pieceId:piece.id,field:prev.pos,message:'💥 '+safeOwner(after,piece.owner)+'s Figur wurde ins Haus geschickt!'});
  if(piece.owner<3&&onTrack(prev)&&onTrack(piece)&&prev.pos!==piece.pos&&
    prev.owner!==after.current&&after.lastCapture?.pieceId!==piece.id)
   events.push({type:'move',pieceId:piece.id,field:piece.pos,previousField:prev.pos,message:'Figur bewegt sich.'});
 }
 const beforeStage=before.tasks?.stage,afterStage=after.tasks?.stage;
 if(beforeStage===afterStage&&Array.isArray(after.tasks?.progress)){
  const was=before.tasks?.progress?.[afterStage]||0,now=after.tasks.progress[afterStage]||0;
  if(now>was){
   const completed=after.tasks.objectives?.filter(o=>o.collected&&!before.tasks?.objectives?.some(x=>x.id===o.id&&x.collected))||[];
   const objective=completed[0],kind=objective?.kind||['light','ice','rune'][afterStage];
   events.push({type:'objective',field:objective?.field,
    message:(labels[kind]||'✨ Missionsziel')+' geschafft! '+now+'/'+[3,4,3][afterStage]});
  }
 }
 if(beforeStage!==afterStage&&Number.isInteger(afterStage))
  events.push({type:'stage',field:null,message:'🎯 Neue Aufgabe: '+['Die Weihnachtslichter','Der Eisbrecher','Die magische Versiegelung'][afterStage]});
 if(!sameEvent(before.lastCurse,after.lastCurse)&&after.lastCurse?.type){
  const c=after.lastCurse,p=after.pieces.find(x=>x.id===c.pieceId);
  if(c.type==='freeze'){
   events.push({type:'freeze',pieceId:c.pieceId,field:fromPosition(p),
    message:'❄ '+safeOwner(after,c.owner)+'s Figur ist zwei eigene Züge eingefroren!'});
  }else if(c.type==='knockback'){
   events.push({type:'knockback',pieceId:c.pieceId,field:fromPosition(p),
    message:'💥 '+safeOwner(after,c.owner)+' wurde '+c.distance+' Felder zurückgeworfen!'});
  }
 }
 if(!sameEvent(before.lastCapture,after.lastCapture)&&after.lastCapture?.pieceId){
  const victim=oldPawns.get(after.lastCapture.pieceId);
  events.push({type:'capture',pieceId:after.lastCapture.pieceId,field:fromPosition(victim),
   message:'🔒 Der Grinch hat eine Figur von '+safeOwner(after,after.lastCapture.owner)+' entführt!'});
 }
 if(!before.complete&&after.complete)
  events.push({type:'win',field:null,message:'🏆 Mission 3 geschafft! Alle drei Aufgaben sind gelöst.'});
 return events;
}
const priority={win:10,capture:9,stage:8,objective:7,freeze:6,knockback:6,hit:5,thaw:4,move:1};
const NS='http://www.w3.org/2000/svg';
let currentTimeout=null;
export function showMission3VisualEffects({viewport,board,banner,events}){
 if(!viewport||!board||!banner||!Array.isArray(events)||!events.length)return;
 // Visual feedback must never block an actual pawn click.
 for(const ev of events.filter(e=>Number.isInteger(e.field)).slice(0,5)){
  const pt=trackPoint(ev.field);
  if(!pt)continue;
  const group=document.createElementNS(NS,'g');
  group.setAttribute('class','m3-vfx m3-vfx-'+ev.type);
  group.setAttribute('pointer-events','none');
  const ring=document.createElementNS(NS,'circle');
  ring.setAttribute('cx',String(pt.x));ring.setAttribute('cy',String(pt.y));ring.setAttribute('r','22');
  ring.setAttribute('class','m3-vfx-ring');group.append(ring);
  const text=document.createElementNS(NS,'text');
  text.setAttribute('x',String(pt.x));
  text.setAttribute('y',String(pt.y-18));
  text.setAttribute('text-anchor','middle');
  text.setAttribute('class','m3-vfx-label');
  text.textContent=icon[ev.type]||'✧';group.append(text);
  board.append(group);
  setTimeout(()=>group.remove(),1050);
 }
 const winner=[...events].sort((a,b)=>(priority[b.type]||0)-(priority[a.type]||0))[0];
 banner.textContent=winner.message;
 banner.dataset.effect=winner.type;
 banner.classList.remove('m3-vfx-visible');
 void banner.offsetWidth; // restart banner entrance animation
 banner.classList.add('m3-vfx-visible');
 clearTimeout(currentTimeout);
 currentTimeout=setTimeout(()=>banner.classList.remove('m3-vfx-visible'),2700);
}
