/* Pure projection of the authoritative hub snapshot for DOG's waiting room.
 * No network, storage, rule engine or DOM changes. */
export function summarizeDogRoomLobby(room,busy=false){
 if(!room||room.game!=='dog'||!['preparing','playing'].includes(room.phase))return null;
 const players=Array.isArray(room.players)?room.players:[];
 const active=players.filter(player=>player.participating);
 const spectatorCount=players.length-active.length;
 const me=players.find(player=>player.me)||null;
 const readyCount=active.filter(player=>player.ready).length;
 const playing=room.phase==='playing';
 const readyPercent=active.length?Math.round(readyCount/active.length*100):0;
 const otherPlayersReady=active.filter(player=>!player.me).every(player=>player.ready);
 return {
  code:String(room.code||'').toUpperCase(),
  slots:Array.from({length:4},(_,i)=>active[i]||null),
  activeCount:active.length,
  spectatorCount,readyCount,readyPercent,
  playing,me,
  joinEnabled:!busy&&(playing?!!room.match?.participating:!!me?.participating&&!me?.ready),
  readyEnabled:!busy&&!playing&&!!me?.participating,
  hostStartVisible:!!room.host&&!playing,
  hostStartEnabled:!busy&&!playing&&!!room.host&&!!me?.participating&&!me?.ready&&otherPlayersReady,
  hostStartHint:me?.ready?'Du bist bereit. Der Server startet DOG automatisch, sobald alle bereit sind.'
   :otherPlayersReady?'Du meldest dich bereit. Der Server startet DOG anschließend automatisch.'
   :'Warte, bis die anderen aktiven Mitspieler bereit sind.'
 };
}
