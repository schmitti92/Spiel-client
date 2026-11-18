/**
 * DOG Grinch-Event Part 2: five-mission overview only.
 * No fake mission completions, virtual earnings or local unlock flags.
 * The prerequisite shown here is based solely on the real shared village.
 */
const MISSIONS=Object.freeze([
 {name:'Die gestohlenen Lichter',icon:'💡',
  description:'Der Weihnachtsmuffel hat Lichter aus Lichtertal gestohlen. Drei DOG-Spieler sollen sie gemeinsam zurückholen.',
  objective:'Geplant: Lichtfelder vor dem Grinch-Bot finden und einsammeln. Belohnungsentwurf: 100 ⭐, 500 🪙 und eine Laterne.'},
 {name:'Verfluchte Karten',icon:'🃏',
  description:'Der Grinch verzaubert DOG-Karten und verändert einige ihrer gewohnten Eigenschaften.',
  objective:'Geplant: Veränderte Kartenwerte durchschauen und als Team gewinnen. Belohnungsentwurf: 150 ⭐, 750 🪙 und ein Kartendesign.'},
 {name:'Eiszeit-Chaos',icon:'❄️',
  description:'Gefrorene Spielfiguren und kurze Zugzeiten machen das DOG-Brett zu einer eisigen Prüfung.',
  objective:'Geplant: Eure Figuren retten und gemeinsam unter Zeitdruck spielen. Belohnungsentwurf: 200 ⭐, 1.000 🪙 und ein Eiskristall.'},
 {name:'Portale und Fallen',icon:'🌀',
  description:'Magische Portale und Fallen verändern die Wege über das Spielfeld.',
  objective:'Geplant: Blockierte Routen überwinden und die Portale gemeinsam nutzen. Belohnungsentwurf: 250 ⭐, 1.250 🪙 und ein Portal.'},
 {name:'Finale in der Grinchhöhle',icon:'👹',
  description:'Im mehrstufigen Finale stellt sich das Team den vereinten Kräften des Weihnachtsmuffels.',
  objective:'Geplant: Mit drei Spielern gegen den Grinch-Bot gewinnen. Belohnungsentwurf: 500 ⭐, 2.500 🪙 und ein besonderer Weihnachtsbaum.'}
]);
export function initGrinchEvent({openTab,openCave,verifiedTreeLevel}){
 const root=document.getElementById('panel-grinch');
 if(!root)return {render(){}};
 const $=id=>document.getElementById(id);
 const dialog=$('grinch-mission-dialog');
 let activeMission=0;
 const close=()=>{if(dialog?.open)dialog.close();};
 $('grinch-visit-cave')?.addEventListener('click',()=>openCave());
 $('grinch-back-village')?.addEventListener('click',()=>openTab('village'));
 root.querySelectorAll('[data-grinch-details]').forEach(button=>{
  button.addEventListener('click',()=>{
   const number=Number(button.dataset.grinchDetails);
   const item=MISSIONS[number-1];
   if(!item)return;
   activeMission=number;
   $('grinch-mission-title').textContent=number+' · '+item.name;
   $('grinch-mission-description').textContent=item.description;
   $('grinch-mission-objective').textContent=item.objective;
   $('grinch-mission-detail-icon').textContent=item.icon;
   $('grinch-mission-lock').textContent=
    '🔒 Missionsvorschau: Der Grinch-Bot und die fünf Missionen werden noch implementiert. Hier werden noch keine echten Siege, Sterne oder Belohnungen vergeben.';
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
    '🌟 Weihnachtsbaum-Stufe 10 erreicht. Die Grinch-Missionen sind noch in Entwicklung und derzeit nicht spielbar.':
    '🔒 Das Grinch-Kapitel ist nach der echten gemeinsamen Weihnachtsbaum-Stufe 10 vorgesehen. Die Missionen sind noch nicht spielbar.';
  }
  // Until backend mission completion exists, always show the truthful 0/5.
  $('grinch-event-counter').textContent='0 / 5 Missionen geschafft';
  for(let i=1;i<=MISSIONS.length;i++){
   const state=$('grinch-mission-state-'+i);
   if(!state)continue;
   const firstPreview=unlocked&&i===1;
   state.dataset.state=firstPreview?'preview':'locked';
   state.textContent=firstPreview?'🧩 In Vorbereitung':'🔒 Gesperrt';
  }
 }
 return {render};
}
