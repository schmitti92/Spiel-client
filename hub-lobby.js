/* Gemeinsamer Online-Raum · Phase 1 (nur Browser-UI, Firestore bleibt maßgeblich). */
(()=>{
'use strict';
const el=id=>document.getElementById(id);
const config=window.SPIELPORTAL_CONFIG||{};
const API=String(config.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
const GAME={barikade:'Barikade',skyjo:'SKYJO Action',kreuz:'KreuzKunter',business:'Das große Business',partychallenge:'Party Challenge'};
let code=null,room=null,operation=false,poll=null,accountUid=null,pollErrors=0;
let playMode=new URL(location.href).searchParams.get('view')==='local'?'local':'online';
let choosingGame=false,displayGame=null;
const GAME_ICON={barikade:'🎲',skyjo:'🃏',kreuz:'🎯',business:'💼',partychallenge:'🏆'};
const GAME_DESCRIPTIONS={
 barikade:'Das Brettspiel mit Barikaden, Action-Regeln und optionalem Bossmodus.',
 skyjo:'Karten, Joker und spannende Runden. Der Host legt die Regeln fest.',
 kreuz:'Würfeln, Farben ankreuzen und gemeinsam Punkte sammeln.',
 business:'Unternehmen, Aktien und Branchen – mit 10, 20 oder 30 Runden.',
 partychallenge:'Fünf oder neun Minispiele in einem Raum; der Host startet jedes Spiel.'
};
function setPlayMode(next){
 playMode=next==='local'?'local':'online';
 el('mode-online').classList.toggle('active',playMode==='online');
 el('mode-local').classList.toggle('active',playMode==='local');
 el('mode-online').setAttribute('aria-pressed',String(playMode==='online'));
 el('mode-local').setAttribute('aria-pressed',String(playMode==='local'));
 el('online-area').classList.toggle('hidden',playMode!=='online');
 el('local-view').classList.toggle('hidden',playMode!=='local');
 if(playMode==='local')notice('');
 render();
}
const stayInMatchId=new URL(location.href).searchParams.get('stayMatch');
let launchedMatchId=null,hubSocket=null,retrySocket=null,streamReady=false,streamLast=0,hubHeartbeat=null,pollInFlight=false;
function stopWatch(){
 streamReady=false;
 if(hubHeartbeat){clearInterval(hubHeartbeat);hubHeartbeat=null;}
 if(retrySocket){clearTimeout(retrySocket);retrySocket=null;}
 if(hubSocket){const old=hubSocket;hubSocket=null;try{old.onclose=null;old.close();}catch(_e){}}
}
function startWatch(){
 if(!code||!room||!activeProfile()||hubSocket)return;
 const socket=new WebSocket(API.replace(/^http/i,'ws')+'/hub');hubSocket=socket;
 let lastPong=Date.now();
 socket.onopen=async()=>{
  try{const token=await logged().user.getIdToken();
    if(hubSocket===socket&&socket.readyState===1){
      socket.send(JSON.stringify({type:'subscribe',code,profileIdToken:token}));
      hubHeartbeat=setInterval(()=>{
        if(hubSocket!==socket||socket.readyState!==1)return;
        if(Date.now()-lastPong>95000){socket.close();return;}
        socket.send(JSON.stringify({type:'ping'}));
      },30000);
    }
  }catch(_e){try{socket.close();}catch(_x){}}
 };
 socket.onmessage=event=>{
  let data;try{data=JSON.parse(event.data);}catch(_e){return;}
  if(data?.type==='pong')lastPong=Date.now();
  if(hubSocket===socket&&data?.type==='room'&&data.room?.code===code){lastPong=Date.now();streamReady=true;streamLast=Date.now();acceptRoom(data.room);}
 };
 socket.onclose=()=>{
  if(hubSocket!==socket)return;
  hubSocket=null;streamReady=false;
  if(hubHeartbeat){clearInterval(hubHeartbeat);hubHeartbeat=null;}
  if(code&&room&&activeProfile())retrySocket=setTimeout(()=>{retrySocket=null;startWatch();},4500);
 };
 socket.onerror=()=>{}; // close event triggers HTTP fallback and retry
}
function enterKreuz(){
 if(room?.phase!=='playing'||room.match?.game!=='kreuz'||!room.match.participating)return;
 const match=room.match;
 if(!/^K[A-HJ-NP-Z2-9]{9}$/.test(match.gameCode))throw Error('MATCH_CODE_INVALID');
 location.assign('KreuzKunter/kreuzkunter.html?hub='+encodeURIComponent(room.code)+'&match='+encodeURIComponent(match.id)+'&gameCode='+encodeURIComponent(match.gameCode));
}
function enterSkyjo(){
 if(room?.phase!=='playing'||room.match?.game!=='skyjo'||!room.match.participating)return;
 const m=room.match;
 if(!/^S[A-HJ-NP-Z2-9]{9}$/.test(m.gameCode))throw Error('MATCH_CODE_INVALID');
 const q=new URLSearchParams({mode:'online',hub:room.code,match:m.id,room:m.gameCode});
 location.assign('Skyjo/skyjo_action.html?'+q.toString());
}
function enterBusiness(){
 if(room?.phase!=='playing'||room.match?.game!=='business'||!room.match.participating)return;
 const m=room.match;
 if(!/^D[A-HJ-NP-Z2-9]{9}$/.test(m.gameCode))throw Error('MATCH_CODE_INVALID');
 const q=new URLSearchParams({hub:room.code,match:m.id,gameCode:m.gameCode});
 location.assign('Business/business_online.html?'+q.toString());
}
function enterCurrentMatch(){
 if(room?.match?.game==='barikade')return enterBarikade();
 if(room?.match?.game==='kreuz')return enterKreuz();
 if(room?.match?.game==='skyjo')return enterSkyjo();
 if(room?.match?.game==='business')return enterBusiness();
 if(room?.match?.game==='partychallenge')return;
 throw Error('GAME_NOT_CONNECTED');
}
function enterBarikade(){
 if(room?.phase!=='playing'||room.match?.game!=='barikade'||!room.match.participating)return;
 const match=room.match,profile=logged();
 if(!/^B[A-HJ-NP-Z2-9]{9}$/.test(match.gameCode))throw Error('MATCH_CODE_INVALID');
 // Only game connection preferences; the authoritative hub, identities and match live in Firestore.
 localStorage.setItem('barikade_room',match.gameCode);
 localStorage.setItem('barikade_mode',room.host?'host':'client');
 localStorage.setItem('barikade_playerName',profile.profile?.name||'Spieler');
 localStorage.setItem('barikade_nameKey',profile.profile?.name||'Spieler');
 localStorage.setItem('barikade_requested_color_'+match.gameCode,match.myColor);
 const settings=match.settings||{};
 localStorage.setItem('barikade_action_mode',settings.mode==='action'?'action':'classic');
 localStorage.setItem('barikade_boss_mode',settings.bossMode?'boss':'off');
 localStorage.setItem('barikade_joker_count_'+match.gameCode,String(settings.jokerStartCount||3));
 localStorage.setItem('barikade_event_field_count_'+match.gameCode,String(settings.eventFieldCount||8));
 localStorage.setItem('barikade_boss_event_trigger_'+match.gameCode,String(settings.bossEventTrigger??2));
 localStorage.setItem('barikade_board_theme_'+match.gameCode,settings.boardTheme||'wood');
 localStorage.removeItem('barikade_sessionToken');
 location.assign('Barikade/barikade.html?compact=1&hub='+encodeURIComponent(room.code)+'&players='+match.playerCount+'&match='+encodeURIComponent(match.id));
}

const activeProfile=()=>{const p=window.SpielOnline?.state?.();return p?.status==='online'&&p?.profile?.setupComplete!==false&&p?.user?p:null;};
const messages={DATABASE_UNAVAILABLE:'Der Spielserver hat derzeit keine Firestore-Verbindung.',LOGIN_REQUIRED:'Bitte melde dich mit deinem Online-Profil an.',PROFILE_REQUIRED:'Bitte vervollständige dein Spielerprofil.',ROOM_NOT_FOUND:'Der Raum wurde nicht gefunden oder ist abgelaufen.',NOT_A_MEMBER:'Du bist diesem Raum noch nicht beigetreten.',ROOM_FULL:'Der Raum ist bereits voll.',GAME_FULL:'Für dieses Spiel sind schon zu viele Personen im Raum.',TOO_MANY_PLAYERS_FOR_GAME:'Für dieses Spiel sind zu viele Personen im Raum.',HOST_ONLY:'Nur der Host darf das ändern.',GAME_NOT_CONNECTED:'Dieses Spiel ist noch nicht mit der zentralen Lobby verbunden.',PLAYERS_NOT_READY:'Noch sind nicht alle Mitspieler bereit.',GAME_SEATS_FULL:'Für dieses Spiel sind alle Mitspielerplätze belegt. Der Host kann zunächst jemanden auf Zuschauer setzen.',SPECTATOR_CANNOT_READY:'Als Zuschauer musst du dich nicht bereit melden.',ROOM_ALREADY_PLAYING:'Diese Partie hat bereits begonnen.',MATCH_IN_PROGRESS:'Während einer laufenden Partie kannst du den Raum nicht verlassen.',MATCH_NOT_FINISHED:'Die Partie ist noch nicht beendet. Der Server hat noch keinen Sieger festgestellt.',HOST_MUST_PLAY:'Der Host muss bei der Partie mitspielen.',NO_ACTIVE_MATCH:'Es läuft keine Partie.',INVALID_SETTINGS:'Diese Einstellungen sind ungültig.',NO_BARIKADE_SETUP:'Bitte zuerst Barikade auswählen.',NO_SKYJO_SETUP:'Bitte zuerst SKYJO auswählen.',NO_BUSINESS_SETUP:'Bitte zuerst Business auswählen.',COLOR_TAKEN:'Diese Spielfarbe ist bereits vergeben.',COLORS_BY_WHEEL:'Die Spielerfarben werden ausgelost.',SPECTATOR_CANNOT_SELECT_COLOR:'Zuschauer können keine Spielfarbe wählen.'};
function notice(message='',isError=false){el('main-status').textContent=message;el('main-status').classList.toggle('error',!!isError);}
function showError(error){const message=messages[error?.message]||error?.message||'Unbekannter Fehler';notice(message,true);}
function logged(){const p=activeProfile();if(!p)throw Error('LOGIN_REQUIRED');return p;}
async function request(path,method='GET',data){
 const uid=logged().user.uid;
 const token=await logged().user.getIdToken();
 if(logged().user.uid!==uid)throw Error('LOGIN_REQUIRED');
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),14000);
 try{
  const response=await fetch(API+'/api/hub'+path,{method,mode:'cors',cache:'no-store',signal:controller.signal,headers:{Authorization:'Bearer '+token,...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});
  const r=await response.json();if(!response.ok||r.ok!==true)throw Error(r.error||'SERVER_ERROR');return r;
 }finally{clearTimeout(timeout);}
}
function setRoomCode(next){code=next;const u=new URL(location.href);if(code)u.searchParams.set('room',code);else u.searchParams.delete('room');history.replaceState(null,'',u);}
function acceptRoom(next){
 if(!next||next.code!==code)return false;
 if(room?.code===next.code&&Number(next.revision)<Number(room.revision))return false;
 room=next;render();return true;
}
function activateRoom(result){if(!result?.code)return;setRoomCode(result.code);acceptRoom(result);}

function pollStop(){if(poll){clearInterval(poll);poll=null;}stopWatch();}
function pollStart(){pollStop();startWatch();poll=setInterval(async()=>{if(!code||operation||pollInFlight||!activeProfile()||document.hidden)return;
 if(streamReady && hubSocket?.readyState===1)return;
 const requestedCode=code;pollInFlight=true;
 try{const result=await request('/rooms/'+requestedCode);if(code!==requestedCode)return;pollErrors=0;acceptRoom(result.room);}catch(e){if(code!==requestedCode)return;if(['ROOM_NOT_FOUND','NOT_A_MEMBER','LOGIN_REQUIRED'].includes(e.message)){leaveView();showError(e);}else if(++pollErrors===3)showError(e);}finally{pollInFlight=false;}
 },4500);}
function leaveView(){pollStop();room=null;choosingGame=false;displayGame=null;setRoomCode(null);render();}

const CHALLENGE_LABELS={'lava-arena':'Lava Arena','maulwurf-arena':'Maulwurf Arena',recheninsel:'Recheninsel',flusssprung:'Flusssprung',zeitgefuehl:'Zeitgefühl','huetchen-challenge':'Hütchen Challenge','snake-arena':'Snake Arena','bomber-strand-arena':'Bomber Strand Arena',preisjaeger:'Preisjäger'};
let challengeClockTimer=null;
let challengeStopBusy=false;
function renderChallengeProgress(){
 let box=el('challenge-progress');
 if(!box){
  box=document.createElement('section');box.id='challenge-progress';box.style.cssText='margin:16px 0;padding:22px;border-radius:22px;background:linear-gradient(135deg,#122946,#223f69);color:white;text-align:center;box-shadow:0 14px 30px #10294b30';
  box.innerHTML='<h2 style="margin:0 0 10px">🏆 Party Challenge</h2><p id="challenge-progress-name"></p><div id="challenge-clock" aria-live="off" style="font-size:clamp(58px,15vw,130px);font-weight:900;line-height:1.1;color:#ffcf6b"></div><p id="challenge-progress-status" role="status"></p><p id="challenge-progress-order" style="font-size:13px;opacity:.85"></p><button id="challenge-time-stop" type="button" style="font-size:24px;padding:16px 36px;border-radius:16px;background:#ffcf6b;color:#122946;font-weight:900;border:0" hidden>⏱️ STOPP!</button><p id="challenge-time-target"></p><div id="challenge-results"></div><div id="challenge-math" hidden><p id="challenge-math-question" style="font-size:clamp(30px,7vw,58px);font-weight:900"></p><input id="challenge-math-input" type="number" min="0" max="1000" inputmode="numeric" aria-label="Ergebnis eingeben" style="width:140px;padding:12px;font-size:24px;border-radius:12px"><button type="button" id="challenge-math-send" style="padding:14px;border-radius:12px">Antwort abgeben</button><p id="challenge-math-feedback" role="status"></p></div><button type="button" id="challenge-next" hidden>▶ Nächstes Minispiel starten</button>';
  el('ready-panel').parentNode.insertBefore(box,el('ready-panel'));
  el('challenge-math-send').addEventListener('click',async()=>{
   const ch=room?.match?.challenge;
   if(!ch)return;
   const answer=Number(el('challenge-math-input').value);
   if(!Number.isInteger(answer)||el('challenge-math-input').value.trim()===''){el('challenge-math-feedback').textContent='Bitte eine ganze Zahl eingeben.';return;}
   const button=el('challenge-math-send');button.disabled=true;
   try{const response=await request('/rooms/'+encodeURIComponent(room.code)+'/challenge-math-answer','POST',{challengeId:ch.id,answer});acceptRoom(response.room);}
   catch(e){el('challenge-math-feedback').textContent=e.message;button.disabled=false;}
  });
  el('challenge-math-input').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.isComposing&&!el('challenge-math-send').disabled){event.preventDefault();el('challenge-math-send').click();}});
  el('challenge-next').addEventListener('click',async()=>{if(!room?.host||!room?.match?.challenge)return;const btn=el('challenge-next');btn.disabled=true;try{const response=await request('/rooms/'+encodeURIComponent(room.code)+'/challenge-next','POST',{challengeId:room.match.challenge.id});acceptRoom(response.room);}catch(e){showError(e);}finally{btn.disabled=false;}});
  el('challenge-time-stop').addEventListener('click',async()=>{if(challengeStopBusy||!room?.match?.challenge)return;challengeStopBusy=true;el('challenge-time-stop').disabled=true;try{const response=await request('/rooms/'+encodeURIComponent(room.code)+'/challenge-time-stop','POST',{challengeId:room.match.challenge.id});acceptRoom(response.room);}catch(e){showError(e);}finally{challengeStopBusy=false;}});
 }
 const ch=room?.match?.game==='partychallenge'?room.match.challenge:null;
 box.classList.toggle('hidden',!ch);
 if(challengeClockTimer){clearInterval(challengeClockTimer);challengeClockTimer=null;}
 if(!ch)return;
 const index=Math.min(Math.max(0,ch.index||0),ch.order.length-1);
 el('challenge-progress-name').textContent='Spiel '+(index+1)+' von '+ch.order.length+' · '+(CHALLENGE_LABELS[ch.order[index]]||ch.order[index]);
 el('challenge-progress-order').textContent=ch.order.map((g,i)=>(i===index?'➤ ':'')+(i+1)+'. '+(CHALLENGE_LABELS[g]||g)).join('  ·  ');
 el('challenge-next').hidden=!room.host||ch.phase!=='results';
 const isMath=ch.order[index]==='recheninsel';
 const myMathSeat=room.players.find(p=>p.me)?.seat;
 const answered=!!ch.math?.answered?.includes(myMathSeat);
 const mathRoundKey=ch.id+':'+index;
 if(el('challenge-math').dataset.round!==mathRoundKey){el('challenge-math').dataset.round=mathRoundKey;el('challenge-math-input').value='';}
 el('challenge-math').hidden=!isMath||ch.phase!=='countdown';
 el('challenge-math-question').textContent=isMath&&ch.math?ch.math.a+' '+ch.math.operator+' '+ch.math.b+' = ?':'';
 el('challenge-math-send').disabled=answered||Number(ch.startAt)>Number(room.serverNow);
 el('challenge-math-input').disabled=answered;
 el('challenge-math-feedback').textContent=answered?'✓ Antwort gespeichert. Warte auf die Mitspieler.':'';
 const isTime=ch.order[index]==='zeitgefuehl';
 const mySeat=room.players.find(p=>p.me)?.seat;
 const stopped=(ch.stopped||[]).includes(mySeat);
 el('challenge-time-target').textContent=isTime?'🎯 Ziel: '+ch.targetSeconds+' Sekunden · Die ersten drei Sekunden werden angezeigt. Danach schätze die Zeit!':'';
 el('challenge-time-stop').hidden=!isTime||ch.phase!=='countdown'||stopped;
 el('challenge-time-stop').disabled=challengeStopBusy||Number(ch.startAt)>Number(room.serverNow)||stopped;
 const resultsBox=el('challenge-results');
 resultsBox.replaceChildren();
 if(ch.phase==='results'||ch.phase==='finished'){
  const result=ch.results[ch.results.length-1];
  const title=document.createElement('h3');title.textContent=ch.phase==='finished'?'🏆 Finale Siegerehrung':'🎉 Minispiel abgeschlossen';resultsBox.append(title);
  if(result?.game==='recheninsel'&&typeof result.answer==='number'){const solution=document.createElement('p');solution.textContent='🏴‍☠️ Lösung: '+result.question+' = '+result.answer;resultsBox.append(solution);}
  if(result?.standings){
   const list=document.createElement('div');list.style.cssText='display:grid;gap:9px;margin:14px auto;max-width:540px';
   result.standings.slice().sort((a,b)=>(b.challengePoints||0)-(a.challengePoints||0)||(a.deltaMs??0)-(b.deltaMs??0)||a.name.localeCompare(b.name)).forEach((entry,i)=>{
    const card=document.createElement('div');card.style.cssText='padding:12px;border-radius:12px;background:#ffffff1c;display:flex;justify-content:space-between;gap:12px';
    const name=document.createElement('strong');name.textContent=(['🥇','🥈','🥉'][i]||'🎮')+' '+entry.name;
    const points=document.createElement('span');points.textContent=(typeof entry.elapsedMs==='number'?(entry.elapsedMs/1000).toFixed(2)+' s · ':'')+(typeof entry.correct==='boolean'?(entry.correct?'✓ Richtig · ':'✗ Falsch · '):'')+'+'+entry.challengePoints+' Punkte';
    card.append(name,points);list.append(card);
   });resultsBox.append(list);
  }
  if(ch.phase==='finished'){
   const total=document.createElement('h3');total.textContent='Gesamtwertung';resultsBox.append(total);
   const standings=(ch.totals||[]).slice().sort((a,b)=>b.points-a.points||a.name.localeCompare(b.name));
   standings.forEach((entry,i)=>{const row=document.createElement('p');row.textContent=(['🏆','🥈','🥉'][i]||'🎮')+' '+entry.name+' · '+entry.points+' Punkte';resultsBox.append(row);});
  }
 }
 const estimatedServerNow=Number(room.serverNow)||Date.now();
 const observedAt=Date.now();
 const draw=()=>{
  const remaining=Number(ch.startAt)-(estimatedServerNow+Date.now()-observedAt);
  const clockEl=el('challenge-clock'),statusEl=el('challenge-progress-status');
  if(ch.phase==='results'||ch.phase==='finished'){
   clockEl.textContent=ch.phase==='finished'?'🏆':'🎉';
   statusEl.textContent=ch.phase==='finished'?'Die Challenge ist beendet.':'Auswertung abgeschlossen. Der Host startet das nächste Spiel.';
   return;
  }
  if(remaining>0){
   clockEl.textContent=String(Math.max(1,Math.ceil(remaining/1000)));
   statusEl.textContent='Start wird vom Server gesteuert. Bitte bereithalten.';
   return;
  }
  if(isTime){
   clockEl.textContent=stopped?'✓':remaining<=-3000?'❓':String(Math.max(0,Math.floor(-remaining/1000)));
   statusEl.textContent=stopped?'✓ Stopp gespeichert – warte auf die Mitspieler.':'⏱️ Zeitgefühl läuft – drücke STOPP bei deiner geschätzten Zielzeit.';
   if(!stopped)el('challenge-time-stop').disabled=challengeStopBusy;
  }else if(isMath){
   clockEl.textContent='🏴‍☠️';
   statusEl.textContent=answered?'Antwort gespeichert – warte auf die Mitspieler.':'Löse die Rechenaufgabe und sende deine Antwort ab.';
   if(!answered)el('challenge-math-send').disabled=false;
  }else{
   clockEl.textContent='⏳';
   statusEl.textContent='⚠️ Dieses Minispiel ist noch nicht online verfügbar.';
  }
 };
 draw();
 if(ch.phase==='countdown'&&(Number(ch.startAt)>estimatedServerNow||isTime&&!stopped))challengeClockTimer=setInterval(draw,80);
}
function renderChallengeSetup(showStage){
 let box=el('challenge-settings-panel');
 if(!box){
  box=document.createElement('section');box.id='challenge-settings-panel';box.style.cssText='padding:18px;margin:14px 0;border:2px solid #e4b75d;border-radius:18px;background:#fff8e9;color:#24334b';
  box.style.cssText='padding:24px;margin:16px 0;border:1px solid #d9c49b;border-radius:24px;background:linear-gradient(145deg,#fffaf0,#f1f6ff);color:#24334b;box-shadow:0 12px 32px #20385814';
  box.innerHTML=`<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px"><span style="font-size:36px">🏆</span><div><h3 style="margin:0;font-size:25px">Party Challenge</h3><small style="color:#657a92">GEMEINSAM SPIELEN · IM SELBEN RAUM BLEIBEN</small></div></div><p style="color:#51647a;margin:12px 0 20px">Wähle die Challenge. Die Minispiele werden nacheinander gespielt und alle Punkte zusammengezählt.</p><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin:12px 0"><div style="padding:17px;border-radius:16px;background:#fff;border:2px solid #32b59d;box-shadow:0 4px 16px #153b4012"><div style="font-size:28px">⏱️</div><strong>Zeitgefühl</strong><div style="font-size:13px;color:#147b67;margin-top:5px">✓ Online spielbar</div></div><div style="padding:17px;border-radius:16px;background:#fff;border:2px solid #32b59d;box-shadow:0 4px 16px #153b4012"><div style="font-size:28px">🧮</div><strong>Recheninsel</strong><div style="font-size:13px;color:#147b67;margin-top:5px">✓ Online spielbar</div></div><div style="padding:17px;border-radius:16px;background:#f4f6fa;border:1px dashed #b8c4d3"><div style="font-size:28px">🔒</div><strong>Weitere Minispiele</strong><div style="font-size:13px;color:#708094;margin-top:5px">In Vorbereitung</div></div></div><label for="challenge-count" style="display:block;font-weight:700;margin:18px 0 7px">🎲 Challenge-Umfang</label><select id="challenge-count" style="width:100%;max-width:440px;min-height:45px;border-radius:12px;border:1px solid #c7d4e3;padding:8px 12px;background:white"><option value="2">🧪 2 Minispiele · jetzt spielbar</option><option value="5" disabled>🔒 5 Minispiele · bald verfügbar</option><option value="9" disabled>🔒 9 Minispiele · bald verfügbar</option></select><div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:14px"><button type="button" id="challenge-save" style="border:0;border-radius:12px;padding:12px 17px;background:#167d72;color:white;font-weight:700">✓ Auswahl speichern</button><button type="button" id="challenge-bots" style="border:1px solid #c8d7e8;border-radius:12px;padding:12px 17px;background:white;color:#243b5a;font-weight:700">🤖 2 Testspieler hinzufügen</button></div><p id="challenge-feedback" role="status" style="font-size:13px;color:#496278;margin:12px 0 0"></p>`;
  el('ready-panel').parentNode.insertBefore(box,el('ready-panel'));
  el('challenge-bots').addEventListener('click',async()=>{
   if(!room?.host)return;
   const button=el('challenge-bots');button.disabled=true;
   try{const enabled=!room.players.some(p=>p.testBot);const response=await request('/rooms/'+encodeURIComponent(room.code)+'/challenge-test-players','POST',{enabled});acceptRoom(response.room);el('challenge-feedback').textContent=enabled?'Zwei Testspieler hinzugefügt.':'Testspieler entfernt.';}
   catch(e){el('challenge-feedback').textContent='Testspieler: '+e.message;}
   finally{button.disabled=false;}
  });
  el('challenge-save').addEventListener('click',async()=>{
   const button=el('challenge-save');button.disabled=true;
   try{await request('/rooms/'+encodeURIComponent(room.code)+'/challenge-settings','POST',{count:Number(el('challenge-count').value)});el('challenge-feedback').textContent='Auswahl gespeichert. Alle Spieler müssen erneut bereit sein.';const updated=await request('/rooms/'+encodeURIComponent(room.code));acceptRoom(updated.room);}
   catch(e){el('challenge-feedback').textContent='Speichern fehlgeschlagen: '+e.message;}
   finally{button.disabled=false;}
  });
 }
 const active=showStage&&room?.game==='partychallenge';box.classList.toggle('hidden',!active);
 if(!active)return;
 if(room.phase!=='preparing')el('challenge-feedback').textContent='';
 const count=room.settings?.count===9?9:room.settings?.count===5?5:2;
 if(document.activeElement!==el('challenge-count'))el('challenge-count').value=String(count===2?2:2);
 el('challenge-count').disabled=!room.host||room.phase!=='preparing';
 el('challenge-save').hidden=!room.host||room.phase!=='preparing';
 el('challenge-bots').hidden=!room.host||room.phase!=='preparing';
 el('challenge-bots').textContent=room.players.some(p=>p.testBot)?'🤖 2 Testspieler entfernen':'🤖 2 Testspieler hinzufügen';
}
function render(){
 if(room?.game==='kreuz'&&room.phase==='preparing'&&new URL(location.href).searchParams.get('stage')==='1'){
  location.replace('KreuzKunter/kreuzkunter_start.html?room='+encodeURIComponent(room.code));
  return;
 }
 if(room?.game==='business'&&room.phase==='preparing'&&new URL(location.href).searchParams.get('stage')==='1'){
  location.replace('Business/business_start.html?room='+encodeURIComponent(room.code));
  return;
 }
 if(room?.game==='barikade'&&room.phase==='preparing'&&new URL(location.href).searchParams.get('stage')==='1'){
  location.replace('Barikade/barikade_start.html?room='+encodeURIComponent(room.code));
  return;
 }
 if(room?.game==='skyjo'&&room.phase==='preparing'&&new URL(location.href).searchParams.get('stage')==='1'){
  location.replace('Skyjo/skyjo_start.html?room='+encodeURIComponent(room.code));
  return;
 }
 const account=activeProfile();
 el('account-name').textContent=account?.profile?.name||account?.user?.email||'Noch nicht angemeldet';
 el('account-info').textContent=account?'Dein verifiziertes Online-Spielerprofil ist verbunden.':'Bitte anmelden oder ein Profil erstellen, um einen Raum zu betreten.';
 el('login-btn').textContent=account?'Profil ansehen':'Anmelden';
 const inside=!!room;
 if(inside&&room.phase==='lobby'&&!room.game&&new URL(location.href).searchParams.get('stage')==='1'){
  location.replace('spielauswahl-online.html?room='+encodeURIComponent(room.code));
  return;
 }
 el('entry-view').classList.toggle('hidden',inside);
 el('room-view').classList.toggle('hidden',!inside);
 el('create-btn').disabled=!account||operation;el('join-btn').disabled=!account||operation;
 if(!inside||playMode!=='online')return;
 if(displayGame!==room.game){choosingGame=false;displayGame=room.game;}
 if(room.phase==='playing')choosingGame=false;
 const showStage=!!room.game&&!choosingGame;
 el('game-chooser').classList.toggle('hidden',showStage);
 el('game-stage-hero').classList.toggle('hidden',!showStage);
 el('ready-panel').classList.toggle('hidden',!showStage);
 el('kreuz-settings-panel').classList.toggle('hidden',!showStage||room.game!=='kreuz');
 renderChallengeSetup(showStage);
 renderChallengeProgress();
 el('change-game-btn').classList.toggle('hidden',!room.host||room.phase==='playing');
 if(showStage){
  el('game-stage-hero').dataset.game=room.game;
  el('selected-game-icon').textContent=GAME_ICON[room.game]||'🎲';
  el('selected-game-title').textContent=GAME[room.game]||room.game;
  el('selected-game-description').textContent=GAME_DESCRIPTIONS[room.game]||'Online-Partie vorbereiten.';
  const selected=room.players.filter(p=>p.participating).length;
  el('selected-game-badge').textContent='👥 '+selected+' von '+room.maxPlayers+' Spielplätzen';
  el('selected-game-host-note').textContent=room.host
    ?'👑 Du bist Host. Nur du kannst Spiel, Regeln und Teilnehmerplätze ändern. Jede Änderung setzt die Bereitmeldungen zurück.'
    :'🔒 Der Host legt Regeln und Teilnehmer fest. Du kannst dich selbst bereit melden, sobald du einen Spielplatz hast.';
 }
 if(room.phase==='playing'&&room.match?.participating&&room.match.id!==stayInMatchId&&room.match.id!==launchedMatchId){
   launchedMatchId=room.match.id;
   try{enterCurrentMatch();}catch(e){showError(e);}
 }
 el('room-code').textContent=room.code;
 el('select-help').textContent=room.phase==='playing'?'Die Partie läuft. Alle bleiben im gemeinsamen Raum.':room.host?'Du bist Host: Wähle ein Spiel für deine Gruppe.':'Der Host wählt das nächste Spiel. Du kannst dich anschließend bereit melden.';
 const player=room.players.find(p=>p.me);
 const barikade=room.game==='barikade'&&!!room.settings;
 const skyjo=room.game==='skyjo'&&!!room.settings;
 const business=room.game==='business'&&!!room.settings;
 const settings=room.settings||{};
 el('business-settings-panel').classList.toggle('hidden',!business||!showStage);
 el('business-host-settings').classList.toggle('hidden',!business||!room.host||room.phase!=='preparing');
 if(business){
  el('business-settings-summary').textContent=room.settings.rounds+' Runden · '+(room.settings.rounds===10?'Schnell':room.settings.rounds===30?'Marathon':'Standard');
  el('business-rounds').value=String(room.settings.rounds);
  el('business-rounds').disabled=operation;
 }
 el('skyjo-settings-panel').classList.toggle('hidden',!skyjo||!showStage);
 el('skyjo-host-settings').classList.toggle('hidden',!skyjo||!room.host||room.phase!=='preparing');
 if(skyjo){
  const settings=room.settings||{};
  el('skyjo-settings-summary').textContent=`${settings.target} Zielpunkte · ${settings.jokerCount} Joker · Spezial ${settings.jokerEnabled?'an':'aus'} · Straßen ${settings.streetModeEnabled?'an':'aus'}`;
  document.querySelectorAll('[data-skyjo-setting]').forEach(field=>{field.value=String(settings[field.dataset.skyjoSetting]);field.disabled=operation;});
 }
 el('barikade-settings-panel').classList.toggle('hidden',!barikade||!showStage);
 el('barikade-host-settings').classList.toggle('hidden',!barikade||!room.host||room.phase!=='preparing');
 if(barikade){
   el('barikade-settings-summary').textContent=[settings.mode==='action'?'⚡ Action':'🎲 Klassisch',settings.bossMode?'👹 Bossmodus':'Ohne Bosse',`Brett: ${settings.boardTheme==='stone'?'Stein':settings.boardTheme==='classic'?'Klassisch':'Holz'}`,settings.colorMode==='wheel'?'🎰 Farben auslosen':'🎨 Farbwahl'].join(' · ');
   document.querySelectorAll('[data-barikade-setting]').forEach(field=>{field.value=String(settings[field.dataset.barikadeSetting]);field.disabled=operation;});
   document.querySelectorAll('.hub-action-setting').forEach(field=>field.classList.toggle('hidden',settings.mode!=='action'));
   document.querySelectorAll('.hub-boss-setting').forEach(field=>field.classList.toggle('hidden',!settings.bossMode));
 }
 const canPick=barikade&&room.phase==='preparing'&&player?.participating&&settings.colorMode==='manual';
 el('barikade-color-select-panel').classList.toggle('hidden',!canPick||!showStage);
 if(canPick){
   const picker=el('barikade-color-select');picker.value=player.colorPref||'';picker.disabled=operation;
   [...picker.options].forEach(opt=>opt.disabled=!!opt.value&&room.players.some(p=>!p.me&&p.participating&&p.colorPref===opt.value));
 }
 el('players').replaceChildren(...room.players.map(p=>{
  const div=document.createElement('div');div.className='player';
  const avatar=document.createElement('span');avatar.className='avatar';avatar.textContent='🙂';
  const name=document.createElement('span');name.className='name';name.textContent=p.name;
  const tag=document.createElement('span');tag.className='tag';tag.textContent=(p.host?'👑 Host ':'')+(p.me?'(Du)':'');name.append(tag);
  const ready=document.createElement('span');ready.className='ready'+(!p.participating?' spectator':p.ready?' yes':'');ready.textContent=!p.participating?'Zuschauer':p.ready?'✓ Bereit':'Wartet';
  div.append(avatar,name,ready);
  if(room.host&&room.game&&room.phase==='preparing'){
    const btn=document.createElement('button');btn.className='seat-button';btn.type='button';
    btn.textContent=p.participating?'Zuschauen':'Mitspielen';
    btn.disabled=operation;btn.setAttribute('aria-label',`${p.name}: ${btn.textContent}`);
    btn.addEventListener('click',()=>command(async()=>{
      const {room:r}=await request('/rooms/'+code+'/seats','POST',{seat:p.seat,participating:!p.participating});activateRoom(r);
    }));
    div.append(btn);
  }
  return div;
 }));
 document.querySelectorAll('[data-game]').forEach(btn=>{
  btn.classList.toggle('active',btn.dataset.game===room.game);
  btn.disabled=!room.host||operation||room.phase==='playing';
  btn.setAttribute('aria-pressed',String(btn.dataset.game===room.game));
 });
 el('ready-help').textContent=room.game?`${GAME[room.game]||room.game} ist ausgewählt. Nur die ausgewählten Mitspieler melden sich bereit; Zuschauer bleiben im Raum.`:'Der Host wählt zuerst ein Spiel.';
 el('ready-btn').textContent=room.phase==='playing'?'Zur laufenden Partie':player?.ready?'Bereitmeldung zurücknehmen':'Ich bin bereit';
 el('ready-btn').disabled=!room.game||!player?.participating||operation;
 el('ready-btn').classList.toggle('is-ready',!!player?.ready);
 const playing=room.players.filter(p=>p.participating);
 const readyCount=playing.filter(p=>p.ready).length;
 const percent=playing.length?Math.round(readyCount/playing.length*100):0;
 el('ready-counter').textContent=room.phase==='playing'?'Partie läuft':playing.length<2?'Mindestens 2 Spieler benötigt':room.allReady?'Alle bereit!':'Warten auf Bereitmeldungen';
 el('ready-fraction').textContent=readyCount+' / '+playing.length;
 el('ready-progress-fill').style.width=percent+'%';
 el('ready-progressbar').setAttribute('aria-valuenow',String(percent));
 el('ready-title').textContent=room.phase==='playing'?'🎮 Eure Partie läuft':'Bereit für '+(GAME[room.game]||'die Partie')+'?';
 el('ready-status').textContent=`${readyCount} von ${playing.length} Mitspielern bereit · ${room.players.length-playing.length} Zuschauer${room.allReady?' · Alle bereit!':''}`;
 el('start-btn').classList.toggle('hidden',!room.host||(room.phase!=='playing'&&!(room.game==='partychallenge'&&room.phase==='preparing'))||(room.game==='partychallenge'&&room.phase==='playing'));
 el('cancel-match-btn').classList.toggle('hidden',!room.host||room.phase!=='playing');
 el('cancel-match-btn').disabled=operation||!room.host||room.phase!=='playing';
 el('start-btn').disabled=operation||!room.host||(room.phase==='preparing'&&!room.allReady);
 el('start-btn').textContent=room.game==='partychallenge'&&room.phase==='preparing'?'🏆 Challenge starten (3–2–1–0)':room.phase==='playing'?'Beendete Partie abschließen':room.canLaunch?'Startet automatisch bei allen Bereitmeldungen':'Spielanbindung folgt';
 el('start-btn').title=room.game==='partychallenge'?'Der Host startet ausdrücklich. Der Server bestimmt die Startzeit.':room.phase==='playing'?'Nur nach beendetem Spiel möglich; der Server prüft den Sieger.':room.canLaunch?'Alle gewählten Mitspieler melden sich bereit.':'Dieses Spiel wird später angeschlossen.';
 el('leave-btn').disabled=room.phase==='playing'||operation;
 el('integration-note').textContent=room.phase==='playing'
  ?'Die Partie läuft. Nach dem bestätigten Spielende kehren alle automatisch in diesen Raum zurück.'
  :room.phase==='lobby'&&room.lastCompleted?.id
   ?(room.lastCompleted.status==='aborted'?'⏹ Partie ohne Wertung beendet: ':'🎉 Letzte Partie abgeschlossen: ')+(GAME[room.lastCompleted.game]||room.lastCompleted.game)+'. Ihr seid weiterhin im selben Raum – der Host kann das nächste Spiel auswählen.'
   :room.canLaunch
    ?'Alle ausgewählten Mitspieler melden sich bereit. Das Spiel startet automatisch.'
    :'Alle vier Spiele sind mit dem gemeinsamen Raum verbunden – Beta.';
}
async function command(run){if(operation)return;operation=true;render();notice('');
 try{await run();pollErrors=0;}catch(e){showError(e);}finally{operation=false;render();}
}
el('login-btn').addEventListener('click',()=>{if(activeProfile())location.assign('profile.html');else window.SpielOnline?.openLogin?.();});
el('mode-local').addEventListener('click',()=>location.assign('spielauswahl-lokal.html'));
el('mode-online').addEventListener('click',()=>setPlayMode('online'));
el('change-game-btn').addEventListener('click',()=>{if(room?.host&&room.phase==='preparing')location.assign('spielauswahl-online.html?room='+encodeURIComponent(room.code)+'&choose=1');});

