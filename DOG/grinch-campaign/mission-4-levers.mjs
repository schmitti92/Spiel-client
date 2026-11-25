import {sectionOpen,unlockSection} from './mission-4-board.mjs?v=3';
// Station assignment by anchor area, not the duplicate editor group ID.
export function stations(board){return [1,2].map(section=>({section,door:board.sections[section-1].to+1,levers:board.source.sideFields.filter(f=>f.type==='lever'&&board.fields[f.anchor]?.section===section)}));}
export function leverStatus(board,state,id){
 const station=stations(board).find(s=>s.levers.some(f=>f.id===id)),lever=station?.levers.find(f=>f.id===id);
 if(!lever)return {allowed:false,reason:'Unbekannter Hebel.'};
 if(!sectionOpen(state,station.section))return {allowed:false,reason:'Gebiet noch gesperrt.',lever,station};
 if(state.leverActive.includes(id))return {allowed:false,reason:'Hebel bereits aktiviert.',lever,station};
 const pawn=state.pieces.find(p=>p.color!=='enemy'&&p.field===lever.anchor+1&&(lever.owner==='all'||p.color===lever.owner));
 return {allowed:!!pawn,reason:pawn?'Hebel bereit.':'Passende Figur auf Feld '+(lever.anchor+1)+' benötigt.',pawn,lever,station};
}
export function activateLever(board,state,id,{test=false}={}){
 const v=leverStatus(board,state,id);if(!v.lever||!sectionOpen(state,v.station.section))throw Error(v.reason);
 if(state.leverActive.includes(id))return state;
 if(!test&&!v.allowed)throw Error(v.reason);
 const n={...state,leverActive:[...state.leverActive,id]};
 if(!v.station.levers.every(f=>n.leverActive.includes(f.id)))return n;
 const opened=unlockSection(n,v.station.section+1);
 if(v.station.section===1){const count=opened.pieces.filter(p=>p.color==='enemy').length;opened.pieces=opened.pieces.filter(p=>p.color!=='enemy');opened.portal1={...opened.portal1,closed:true,lastAction:'Portal geschlossen · '+count+' Gegner vernichtet.'};}
 if(v.station.section===2&&!opened.counterattack){
  const targets=(board.source.enemies||[]).map((position,i)=>position?{id:i+1,position}:null).filter(Boolean);
  opened.defeatedArchers=targets.map(t=>t.id);
  // The six new lever positions line up with the six ranged enemies.
  // Match in horizontal order, preserving enemy IDs; no invented editor coordinates.
  const orderedLevers=[...v.station.levers].sort((a,b)=>a.position.x-b.position.x||a.position.y-b.position.y||a.id-b.id);
  const orderedTargets=[...targets].sort((a,b)=>a.position.x-b.position.x||a.position.y-b.position.y||a.id-b.id);
  const shots=orderedTargets.map((target,i)=>({targetId:target.id,leverId:orderedLevers[i%orderedLevers.length].id,origin:orderedLevers[i%orderedLevers.length].position}));
  opened.counterattack={type:'lever-counterattack',station:2,leverIds:v.station.levers.map(f=>f.id),origins:v.station.levers.map(f=>f.position),targets,shots};
 }
 return opened;
}
export function doorOpen(board,state,number){const station=stations(board).find(s=>s.door===number);return !!station&&sectionOpen(state,station.section+1);}
