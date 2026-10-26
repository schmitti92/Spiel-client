export function mountSnakeOriginal({container,getRoom,request,acceptRoom,onError}){
 const frame=document.createElement('iframe');
 frame.src='./minispiele/snake-arena-online-adapter-v29.html?v=35&session='+Date.now();
 frame.title='Snake Arena Online';frame.style.cssText='width:100%;height:100%;border:0;display:block';container.replaceChildren(frame);
 let alive=true,ready=false,configured=false,challengeId=null,offset=0,seq=0,pending=false,queued=null,lastSent=0,lastPoll=0,pollPending=false;
 const current=()=>{const room=getRoom(),ch=room?.match?.challenge;return ch?.order?.[ch.index]==='snake-arena'?{room,ch}:null};
 function sync(){
  if(!alive||!ready)return;const c=current();if(!c)return;const {room,ch}=c;
  if(challengeId!==ch.id){challengeId=ch.id;configured=false;seq=0;queued=null;pending=false;lastSent=0;lastPoll=0;}
  const seats=(room.match?.members?.length?room.match.members:room.players.filter(p=>p.participating)).map(p=>p.seat);
  const mine=room.players.find(p=>p.me||p.isMe||p.uid===room.myUid)?.seat,localSeat=seats.indexOf(mine);if(localSeat<0)return;
  if(!configured){seq=Math.max(seq,...(Array.isArray(ch.snake?.players)?ch.snake.players:Object.values(ch.snake?.players||{})).filter(p=>p.seat===mine).map(p=>p.seq||0),0);frame.contentWindow.postMessage({type:'snake-arena:configure',challengeId:ch.id,startAt:ch.startAt,serverOffset:offset,initialSeq:seq,localSeat,seats:seats.map(seat=>({name:room.players.find(p=>p.seat===seat)?.name||'Spieler'}))},location.origin);return;}
  if(ch.snake||ch.phase!=='countdown'){const players=ch.snake?.players||[];const alive=players.filter(p=>p.alive);const eliminated=players.filter(p=>!p.alive);frame.contentWindow.postMessage({type:'snake-arena:snapshot',challengeId:ch.id,phase:ch.phase,players,winningTarget:alive.length===1&&alive[0].seat===mine&&eliminated.length?(Number.isFinite(ch.snake?.winningTarget)?ch.snake.winningTarget:Math.max(...eliminated.map(p=>p.score))):null,standings:ch.results?.find(r=>r.game==='snake-arena'&&r.index===ch.index)?.standings},location.origin);}
  if(ch.phase==='countdown'&&Date.now()-lastPoll>800&&!pollPending){pollPending=true;lastPoll=Date.now();const id=ch.id;request('/rooms/'+encodeURIComponent(room.code)+'/challenge-snake-timeout','POST',{challengeId:id}).then(r=>{if(alive&&current()?.ch.id===id&&r?.room)acceptRoom(r.room)}).catch(e=>{if(alive)onError(e)}).finally(()=>{pollPending=false});}
 }
 async function send(){
  if(!alive||pending||!queued)return;
  const c=current();if(!c||c.ch.phase!=='countdown')return;
  const m=queued;queued=null;pending=true;lastSent=Date.now();
  try{const r=await request('/rooms/'+encodeURIComponent(c.room.code)+'/challenge-snake-state','POST',{challengeId:c.ch.id,seq:m.seq,score:m.score,survived:m.survived,finished:m.finished});if(alive&&current()?.ch.id===c.ch.id&&r?.room)acceptRoom(r.room)}
  catch(e){if(alive){if(!queued||queued.seq<m.seq)queued={...m,finished:m.finished||!!queued?.finished};if(e?.status===409||e?.status===403){queued=null;}else onError(e);}}finally{pending=false;if(queued&&alive)setTimeout(send,queued.finished?0:80);}
 }
 function onMessage(e){
  if(!alive||e.origin!==location.origin||e.source!==frame.contentWindow)return;const m=e.data,c=current();if(!c||m?.challengeId!==c.ch.id)return;
  if(m.type==='snake-arena:configured'){configured=true;sync();return;}
  if(m.type!=='snake-arena:state'||c.ch.phase!=='countdown')return;
  if(!Number.isSafeInteger(m.score)||!Number.isSafeInteger(m.survived)||typeof m.finished!=='boolean')return;
  const previous=queued;queued={...m,seq:++seq,finished:m.finished||!!previous?.finished};if(!pending&&(m.finished||Date.now()-lastSent>=80))send();
 }
 window.addEventListener('message',onMessage);
 frame.addEventListener('load',()=>{ready=true;configured=false;sync()});
 const timer=setInterval(()=>{const r=getRoom();if(Number.isFinite(r?.serverNow))offset=r.serverNow-Date.now();sync();if(queued&&!pending&&Date.now()-lastSent>=350)send();},80);
 return {sync,destroy(){alive=false;clearInterval(timer);window.removeEventListener('message',onMessage);frame.remove()}};
}
