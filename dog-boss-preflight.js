/* Independent cinematic pre-battle layer for 100-Tore group bosses.
 * This is presentation-only: no network requests, fabricated statistics,
 * damage rolls, local rewards, or shortcuts around server validation.
 * Its buttons delegate exclusively to the existing authenticated controls.
 */
(()=>{
 'use strict';
 const icons={10:'aschewaechter-cinematic.svg',20:'schattenfuerst.svg',
  30:'kristallwurm.svg',40:'dornenkoenig.svg',50:'hueter-der-tiefe.svg',
  60:'flammendrache.svg',70:'seelenrichter.svg',80:'eisenkoloss.svg',
  90:'festungswaechter.svg',100:'letzter-waechter.svg'};
 const names={10:'Der Aschewächter',20:'Schattenfürst',30:'Kristallwurm',
  40:'Dornenkönig',50:'Hüter der Tiefe',60:'Flammendrache',
  70:'Seelenrichter',80:'Eisenkoloss',90:'Festungswächter',
  100:'Der letzte Wächter'};
 const elements={10:'🔥 Feuer und Asche',20:'🌑 Schatten',30:'💎 Kristall',
  40:'🌿 Dornen',50:'🌊 Tiefe',60:'🔥 Flammen',70:'✨ Seelenmagie',
  80:'⚙️ Eisen',90:'🛡️ Festung',100:'👑 Finale Prüfung'};
 const stories={
  10:'Aus geschmolzenem Fels erhebt sich der Aschewächter. Seine glühenden Rüstungsplatten bewachen den Weg durch das zehnte Tor. Nur eine gut vorbereitete Heldengruppe kann seinen Ansturm überstehen.',
  20:'Dichte Schatten verschlingen den Pfad. Der Schattenfürst prüft euren Mut und verlangt Zusammenarbeit, bevor sich das nächste Tor öffnet.',
  30:'Unter einer Decke aus schimmernden Kristallen erwacht ein uralter Wurm. Er verteidigt das dritte große Siegel der Expedition.',
  40:'Der Dornenkönig regiert über eine verwachsene Festung. Seine Wurzeln versperren jedem unvorbereiteten Helden den Weg.',
  50:'In den Ruinen unter der Erde wartet der Hüter der Tiefe. Seine Prüfung fordert jeden Funken eurer Kraft.',
  60:'Flammen brechen aus dem Boden, als der Drache sein Revier verteidigt. Nur koordinierte Angriffe bringen euch weiter.',
  70:'Der Seelenrichter misst den Mut der Helden. Beweist ihm eure Stärke im gemeinsamen Kampf.',
  80:'Der Eisenkoloss erhebt sich aus einer vergessenen Schmiede. Seine gewaltige Rüstung verlangt nach stärkeren Waffen.',
  90:'Die letzte Festung vor dem Ziel wird von einem unnachgiebigen Wächter verteidigt. Hier zählt jeder Verbündete.',
  100:'Hinter diesem letzten Wächter wartet das Ziel eurer hundert Tore. Jetzt muss eure gesamte Expedition zusammenhalten.'
 };
 const rolePortraits=['held-krieger.svg','held-magier.svg','held-schildtraeger.svg'];
 const cinematicRolePortraits=['held-krieger-cinematic.svg','held-magier-cinematic.svg','held-schildtraeger-cinematic.svg'];
 const $=id=>document.getElementById(id);
 function create(gate){
  const root=$('boss-preflight'),stage=document.querySelector('main.stage');
  if(!root||!stage||!Object.hasOwn(icons,gate))return {update:()=>{}};
  const battleReady=$('ready-button'),battleStart=$('start-button'),battleRetry=$('retry-button');
  const ready=$('preflight-ready'),start=$('preflight-start'),retry=$('preflight-retry');
  if(!battleReady||!battleStart||!battleRetry)return {update:()=>{}};
  const name=names[gate];
  $('preflight-title').textContent='TOR '+gate+' · '+name.toLocaleUpperCase('de-DE');
  $('preflight-boss-name').textContent=name;
  $('preflight-boss-type').textContent=elements[gate];
  $('preflight-boss-image').src='./dog-boss-art/'+icons[gate];
  $('preflight-boss-image').alt='Illustration: '+name;
  $('preflight-story').textContent=stories[gate];
  $('preflight-gate').textContent=gate+' / 100';
  $('preflight-reward').textContent=gate===100?
   'Finalen Boss-Sieg sichern':'Schmiede-Level '+(gate/10+1)+' freischalten';
  $('preflight-forge-link').href=$('to-forge')?.href||'./dog-ascension.html';
  for(const [proxy,real] of [[ready,battleReady],[start,battleStart],[retry,battleRetry]]){
   proxy.addEventListener('click',()=>{
    if(proxy.disabled||real.disabled||real.hidden)return;
    // All of the original receipt-safe, authentication-checked logic remains
    // exactly in the real button listeners in dog-boss10/group-boss.js.
    real.click();
   });
  }
  let lastRoster='',lastScreen='';
  function teamCards(members){
   const signature=JSON.stringify(members.map(m=>m?
    [m.uid,m.name,m.isMe,m.ready,m.eligible]:null));
   if(lastRoster===signature)return;
   lastRoster=signature;
   const parent=$('preflight-team-members');
   const fragment=document.createDocumentFragment();
   for(let i=0;i<3;i++){
    const member=members[i],card=document.createElement('article');
    card.className='preflight-member'+(member?.ready?' is-ready':'')+
     (!member?.eligible?' is-unready':'');
    const image=document.createElement('img');
    image.className='preflight-member-portrait';
    image.src='./dog-boss-art/'+(gate===10?cinematicRolePortraits:rolePortraits)[i];
    image.alt='';image.width=70;image.height=70;
    const info=document.createElement('div');info.className='preflight-member-info';
    const title=document.createElement('strong');
    title.textContent=member?.name||'Freier Heldenplatz';
    const subtitle=document.createElement('span');
    subtitle.textContent=member?.isMe?'DEIN HELD':member?'TEAMMITGLIED':'WARTET AUF SPIELER';
    info.append(title,subtitle);
    const marker=document.createElement('span');marker.className='preflight-member-state';
    marker.textContent=!member?'Frei':!member.eligible?'Gesperrt':member.ready?'✓ Bereit':'Wartet';
    card.append(image,info,marker);
    fragment.append(card);
   }
   parent.replaceChildren(fragment);
  }
  function update(view,serverNow=Date.now()){
   const phase=view?.phase||'unavailable';
   const cooldown=Math.max(0,(Number(view?.cooldownUntil)||0)-serverNow);
   // Keep the existing battle/minigame and victory/defeat layouts intact.
   // Only the pre-fight waiting phase (and a fully expired cooldown) uses
   // the new page. Never conceal the current combat or its final result.
   const show=phase==='unavailable'||phase==='waiting'||
    (phase==='cooldown'&&cooldown===0);
   const screen=show?'preflight':'battle';
   if(lastScreen!==screen){stage.dataset.screen=screen;lastScreen=screen;}
   const members=Array.isArray(view?.members)?view.members:[];
   teamCards(members);
   const number=Number(view?.bossHp);
   const hp=Number.isFinite(number)&&number>0?number:0;
   $('preflight-hp').textContent=hp?
    'BOSS-LP  '+hp.toLocaleString('de-DE')+' / '+hp.toLocaleString('de-DE'):
    'BOSS-LP · WIRD GELADEN';
   $('preflight-hp-fill').style.width=hp?'100%':'0%';
   $('preflight-ready-counter').textContent=members.filter(m=>m.ready).length+
    ' / 3 bereit';
   for(const [proxy,real] of [[ready,battleReady],[start,battleStart],[retry,battleRetry]]){
    proxy.hidden=real.hidden;
    proxy.disabled=real.disabled||!show;
    proxy.textContent=real.textContent;
   }
   const mine=members.find(m=>m.isMe);
   $('preflight-launch-flag').textContent=!view?'⏳ SERVERVERBINDUNG WIRD GEPRÜFT':
    phase==='cooldown'?'⚔️ NEUER VERSUCH MÖGLICH':
    mine?.ready?'✅ BEREIT · AUF START WARTEN':
    !view.eligible?'🔒 VORHERIGE TORE ABSCHLIESSEN':'⚔️ BEREIT ZUM KAMPF';
   const source=$('status')?.textContent||'Bereite deinen Helden auf den Kampf vor.';
   const message=$('preflight-message');
   if(message.textContent!==source)message.textContent=source;
  }
  return {update};
 }
 window.DogBossPreflight=Object.freeze({create});
})();
