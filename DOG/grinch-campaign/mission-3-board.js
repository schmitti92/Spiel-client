/**
 * Mission 3 local prototype board.
 * Uses the original DOG board coordinates without changing the shared board.
 * Uses standalone editable SVG artwork; DOM overlays remain interactive.
 */
import {trackPoint,homePoint,TRACK_POINTS} from '../board-layout.js?v=11';
import {MISSION3_COLORS,MISSION3_STARTS} from './mission-3-rules.js?v=4';
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
 push('<image x="18" y="18" width="724" height="724" href="./mission-3-background.svg" preserveAspectRatio="xMidYMid slice" pointer-events="none" aria-hidden="true"/>');
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
 // Mission 3 cooperative targets: non-interactive overlays above track holes.
 // All positions originate from the authoritative mission state.
 if(s.tasks?.objectives&&s.tasks?.stage===s.stage){
  const kinds=[
   {name:'m3-light',edge:'#ffdc64',fill:'#986b17',mark:'✦'},
   {name:'m3-ice',edge:'#91e7ff',fill:'#286b89',mark:'❄'},
   {name:'m3-rune',edge:'#dfa8ff',fill:'#75368d',mark:'✧'}
  ],kind=kinds[s.stage]||kinds[0];
  const objectives=s.tasks.objectives.filter(o=>!o.collected);
  for(const [n,item] of objectives.entries()){
   const p=trackPoint(item.field);
   if(!p)continue;
   const cx=fmt(p.x),cy=fmt(p.y);
   push('<g class="m3-objective '+kind.name+'" pointer-events="none" aria-hidden="true">');
   push('<circle cx="'+cx+'" cy="'+cy+'" r="26" fill="'+kind.edge+'" opacity=".28" filter="url(#m3-glow)"/>');
   push('<circle cx="'+cx+'" cy="'+cy+'" r="18" fill="'+kind.fill+'" stroke="'+kind.edge+'" stroke-width="3.5"/>');
   push('<circle cx="'+cx+'" cy="'+cy+'" r="13" fill="#0c1830" fill-opacity=".5"/>');
   push('<text x="'+cx+'" y="'+fmt(p.y+6)+'" text-anchor="middle" font-weight="950" font-size="22" fill="'+kind.edge+'">'+kind.mark+'</text>');
   push('<circle cx="'+fmt(p.x+15)+'" cy="'+fmt(p.y-16)+'" r="8" fill="#101c29" stroke="'+kind.edge+'" stroke-width="1.7"/>');
   push('<text x="'+fmt(p.x+15)+'" y="'+fmt(p.y-12)+'" text-anchor="middle" font-weight="900" font-size="11" fill="#fff">'+(s.tasks.progress[s.stage]+n+1)+'</text>');
   push('</g>');
  }
 }
 for(let owner=0;owner<3;owner++){
  for(let slot=0;slot<4;slot++){
   const p=homePoint([0,1,3][owner],slot);
   if(!p)continue;
   push('<circle cx="'+fmt(p.x)+'" cy="'+fmt(p.y)+'" r="17.3" fill="#072733" stroke="'+MISSION3_COLORS[owner]+'" stroke-width="2.1" stroke-opacity=".8"/>');
  }
 }
 // Original Grinch sigil: illustrated locally rather than an external icon.
 push('<g class="m3-crest" pointer-events="none" aria-hidden="true">');
 push('<circle cx="380" cy="380" r="127" fill="#061719" fill-opacity=".92" stroke="#cbaa68" stroke-width="5"/>');
 push('<circle cx="380" cy="380" r="115" fill="none" stroke="#7cbf8c" stroke-width="1.7" stroke-dasharray="4 10" stroke-opacity=".5"/>');
 push('<circle cx="380" cy="380" r="104" fill="#153c35" stroke="#386d60" stroke-width="2"/>');
 push('<path d="M321 393L304 341L320 354L338 317L342 344Q380 302 420 341L436 313L442 348L459 337L447 392L422 418L416 445Q384 475 346 447L341 421Z" fill="#7ec64a" stroke="#133f2a" stroke-width="5"/>');
 push('<path d="M323 350Q348 330 373 356L370 375Q350 362 327 369ZM390 353Q419 330 440 350L435 371Q414 363 391 375Z" fill="#244b31" opacity=".85"/>');
 push('<path d="M330 363Q350 349 371 371Q352 375 333 373ZM393 371Q415 348 435 363L432 373Q413 378 393 371Z" fill="#f7e7a4"/>');
 push('<ellipse cx="355" cy="368" rx="6" ry="7" fill="#a22527"/><ellipse cx="412" cy="368" rx="6" ry="7" fill="#a22527"/>');
 push('<path d="M373 388Q383 375 395 389Q388 398 378 396Z" fill="#2a542f"/>');
 push('<path d="M349 412Q383 435 421 404Q397 449 358 435Z" fill="#143122"/>');
 push('<path d="M359 419Q386 431 407 416" stroke="#fdf4c8" stroke-width="3.5" stroke-linecap="round" fill="none"/>');
 push('<path d="M321 333Q337 278 392 290L440 323L426 339Q367 316 321 345Z" fill="#a22a2e" stroke="#d58272" stroke-width="3"/>');
 push('<path d="M311 345Q375 316 449 345" fill="none" stroke="#fff2d7" stroke-width="17" stroke-linecap="round"/>');
 push('<circle cx="443" cy="324" r="15" fill="#faf2dd"/>');
 push('<path d="M292 466Q379 482 467 466" fill="none" stroke="#bb9e60" stroke-width="2" stroke-opacity=".6"/>');
 push('<text x="380" y="488" text-anchor="middle" font-size="19" font-weight="900" fill="#fff1c7" letter-spacing="3">GRINCH</text>');
 push('<text x="380" y="505" text-anchor="middle" font-size="11" font-weight="800" fill="#c1e2c6" letter-spacing="2">DIE ERSTE BEGEGNUNG</text>');
 push('</g>');
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
  // Invisible expanded target: fingers can select pawns without changing sizes.
  push('<circle cx="'+fmt(pt.x)+'" cy="'+fmt(pt.y)+'" r="25" fill="transparent" class="m3-pawn-hit"/>');
  const number=piece.owner===3?'G'+(Number(piece.id.slice(1))+1):Number(piece.id.slice(1))+1;
  push('<text x="'+fmt(pt.x)+'" y="'+fmt(pt.y+5)+'" font-size="'+(piece.owner===3?10:13)+'" font-weight="950" fill="'+(piece.owner===2?'#263432':'#fff')+'" text-anchor="middle" pointer-events="none">'+number+'</text>');
  if(piece.frozenTurns>0){
   push('<circle cx="'+fmt(pt.x)+'" cy="'+fmt(pt.y)+'" r="20.5" fill="none" stroke="#9eeaff" stroke-width="3" stroke-dasharray="5 3" pointer-events="none"/>');
   push('<circle cx="'+fmt(pt.x+12)+'" cy="'+fmt(pt.y-13)+'" r="10" fill="#16466b" stroke="#bbf4ff" stroke-width="2" pointer-events="none"/>');
   push('<text x="'+fmt(pt.x+12)+'" y="'+fmt(pt.y-9)+'" font-size="13" text-anchor="middle" font-weight="850" fill="#fff" pointer-events="none">'+piece.frozenTurns+'</text>');
  }
  push('</g>');
 }
 svg.innerHTML=out.join('');
 for(const item of svg.querySelectorAll('[data-piece]')){
  const id=item.dataset.piece;
  item.addEventListener('click',()=>onPieceClick(id));
  item.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();onPieceClick(id);}});
 }
}
