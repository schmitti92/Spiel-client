/* S-04 · Optional 100-Tore WebSocket pilot.
 * ?dogpush=1 enables it. Requires authenticated signed-in profile;
 * all game state is still fetched through the existing HTTP API.
 * Inactive or disconnected WS never suppresses the HTTP fallback.
 */
(()=>{'use strict';
 const enabled=new URLSearchParams(location.search).get('dogpush')==='1';
 function create({api,gate,getUser,onChanged}={}){
  if(!enabled||typeof WebSocket!=='function')return null;
  if(!Number.isInteger(gate)||gate<10||gate>100||gate%10!==0)return null;
  const url=String(api||'').replace(/^https:/,'wss:').replace(/^http:/,'ws:');
  if(!/^wss?:\/\//.test(url))return null;
  let ws=null,uid=null,connected=false,connecting=false,generation=0;
  let revision=0,reconnectTimer=null,coalesceTimer=null;
  function clear(id){if(id!==null)clearTimeout(id)}
  function stop(){
   generation++;
   connected=false;connecting=false;revision=0;
   clear(reconnectTimer);reconnectTimer=null;
   clear(coalesceTimer);coalesceTimer=null;
   const old=ws;ws=null;
   if(old)try{old.close()}catch{}
  }
  function active(){return connected&&ws?.readyState===1}
  function schedule(){
   if(reconnectTimer!==null)return;
   reconnectTimer=setTimeout(()=>{
    reconnectTimer=null;
    void start();
   },2000);
  }
  async function start(){
   const user=typeof getUser==='function'?getUser():null;
   if(!user?.uid||typeof user.getIdToken!=='function'){
    if(uid||ws)stop();
    uid=null;return;
   }
   if(uid!==user.uid){stop();uid=user.uid}
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
     if(payload?.type==='subscribed'&&payload.gate===gate){
      connected=true;connecting=false;revision=0;return;
     }
     if(payload?.type==='changed'&&connected&&
      Number.isSafeInteger(payload.seq)&&payload.seq>revision){
      revision=payload.seq;
      // Coalesce rapid POSTs into a single verified HTTP GET.
      if(coalesceTimer===null)coalesceTimer=setTimeout(()=>{
       coalesceTimer=null;
       if(epoch===generation&&active())onChanged?.();
      },250);
     }
    };
    socket.onerror=()=>{connected=false};
    socket.onclose=()=>{
     if(epoch!==generation)return;
     connected=false;connecting=false;ws=null;
     schedule();
    };
   }catch{
    if(epoch===generation){connecting=false;connected=false;schedule()}
   }
  }
  return Object.freeze({start,stop,active});
 }
 window.DogBossPushClient={create};
})();
