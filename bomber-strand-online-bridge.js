export function mountBomberOriginal({container,getRoom,request,acceptRoom,onError}){
 const frame=document.createElement('iframe');
 frame.src='./minispiele/bomber-strand-online-adapter-v215.html?v=5';
 frame.title='Bomber Strand Arena Online';
 frame.style.cssText='width:100%;height:100%;border:0;display:block';
 container.replaceChildren(frame);
 let alive=true,ready=false,configured=false,pending=false,lastSeq=0,lastSend=0,lastTimeout=false,offset=0;
 function current(){const room=getRoom(),ch=room?.match?.challenge;return ch?.order?.[ch.index]==='bomber-strand-arena'?{room,ch}:null;}
 function sync(){
  if(!alive||!ready)return;const c=current();if(!c)return;
  const {room,ch}=c,seats=(room.match?.members||room.players.filter(p=>p.participating)).map(p=>p.seat);
  const mine=room.players.find(p=>p.me)?.seat,localSeat=seats.indexOf(mine);
  if(localSeat<0)return;
  if(!configured){frame.contentWindow.postMessage({type:'bomber:configure',challengeId:ch.id,localSeat,roster:seats.map((seat,id)=>({id,seat,name:room.players.find(p=>p.seat===seat)?.name||'Spieler',bot:false}))},location.origin);return;}
  if(ch.bomber)frame.contentWindow.postMessage({type:'bomber:snapshot',challengeId:ch.id,phase:ch.phase,players:ch.bomber.players.map((p,i)=>({...p,id:i})),bombs:ch.bomber.bombs,blasts:ch.bomber.blasts,destroyed:ch.bomber.destroyed,serverNow:room.serverNow},location.origin);
  if(ch.phase==='countdown'&&Date.now()+offset>ch.startAt+120000&&!lastTimeout){lastTimeout=true;request('/rooms/'+encodeURIComponent(room.code)+'/challenge-bomber-timeout','POST',{challengeId:ch.id}).then(r=>{if(r?.room)acceptRoom(r.room)}).catch(e=>{lastTimeout=false;onError(e)});}
 }
 async function onMessage(e){
  if(!alive||e.origin!==location.origin||e.source!==frame.contentWindow)return;
  const m=e.data,c=current();if(!c||m?.challengeId!==c.ch.id)return;
  if(m.type==='bomber:configured'){configured=true;sync();return;}
  if(m.type==='bomber:bomb'){if(c.ch.phase!=='countdown')return;try{const r=await request('/rooms/'+encodeURIComponent(c.room.code)+'/challenge-bomber-bomb','POST',{challengeId:c.ch.id,seq:m.seq,x:m.x,y:m.y,range:m.range});if(r?.room)acceptRoom(r.room)}catch(error){onError(error)}return;}
  if(m.type!=='bomber:state'||pending||c.ch.phase!=='countdown'||Date.now()+offset<c.ch.startAt||Date.now()-lastSend<180||!Number.isSafeInteger(m.seq)||m.seq<=lastSeq)return;
  if(![m.x,m.y].every(Number.isFinite))return;
  pending=true;lastSend=Date.now();lastSeq=m.seq;
  try{const r=await request('/rooms/'+encodeURIComponent(c.room.code)+'/challenge-bomber-state','POST',{challengeId:c.ch.id,seq:m.seq,x:m.x,y:m.y,alive:!!m.alive,bombsPlaced:m.bombsPlaced||0});if(r?.room)acceptRoom(r.room)}
  catch(e){onError(e)}finally{pending=false;}
 }
 window.addEventListener('message',onMessage);
 frame.addEventListener('load',()=>{ready=true;configured=false;sync()});
 const timer=setInterval(()=>{const r=getRoom();if(Number.isFinite(r?.serverNow))offset=r.serverNow-Date.now();sync();},350);
 return {sync,destroy(){alive=false;clearInterval(timer);window.removeEventListener('message',onMessage);frame.remove()}};
}
