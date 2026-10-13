/* Spielesammlung: safe, server-authorized return from finished hub matches.
 * Used only when a page has ?hub=...&match=...; legacy/local sessions stay unchanged.
 */
(()=>{
  'use strict';
  const params=new URL(location.href).searchParams;
  const hub=String(params.get('hub')||'').toUpperCase();
  const matchId=String(params.get('match')||'');
  if(!/^[A-HJ-NP-Z2-9]{6}$/.test(hub)||!/^[0-9a-f-]{36}$/i.test(matchId))return;
  const config=window.SPIELPORTAL_CONFIG||{};
  const api=String(config.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
  const hubUrl='../spielauswahl-online.html?room='+encodeURIComponent(hub);
  let busy=false,finished=false,pollTimer=null,autoTimer=null;
  let completionStatus='finished',aborting=false;
  const gotoHub=()=>location.assign(hubUrl);
  const readyProfile=()=>{
    const p=window.SpielOnline?.state?.();
    return p?.status==='online'&&p.user?.getIdToken&&p.user;
  };
  function showReturn(){
    if(finished)return;
    finished=true;
    if(pollTimer){clearInterval(pollTimer);pollTimer=null;}
    const panel=document.createElement('aside');
    panel.setAttribute('role','status');
    panel.style.cssText='position:fixed;z-index:2147483600;bottom:16px;left:50%;transform:translateX(-50%);width:min(440px,calc(100% - 24px));padding:16px 18px;border-radius:18px;background:#f5faff;color:#18355c;border:1px solid #bad6f2;box-shadow:0 10px 38px #10294444;font:600 14px/1.45 system-ui,sans-serif;text-align:center;';
    const message=document.createElement('div');
    message.style.cssText='margin-bottom:10px;font-weight:800';
    message.textContent=completionStatus==='aborted'?'⏹ Partie ohne Wertung beendet. Keine Statistik verändert.':'🎉 Partie beendet! Ihr bleibt im gemeinsamen Spielraum.';
    const btn=document.createElement('button');
    btn.type='button';
    btn.style.cssText='border:0;background:#2878e1;color:white;font:800 14px system-ui,sans-serif;padding:11px 18px;border-radius:11px;cursor:pointer;width:100%';
    btn.addEventListener('click',gotoHub);
    const started=Date.now(),duration=30000;
    function refresh(){
      const remaining=Math.max(0,Math.ceil((duration-(Date.now()-started))/1000));
      btn.textContent='Zur Spiele-Lobby ('+remaining+' s)';
      if(remaining===0)gotoHub();
    }
    panel.append(message,btn);
    (document.body||document.documentElement).append(panel);
    refresh();
    autoTimer=setInterval(refresh,1000);
  }
  async function check(){
    if(busy||finished||document.hidden)return;
    const user=readyProfile();
    if(!user)return;
    busy=true;
    const ctrl=new AbortController();
    const timeout=setTimeout(()=>ctrl.abort(),12000);
    try{
      const token=await user.getIdToken();
      const response=await fetch(api+'/api/hub/rooms/'+hub+'/sync',{
        method:'POST',mode:'cors',cache:'no-store',signal:ctrl.signal,
        headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
        body:JSON.stringify({matchId})
      });
      if(!response.ok)return;
      const result=await response.json(),room=result?.room;
      if(!result?.ok||!room||room.code!==hub)return;
      if(room.lastCompleted?.id===matchId || (room.phase!=='playing'||room.match?.id!==matchId)){
        completionStatus=room.lastCompleted?.id===matchId&&room.lastCompleted?.status==='aborted'?'aborted':'finished';
        showReturn();
      }
    }catch(_e){/* Temporary network issues cannot terminate a game. */}
    finally{clearTimeout(timeout);busy=false;}
  }
  function installAbortButton(){
    if(document.getElementById('spiel-hub-abort'))return;
    const btn=document.createElement('button');
    btn.id='spiel-hub-abort';btn.type='button';btn.textContent='⏹ Partie abbrechen';
    btn.style.cssText='position:fixed;bottom:14px;right:14px;z-index:2147483500;border:1px solid #d6a6aa;border-radius:12px;background:#fff8f8;color:#9a2937;padding:11px 14px;font:700 13px system-ui,sans-serif;box-shadow:0 6px 22px #0003;cursor:pointer';
    btn.hidden=true;
    btn.addEventListener('click',async()=>{
      if(aborting||finished)return;
      if(!confirm('Partie für alle abbrechen? Es wird kein Sieger und keine Statistik gespeichert.'))return;
      const user=readyProfile();if(!user)return;
      aborting=true;btn.disabled=true;
      try{
        const token=await user.getIdToken();
        const response=await fetch(api+'/api/hub/rooms/'+hub+'/cancel',{
          method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},cache:'no-store'
        });
        const result=await response.json();
        if(!response.ok||!result.ok)throw Error(result.error||'Abbruch fehlgeschlagen');
        completionStatus='aborted';showReturn();
      }catch(e){alert('Partie konnte nicht beendet werden: '+(e.message||e));}
      finally{aborting=false;btn.disabled=false;}
    });
    (document.body||document.documentElement).append(btn);
    async function updateHost(){
      if(finished||document.hidden)return;
      const user=readyProfile();if(!user)return;
      try{
        const token=await user.getIdToken();
        const res=await fetch(api+'/api/hub/rooms/'+hub,{headers:{Authorization:'Bearer '+token},cache:'no-store'});
        if(!res.ok)return;
        const data=await res.json(),room=data.room;
        btn.hidden=!(room?.host&&room.phase==='playing'&&room.match?.id===matchId);
      }catch(_e){}
    }
    const hostTimer=setInterval(updateHost,6000);setTimeout(updateHost,1000);
    window.addEventListener('pagehide',()=>clearInterval(hostTimer),{once:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installAbortButton,{once:true});
  else installAbortButton();
  window.addEventListener('spielonline-change',()=>{if(!finished)void check();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!finished)void check();});
  window.addEventListener('pagehide',()=>{
    if(pollTimer)clearInterval(pollTimer);
    if(autoTimer)clearInterval(autoTimer);
  });
  pollTimer=setInterval(check,7000);
  setTimeout(check,1800);
})();