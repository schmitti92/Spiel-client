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
export const EDITION_SETTINGS_FIELDS=Object.freeze({
 gifts:['gs-price','gs-edition-budget'],
 snow_collect:['sn-price','sn-edition-budget'],
 elf:['oe-price','oe-budget'],premium_27:['oe-price','oe-budget'],
 number_one_20:['oe-price','oe-budget'],dog_jackpot_9:['oe-price','oe-budget'],
 tic_tac_toe:['tic-price','tic-edition-budget']
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
export const editionAggregateStats=edition=>{
 if(!edition)return null;
 const remaining=Math.max(0,Number(edition.remaining??500-Number(edition.issued??0)));
 const paying=edition.payingTicketsRemaining??edition.moneyTicketsRemaining??null;
 const nonPaying=edition.nonPayingTicketsRemaining??(
  Number.isInteger(paying)?remaining-paying:null);
 const gift=edition.giftTicketsRemaining??null;
 const maximum=edition.maxTicketCoinsRemaining??null;
 const price=Number(edition.config?.price);
 const budget=Number(edition.maxTotalCoins);
 const payoutShare=Number.isFinite(price)&&price>0&&Number.isFinite(budget)?
  Math.round(budget/(500*price)*1000)/10:null;
 return {remaining,paying,nonPaying,gift,maximum,payoutShare};
};
export function mountScratchEditionManager({
 dialog,variant,getEdition,query,onEdition,onRetired,onLoadCurrent
}){
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
 const progress=document.createElement('progress');
 progress.className='scratch-edition-management-progress';
 progress.max=500;progress.value=0;
 progress.setAttribute('aria-label','Bereits vergebene Lose von 500');
 const details=document.createElement('div');
 details.className='scratch-edition-management-stats';
 const actions=document.createElement('div');
 actions.className='scratch-edition-management-actions';
 const refresh=document.createElement('button');
 refresh.type='button';refresh.textContent='🔄 Auflage prüfen';refresh.className='scratch-edition-management-check';
 const retire=document.createElement('button');
 retire.type='button';retire.textContent='🗑️ Letzte Auflage beenden';retire.className='scratch-edition-management-retire';
 // An additional real production control: set an edition's fixed payout
 // budget as a chosen percentage of gross full-price sales. The edition
 // creator can still adjust the exact amount in the form before publishing.
 const budgetPanel=document.createElement('div');
 budgetPanel.className='scratch-edition-management-budget';
 const ratioLabel=document.createElement('label');
 ratioLabel.textContent='🎯 Gewünschte Auszahlungsquote (% vom Listenpreisumsatz)';
 const ratio=document.createElement('input');
 ratio.type='number';ratio.min='0';ratio.max='500';ratio.step='0.1';ratio.value='80';
 ratio.setAttribute('aria-label','Gewünschte Auszahlungsquote in Prozent');
 ratioLabel.append(ratio);
 const applyBudget=document.createElement('button');
 applyBudget.type='button';applyBudget.className='scratch-edition-management-check';
 applyBudget.textContent='💰 Gewinnbudget aus Quote übernehmen';
 const budgetNote=document.createElement('small');
 budgetNote.textContent='Berechnung für 500 Lose. Rabatte und Gutscheine sind nicht eingerechnet; der Server prüft, ob die Gewinnkombinationen machbar sind.';
 budgetPanel.append(ratioLabel,applyBudget,budgetNote);
 const load=document.createElement('button');
 load.type='button';load.textContent='✏️ Aktuelle Einstellungen übernehmen';
 load.className='scratch-edition-management-check';
 const feedback=document.createElement('p');
 feedback.className='scratch-edition-management-feedback';
 feedback.setAttribute('role','status');
 feedback.setAttribute('aria-live','polite');
 actions.append(refresh,retire,load);
 section.append(heading,status,progress,details,actions,budgetPanel,feedback);
 const headingNode=dialog.querySelector('header,.scratch-gifts-settings-head');
 if(headingNode?.nextSibling)headingNode.parentNode.insertBefore(section,headingNode.nextSibling);
 else dialog.querySelector('form')?.prepend(section);
 let busy=false;
 function render(){
  const edition=getEdition();
  status.textContent=editionStatusLine(edition);
  progress.value=Math.max(0,Math.min(500,Number(edition?.issued||0)));
  progress.hidden=!edition;
  details.replaceChildren();
  const stats=editionAggregateStats(edition);
  if(stats){
   const info=[
    ['💰 Geldlose offen',stats.paying],
    ['❄️ Ohne Geldgewinn',stats.nonPaying],
    ['🎁 Geplante Geschenkfelder',stats.gift],
    ['🏆 Höchster Geldgewinn',stats.maximum===null||stats.maximum===undefined?
      null:Number(stats.maximum).toLocaleString('de-DE')+' 🪙'],
    ['📊 Budget / Listenpreisumsatz',stats.payoutShare===null?
      null:stats.payoutShare.toLocaleString('de-DE')+' %']
   ];
   for(const [label,value] of info){
    if(value===null||value===undefined)continue;
    const cell=document.createElement('div');
    const caption=document.createElement('small');caption.textContent=label;
    const number=document.createElement('strong');number.textContent=String(value);
    cell.append(caption,number);details.append(cell);
   }
  }
  refresh.disabled=busy;retire.disabled=busy;
  load.disabled=busy||!edition||typeof onLoadCurrent!=='function';
  load.textContent=edition?.remaining===0?'📋 Letzte Einstellungen für neue Auflage übernehmen':
   '✏️ Gespeicherte Einstellungen übernehmen';
  load.hidden=typeof onLoadCurrent!=='function';
  retire.textContent=edition?.remaining>0?'🗑️ Aktuelle Auflage beenden':'🔎 Aktuelle Auflage prüfen / beenden';
 }
 const notice=message=>{feedback.textContent=message};
 applyBudget.addEventListener('click',()=>{
  const [priceId,budgetId]=EDITION_SETTINGS_FIELDS[variant]||[];
  const price=Number(dialog.querySelector('#'+priceId)?.value);
  const budgetInput=dialog.querySelector('#'+budgetId);
  const percent=Number(ratio.value);
  if(!Number.isSafeInteger(price)||price<0||price>1000000||
   !Number.isFinite(percent)||percent<0||percent>500||!budgetInput){
   notice('⚠️ Bitte einen gültigen Lospreis und eine Auszahlungsquote von 0 bis 500 % eingeben.');return;
  }
  const planned=Math.round(500*price*percent/100);
  if(!Number.isSafeInteger(planned)||planned<Number(getEdition()?.paidCoins||0)){
   notice('⚠️ Das Budget darf nicht kleiner sein als die bereits ausgezahlten Gewinne.');return;
  }
  budgetInput.value=String(planned);
  budgetInput.dispatchEvent(new Event('input',{bubbles:true}));
  notice('✅ Gewinnbudget: '+planned.toLocaleString('de-DE')+
   ' 🪙 für 500 Lose eingetragen. Prüfe anschließend die Gewinnwerte und erstelle/bearbeite die Auflage.');
 });
 load.addEventListener('click',()=>{
  if(busy||!getEdition()||typeof onLoadCurrent!=='function')return;
  try{
   onLoadCurrent(getEdition());
   notice('✅ Die gespeicherten Werte der aktuellen Auflage wurden ins Formular übernommen. Änderungen gelten erst nach „Restlose bearbeiten“.');
  }catch(e){notice('⚠️ '+String(e.message||e))}
 });
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
   notice(!edition?'✅ Keine laufende Auflage. Du kannst eine neue 500er-Serie erstellen.':
    edition.remaining===0?'🏁 Die letzte Auflage ist ausverkauft. Du kannst ihre Einstellungen übernehmen und eine neue erstellen.':
    editionStatusLine(edition)+(canRetire?
     ' · Du darfst diese laufende Auflage bearbeiten oder beenden.':
     ' · Nur der Ersteller oder ein serverseitig freigeschalteter Entwickler darf diese laufende Auflage ändern.'));
  }catch(e){notice('⚠️ '+String(e.message||e))}
  finally{busy=false;render()}
 }
 async function doRetire(){
  if(busy)return;
  busy=true;render();notice('🔄 Prüfe Auflage und Entwicklerberechtigung …');
  try{
   const {edition,canRetire}=await check();
   if(!edition){notice('✅ Keine aktive Auflage vorhanden. Du kannst eine neue erstellen.');return}
   if(edition.remaining<=0){notice('✅ Diese Auflage ist schon ausverkauft. Du kannst eine neue erstellen.');return}
   if(!canRetire){notice('🔒 Nur der Ersteller oder ein serverseitig freigeschalteter Entwickler darf diese Auflage beenden.');return}
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
   SCRATCH_EDITION_ONLY_CREATOR:'Nur der Ersteller oder ein serverseitig freigeschalteter Entwickler darf diese Auflage beenden.',
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
