/**
 * Mission 1 Pfadfinder: passive overlays on the canonical 64-field DOG board.
 * Exactly ONE reusable portal per active color, at its original FIRST goal.
 * The three other goal positions are not rendered in mission 1.
 * No normal DOG geometry, rules or appearance settings are modified.
 */
import {MISSION_1} from './mission-config.js?v=4';
export const PATHFINDER_SEATS=Object.freeze([0,1,3]); // red, blue, yellow
export const PATHFINDER_CLUES=Object.freeze(MISSION_1.trailHints.map(c=>Object.freeze({field:c.field,emoji:c.icon,title:c.title})));
const point=n=>Number(n).toFixed(2);
const goalsReached=(game,seat)=>game.pieces.filter(p=>p.seat===seat&&p.place==='teleported').length;
export function pathfinderStatus(game){
 if(!game)return {ready:0,allReady:false,totalGoals:0,participants:3,counts:[0,0,0]};
 const counts=[0,1,2].map(seat=>goalsReached(game,seat));
 const ready=counts.filter(v=>v===4).length;
 return {ready,allReady:ready===3,totalGoals:counts.reduce((a,b)=>a+b,0),participants:3,counts};
}
export function pathfinderBoardMarkup(game,{track,goals,colors}){
 if(!game||!Array.isArray(track)||track.length!==64)return '';
 const out=['<g id="grinch-pathfinder-overlay" pointer-events="none" aria-hidden="true">'];
 // Story-only orientation signs – movement rules remain unaffected.
 for(const marker of PATHFINDER_CLUES){
  const p=track[marker.field];if(!p)continue;
  const x=point(p.x),y=point(p.y);
  out.push('<g class="pf-clue" data-pathfinder-field="'+marker.field+'">'+
   '<circle cx="'+x+'" cy="'+y+'" r="20" fill="none" stroke="#f5d68e" stroke-width="1.4" stroke-dasharray="3 3" opacity=".85"/>'+
   '<circle cx="'+x+'" cy="'+y+'" r="14.6" fill="#173e42" fill-opacity=".68"/>'+
   '<text x="'+x+'" y="'+point(p.y+5)+'" text-anchor="middle" font-size="14">'+marker.emoji+'</text></g>');
 }
 // One fully reusable portal on the original entrance field, per player.
 for(let seat=0;seat<3;seat++){
  const owner=PATHFINDER_SEATS[seat],entry=goals?.[owner]?.[0];if(!entry)continue;
  const count=goalsReached(game,seat),done=count===4;
  const x=point(entry.x),y=point(entry.y),color=colors[owner]||'#f6dd8c';
  out.push('<g class="pf-exit '+(done?'pf-exit-ready':'pf-exit-pending')+'" data-pathfinder-seat="'+seat+'">'+
   '<circle cx="'+x+'" cy="'+y+'" r="22.1" fill="#092c36" fill-opacity=".8" stroke="'+color+'" stroke-width="2.5"/>'+
   '<circle cx="'+x+'" cy="'+y+'" r="17.8" fill="#073c3c" stroke="#ccffcf" stroke-width="1.4"/>'+
   '<circle class="pf-gate-halo" cx="'+x+'" cy="'+y+'" r="14.2" fill="'+(done?'#fae29a':'#39d9aa')+'" fill-opacity=".23"/>'+
   '<path d="M '+point(entry.x-8)+' '+point(entry.y-6)+' Q '+point(entry.x+13)+' '+point(entry.y-9)+' '+point(entry.x+7)+' '+point(entry.y+6)+' Q '+point(entry.x-6)+' '+point(entry.y+12)+' '+point(entry.x-3)+' '+point(entry.y+2)+' Q '+point(entry.x+4)+' '+point(entry.y-3)+' '+point(entry.x+4)+' '+point(entry.y+4)+'" fill="none" stroke="'+(done?'#ffedb3':'#9efae7')+'" stroke-width="2.8" stroke-linecap="round"/>'+
   '</g>');
 }
 out.push('</g>');
 return out.join('');
}
