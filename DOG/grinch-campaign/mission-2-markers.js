/**
 * Mission-2-only portal and hazard artwork on the original 64 DOG fields.
 * No changes to geometry or the main DOG board.
 */
export const mission2Status=game=>{
 const counts=[0,1,2].map(seat=>game?.pieces?.filter(p=>p.seat===seat&&p.place==='teleported').length||0);
 const ready=counts.filter(n=>n===3).length;
 return {ready,counts,allReady:ready===3,participants:3,totalGoals:counts.reduce((a,b)=>a+b,0)};
};
const num=x=>Number(x).toFixed(2);
const places=[0,1,3];
const hazardSymbol={wall:'🚧',endblock:'❄️',slip:'⛸️',trap:'🪤',home:'🏠'};
export function mission2BoardMarkup(game,{track,goals,colors}){
 if(!game||track?.length!==64)return '';
 const out=['<g id="grinch-m2-effects" pointer-events="none" aria-hidden="true">'];
 for(let seat=0;seat<3;seat++){
  const owner=places[seat],p=goals?.[owner]?.[0];if(!p)continue;
  const done=mission2Status(game).counts[seat]===3;
  const locked=Number(game.m2?.portalUntil)>Number(game.turn);
  const color=colors[owner]||'#d2eca1';
  out.push('<g><circle cx="'+num(p.x)+'" cy="'+num(p.y)+'" r="22" fill="#134c42" stroke="'+color+'" stroke-width="2.5"/>'+
    '<text x="'+num(p.x)+'" y="'+num(p.y+6)+'" font-size="19" text-anchor="middle">'+(locked?'🔒':done?'✨':'🌀')+'</text></g>');
 }
 for(const h of game.m2?.hazards||[]){
  if(h.used||h.until<=game.turn)continue;
  const p=track[h.field];if(!p)continue;
  out.push('<circle cx="'+num(p.x)+'" cy="'+num(p.y)+'" r="19" fill="#12313d" fill-opacity=".7" stroke="#b6f4ff" stroke-width="2" stroke-dasharray="3 2"/>'+
   '<text x="'+num(p.x)+'" y="'+num(p.y+6)+'" font-size="18" text-anchor="middle">'+(hazardSymbol[h.type]||'❄️')+'</text>');
 }
 for(const pawn of game.pieces||[]){
  if(!game.m2?.frozen?.[pawn.id]||pawn.place!=='track')continue;
  const abs=((places[pawn.seat]*16+pawn.steps)%64+64)%64;
  const p=track[abs];if(!p)continue;
  out.push('<circle cx="'+num(p.x)+'" cy="'+num(p.y)+'" r="24" fill="#66d6fa" fill-opacity=".24" stroke="#a6e6fd" stroke-width="2"/>');
 }
 out.push('</g>');
 return out.join('');
}
