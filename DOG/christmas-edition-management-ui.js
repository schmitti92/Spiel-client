/**
 * Shared latest-edition management for all seven DOG Christmas scratch types.
 * Fresh checks read one edition document; no Firestore polling.
 */
export const SCRATCH_EDITION_IDS=Object.freeze([
 'gifts','snow_collect','elf','premium_27','tic_tac_toe','number_one_20','dog_jackpot_9'
]);
export const SCRATCH_EDITION_TITLES=Object.freeze({
 gifts:'🎁 Geschenkelinie',snow_collect:'❄️ Schneeflocken-Bingo',
 elf:'🧝 Magischer Wichtelpfad',premium_27:'👑 Premium-Weihnachtslos',
 tic_tac_toe:'⭕ DOG Tic-Tac-Toe',number_one_20:'🔢 Glückszahl 1',
 dog_jackpot_9:'🐾 Finde DOG!'
});
export const editionStatusLine=edition=>{
 if(!edition)return 'Noch keine aktive Auflage erkannt. Mit „Stand prüfen“ den aktuellen Serverstand abrufen.';
 const sold=Number(edition.issued??0),left=Math.max(0,500-sold);
 const fmt=value=>Number(value||0).toLocaleString('de-DE');
 const paid=Number(edition.paidCoins??0),budget=Number(edition.maxTotalCoins??0);
 const date=Number.isFinite(Number(edition.createdAt))?
  new Date(Number(edition.createdAt)).toLocaleDateString('de-DE'):'–';
 return (left?'🟢 Laufende':'🏁 Ausverkaufte')+' Auflage · '+sold+'/500 ausgegeben · '+left+
  ' Restlose · '+fmt(paid)+' / '+fmt(budget)+' 🪙 ausgeschüttet · '+
  fmt(Math.max(0,budget-paid))+' 🪙 Gewinnreserve · Start: '+date;
};
export function mountScratchEditionManager({dialog,variant,getEdition,query,onEdition,onRetired}){
 if(!SCRATCH_EDITION_IDS.includes(variant)||!dialog||
  typeof getEdition!=='function'||typeof query!=='function')throw Error('INVALID_EDITION_MANAGER');
 const section=document.createElement('section');
 section.className='scratch-edition-management';
 section.setAttribute('aria-label','Aktuellste Auflage verwalten');
 const heading=document.createElement('strong');
 heading.textContent=SCRATCH_EDITION_TITLES[variant]+' · aktuellste Auflage';
 const status=document.createElement('p');
 status.className='scratch-edition-management-status';
 status.setAttribute('role','status');
 const actions=document.createElement('div');
 actions.className='scratch-edition-management-actions';
 const refresh=document.createElement('button');
 refresh.type='button';refresh.textContent='🔄 Auflage prüfen';refresh.className='scratch-edition-management-check';
 const retire=document.createElement('button');
 retire.type='button';retire.textContent='🗑️ Letzte Auflage beenden';retire.className='scratch-edition-management-retire';
 const feedback=document.createElement('p');
 feedback.className='scratch-edition-management-feedback';
 feedback.setAttribute('role','status');
 feedback.setAttribute('aria-live','polite');
 actions.append(refresh,retire);
 section.append(heading,status,actions,feedback);
 const headingNode=dialog.querySelector('header,.scratch-gifts-settings-head');
 if(headingNode?.nextSibling)headingNode.parentNode.insertBefore(section,headingNode.nextSibling);
 else dialog.querySelector('form')?.prepend(section);
 let busy=false;
 function render(){
  status.textContent=editionStatusLine(getEdition());
  refresh.disabled=busy;retire.disabled=busy;
  retire.textContent=getEdition()?.remaining>0?'🗑️ Aktuelle Auflage beenden':'🔎 Aktuelle Auflage prüfen / beenden';
 }
 const notice=message=>{feedback.textContent=message};
 async function check(){
  const reply=await query('/editions/'+variant+'/status');
  const name=variant==='gifts'?'giftsEdition':
   variant==='snow_collect'?'snowEdition':
   variant==='tic_tac_toe'?'ticEdition':'otherEdition';
  const edition=reply?.[name]??null;
  onEdition?.(edition);
  render();
  return {edition,canRetire:reply?.canRetire===true};
 }
 async function doCheck(){
  if(busy)return;
  busy=true;render();notice('🔄 Prüfe die letzte Auflage am Server …');
  try{
   const {edition,canRetire}=await check();
   notice(edition?editionStatusLine(edition)+(canRetire?' · Du darfst diese Auflage verwalten.':' · Nur der Ersteller darf sie beenden.'):
    '✅ Keine laufende Auflage. Du kannst eine neue 500er-Serie erstellen.');
  }catch(e){notice('⚠️ '+String(e.message||e))}
  finally{busy=false;render()}
 }
 async function doRetire(){
  if(busy)return;
  busy=true;render();notice('🔄 Prüfe Auflage und Erstellerberechtigung …');
  try{
   const {edition,canRetire}=await check();
   if(!edition){notice('✅ Keine aktive Auflage vorhanden. Du kannst eine neue erstellen.');return}
   if(edition.remaining<=0){notice('✅ Diese Auflage ist schon ausverkauft. Du kannst eine neue erstellen.');return}
   if(!canRetire){notice('🔒 Nur das Konto, das diese Auflage erstellt hat, darf sie beenden.');return}
   const msg=SCRATCH_EDITION_TITLES[variant]+'\n\nDiese Auflage wirklich beenden?\n'+
    edition.issued+' bereits ausgegebene Lose und ihre Gewinne bleiben erhalten.\n'+
    edition.remaining+' unverkaufte Lose werden archiviert und nicht mehr verkauft.\n'+
    'Danach kannst du eine komplett neue 500er-Auflage erstellen.\n\nNicht rückgängig zu machen.';
   if(!window.confirm(msg)){notice('Auflage unverändert.');return}
   notice('🔄 Archiviere die Auflage …');
   const result=await query('/editions/'+variant+'/retire',{
    editionId:edition.id,expectedRevision:edition.revision,
    confirmation:'RETIRE_'+variant.toUpperCase()
   });
   if(!result?.retiredEdition||result.retiredEdition.id!==edition.id)
    throw Error('SERVER_CONFIRMATION_MISSING');
   onRetired?.();
   notice('✅ Auflage archiviert. Du kannst jetzt eine neue Serie mit deinen Einstellungen erstellen.');
  }catch(e){notice('⚠️ '+({
   SCRATCH_EDITION_CHANGED:'Die Auflage hat sich geändert. Bitte erneut prüfen.',
   SCRATCH_EDITION_ONLY_CREATOR:'Nur das Erstellerkonto darf diese Auflage beenden.',
   SCRATCH_EDITION_ARCHIVE_CONFLICT:'Diese Auflage ist bereits archiviert.',
   SCRATCH_EDITION_ALREADY_COMPLETE:'Die Auflage ist ausverkauft; eine neue kann direkt erstellt werden.'
  }[e.message]||String(e.message||e)))}
  finally{busy=false;render()}
 }
 refresh.addEventListener('click',()=>void doCheck());
 retire.addEventListener('click',()=>void doRetire());
 render();
 return {refresh:render,status:()=>getEdition(),root:section};
}
