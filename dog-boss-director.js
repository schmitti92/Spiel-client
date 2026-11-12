/* 100 Tore — cinematic camera and real HP focus, client-only UX.
 * No invented attacks or health: every number comes from the authoritative view.
 */
(()=>{'use strict';
 const create=root=>{
  const scene=root?.querySelector?.('#combat-scene');
  if(!scene)return {update:()=>{}};
  const camera=root.querySelector('#combat-camera');
  const fx=root.querySelector('#combat-fx');
  const note=root.querySelector('#combat-focus-label');
  const modes=['auto','normal','boss','team'];
  const format=n=>Math.max(0,Math.round(Number(n)||0)).toLocaleString('de-DE');
  let mode='auto',enabled=true,view=null,vitals=null,focusUid=null,session=null;
  function activate(next){
   mode=modes.includes(next)?next:'normal';
   scene.dataset.camera=mode==='auto'?'normal':mode;
   if(camera){
    camera.textContent=mode==='auto'?'🎬':mode==='boss'?'🐉':mode==='team'?'🛡️':'🎥';
    camera.setAttribute('aria-label','Kamera: '+(mode==='auto'?'automatischer Fokus':mode==='boss'?'Boss':mode==='team'?'Helden':'Übersicht')+'. Zum Wechseln antippen');
   }
   showFocus();
  }
  function showFocus(){
   if(!note)return;
   const heroes=vitals?.heroes||view?.teamHealth?.heroes||[];
   if(focusUid){
    const hero=heroes.find(h=>h.uid===focusUid);
    if(hero){
     const name=view?.members?.find(m=>m.uid===focusUid)?.name||'Held';
     note.textContent='❤️ '+name+' · '+format(hero.hp)+' / '+format(hero.maxHp)+' LP';
     note.hidden=false;
     return;
    }
    focusUid=null;
   }
   if(scene.dataset.camera==='boss'&&view?.bossHp){
    note.textContent='🐉 '+format(vitals?.bossHp??view?.bossLiveHp??view.bossHp)+
     ' / '+format(vitals?.bossMaxHp??view.bossHp)+' LP';
    note.hidden=false;
   }else if(scene.dataset.camera==='team'&&(vitals?.teamMaxHp||view?.teamHealth?.maxHp)){
    note.textContent='❤️ '+format(vitals?.teamHp??view.teamHealth.hp)+
     ' / '+format(vitals?.teamMaxHp??view.teamHealth.maxHp)+' LP';
    note.hidden=false;
   }else {note.textContent='';note.hidden=true;}
  }
  camera?.addEventListener('click',event=>{
   event.stopPropagation();focusUid=null;
   activate(modes[(modes.indexOf(mode)+1)%modes.length]);
  });
  fx?.addEventListener('click',event=>{
   event.stopPropagation();enabled=!enabled;
   scene.dataset.effects=enabled?'on':'off';
   fx.setAttribute('aria-pressed',String(enabled));
   fx.textContent=enabled?'✨':'◌';
   fx.setAttribute('aria-label',enabled?'Effekte ausschalten':'Effekte einschalten');
  });
  scene.addEventListener('click',event=>{
   const target=event.target;
   const hero=target?.closest?.('.combat-hero');
   if(hero){
    const uid=hero.getAttribute?.('data-hero-uid');
    if(uid&&(vitals?.heroes||view?.teamHealth?.heroes)?.some(h=>h.uid===uid)){
     focusUid=uid;activate('team');
    }
   }else if(target?.closest?.('#combat-boss')){
    focusUid=null;activate('boss');
   }
  });
  activate('auto');
  scene.dataset.effects='on';
  return {update(next,now){
   view=next;
   vitals=window.DogBossLiveUI?.combatVitals?.(next,now)||null;
   const stamp=String(next?.startedAt||'')+':'+String(next?.attempt||'');
   if(session!==stamp){
    session=stamp;focusUid=null;
    activate('auto');
   }
   if(!['fighting','victory','cooldown'].includes(next?.phase)){
    focusUid=null;activate('auto');
   }else {
    if(mode==='auto'){
     const event=window.DogBossArenaV3?.derive?.(next,now);
     scene.dataset.camera=event?.kind==='boss-strike'?'team':
      event?.kind==='hero-strike'?'boss':'normal';
    }
    showFocus();
   }
  }};
 };
 window.DogBossDirector={create};
})();