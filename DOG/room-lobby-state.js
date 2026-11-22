/* Pure projection of the authoritative hub snapshot for DOG's waiting room.
 * No network, storage, rule engine or DOM changes. */
export function summarizeDogRoomLobby(room,busy=false){
 if(!room||room.game!=='dog'||!['preparing','playing'].includes(room.phase))return null;
 const players=Array.isArray(room.players)?room.players:[];
 const active=players.filter(player=>player.participating);
 const spectatorCount=players.length-active.length;
 const me=players.find(player=>player.me)||null;
 const readyCount=active.filter(player=>player.ready).length;
 const finished=room.phase==='playing'&&room.match?.status?.phase==='finished';
 const playing=room.phase==='playing'&&!finished;
 const readyPercent=active.length?Math.round(readyCount/active.length*100):0;
 const otherPlayersReady=active.filter(player=>!player.me).every(player=>player.ready);
 return {
  code:String(room.code||'').toUpperCase(),
  slots:Array.from({length:4},(_,i)=>active[i]||null),
  activeCount:active.length,
  spectatorCount,readyCount,readyPercent,
  playing,finished,me,
  joinEnabled:!busy&&(playing?!!room.match?.participating:!!me?.participating&&!me?.ready),
  readyEnabled:!busy&&room.phase==='preparing'&&!!me?.participating,
  hostStartVisible:!!room.host&&!playing,
  hostStartEnabled:!busy&&!!room.host&&!!me?.participating&&
   (finished||(room.phase==='preparing'&&!me?.ready&&otherPlayersReady)),
  hostStartHint:finished?'Die DOG-Partie ist abgeschlossen. Neue Runde im selben Raum vorbereiten.'
   :me?.ready?'Du bist bereit. Der Server startet DOG automatisch, sobald alle bereit sind.'
   :otherPlayersReady?'Du meldest dich bereit. Der Server startet DOG anschließend automatisch.'
   :'Warte, bis die anderen aktiven Mitspieler bereit sind.'
 };
}
