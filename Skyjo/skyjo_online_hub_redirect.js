/* Online SKYJO has one lobby: the central game-selection hub.
   Preserve explicit local sessions and valid hub match URLs unchanged.
   Old standalone online lobby URLs are forwarded to the shared lobby. */
(()=>{'use strict';
 const here=new URL(location.href),q=here.searchParams;
 if(q.get('mode')!=='online')return;
 const hub=String(q.get('hub')||'').toUpperCase();
 const match=String(q.get('match')||'');
 const gameRoom=String(q.get('room')||'').toUpperCase();
 const isHub=/^(?:[0-9]{3}|[A-HJ-NP-Z2-9]{6})$/.test(hub)&&
  /^[0-9a-f-]{36}$/i.test(match)&&/^S[A-HJ-NP-Z2-9]{9}$/.test(gameRoom);
 if(isHub)return;
 // Obsolete links must not produce a second in-game lobby.
 // Only keep a canonical hub code, never confuse a SKYJO game code with one.
 const valid=/^(?:[0-9]{3}|[A-HJ-NP-Z2-9]{6})$/;
 const code=valid.test(hub)?hub:valid.test(gameRoom)?gameRoom:'';
 const target=new URL('../spielauswahl-online.html',here);
 if(code)target.searchParams.set('room',code);
 target.searchParams.set('stay','1');
 location.replace(target.href);
})();
