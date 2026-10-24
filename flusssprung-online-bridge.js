export function mountFlusssprungOriginal({container,getRoom,request,acceptRoom,onError}){
 const frame=document.createElement('iframe');
 frame.title='Flusssprung – Online';frame.src='minispiele/flusssprung-online-adapter-v41.html?v=2';
 frame.style.cssText='width:100%;height:100%;border:0;display:block';
 frame.setAttribute('sandbox','allow-scripts allow-same-origin');
 container.replaceChildren(frame);
 let alive=true,ready=false,configured=false,lastMove=0,timeoutPending=false;
 let lastKey='',lastError=0;
 const timer=setInterval(()=>{if(alive)sync()},500);
 function sync(){
  if(!alive||!ready||!frame.contentWindow)return;
  const room=getRoom(),ch=room?.match?.challenge,f=ch?.flusssprung;
  if(!f||ch.order?.[ch.index]!=='flusssprung')return;
  const seat=room.players?.find(p=>p.me)?.seat;
  const players=(room.players||[]).filter(p=>p.participating).sort((a,b)=>a.seat-b.seat);
  const localSeat=players.findIndex(p=>p.seat===seat);
  if(localSeat<0)return;
  const key=ch.id+':'+ch.index;
  if(key!==lastKey){lastKey=key;configured=false;lastMove=0;timeoutPending=false;}
  if(!configured){
   frame.contentWindow.postMessage({type:'flusssprung:configure',path:f.path,localSeat,seats:players.map(p=>({name:p.name}))},location.origin);
   return;
  }
  const moves=f.moves||[];
  while(lastMove<moves.length){
   const m=moves[lastMove++];
   const idx=players.findIndex(p=>p.seat===m.seat);
   if(idx>=0&&idx!==localSeat)frame.contentWindow.postMessage({type:'flusssprung:remote-jump',seat:idx,col:m.col},location.origin);
  }
  const serverNow=Number(room.serverNow)||Date.now();
  if(ch.phase==='countdown'&&serverNow>=ch.startAt+60000&&!timeoutPending){
   timeoutPending=true;
   request('/rooms/'+encodeURIComponent(room.code)+'/challenge-flusssprung-timeout','POST',{challengeId:ch.id})
    .then(r=>{if(alive&&r?.room)acceptRoom(r.room)})
    .catch(e=>{timeoutPending=false;if(Date.now()-lastError>12000){lastError=Date.now();onError?.(e)}});
  }
 }
 async function onMessage(e){
  if(!alive||e.origin!==location.origin||e.source!==frame.contentWindow)return;
  if(e.data?.type==='flusssprung:configured'){configured=true;sync();return;}
  if(e.data?.type!=='flusssprung:jump')return;
  const room=getRoom(),ch=room?.match?.challenge;
  if(!ch||ch.phase!=='countdown'||ch.order?.[ch.index]!=='flusssprung')return;
  const {row,col}=e.data;
  if(!Number.isInteger(row)||row<0||row>=5||!Number.isInteger(col)||col<0||col>=6)return;
  try{const r=await request('/rooms/'+encodeURIComponent(room.code)+'/challenge-flusssprung-jump','POST',{challengeId:ch.id,row,col});if(alive&&r?.room)acceptRoom(r.room)}
  catch(err){onError?.(err)}
 }
 window.addEventListener('message',onMessage);
 frame.addEventListener('load',()=>{ready=true;sync()});
 return {sync,destroy(){alive=false;clearInterval(timer);window.removeEventListener('message',onMessage);frame.remove()}};
}
