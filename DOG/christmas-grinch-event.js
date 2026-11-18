/**
 * DOG Grinch-Event Part 2: five-mission overview only.
 * No fake mission completions, virtual earnings or local unlock flags.
 * The prerequisite shown here is based solely on the real shared village.
 */
const MISSIONS=Object.freeze([
 {name:'Der Weg zum Berg',icon:'🏔️',
  description:'Die drei Freunde folgen dem grünen Leuchten. Jeder beginnt mit fünf Figuren, doch auf dem Bergpfad verschwindet von jedem eine.',
  objective:'Vier Figuren pro Spieler sicher ins Ziel bringen. Einsturz, Eisfluch, Entführung, Nebel und Erdbeben. Eine lokale Testversion ist verfügbar.'},
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
   $('grinch-mission-lock').textContent=number===1?
    '🧪 Mission 1 kann als eigenständiger lokaler Test gespielt werden. Keine Online-Synchronisierung, keine offiziellen Siege oder Belohnungen.':
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
    '🌟 Baumstufe 10 erreicht. Mission 1 hat einen lokalen Testmodus; offizielle Online-Missionen sind noch nicht freigeschaltet.':
    '🔒 Offizieller Kampagnenstart erst nach echter Baumstufe 10. Mission 1 hat bereits einen unabhängigen lokalen Testmodus.';
  }
  // Until backend mission completion exists, always show the truthful 0/5.
  $('grinch-event-counter').textContent='0 / 5 Missionen geschafft';
  for(let i=1;i<=MISSIONS.length;i++){
   const state=$('grinch-mission-state-'+i);
   if(!state)continue;
   const firstPreview=i===1;
   state.dataset.state=firstPreview?'preview':'locked';
   state.textContent=firstPreview?'🧪 Testmodus':'🔒 Gesperrt';
  }
 }
 return {render};
}
