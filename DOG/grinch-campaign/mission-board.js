/**
 * Grinch campaign board view.
 *
 * The ORIGINAL DOG drawBoard() static SVG drawing is reused here as a
 * mission-scoped rendering snapshot. The canonical 64 track coordinates,
 * 16 goal slots, 16 start slots, user-created layouts and selected cosmetics
 * are read from the same original modules (not copied or overwritten).
 *
 * DO NOT import the main DOG app: it creates normal lobby/network sessions.
 * Any mission-specific decoration must remain after the original holes.
 */
import {trackPoint,goalPoint,homePoint,TRACK_POINTS,GOAL_POINTS,HOME_POINTS,isStartField} from '../board-layout.js?v=11';
import {resolveAppearance,loadAppearance,validAssetPath} from '../appearance-registry.js?v=27';
import {pieceCoord} from './mission-1-rules.js?v=6';
import {pathfinderBoardMarkup} from './mission-1-pathfinder.js?v=4';
export const CLASSIC_TRACK_LENGTH=64;
export const MISSION_BOARD_SEATS=Object.freeze([0,1,3]); // Rot, Blau, Gelb
const coord=p=>Number(p.x).toFixed(2)+','+Number(p.y).toFixed(2);
const boardPoint=trackPoint;
const resolveImage=path=>validAssetPath(path)?'../'+path.slice(2):'';
const xmlEscape=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function drawClassicMissionBoard(boardSvg,game,{selectedPiece=null,onPieceClick=()=>{}}={}){
 if(!boardSvg||!game)return;
 const look=resolveAppearance(loadAppearance()),skin=look.board;
 const palette=look.pieces.colors;
 const safeColor=seat=>palette[seat]||palette[0];
 const board=[],push=part=>board.push(part);
  push('<title>Grinch-Mission 1: Originale 64 DOG-Lauffelder und drei einzelne Portal-Zielfelder</title>');
  push('<defs>'+
    '<linearGradient id="dog-wood" x1="0" y1="0" x2="1" y2="1"><stop stop-color="'+skin.wood[0]+'"/><stop offset=".22" stop-color="'+skin.wood[1]+'"/><stop offset=".44" stop-color="'+skin.wood[2]+'"/><stop offset=".7" stop-color="'+skin.wood[3]+'"/><stop offset="1" stop-color="'+skin.wood[4]+'"/></linearGradient>'+
    '<radialGradient id="dog-blue" cx=".42" cy=".34" r=".88"><stop stop-color="'+skin.surface[0]+'"/><stop offset=".56" stop-color="'+skin.surface[1]+'"/><stop offset="1" stop-color="'+skin.surface[2]+'"/></radialGradient>'+
    '<linearGradient id="dog-hole" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffffff"/><stop offset=".52" stop-color="#ecf1f4"/><stop offset="1" stop-color="#b6c4d0"/></linearGradient>'+
    '<linearGradient id="dog-center" x1="0" y1="0" x2="0" y2="1"><stop stop-color="'+skin.center[0]+'"/><stop offset="1" stop-color="'+skin.center[1]+'"/></linearGradient>'+
    '<filter id="dog-pawn-shadow" x="-60%" y="-60%" width="220%" height="220%"><feDropShadow dx="0" dy="3" stdDeviation="2.8" flood-color="#000" flood-opacity=".65"/></filter>'+
    '<filter id="dog-halo" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="4"/></filter>'+
    '<pattern id="dog-speckle" x="0" y="0" width="31" height="43" patternUnits="userSpaceOnUse"><circle cx="5" cy="11" r=".8" fill="#ffffff" opacity=".09"/><circle cx="22" cy="34" r=".65" fill="#ffffff" opacity=".12"/><circle cx="16" cy="6" r=".55" fill="#06172f" opacity=".38"/></pattern>'
  );
  // Classic figure gradients remain available beside the optional full-field discs.
  for(let seat=0;seat<4;seat++){
    const color=safeColor(seat);
    push('<linearGradient id="dog-pawn-'+seat+'" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffffff" stop-opacity=".68"/><stop offset=".3" stop-color="'+color+'"/><stop offset=".83" stop-color="'+color+'"/><stop offset="1" stop-color="#172431" stop-opacity=".9"/></linearGradient>');
  }
  push('</defs>');
  push('<rect x="8" y="8" width="744" height="744" rx="44" fill="url(#dog-wood)" stroke="#2c1b13" stroke-width="7"/>');
  push('<rect x="27" y="27" width="706" height="706" rx="30" fill="#051323" stroke="#ead4a4" stroke-opacity=".66" stroke-width="2"/>');
  push('<rect x="35" y="35" width="690" height="690" rx="25" fill="url(#dog-blue)"/>');
  // Static background art has no spaces or pawns; the interactive path below
  // always uses the editor's actual track coordinates. Fallback stays visible
  // until the optional premium WebP image has been uploaded to the repository.
  if(validAssetPath(skin.fallbackImage))
    push('<image href="'+resolveImage(skin.fallbackImage)+'" x="0" y="0" width="760" height="760" preserveAspectRatio="xMidYMid meet" pointer-events="none"/>');
  if(validAssetPath(skin.image))
    push('<image href="'+resolveImage(skin.image)+'" x="0" y="0" width="760" height="760" preserveAspectRatio="xMidYMid meet" pointer-events="none"/>');
  // Uploaded 1254px winter art, exclusively in this campaign renderer.
  // Place it ABOVE the selected classic theme but BELOW all 64 live DOG fields.
  push('<image href="./winterliches_portal_im_alpenreich.png" x="0" y="0" width="760" height="760" preserveAspectRatio="xMidYMid meet" pointer-events="none"/>');
  push('<rect x="35" y="35" width="690" height="690" rx="25" fill="url(#dog-speckle)"/>');
  push('<rect x="41" y="41" width="678" height="678" rx="20" fill="none" stroke="'+skin.edge+'" stroke-opacity=".27" stroke-width="1.5"/>');
  // The course makes a single uninterrupted 64-step circuit. Start indices are
  // 0/16/32/48; the correct corner is independent of future cosmetic themes.
  const path=TRACK_POINTS.map((p,i)=>(i===0?'M ':'L ')+coord(p)).join(' ')+' Z';
  push('<path d="'+path+'" fill="none" stroke="#03152a" stroke-width="16" stroke-linejoin="round" stroke-linecap="round" opacity=".44"/>');
  push('<path d="'+path+'" fill="none" stroke="'+skin.route+'" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" opacity=".55"/>');
  // All goal and reserve holes follow the draggable editor coordinates.
  for(let seat=0;seat<4;seat++){
    const c=safeColor(seat),start=boardPoint(seat*16);
    const goal=GOAL_POINTS[seat],home=HOME_POINTS[seat];
    const hps=home.map(coord).join(' ');
    // Home positions remain exactly the same as classic DOG, including green.
    push('<polyline points="'+hps+'" fill="none" stroke="'+c+'" stroke-opacity=".15" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>');
    push('<polyline points="'+hps+'" fill="none" stroke="'+c+'" stroke-opacity=".45" stroke-width="2" stroke-linecap="round"/>');
    push('<path d="M '+coord(start)+' L '+coord(home[0])+'" stroke="'+c+'" stroke-width="2.1" stroke-dasharray="3 7" opacity=".62"/>');
    for(let j=0;j<4;j++){
      const p=home[j];
      push('<circle cx="'+p.x+'" cy="'+p.y+'" r="17.1" fill="#041629" stroke="'+c+'" stroke-opacity=".7" stroke-width="1.5"/>');
      push('<circle cx="'+p.x+'" cy="'+p.y+'" r="11.7" fill="#164066" opacity=".6"/>');
    }
    // In this mission ONLY the first original goal is a reusable portal.
    // The three former inner goal holes are intentionally not drawn.
    if(MISSION_BOARD_SEATS.includes(seat)){
      const p=goal[0];
      push('<path d="M '+coord(start)+' L '+coord(p)+'" stroke="'+c+'" stroke-width="2.8" stroke-dasharray="6 4" opacity=".68"/>');
      push('<circle class="dog-goal-hole" cx="'+p.x+'" cy="'+p.y+'" r="17.1" fill="#075846" stroke="'+c+'" stroke-width="2.4" pointer-events="none"/>');
    }
    const labelHome=home[2];
    push('<text x="'+labelHome.x+'" y="'+(labelHome.y+28)+'" text-anchor="middle" fill="'+c+'" font-size="10" font-weight="850" letter-spacing=".8">START</text>');
  }
  // No DOG crest for Mission 1: the uploaded center artwork is the world-2 entrance.
  // Carved white holes, exactly sixty unprotected plus four tinted starts.
  for(let i=0;i<64;i++){
    const {x,y}=boardPoint(i),start=isStartField(i),seat=i/16|0;
    const c=safeColor(seat);
    push('<circle cx="'+x+'" cy="'+(y+2.1)+'" r="17.3" fill="#020f22" opacity=".66"/>');
    push('<circle cx="'+x+'" cy="'+y+'" r="'+(start?17.3:17.1)+'" fill="'+(start?c:'url(#dog-hole)')+'" stroke="'+(start?'#f5e1b7':'#143c58')+'" stroke-width="'+(start?1.7:1.3)+'"/>');
    push('<circle cx="'+(x-4)+'" cy="'+(y-5)+'" r="'+(start?5.5:4.4)+'" fill="#ffffff" opacity="'+(start?'.30':'.62')+'"/>');
    if(start){
      push('<circle cx="'+x+'" cy="'+y+'" r="10.4" fill="#07172b" fill-opacity=".18"/>');
      push('<path d="M '+(x-4)+' '+(y-7)+' L '+(x+5)+' '+y+' L '+(x-4)+' '+(y+7)+' Z" fill="#ffffff" opacity=".88"/>');
    }
  }

 // New mission-specific pathfinding details are appended above the unchanged
 // classic holes and below the pawns. No original SVG coordinates move.
 push(pathfinderBoardMarkup(game,{track:TRACK_POINTS,goals:GOAL_POINTS,colors:palette}));
 // Mission-specific overlays remain passive; normal DOG uses its original renderer.
 // Use the four original home holes dynamically. The fifth reserve
 // pawn stands on the colored starting tile ONLY while all five are home.
 // Once any pawn has left home, the fifth moves into the now-vacant house hole.
 // Returning/captured pawns likewise take any available house hole.
 const homePositions=new Map();
 for(let seat=0;seat<MISSION_BOARD_SEATS.length;seat++){
  const owner=MISSION_BOARD_SEATS[seat];
  const remaining=game.pieces.filter(p=>p.seat===seat&&p.place==='home')
    .sort((a,b)=>Number(a.id.slice(1))-Number(b.id.slice(1)));
  const occupied=game.pieces.some(p=>p.place==='track'&&pieceCoord(p)===owner*16);
  const fifth=remaining.find(p=>Number(p.id.slice(1))%5===4);
  const showFifthOnStart=remaining.length===5&&!occupied&&!!fifth;
  const normalHomed=showFifthOnStart?remaining.filter(p=>p!==fifth):remaining;
  normalHomed.forEach((p,i)=>{
   // In the rare case another player's real pawn occupies a protected start,
   // show a compact fifth reserve figure by the house rather than hiding it.
   const hole=homePoint(owner,Math.min(i,3));
   homePositions.set(p.id,i<4?hole:{x:hole.x+9,y:hole.y+9});
  });
  if(showFifthOnStart)homePositions.set(fifth.id,trackPoint(owner*16));
 }
 for(const piece of game.pieces){
  if(piece.place==='lost'||piece.place==='teleported')continue;
  const owner=MISSION_BOARD_SEATS[piece.seat];
  if(!Number.isInteger(owner))continue;
  const p=piece.place==='track'?trackPoint(pieceCoord(piece)):homePositions.get(piece.id);
  if(!p)continue;
  const c=safeColor(owner),hi=selectedPiece===piece.id;
  const id=xmlEscape(piece.id),label=xmlEscape(game.players[piece.seat]?.name||'');
  if(hi)push('<circle cx="'+p.x+'" cy="'+p.y+'" r="27" fill="'+c+'" fill-opacity=".48" filter="url(#dog-halo)" pointer-events="none"/>');
  push('<g class="dog-pawn '+(hi?'can-pick dog-pawn-selected':'')+'" data-piece="'+id+'" tabindex="0" role="button" aria-label="Figur '+(Number(piece.id.slice(1))%5+1)+' '+label+'">');
  if(look.pieceShape==='solid'){
    push('<circle cx="'+p.x+'" cy="'+p.y+'" r="17.3" fill="'+c+'" stroke="'+(hi?'#fffaf0':'#112536')+'" stroke-width="'+(hi?'2.4':'1.1')+'" filter="url(#dog-pawn-shadow)"/>');
    push('<circle cx="'+p.x+'" cy="'+p.y+'" r="14.7" fill="none" stroke="#ffffff" stroke-opacity=".26" stroke-width=".9" pointer-events="none"/>');
    push('<path d="M '+(p.x-10)+' '+(p.y-6)+' Q '+(p.x-3)+' '+(p.y-13)+' '+(p.x+5)+' '+(p.y-10)+'" fill="none" stroke="#ffffff" stroke-opacity=".30" stroke-width="1.8" stroke-linecap="round" pointer-events="none"/>');
  }else{
    push('<ellipse cx="'+p.x+'" cy="'+(p.y+10)+'" rx="14.6" ry="6.8" fill="#020b15" opacity=".63"/>');
    push('<path d="M '+(p.x-10)+' '+(p.y+5)+' Q '+(p.x-11)+' '+(p.y-3)+' '+(p.x-5)+' '+(p.y-7)+' Q '+p.x+' '+(p.y-13)+' '+(p.x+5)+' '+(p.y-7)+' Q '+(p.x+11)+' '+(p.y-3)+' '+(p.x+10)+' '+(p.y+5)+' Q '+p.x+' '+(p.y+14)+' '+(p.x-10)+' '+(p.y+5)+' Z" fill="url(#dog-pawn-'+owner+')" stroke="'+(hi?'#ffffff':'#061b2c')+'" stroke-width="'+(hi?'3':'1.5')+'" filter="url(#dog-pawn-shadow)"/>');
    push('<circle cx="'+p.x+'" cy="'+(p.y-7)+'" r="9.1" fill="url(#dog-pawn-'+owner+')" stroke="#ffffff" stroke-opacity=".42" stroke-width="1.4"/>');
    push('<circle cx="'+(p.x-2.8)+'" cy="'+(p.y-10.8)+'" r="2.3" fill="#fff" opacity=".68"/>');
  }
  // Number 5 identifies the fifth pawn, whether at start or in a house hole.
  if(piece.place==='home'&&Number(piece.id.slice(1))%5===4){
    push('<circle cx="'+(p.x+10)+'" cy="'+(p.y-12)+'" r="10" fill="#0b2034" stroke="#fff1bb" stroke-width="1.5"/>');
    push('<text x="'+(p.x+10)+'" y="'+(p.y-8)+'" font-size="12" text-anchor="middle" font-weight="900" fill="#fff">5</text>');
  }
  push('<circle cx="'+p.x+'" cy="'+p.y+'" r="19" fill="transparent"/>');
  push('</g>');
 }
 boardSvg.innerHTML=board.join('');
 boardSvg.querySelectorAll('[data-piece]').forEach(el=>{
  const id=el.getAttribute('data-piece');
  el.addEventListener('click',()=>onPieceClick(id));
  el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onPieceClick(id);}});
 });
}
