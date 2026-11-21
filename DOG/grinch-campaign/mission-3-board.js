/**
 * Mission 3 local prototype board.
 * Uses the original DOG board coordinates without changing the shared board.
 * Overlay is intentionally SVG/CSS only until the mission art pack is approved.
 */
import {trackPoint,homePoint,TRACK_POINTS} from '../board-layout.js?v=11';
import {MISSION3_COLORS,MISSION3_STARTS} from './mission-3-rules.js?v=1';
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=x=>Number(x).toFixed(1);
export function drawMission3Board(svg,s,{selectedPiece=null,onPieceClick=()=>{}}={}){
 if(!svg||!s)return;
 const out=[],push=t=>out.push(t);
 push('<title>Grinch-Mission 3: Vier Farben auf dem originalen 64-Felder-DOG-Brett</title>');
 push('<defs><radialGradient id="m3-ground"><stop stop-color="#184b45"/><stop offset=".68" stop-color="#0c2c38"/><stop offset="1" stop-color="#071421"/></radialGradient>'+
 '<linearGradient id="m3-stone" x2="1" y2="1"><stop stop-color="#fffbeb"/><stop offset="1" stop-color="#b7d5d0"/></linearGradient>'+
 '<filter id="m3-shadow"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity=".65"/></filter>'+
 '<filter id="m3-glow"><feGaussianBlur stdDeviation="7"/></filter></defs>');
 push('<rect x="5" y="5" width="750" height="750" rx="34" fill="#182d28" stroke="#b69b59" stroke-width="10"/>');
 push('<rect x="20" y="20" width="720" height="720" rx="28" fill="url(#m3-ground)" stroke="#6d8464" stroke-width="3"/>');
 for(let n=0;n<60;n++){
  const x=50+(n*149)%660,y=50+(n*107)%660,r=1+(n%3)*.7;
  push('<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="#b6ecca" opacity="'+(.14+(n%4)*.06)+'" pointer-events="none"/>');
 }
 const path=TRACK_POINTS.map((p,i)=>(i?'L':'M')+fmt(p.x)+' '+fmt(p.y)).join(' ')+' Z';
 push('<path d="'+path+'" fill="none" stroke="#04202b" stroke-width="31" opacity=".6" stroke-linejoin="round"/>');
 push('<path d="'+path+'" fill="none" stroke="#bfc8a1" stroke-width="3.5" stroke-opacity=".52" stroke-linejoin="round"/>');
 for(let i=0;i<64;i++){
  const p=trackPoint(i),isStart=i%16===0,owner=[0,1,3,2][Math.floor(i/16)],color=MISSION3_COLORS[owner];
  if(!p)continue;
  push('<circle cx="'+fmt(p.x)+'" cy="'+fmt(p.y+2)+'" r="18.4" fill="#000" opacity=".5"/>');
  push('<circle cx="'+fmt(p.x)+'" cy="'+fmt(p.y)+'" r="16.7" fill="'+(isStart?color:'url(#m3-stone)')+'" stroke="'+(isStart?'#f9eca5':'#34646e')+'" stroke-width="'+(isStart?'3':'1.4')+'"/>');
  if(isStart)push('<path d="M '+(p.x-5)+' '+(p.y-6)+' L '+(p.x+6)+' '+p.y+' L '+(p.x-5)+' '+(p.y+6)+' Z" fill="#fff9de" opacity=".65"/>');
 }
 for(let owner=0;owner<3;owner++){
  for(let slot=0;slot<4;slot++){
   const p=homePoint([0,1,3][owner],slot);
   if(!p)continue;
   push('<circle cx="'+fmt(p.x)+'" cy="'+fmt(p.y)+'" r="17.3" fill="#072733" stroke="'+MISSION3_COLORS[owner]+'" stroke-width="2.1" stroke-opacity=".8"/>');
  }
 }
 push('<circle cx="380" cy="380" r="124" fill="#043322" opacity=".36" stroke="#74a26a" stroke-width="3" stroke-opacity=".65"/>');
 push('<circle cx="380" cy="380" r="98" fill="none" stroke="#a0daae" stroke-opacity=".14" stroke-width="4" stroke-dasharray="8 15"/>');
 push('<text x="380" y="348" text-anchor="middle" font-size="17" font-weight="950" fill="#fff0bb" letter-spacing="2.8">MISSION 3</text>');
 push('<text x="380" y="383" text-anchor="middle" font-size="32" font-weight="900" fill="#b0f2a0">GRINCH</text>');
 push('<text x="380" y="412" text-anchor="middle" font-size="14" font-weight="800" fill="#d5e7df">DIE ERSTE BEGEGNUNG</text>');
 push('<text x="380" y="440" text-anchor="middle" font-size="13" fill="#eee1aa">🃏 110 DOG-KARTEN</text>');
 const homeSlots=[0,0,0];
 for(const piece of s.pieces){
  if(piece.place==='captured'||piece.place==='lost')continue;
  let pt=null;
  if(piece.place==='track')pt=trackPoint(piece.pos);
  else if(piece.owner<3){
   const slot=homeSlots[piece.owner]++;
   const p=homePoint([0,1,3][piece.owner],slot%4);
   pt=p?{x:p.x+(slot>=4?8:0),y:p.y+(slot>=4?8:0)}:null;
  }
  if(!pt)continue;
  const c=MISSION3_COLORS[piece.owner],id=esc(piece.id),selected=piece.id===selectedPiece;
  push('<g class="m3-pawn '+(piece.owner===3?'m3-grinch':'')+(selected?' selected':'')+'" data-piece="'+id+'" role="button" tabindex="0" aria-label="'+esc(s.players[piece.owner].name)+' Spielfigur '+esc(piece.id)+'">');
  if(selected)push('<circle cx="'+fmt(pt.x)+'" cy="'+fmt(pt.y)+'" r="26.5" fill="'+c+'" opacity=".5" filter="url(#m3-glow)" pointer-events="none"/>');
  push('<circle cx="'+fmt(pt.x)+'" cy="'+fmt(pt.y)+'" r="17.3" fill="'+c+'" stroke="'+(selected?'#ffffff':'#071b25')+'" stroke-width="'+(selected?'4':'2.6')+'" filter="url(#m3-shadow)"/>');
  push('<circle cx="'+fmt(pt.x-5)+'" cy="'+fmt(pt.y-6)+'" r="4.2" fill="#fff" opacity=".44"/>');
  const number=piece.owner===3?'G'+(Number(piece.id.slice(1))+1):Number(piece.id.slice(1))+1;
  push('<text x="'+fmt(pt.x)+'" y="'+fmt(pt.y+5)+'" font-size="'+(piece.owner===3?10:13)+'" font-weight="950" fill="'+(piece.owner===2?'#263432':'#fff')+'" text-anchor="middle" pointer-events="none">'+number+'</text>');
  push('</g>');
 }
 svg.innerHTML=out.join('');
 for(const item of svg.querySelectorAll('[data-piece]')){
  const id=item.dataset.piece;
  item.addEventListener('click',()=>onPieceClick(id));
  item.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();onPieceClick(id);}});
 }
}
