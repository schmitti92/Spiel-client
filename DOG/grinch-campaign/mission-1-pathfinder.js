/**
 * Mission 1 – Pfadfinder: an SVG decoration layer for the ORIGINAL DOG board.
 *
 * Coordinates come exclusively from DOG/board-layout.js. No holes, starts,
 * rules, player choices, or regular appearance settings are modified.
 *
 * All markup is passive (pointer-events:none), so original pawn clicks work.
 */
import {MISSION_1} from './mission-config.js';
export const PATHFINDER_CLUES=Object.freeze(MISSION_1.trailHints.map(c=>Object.freeze({field:c.field,emoji:c.icon,title:c.title})));
export const PATHFINDER_SEATS=Object.freeze([0,1,3]); // Rot, Blau, Gelb
const point=p=>Number(p).toFixed(2);
const esc=v=>String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const goalProgress=(game,seat)=>game.pieces.filter(p=>p.seat===seat&&p.place==='goal').length;
/** Generate the mission-specific map and exit-gate overlay from geometry. */
export function pathfinderBoardMarkup(game,{track,goals,colors}){
 if(!game||!Array.isArray(track)||track.length!==64)return '';
 const out=[];
 out.push('<g id="grinch-pathfinder-overlay" class="pf-overlay" pointer-events="none" aria-hidden="true">');
 // A track remains a 64-field DOG track. Clues are signposts, NOT replacements
 // or physical trap fields. Mandatory losses still come from the mission engine.
 for(const mark of PATHFINDER_CLUES){
  const p=track[mark.field];if(!p)continue;
  const x=point(p.x),y=point(p.y);
  out.push('<g class="pf-clue" data-pathfinder-field="'+mark.field+'">'+
    '<circle cx="'+x+'" cy="'+y+'" r="20.5" fill="none" stroke="#f5d68e" stroke-width="1.4" stroke-dasharray="3.2 3.2" opacity=".82"/>'+
    '<circle cx="'+x+'" cy="'+y+'" r="14.5" fill="#173e42" fill-opacity=".70"/>'+
    '<text x="'+x+'" y="'+point(p.y+5.4)+'" text-anchor="middle" font-size="14" font-family="system-ui,sans-serif">'+mark.emoji+'</text>'+
   '</g>');
 }
 // Each inner goal endpoint is a wayfinder gate pointing toward the next
 // chapter. A 32-unit open gap between the last goal field and the DOG crest
 // is used; all four official goal positions remain unchanged.
 for(let seat=0;seat<3;seat++){
  const owner=PATHFINDER_SEATS[seat],lane=goals[owner];
  if(!Array.isArray(lane)||lane.length!==4)continue;
  const c=colors[owner]||'#f0cf87',count=goalProgress(game,seat),done=count===4;
  const tip=lane[3];
  const dx=380-tip.x,dy=380-tip.y,length=Math.hypot(dx,dy)||1;
  const ux=dx/length,uy=dy/length,gate={x:tip.x+ux*32,y:tip.y+uy*32};
  out.push('<g class="pf-exit '+(done?'pf-exit-ready':'pf-exit-pending')+'" data-pathfinder-seat="'+seat+'">');
  // Thin signal rings frame the four *existing* white goal spaces.
  for(let j=0;j<4;j++){
   const p=lane[j],filled=game.pieces.some(piece=>piece.seat===seat&&piece.place==='goal'&&piece.steps===64+j);
   out.push('<circle cx="'+point(p.x)+'" cy="'+point(p.y)+'" r="19.35" fill="none" stroke="'+esc(filled?'#fbe6a1':c)+'" stroke-width="'+(filled?'3':'1.6')+'" opacity="'+(filled?'1':'.6')+'"/>');
  }
  out.push('<path d="M '+point(tip.x+ux*17)+' '+point(tip.y+uy*17)+' L '+point(gate.x-ux*10)+' '+point(gate.y-uy*10)+'" fill="none" stroke="'+(done?'#f7e59a':'#a5d6b2')+'" stroke-width="'+(done?'3.4':'2.4')+'" stroke-dasharray="4 3" opacity="'+(done?'1':'.76')+'"/>');
  if(done)out.push('<circle cx="'+point(gate.x)+'" cy="'+point(gate.y)+'" r="17.4" fill="#efdc87" opacity=".18" class="pf-gate-halo"/>');
  out.push('<circle cx="'+point(gate.x)+'" cy="'+point(gate.y)+'" r="12.9" fill="'+(done?'#5b672d':'#17403c')+'" stroke="'+(done?'#ffe9ad':'#b5d9bf')+'" stroke-width="2.1"/>');
  out.push('<text x="'+point(gate.x)+'" y="'+point(gate.y+4)+'" text-anchor="middle" font-size="10.8" font-weight="900" fill="#fff3c5" font-family="system-ui,sans-serif">M2</text>');
  out.push('</g>');
 }
 out.push('</g>');
 return out.join('');
}
export function pathfinderStatus(game){
 if(!game)return {ready:0,allReady:false,totalGoals:0,participants:3};
 const counts=[0,1,2].map(seat=>goalProgress(game,seat));
 const ready=counts.filter(n=>n===4).length;
 return {ready,allReady:ready===3,totalGoals:counts.reduce((a,b)=>a+b,0),participants:3,counts};
}