el('create-btn').addEventListener('click',()=>command(async()=>{
 const {room:r}=await request('/rooms','POST');location.assign('spielauswahl-online.html?room='+encodeURIComponent(r.code));
}));
el('join-code').addEventListener('input',event=>{event.target.value=event.target.value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g,'').slice(0,6);notice('');});
el('join-code').addEventListener('keydown',e=>{if(e.key==='Enter')el('join-btn').click();});
el('join-btn').addEventListener('click',()=>command(async()=>{
 const c=el('join-code').value.trim().toUpperCase();if(!/^[A-HJ-NP-Z2-9]{6}$/.test(c))throw Error('Bitte einen gültigen Raumcode mit 6 Zeichen eingeben.');
 const {room:r}=await request('/rooms/'+c+'/join','POST');location.assign('spielauswahl-online.html?room='+encodeURIComponent(r.code));
}));
document.querySelectorAll('[data-game]').forEach(btn=>btn.addEventListener('click',()=>command(async()=>{
 if(!room?.host)return;const {room:r}=await request('/rooms/'+code+'/select','POST',{game:btn.dataset.game});choosingGame=false;activateRoom(r);
}))); 
document.querySelectorAll('[data-barikade-setting]').forEach(field=>field.addEventListener('change',()=>command(async()=>{
 if(!room?.host||room.phase!=='preparing'||room.game!=='barikade')return;
 const key=field.dataset.barikadeSetting;
 const value=field.value;
 const settings={...room.settings,[key]:key==='bossMode'?value==='true':['jokerStartCount','eventFieldCount','bossEventTrigger'].includes(key)?Number(value):value};
 const {room:r}=await request('/rooms/'+code+'/settings','POST',{settings});activateRoom(r);
})));
document.querySelectorAll('[data-skyjo-setting]').forEach(field=>field.addEventListener('change',()=>command(async()=>{
 if(!room?.host||room.phase!=='preparing'||room.game!=='skyjo')return;
 const key=field.dataset.skyjoSetting;
 const raw=field.value;
 const next={...room.settings,[key]:['beginner','jokerEnabled','streetModeEnabled'].includes(key)?raw==='true':Number(raw)};
 const {room:r}=await request('/rooms/'+code+'/skyjo-settings','POST',{settings:next});activateRoom(r);
})));
el('business-rounds').addEventListener('change',event=>command(async()=>{
 if(!room?.host||room.phase!=='preparing'||room.game!=='business')return;
 const {room:r}=await request('/rooms/'+code+'/business-settings','POST',{settings:{rounds:Number(event.target.value)}});activateRoom(r);
}));
el('barikade-color-select').addEventListener('change',event=>command(async()=>{
 const {room:r}=await request('/rooms/'+code+'/color','POST',{color:event.target.value||null});activateRoom(r);
}));
el('ready-btn').addEventListener('click',()=>command(async()=>{
 if(room?.phase==='playing'){enterCurrentMatch();return;}
 const me=room?.players.find(p=>p.me);if(!me)return;
 const {room:r}=await request('/rooms/'+code+'/ready','POST',{ready:!me.ready});activateRoom(r);
}));
el('start-btn').addEventListener('click',()=>command(async()=>{
 if(!room?.host)return;
 if(room.game==='partychallenge'&&room.phase==='preparing'){
  if(!room.allReady)throw Error('PLAYERS_NOT_READY');
  const {room:r}=await request('/rooms/'+code+'/start','POST');activateRoom(r);notice('Challenge gestartet: gemeinsamer Countdown läuft.');return;
 }
 if(room?.phase!=='playing'||room.game==='partychallenge')return;
 const {room:r}=await request('/rooms/'+code+'/finish','POST');
 activateRoom(r);notice('Partie abgeschlossen. Ihr könnt das nächste Spiel auswählen.');
}));
el('cancel-match-btn').addEventListener('click',()=>{
 if(!room?.host||room.phase!=='playing'||operation)return;
 if(!window.confirm('Die laufende Partie für alle beenden? Es wird kein Sieger und keine Statistik gespeichert.'))return;
 void command(async()=>{
  const {room:r}=await request('/rooms/'+code+'/cancel','POST');
  launchedMatchId=null;
  activateRoom(r);
  location.assign('spielauswahl-online.html?room='+encodeURIComponent(r.code));
 });
});
el('refresh-btn').addEventListener('click',()=>command(async()=>{const {room:r}=await request('/rooms/'+code);activateRoom(r);notice('Raum aktualisiert.');}));
el('copy-btn').addEventListener('click',async()=>{
 try{await navigator.clipboard.writeText(room?.code||'');notice('Raumcode kopiert.');}catch{notice('Raumcode: '+room?.code);}
});
el('leave-btn').addEventListener('click',()=>command(async()=>{await request('/rooms/'+code+'/leave','POST');leaveView();notice('Du hast den Raum verlassen.');}));
window.addEventListener('spielonline-change',()=>{
 const uid=activeProfile()?.user?.uid||null;
 if(uid!==accountUid){accountUid=uid;if(room){leaveView();notice('Das Spielerprofil hat gewechselt. Bitte dem Raum erneut beitreten.');}}
 render();
});
async function boot(){
 render();
 const params=new URL(location.href).searchParams;
 const invite=params.get('invite');
 if(invite&&/^[A-HJ-NP-Z2-9]{6}$/i.test(invite)){
  el('join-code').value=invite.toUpperCase();
  notice('Einladung erhalten: Bitte dem Raum '+invite.toUpperCase()+' beitreten.');
 }
 const fromUrl=params.get('room');
 if(!fromUrl||!/^[A-HJ-NP-Z2-9]{6}$/i.test(fromUrl))return;
 if(new URL(location.href).searchParams.get('stage')!=='1'&&!stayInMatchId){
   location.replace('spielauswahl-online.html?room='+encodeURIComponent(fromUrl.toUpperCase()));
   return;
 }
 let elapsed=0;const timer=setInterval(async()=>{
  elapsed+=250;
  if(!activeProfile()&&elapsed<12000)return;
  clearInterval(timer);
  if(!activeProfile())return;
  code=fromUrl.toUpperCase();
  try{const {room:r}=await request('/rooms/'+code);activateRoom(r);pollStart();}
  catch(e){setRoomCode(null);el('join-code').value=fromUrl.toUpperCase();notice('Gib den Raumcode ein und klicke auf „Beitreten“.');}
 },250);
}
setPlayMode(playMode);
boot();
})();
