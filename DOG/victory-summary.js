/** Visual-only DOG result projection. Never exposes hidden hands or mutates match state. */
export const DOG_VICTORY_TEAM_NAMES=Object.freeze(['Rot / Grün','Blau / Gelb']);
export const DOG_VICTORY_SEATS=Object.freeze([Object.freeze([0,2]),Object.freeze([1,3])]);

export function summarizeDogVictory(game){
 if(!game||game.phase!=='finished'||!Number.isInteger(game.winner)||
   !Array.isArray(game.players)||game.players.length!==4||
   !Array.isArray(game.pieces))return null;
 if(game.mode==='solo3'||game.mode==='solo2'){
  const active=game.players.filter(p=>!p.inactive);
  const count=game.mode==='solo2'?2:3;
  if(active.length!==count||game.pieces.length!==4*count||
     !active.some(p=>p.seat===game.winner))return null;
  const ranked=[...active].sort((a,b)=>(a.seat===game.winner?-1:b.seat===game.winner?1:0));
  const players=ranked.map(p=>({
   seat:p.seat,name:String(p.name||'Spieler '+(p.seat+1)),bot:!!p.bot,
   goalCount:game.pieces.filter(piece=>piece.owner===p.seat&&piece.place==='goal').length,
   winning:p.seat===game.winner
  }));
  return {winner:game.winner,winningSeat:game.winner,mode:game.mode,teams:players.map(p=>({
   id:p.seat,name:p.name,winning:p.winning,total:p.goalCount,capacity:4
  })),players};
 }
 if(![0,1].includes(game.winner)||game.pieces.length!==16)return null;

 const goalCounts=Array.from({length:4},(_,seat)=>game.pieces.filter(p=>
   p.owner===seat&&p.place==='goal').length);
 // The actual first finisher (4/4) is recorded separately from the
 // winning team; this also handles snapshots from before winnerSeat existed.
 const winningSeat=Number.isInteger(game.winnerSeat)&&
  game.winnerSeat>=0&&game.winnerSeat<4&&
  game.winnerSeat%2===game.winner&&goalCounts[game.winnerSeat]===4?
    game.winnerSeat:DOG_VICTORY_SEATS[game.winner].find(seat=>goalCounts[seat]===4)??null;
 const teams=[0,1].map(team=>({
   id:team,name:DOG_VICTORY_TEAM_NAMES[team],winning:team===game.winner,
   total:DOG_VICTORY_SEATS[team].reduce((sum,seat)=>sum+goalCounts[seat],0)
 }));
 const bySeat=new Map(game.players.map((player,index)=>[Number.isInteger(player.seat)?player.seat:index,player]));
 const seatOrder=[...DOG_VICTORY_SEATS[game.winner],...DOG_VICTORY_SEATS[1-game.winner]];
 const players=seatOrder.map(seat=>{
   const player=bySeat.get(seat)||game.players[seat];
   return {seat,name:String(player?.name||'Spieler '+(seat+1)),bot:!!player?.bot,
     goalCount:goalCounts[seat],winning:DOG_VICTORY_SEATS[game.winner].includes(seat)};
 });
 return {winner:game.winner,winningSeat,teams:[teams[game.winner],teams[1-game.winner]],players};
}
