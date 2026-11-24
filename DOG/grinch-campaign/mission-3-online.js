/**
 * Online transport for Grinch Mission 3. Same hub room, same Firebase profile.
 * The Render room is authoritative. We NEVER send local game snapshots/wins.
 * All move commands carry an expected revision and idempotency identifier.
 */
const API=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
const CODE=/^(?:[0-9]{3}|[A-HJ-NP-Z2-9]{6})$/;
const signedIn=()=>{
 const s=window.SpielOnline?.state?.();
 return s?.status==='online'&&s.user?.getIdToken?s.user:null;
};
function friendlyError(message){
 const errors={
  GRINCH_MISSION3_NOT_RELEASED:'Mission 3 ist online noch nicht freigeschaltet.',
  GRINCH_NOT_YOUR_TURN:'Du bist gerade nicht am Zug.',
  LOGIN_REQUIRED:'Bitte zuerst mit deinem Online-Spielerprofil anmelden.',
  NOT_A_MEMBER:'Du musst mit demselben Profil zuerst dem gemeinsamen Spielraum beitreten.',
  ROOM_NOT_FOUND:'Dieser Raum ist nicht vorhanden oder bereits abgelaufen.',
  HOST_ONLY:'Nur der Host kann Mission 3 gemeinsam starten.',
  GRINCH_REQUIRES_THREE_HUMAN_PLAYERS:'Für Mission 3 müssen genau drei echte Spieler im selben Raum sein.',
  GRINCH_TREE_LEVEL_10_REQUIRED:'Die offizielle Kampagne wird erst bei Weihnachtsbaum-Stufe 10 freigeschaltet.',
  CHRISTMAS_EVENT_INACTIVE:'Das Weihnachtsevent ist derzeit nicht aktiv.',
  MATCH_IN_PROGRESS:'In diesem Spielraum läuft noch eine andere Partie.',
  GRINCH_STALE_REVISION:'Ein anderer Zug war schneller. Der aktuelle Spielstand wird geladen.',
  GRINCH_MATCH_MISMATCH:'Die Partie wurde geändert. Der aktuelle Spielstand wird geladen.',
  NOT_YOUR_TURN:'Du bist gerade nicht am Zug.',
  GRINCH_SPECTATOR:'Nur die drei Teilnehmer dürfen Mission 3 spielen.',
  GRINCH_MISSION2_REQUIRED_FOR_ALL_PLAYERS:'Alle drei Spieler müssen Mission 2 offiziell abgeschlossen haben.',
  GRINCH_SLOT_PENDING:'Zuerst die Grinch-Slotrunde abschließen.',
  GRINCH_SLOT_NOT_YOUR_TURN:'Nur der aktive Spieler kann den Slot für alle freigeben.',
  GRINCH_SLOT_NOT_PENDING:'Diese Slotrunde wurde bereits bestätigt.'
 };
 return errors[message]||String(message||'Die Verbindung zum Spielraum ist fehlgeschlagen.');
}
export function createGrinchOnline({roomCode,onRoom,onError,onConnection}){
 const code=String(roomCode||'').trim().toUpperCase();
 if(!CODE.test(code))throw Error('Ungültiger Raumcode');
 let stopped=false,socket=null,reconnectTimer=null,heartbeat=null,pollTimer=null,pending=null,lastMatchId=null,lastRevision=-1,account=null;
 const notify=msg=>onError?.(friendlyError(msg));
 const connected=()=>socket?.readyState===1;
 const base='/api/hub/rooms/'+encodeURIComponent(code);
 async function request(suffix='',method='GET',payload){
  const person=signedIn();
  if(!person)throw Error('LOGIN_REQUIRED');
  const token=await person.getIdToken();
  const response=await fetch(API+base+suffix,{method,
   headers:{Authorization:'Bearer '+token,...(payload?{'Content-Type':'application/json'}:{})},
   body:payload?JSON.stringify(payload):undefined,cache:'no-store'});
  let body;try{body=await response.json();}catch{throw Error('INVALID_SERVER_RESPONSE');}
  if(!response.ok||body?.ok!==true)throw Error(body?.error||'SERVER_ERROR');
  if(signedIn()?.uid!==person.uid)throw Error('LOGIN_REQUIRED');
  return body;
 }
 const accept=room=>{
  if(stopped||!room||room.code!==code)return;
  if(Number(room.revision)<lastRevision)return;
  lastRevision=Number(room.revision)||0;
  lastMatchId=room.match?.game==='dog-grinch3'?room.match.id:null;
  onRoom?.(room);
 };
 async function refresh(){
  if(stopped||pending)return pending;
  if(!signedIn()){onConnection?.('login');return null;}
  pending=(async()=>{
   try{accept((await request()).room);return true;}
   catch(err){notify(err.message);onConnection?.('offline');return false;}
  })();
  try{return await pending;}finally{pending=null;}
 }
 function stopSocket(){
  clearTimeout(reconnectTimer);reconnectTimer=null;
  clearInterval(heartbeat);heartbeat=null;
  if(socket){const previous=socket;socket=null;previous.onclose=null;previous.onerror=null;try{previous.close();}catch{}}
 }
 function connect(){
  if(stopped||socket||!signedIn())return;
  const ws=new WebSocket(API.replace(/^http/i,'ws')+'/hub');
  socket=ws;let lastReceived=Date.now();
  ws.onopen=async()=>{
   try{
    const token=await signedIn()?.getIdToken();
    if(!token||ws!==socket||ws.readyState!==1)throw Error('LOGIN_REQUIRED');
    ws.send(JSON.stringify({type:'subscribe',code,profileIdToken:token}));
    onConnection?.('connected');
    heartbeat=setInterval(()=>{
      if(ws.readyState!==1)return;
      if(Date.now()-lastReceived>95000){ws.close();return;}
      ws.send(JSON.stringify({type:'ping'}));
    },30000);
   }catch{ws.close();}
  };
  ws.onmessage=e=>{
   if(ws!==socket||stopped)return;
   let data;try{data=JSON.parse(e.data);}catch{return;}
   lastReceived=Date.now();
   if(data?.type==='room'&&data.room?.code===code)accept(data.room);
   else if(data?.type==='error'){notify(data.error||'STREAM_UNAVAILABLE');}
  };
  ws.onclose=()=>{
   if(ws!==socket||stopped)return;
   socket=null;clearInterval(heartbeat);heartbeat=null;
   onConnection?.('reconnecting');
   reconnectTimer=setTimeout(()=>{reconnectTimer=null;connect();void refresh();},4400);
  };
  ws.onerror=()=>{};
 }
 async function launch(){
  if(stopped)return;
  try{const result=await request('/grinch/launch3','POST',{});accept(result.room);return result.room;}
  catch(err){notify(err.message);await refresh();return null;}
 }
 async function action(move,state){
  if(stopped||!move||!state||!lastMatchId)throw Error('NOT_CONNECTED');
  try{
   const payload={matchId:state.matchId||lastMatchId,expectedRevision:state.revision,
    actionId:typeof crypto?.randomUUID==='function'?crypto.randomUUID():'g3_'+Date.now()+'_'+Math.floor(Math.random()*1e6),
    action:move};
   const result=await request('/grinch/action3','POST',payload);
   accept(result.room);
   return result.room;
  }catch(err){notify(err.message);await refresh();return null;}
 }
 function onLogin(){
  if(stopped)return;
  const uid=signedIn()?.uid||null;
  if(uid===account)return;
  account=uid;lastRevision=-1;lastMatchId=null;stopSocket();onRoom?.(null);
  if(uid){connect();void refresh();}
  else onConnection?.('login');
 }
 function start(){
  stopped=false;window.addEventListener('spielonline-change',onLogin);
  document.addEventListener('visibilitychange',onVisible);
  pollTimer=setInterval(()=>{if(!connected()&&!document.hidden)void refresh();},8000);
  onLogin();
 }
 function onVisible(){if(document.hidden)return;connect();void refresh();}
 function stop(){
  stopped=true;window.removeEventListener('spielonline-change',onLogin);
  document.removeEventListener('visibilitychange',onVisible);
  clearInterval(pollTimer);pollTimer=null;stopSocket();
 }
 return {code,start,stop,refresh,launch,action};
}
