/**
 * DOG Grinch-Event Part 2: five-mission overview only.
 * No fake mission completions, virtual earnings or local unlock flags.
 * The prerequisite shown here is based solely on the real shared village.
 */
const MISSIONS=Object.freeze([
 {name:'Pfadfinder – Der Weg zum Berg',icon:'🧭',
  description:'Die drei Freunde folgen dem grünen Leuchten. Jeder beginnt mit fünf Figuren, doch auf dem Bergpfad verschwindet von jedem eine.',
  objective:'Online: Drei angemeldete Spieler im selben Raum; die regulären DOG-Karten, drei verdeckte Fallen und je vier Figuren durch das eigene Portal. Nur verifizierte gemeinsame Siege schalten Mission 2 frei. Lokaler Testmodus bleibt verfügbar.'},
 {name:'Der verfluchte Aufstieg',icon:'🌫️',
  description:'Mit vier Figuren je Spieler geht der Aufstieg weiter. Die Dunkelheit wird gefährlicher.',
  objective:'Geplant: Ein weiterer unvermeidbarer Figurenverlust je Spieler.'},
 {name:'Die erste Begegnung',icon:'👹',
  description:'Die Freunde treffen den Grinch zum ersten Mal direkt auf dem Spielfeld. Er verhöhnt sie und gesteht, die Gefangenen zu haben.',
  objective:'Geplant: Erster Grinch-Bot als vierter Spieler, Start mit drei Figuren, jeweils eine weitere Figur verschwindet.'},
 {name:'Befreiung in der Höhle',icon:'🔓',
  description:'Nur noch zwei Figuren je Spieler sind frei. Sie dringen in die Höhle ein und befreien alle neun Gefangenen.',
  objective:'Geplant: Alle vermissten Figuren befreien. Mission 5 startet wieder mit fünf Figuren pro Spieler.'},
 {name:'Die letzte Schlacht',icon:'⚔️',
  description:'Mit allen fünfzehn eigenen Figuren treten die Freunde gegen die Grinch-Armee und ihren Anführer an.',
  objective:'Geplant: Sämtliche Soldaten und den Grinch schlagen, um den Weihnachtsvernichter zu zerstören.'}
]);
export function initGrinchEvent({openTab,openCave,verifiedTreeLevel}){
 const root=document.getElementById('panel-grinch');
 if(!root)return {render(){}};
 const $=id=>document.getElementById(id);
 const dialog=$('grinch-mission-dialog');
 let verifiedProgress=null,progressForUid=null,progressLoading=false,progressLastAt=0;
 const roomCode=(new URLSearchParams(location.search).get('room')||'').toUpperCase();
 const hasRoom=/^(?:[0-9]{3}|[A-HJ-NP-Z2-9]{6})$/.test(roomCode);
 const user=()=>{const s=window.SpielOnline?.state?.();return s?.status==='online'&&s.user?.getIdToken?s.user:null;};
 async function loadProgress(force=false){
  const person=user();
  if(!person){verifiedProgress=null;progressForUid=null;render();return;}
  if(progressLoading||(!force&&progressForUid===person.uid&&Date.now()-progressLastAt<30000))return;
  progressLoading=true;
  try{
   const api=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/[/]+$/,'');
   const token=await person.getIdToken();
   const response=await fetch(api+'/api/hub/grinch/progress',{headers:{Authorization:'Bearer '+token},cache:'no-store'});
   if(!response.ok)throw Error('Progress read failed');
   const payload=await response.json();
   if(payload.ok===true){
    verifiedProgress=payload.progress;progressForUid=person.uid;progressLastAt=Date.now();
   }
  }catch(_e){/* Never fabricate progress or unlocks while offline. */}
  finally{progressLoading=false;render();}
 }
 window.addEventListener('spielonline-change',()=>void loadProgress());
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void loadProgress(true);});
 void loadProgress();
 // A dialog must remain visible if its parent event panel changes tabs.
 if(dialog&&dialog.parentElement!==document.body)document.body.append(dialog);

 const close=()=>{if(dialog?.open)dialog.close();};
 // Isolated local trial only. No server rewards, level gates or online room are bypassed.
 const testLink=document.createElement('a');
 testLink.href='./grinch-campaign/mission-1.html';
 testLink.textContent='🏔️ Mission 1 im Testmodus spielen';
 testLink.className='grinch-event-small-button';
 testLink.style.cssText='display:none;align-items:center;justify-content:center;gap:8px;text-decoration:none;margin:9px 8px 9px 0;';
 testLink.hidden=true;
 $('grinch-mission-return')?.before(testLink);
 const onlineLink=document.createElement('a');
 onlineLink.href=hasRoom?'./grinch-campaign/mission-1.html?'+new URLSearchParams({room:roomCode}).toString():'../hub-lobby.html?view=online';
 onlineLink.textContent=hasRoom?'🌐 Mission 1 gemeinsam im Raum '+roomCode:'🌐 Gemeinsamen Spielraum öffnen';
 onlineLink.className='grinch-event-small-button';
 onlineLink.style.cssText='display:none;align-items:center;justify-content:center;gap:8px;text-decoration:none;margin:9px 8px 9px 0;border-color:#8fe9c1;';
 onlineLink.hidden=true;
 $('grinch-mission-return')?.before(onlineLink);
 // Mission 2 design-only preview: never grants campaign progress or rewards.
 const slotPreviewLink=document.createElement('a');
 slotPreviewLink.href='./grinch-campaign/mission-2-slot-preview.html';
 slotPreviewLink.textContent='🎰 Mission 2: Grinch-Slots ansehen (Vorschau)';
 slotPreviewLink.className='grinch-event-small-button';
 slotPreviewLink.style.cssText='display:none;align-items:center;justify-content:center;gap:8px;text-decoration:none;margin:9px 8px 9px 0;border-color:#d7b46c;';
 slotPreviewLink.hidden=true;
 $('grinch-mission-return')?.before(slotPreviewLink);

 $('grinch-visit-cave')?.addEventListener('click',()=>openCave());
 $('grinch-back-village')?.addEventListener('click',()=>openTab('village'));
 root.querySelectorAll('[data-grinch-details]').forEach(button=>{
  button.addEventListener('click',()=>{
   const number=Number(button.dataset.grinchDetails);
   const item=MISSIONS[number-1];
   if(!item)return;
   $('grinch-mission-title').textContent=number+' · '+item.name;
   $('grinch-mission-description').textContent=item.description;
   $('grinch-mission-objective').textContent=item.objective;
   $('grinch-mission-detail-icon').textContent=item.icon;
   testLink.hidden=number!==1;
   testLink.style.display=number===1?'inline-flex':'none';
   onlineLink.hidden=number!==1;
   onlineLink.style.display=number===1?'inline-flex':'none';
   slotPreviewLink.hidden=number!==2;
   slotPreviewLink.style.display=number===2?'inline-flex':'none';
   const cleared=verifiedProgress?.completedMissions?.includes(1)===true;
   $('grinch-mission-lock').textContent=number===1?
    '🎮 Online spielt ihr zu dritt in eurem vorhandenen Raum. Ein offizieller Start benötigt Baumstufe 10; nur ein vom Server bestätigter Sieg zählt. Der lokale Test vergibt keine Freischaltungen.':
    number===2&&cleared?
    '🔓 Dein Konto hat Mission 2 durch einen echten Sieg freigeschaltet. Diese Folgemission ist noch in Entwicklung und derzeit nicht spielbar.':
    '🔒 Missionsvorschau. Diese Mission ist noch nicht spielbar und vergibt keine Belohnungen.';
   if(dialog&&!dialog.open)dialog.showModal();
  });
 });
 $('grinch-mission-close')?.addEventListener('click',close);
 $('grinch-mission-return')?.addEventListener('click',close);
 dialog?.addEventListener('click',event=>{if(event.target===dialog)close();});
 root.querySelectorAll('img').forEach(img=>{
  const hide=()=>{img.hidden=true;};
  img.addEventListener('error',hide);
  if(img.complete&&img.naturalWidth===0)hide();
 });
 function render(){
  const level=Number(verifiedTreeLevel()||0);
  const unlocked=Number.isInteger(level)&&level>=10;
  const banner=$('grinch-event-unlock');
  if(banner){
   banner.dataset.state=unlocked?'tree-ready':'locked';
   banner.textContent=unlocked?
    '🌟 Baumstufe 10 erreicht. Mission 1 kann jetzt zu dritt im gemeinsamen Online-Raum offiziell gespielt werden.':
    '🔒 Offizieller Kampagnenstart erst nach echter Baumstufe 10. Mission 1 hat bereits einen unabhängigen lokalen Testmodus.';
  }
  const completed=new Set(verifiedProgress?.completedMissions||[]);
  $('grinch-event-counter').textContent=completed.size+' / 5 Missionen geschafft';
  for(let i=1;i<=MISSIONS.length;i++){
   const state=$('grinch-mission-state-'+i);
   if(!state)continue;
   if(completed.has(i)){state.dataset.state='completed';state.textContent='✅ Geschafft';}
   else if(i===1){state.dataset.state=unlocked?'available':'preview';state.textContent=unlocked?'🌐 Online bereit':'🧪 Testmodus';}
   else if(i===2&&Number(verifiedProgress?.highestUnlocked||1)>=2){state.dataset.state='unlocked';state.textContent='🔓 Freigeschaltet · folgt';}
   else{state.dataset.state='locked';state.textContent='🔒 Gesperrt';}
  }
 }
 return {render};
}
