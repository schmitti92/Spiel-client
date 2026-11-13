/* 100-Tore boss notifications are enabled by default for real players.
 * ?dogpush=0 explicitly disables them. Requires authenticated signed-in profile;
 * all game state is still fetched through the existing HTTP API.
 * Inactive or disconnected WS never suppresses the HTTP fallback.
 */
(()=>{'use strict';
 const enabled=new URLSearchParams(location.search).get('dogpush')!=='0';
 function create({api,gate,getUser,onChanged}={}){
  if(!enabled||typeof WebSocket!=='function')return null;
  if(!Number.isInteger(gate)||gate<10||gate>100||gate%10!==0)return null;
  const url=String(api||'').replace(/^https:/,'wss:').replace(/^http:/,'ws:');
  if(!/^wss?:\/\//.test(url))return null;
  let ws=null,uid=null,connected=false,connecting=false,generation=0;
  let revision=0,reconnectTimer=null,coalesceTimer=null,denied=false;
  let subscribedBefore=false,pending=false,gaps=0,duplicates=0,recoveries=0;
  let reconnectFailures=0,nextRetryMs=0,subscribedAt=0;
  function clear(id){if(id!==null)clearTimeout(id)}
  function stop(){
   generation++;
   connected=false;connecting=false;revision=0;
   subscribedBefore=false;pending=false;
   reconnectFailures=0;nextRetryMs=0;subscribedAt=0;
   clear(reconnectTimer);reconnectTimer=null;
   clear(coalesceTimer);coalesceTimer=null;
   const old=ws;ws=null;
   if(old)try{old.close()}catch{}
  }
  function active(){return connected&&ws?.readyState===1}
  // A background tab or an active POST/GET must not drop a notification.
  // Keep the hint until the browser can safely fetch an official snapshot.
  function flush(){
   if(!pending||!active())return false;
   try{
    if(onChanged?.()===false)return false;
    pending=false;
    return true;
   }catch{return false}
  }
  function queue(){
   pending=true;
   if(coalesceTimer!==null)return;
   coalesceTimer=setTimeout(()=>{coalesceTimer=null;flush()},250);
  }
  function schedule(){
   if(reconnectTimer!==null||denied)return;
   // Each failed WS handshake can otherwise trigger another verified
   // team-document read every two seconds. Back off only the optional
   // push channel; the existing HTTP game-state fallback stays active.
   const wait=Math.min(30000,2000*2**Math.min(reconnectFailures,4));
   reconnectFailures=Math.min(4,reconnectFailures+1);
   nextRetryMs=wait;
   reconnectTimer=setTimeout(()=>{
    reconnectTimer=null;
    void start();
   },wait);
  }
  async function start(){
   const user=typeof getUser==='function'?getUser():null;
   if(!user?.uid||typeof user.getIdToken!=='function'){
    if(uid||ws)stop();
    uid=null;return;
   }
   if(uid!==user.uid){stop();uid=user.uid;denied=false}
   if(denied)return;
   if(active()||connecting)return;
   connecting=true;
   const epoch=++generation;
   try{
    const token=await user.getIdToken();
    if(epoch!==generation||getUser()?.uid!==uid)return;
    const socket=new WebSocket(url+'/dog/updates');
    ws=socket;
    socket.onopen=()=>{
     if(epoch!==generation)return;
     socket.send(JSON.stringify({type:'subscribe',idToken:token,gate}));
    };
    socket.onmessage=e=>{
     if(epoch!==generation)return;
     let payload;
     try{payload=JSON.parse(e.data)}catch{return}
     if(payload?.type==='error'&&payload.code==='DENIED'){
      denied=true;connected=false;return;
     }
     if(payload?.type==='subscribed'&&payload.gate===gate){
      connected=true;connecting=false;revision=0;
      subscribedAt=Date.now();nextRetryMs=0;
      // The initial page already makes its own HTTP GET. Only a real
      // reconnect needs one extra recovery GET for events missed offline.
      if(subscribedBefore){recoveries++;queue()}
      subscribedBefore=true;
      return;
     }
     if(payload?.type==='changed'&&connected&&
      Number.isSafeInteger(payload.seq)&&payload.seq>0){
      if(payload.seq<=revision){duplicates++;return}
      if(payload.seq>revision+1)gaps++;
      revision=payload.seq;
      // One authoritative GET covers missing/late/duplicate hints.
      // Never derive actual damage from websocket hints.
      queue();
     }
    };
    socket.onerror=()=>{connected=false};
    socket.onclose=()=>{
     if(epoch!==generation)return;
     // A stable 20-second subscription is healthy; reset accumulated
     // backoff so an occasional disconnect recovers promptly.
     if(subscribedAt&&Date.now()-subscribedAt>=20000)
      reconnectFailures=0;
     subscribedAt=0;
     connected=false;connecting=false;ws=null;
     if(!denied)schedule();
    };
   }catch{
    if(epoch===generation){connecting=false;connected=false;schedule()}
   }
  }
  return Object.freeze({start,stop,active,flush,
   stats:()=>({gaps,duplicates,recoveries,pending,revision,
    reconnectFailures,nextRetryMs})
  });
 }
 window.DogBossPushClient={create};
})();
