/** Visual-only DOG result projection. Never exposes hidden hands or mutates match state. */
export const DOG_VICTORY_TEAM_NAMES=Object.freeze(['Rot / Grün','Blau / Gelb']);
export const DOG_VICTORY_SEATS=Object.freeze([Object.freeze([0,2]),Object.freeze([1,3])]);

export function summarizeDogVictory(game){
 if(!game||game.phase!=='finished'||![0,1].includes(game.winner)||
   !Array.isArray(game.players)||game.players.length!==4||
   !Array.isArray(game.pieces)||game.pieces.length!==16)return null;

 const goalCounts=Array.from({length:4},(_,seat)=>game.pieces.filter(p=>
   p.owner===seat&&p.place==='goal').length);
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
 return {winner:game.winner,teams:[teams[game.winner],teams[1-game.winner]],players};
}
