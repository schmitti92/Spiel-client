/**
 * DOG Lichtertal scratch tickets. No write occurs while a field is scratched.
 * The signed-in Render service creates a card with immutable win combinations.
 */
export const SCRATCH_TICKET_TYPES=Object.freeze([
 {id:'simple',icon:'🟤',label:'Einfach',price:200,coinMax:100,unlockChance:'11,1',rewards:'47 klassische Emojis · 16 Blockfarben',odds:'20 % Nieten · 68,9 % Münzen · 11,1 % Freischaltungen'},
 {id:'medium',icon:'🔵',label:'Mittel',price:500,coinMax:800,unlockChance:'3',rewards:'5 Profilbilder · 4 Weihnachts-Emojis · Rahmen · Aktivsymbol · Spielbrett',odds:'20 % Nieten · 77 % Münzen · 3 % Freischaltungen'},
 {id:'premium',icon:'🟡',label:'Premium',price:1000,coinMax:2000,unlockChance:'4',rewards:'10 Profilbilder · 4 Weihnachts-Emojis · 2 Rahmen · 2 Aktivsymbole · 2 Hintergründe · Spielbrett',odds:'20 % Nieten · 76 % Münzen · 4 % Freischaltungen'}
]);
export const SCRATCH_COIN_PRIZES=Object.freeze({
 simple:Object.freeze([10,40,100]),
 medium:Object.freeze([100,300,800]),
 premium:Object.freeze([200,800,2000])
});
// Four distinct and directly selectable cards; three price classes stay unchanged.
export const SCRATCH_SHOP_VARIANTS=Object.freeze([
 Object.freeze({id:'gifts',tier:'simple',icon:'🎁',name:'Geschenkelinie',subtitle:'Einfach · 9 Felder',rule:'3 gleiche in einer Linie',theme:'gift'}),
 Object.freeze({id:'snow_collect',tier:'simple',icon:'❄️',name:'Schneeflocken-Bingo',subtitle:'Einfach · 16 Felder',rule:'3 gleiche irgendwo',theme:'snow'}),
 Object.freeze({id:'elf',tier:'medium',icon:'🧝',name:'Magischer Wichtelpfad',subtitle:'Mittel · 20 Felder',rule:'Geld: durchgehender Pfad',theme:'elf'}),
 Object.freeze({id:'premium_27',tier:'premium',icon:'👑',name:'Premium-Weihnachtslos',subtitle:'Premium · 27 Felder',rule:'3 gleiche Geldsymbole · 20 Symbole = 1.000 🪙 (30 %)',theme:'gold'})
]);
const VARIANTS={
 premium_27:['🎅 Premium-Weihnachts-Rubbellos','3 gleiche Symbole in einer waagerechten Dreierreihe gewinnen. Ab 20 Symbolfeldern gibt es Gold; ab 24 zusätzlich einen Premium-Hauptgewinn. 🧊-Felder zählen nicht.',9,3],
 gifts:['🎁 Geschenkelinie','Drei gleiche Symbole in einer Reihe, Spalte oder Diagonale',3,3],
 snow:['❄️ Schneeflocken-Bingo (älteres Los)','Vier gleiche Symbole in einer Reihe, Spalte oder Diagonale',4,4],
 snow_collect:['❄️ Schneeflocken-Bingo','Drei gleiche Gewinnsymbole irgendwo auf dem Los zählen als Gewinn – unabhängig von der Position. 🧊 bedeutet Niete und zählt nicht.',4,4],
 stars:['⭐ Sternensammler','Vier gleiche Sterne beliebig auf dem Los',3,4],
 elf:['🧝 Magischer Wichtelpfad','Ein durchgehender Weg gleicher Symbole von links nach rechts. Nachbarfelder zählen nur waagerecht oder senkrecht, niemals diagonal.',4,5],
 reindeer:['🦌 Rentierglück','Drei gleiche Rentiere beliebig auf dem Los',3,4],
 candy:['🍬 Zuckerstangen-Duell','Jedes identische Paar in einer Zweierreihe gewinnt',3,2],
 tree:['🎄 Weihnachtsbaum-Los','Stern, Baum und Geschenk in genau dieser Reihenfolge: ⭐ 🎄 🎁',5,3],
 cookie:['🍪 Lebkuchen-Memory','Ein 2×2-Feld mit zwei passenden Symbolpaaren',4,4],
 diamond:['💎 Diamantenjagd','Drei Diamanten beliebig auf dem Los',3,3],
 bells:['🔔 Glocken-Jackpot','Fünf gleiche Symbole waagerecht oder Glocken-Diamant',4,5]
};
const el=(tag,cls,str)=>{
 const n=document.createElement(tag);
 if(cls)n.className=cls;
 if(str!==undefined)n.textContent=String(str);
 return n;
};
const num=v=>Number(v||0).toLocaleString('de-DE');
const prizeLabel=p=>p?.type==='coins'?(p.bonus?'🎉 Zusatzgewinn · ':'')+(p.symbol||'🪙')+' '+num(p.amount)+' Münzen'+(p.x2?' (×2)':''):
 p?.type==='unlock'?(p.symbol||'🎁')+' Freischaltung: '+(p.prize?.icon?p.prize.icon+' ':'')+(p.prize?.name||'Freischaltung'):'';
const symbolLegend=(tier,values=null)=>{
 const [coin,note,bag]=Array.isArray(values)&&values.length===3?values:
  SCRATCH_COIN_PRIZES[tier]||SCRATCH_COIN_PRIZES.simple;
 return '🪙 '+num(coin)+' · 💵 '+num(note)+' · 💼 '+num(bag)+' Münzen · 🎁 💝 🎀 🧧 (je 3 gleiche = Freischaltung)';
};
/**
 * Premium milestone counters are purely visual. The server-issued board
 * determines the prize: counting 🧊 never grants coins or collectibles.
 * revealedIndices contains only cells the player has scratched or uncovered.
 */
export function premiumScratchProgress(board,revealedIndices=[]){
 if(board?.variantId!=='premium_27'||!Array.isArray(board?.cells)||board.cells.length!==27)return null;
 const visible=new Set(revealedIndices.filter(i=>Number.isInteger(i)&&i>=0&&i<27));
 const count=board.cells.reduce((n,symbol,i)=>n+(visible.has(i)&&symbol!=='🧊'?1:0),0);
 const wins=Array.isArray(board.wins)?board.wins:[];
 return {count,total:board.cells.filter(symbol=>symbol!=='🧊').length,
  goldAwarded:wins.some(win=>win.rule==='gold-20'),
  premiumAwarded:wins.some(win=>win.rule==='premium-24'),
  giftRowRequired:[3,4].includes(board.symbolVersion)};
}
/** Gold belongs to a real winning three-in-a-row, never to all 20/24 counted tiles. */
export function premiumWinningRowIndices(wins=[]){
 return [...new Set(wins.filter(win=>(win.rule==='row-3'||
   win.rule==='premium-24'&&win.indices?.length===3)&&
   Array.isArray(win.indices)&&win.indices.length===3&&
   win.indices.every(i=>Number.isInteger(i)&&i>=0&&i<27)&&
   Math.floor(win.indices[0]/3)===Math.floor(win.indices[2]/3)&&
   win.indices[1]===win.indices[0]+1&&win.indices[2]===win.indices[1]+1)
  .flatMap(win=>win.indices))];
}
export function initChristmasScratch(){
 const $=id=>document.getElementById(id);
 const root=$('scratch-tier-grid'),wallet=$('scratch-wallet'),stage=$('scratch-stage'),
  board=$('scratch-board'),results=$('scratch-result-panel'),reveal=$('scratch-reveal');
 if(!root||!wallet||!stage||!board||!results||!reveal)throw Error('SCRATCH_UI_NOT_FOUND');
 let status=null,ticket=null,busy=false,pending=null,requestId=0,finished=false,canManageScratch=false;
 const hostDialog=$('scratch-host-dialog');
 const base=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
 const room=String(new URLSearchParams(location.search).get('room')||'').toUpperCase();
 const validRoom=/^(?:[0-9]{3}|[A-HJ-NP-Z2-9]{6})$/.test(room);
 const account=()=>{
  const s=window.SpielOnline?.state?.();
  return s?.status==='online'&&s.user?.getIdToken?s.user:null;
 };
 const notice=s=>{$('scratch-status').textContent=s};
 const acknowledged=()=>{
  try{return localStorage.getItem('dog-scratch-seen:'+account()?.uid)}catch{return null}
 };
 const acknowledge=commandId=>{
  try{localStorage.setItem('dog-scratch-seen:'+account()?.uid,commandId)}catch{}
 };
 async function query(path,payload){
  const u=account();if(!u)throw Error('LOGIN_REQUIRED');
  const token=await u.getIdToken();
  const target=base+'/api/hub/scratch'+path+(!payload&&path===''&&validRoom?'?room='+encodeURIComponent(room):'');
  const r=await fetch(target,{
   method:payload?'POST':'GET',cache:'no-store',
   headers:{Authorization:'Bearer '+token,...(payload?{'Content-Type':'application/json'}:{})},
   body:payload?JSON.stringify(payload):undefined
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok||data.ok!==true)throw Error(data.error||'SERVER_UNAVAILABLE');
  return data;
 }
 const VARIANT_LABELS=Object.freeze([
  ['gifts','🎁 Geschenkelinie','Einfach · 200 🪙'],
  ['snow_collect','❄️ Schneeflocken-Bingo','Einfach · 200 🪙'],
  ['elf','🧝 Magischer Wichtelpfad','Mittel · 500 🪙'],
  ['premium_27','🎅 Premium-Weihnachts-Rubbellos','Premium · 1.000 🪙']
 ]);
 const variantTiers=Object.freeze({simple:['gifts','snow_collect'],medium:['elf'],premium:['premium_27']});
 const percent=n=>(Number(n)/10).toLocaleString('de-DE',{maximumFractionDigits:1});
 function chanceRange(tier,key){
  const counts=(variantTiers[tier]||[]).map(id=>status?.settings?.variants?.[id]?.weights?.[key]).filter(Number.isInteger);
  if(!counts.length)return null;
  return Math.min(...counts)===Math.max(...counts)?percent(counts[0]):
   percent(Math.min(...counts))+'–'+percent(Math.max(...counts));
 }
 function coinAmountsFor(tier,variantId=null,result=null){
  // A previously bought ticket always displays its original configured
  // money values, even if the host has changed them since purchase.
  if(Array.isArray(result?.coinAmounts)&&result.coinAmounts.length===3)
   return result.coinAmounts;
  if(result)return SCRATCH_COIN_PRIZES[tier]||SCRATCH_COIN_PRIZES.simple;
  const saved=status?.settings?.variants?.[variantId]?.coinAmounts;
  return Array.isArray(saved)&&saved.length===3?saved:
   SCRATCH_COIN_PRIZES[tier]||SCRATCH_COIN_PRIZES.simple;
 }
 function shopMoneyLegend(tier){
  const ids=variantTiers[tier]||[];
  return ids.map(id=>{
   const label=id==='gifts'?'🎁 Geschenkelinie: ':
    id==='snow_collect'?'❄️ Schneeflocken-Bingo: ':'';
   return label+symbolLegend(tier,coinAmountsFor(tier,id));
  }).join('\n');
 }
 // User-specific counters come with the existing authenticated scratch status.
 // No polling, extra Firebase read or per-stroke writes are necessary.
 function drawScratchAnalytics(){
  const root=$('scratch-analytics');
  if(!root)return;
  const body=$('scratch-analytics-body'),footer=$('scratch-analytics-footer'),
   kpis=$('scratch-analytics-kpis'),note=$('scratch-analytics-note');
  const p=status?.progress;
  const stat=value=>Number.isSafeInteger(value)&&value>=0?value:0;
  const missing=!p;
  const opened=stat(p?.opened),tracked=stat(p?.tracked);
  const older=stat(p?.olderUnclassified);
  const incomplete=older>0;
  const cards=[
   ['🎟️','Lose geöffnet',opened],
   ['🏆',incomplete?'Gewinnlose (erfasst)':'Gewinnlose',stat(p?.winTickets)],
   ['🎁',incomplete?'Freischaltungen (erfasst)':'Freischaltungen',stat(p?.unlocks)],
   ['🪙',incomplete?'Münzen gewonnen (erfasst)':'Münzen gewonnen',stat(p?.coinsWon)]
  ];
  kpis.replaceChildren();
  for(const [icon,label,value] of cards){
   const item=el('div','scratch-analytics-kpi');
   item.append(el('span','scratch-analytics-kpi-label',icon+' '+label),
    el('strong','scratch-analytics-kpi-value',missing?'–':num(value)));
   kpis.append(item);
  }
  body.replaceChildren();footer.replaceChildren();
  if(missing){
   const row=el('tr');const cell=el('td','',status?'⌛ Die persönliche Statistik wird vom Render-Server noch nicht bereitgestellt.':'🔐 Mit deinem DOG-Onlineprofil anmelden, um deine Statistik zu sehen.');
   cell.colSpan=7;row.append(cell);body.append(row);
   note.textContent=status?'Versuche „Kontostand aktualisieren“, sobald der Render-Server die neue Statistikversion übernommen hat.':'Die Übersicht wird direkt aus deinem angemeldeten Spielerprofil geladen.';
   return;
  }
  const headers=['Rubbellos','Geöffnet','Gewinnlose','Nieten','Gratis','🎁 Gewinne','🪙 Gewonnen'];
  const addRow=(target,label,data,{total=false,unknown=false,share=true}={})=>{
   const row=el('tr',total?'scratch-analytics-sum':unknown?'scratch-analytics-unknown':'');
   const labelCell=el(total?'th':'td','scratch-analytics-name');
   if(total)labelCell.scope='row';
   labelCell.append(el('strong','',label));
   if(share&&tracked>0&&stat(data?.opened)>0){
    const track=el('span','scratch-analytics-bar');
    const fill=el('i','scratch-analytics-bar-fill');
    fill.style.width=Math.min(100,stat(data?.opened)/tracked*100)+'%';
    track.append(fill);labelCell.append(track);
   }
   row.append(labelCell);
   const numbers=[data?.opened,data?.winTickets,data?.duds,data?.free,data?.unlocks,data?.coinsWon];
   for(let i=0;i<numbers.length;i++){
    const cell=el('td','',unknown&&i>0?'–':num(stat(numbers[i])));
    cell.dataset.label=headers[i+1];
    row.append(cell);
   }
   target.append(row);
  };
  for(const [id,title,tier] of VARIANT_LABELS){
   const value=p.byVariant?.[id]||{};
   addRow(body,title+' · '+tier,value);
  }
  if(stat(p.other?.opened)>0)addRow(body,'🗂️ Weitere ältere Losarten',p.other);
  if(older>0)addRow(body,'📜 Frühere Lose ohne Einzelstatistik',{opened:older},{unknown:true,share:false});
  addRow(footer,'GESAMT',{
   opened,winTickets:p.winTickets,duds:p.duds,free:p.free,
   unlocks:p.unlocks,coinsWon:p.coinsWon
  },{total:true,share:false});
  note.textContent=incomplete?
   'ℹ️ Für '+num(older)+' ältere Lose liegt nur die Gesamtzahl vor. Die Aufteilung, Gewinne und Münzen berücksichtigen '+num(tracked)+' nachvollziehbare Lose; neue Lose werden dauerhaft mitgezählt.':
   '✓ Dein persönlicher Fortschritt wird bei jedem auf Render erzeugten Los gespeichert – ohne zusätzliche Schreibvorgänge beim Rubbeln.';
 }
 function drawShop(){
  root.replaceChildren();
  wallet.textContent=status?num(status.coins)+' 🪙':'– 🪙';
  const freeMode=status?.settings?.freeEnabled===true;
  $('scratch-host-settings').hidden=false;
  $('scratch-host-settings').title='Gemeinsame Rubbellos-Einstellungen';
  $('scratch-daily-info').textContent=freeMode?'🎁 Kostenloses Rubbeln für alle aktiviert':
   status?.dailyFreeAvailable?'🎁 Heute ein einfaches Gratis-Los verfügbar':'Gratis-Los heute bereits benutzt';
  // All four variants are visible simultaneously; no hidden two-card
  // selector and no random result when one specific card was chosen.
  for(const option of SCRATCH_SHOP_VARIANTS){
   const tier=SCRATCH_TICKET_TYPES.find(c=>c.id===option.tier);
   const variantConfig=status?.settings?.variants?.[option.id];
   const unlockChance=Number.isInteger(variantConfig?.weights?.unlock)?
    percent(variantConfig.weights.unlock):tier.unlockChance;
   const article=el('article','scratch-tier '+option.tier+' scratch-variant-'+option.theme);
   article.dataset.variant=option.id;
   const heading=el('div','scratch-card-heading');
   heading.append(el('span','scratch-icon',option.icon));
   const names=el('div','scratch-card-names');
   names.append(el('small','scratch-card-class',option.subtitle),
    el('h3','',option.name));heading.append(names);
   const details=el('div','scratch-card-brief');
   details.append(el('span','scratch-card-rule',option.rule),
    el('span','scratch-card-chance','🎁 '+unlockChance+' % Freischaltung'));
   const amounts=coinAmountsFor(option.tier,option.id);
   article.append(heading,details,
    el('strong','scratch-price',num(tier.price)+' 🪙'),
    el('div','scratch-card-payouts','🪙 '+num(amounts[0])+' · 💵 '+num(amounts[1])+' · 💼 '+num(amounts[2])),
    el('div','scratch-symbol-key',symbolLegend(option.tier,amounts)));
   const vouchers=Number(status?.vouchers?.[option.tier]||0);
   const buyBtn=el('button','scratch-buy','🎟️ Für '+num(tier.price)+' Münzen öffnen');
   buyBtn.type='button';buyBtn.hidden=freeMode;
   buyBtn.disabled=busy||!!ticket||!account()||!status||status.coins<tier.price;
   buyBtn.addEventListener('click',()=>void buy(option.tier,false,option.id));
   article.append(buyBtn);
   if(vouchers>0){
    const voucherBtn=el('button','scratch-free scratch-earned-voucher',
     '🎟️ Gesammeltes Los einlösen · '+num(vouchers)+' vorhanden');
    voucherBtn.type='button';
    voucherBtn.disabled=busy||!!ticket||!account()||!status;
    voucherBtn.addEventListener('click',()=>void buy(option.tier,false,option.id,true));
    article.append(voucherBtn);
   }
   if(freeMode||option.tier==='simple'){
    const free=el('button','scratch-free',freeMode?'🎁 Kostenlos öffnen':'🎁 Tagesfreilos öffnen');
    free.type='button';
    free.disabled=busy||!!ticket||!account()||!status||(!freeMode&&!status.dailyFreeAvailable);
    free.addEventListener('click',()=>void buy(option.tier,true,option.id));
    article.append(free);
   }
   root.append(article);
  }
  drawScratchAnalytics();
 }
 function openSettings(){
  
  if(!status?.settings||!hostDialog){notice('⚠️ Einstellungen konnten noch nicht geladen werden. Bitte Kontostand aktualisieren.');return;}
  $('scratch-host-free-enabled').checked=status.settings.freeEnabled===true;
  const root=$('scratch-host-variants');root.replaceChildren();
  for(const [id,title,tier] of VARIANT_LABELS){
   const settings=status.settings.variants[id];
   if(!settings)continue;
   const block=el('section','scratch-host-variant');
   block.dataset.variant=id;
   block.append(el('h5','',title),el('small','',tier));
   const fields=el('div','scratch-host-fields');
   for(const [key,label,value,step] of [
    ['none','Niete (%)',settings.weights.none/10,'0.1'],
    ['coins','Münzen (%)',settings.weights.coins/10,'0.1'],
    ['unlock','Freischaltung (%)',settings.weights.unlock/10,'0.1'],
    ['extraCoinChance','Zusatz-Münzchance (%)',settings.extraCoinChance,'1']
   ]){
    const field=el('label','scratch-host-field');
    field.append(el('span','',label));
    const input=el('input');input.type='number';input.min='0';input.max='100';input.step=step;
    input.required=true;input.value=String(value);input.dataset.key=key;
    field.append(input);fields.append(field);
   }
   const maxField=el('label','scratch-host-field');
   maxField.append(el('span','','Max. gleichzeitige Gewinne'));
   const select=el('select');select.dataset.key='maxPrizes';
   for(let n=1;n<=10;n++){
    const option=el('option','',String(n));option.value=String(n);
    option.selected=n===settings.maxPrizes;select.append(option);
   }
   maxField.append(select);fields.append(maxField);block.append(fields);
   // Each money icon has a different coin payout, separately set for
   // Geschenkelinie, Schneeflocken-Bingo, Wichtelpfad and Premium.
   const money=el('div','scratch-host-money');
   money.append(el('h6','','💰 Geldgewinne je Symbol'),
    el('small','','Münzbeträge für ein gültiges Gewinnsymbol; zwischen 1 und 50.000.000. Der Geldkoffer muss mehr als der Schein und der Schein mehr als die Münze auszahlen.'));
   const values=Array.isArray(settings.coinAmounts)&&settings.coinAmounts.length===3?
    settings.coinAmounts:SCRATCH_COIN_PRIZES[id==='elf'?'medium':id==='premium_27'?'premium':'simple'];
   const moneyFields=el('div','scratch-host-fields scratch-host-money-fields');
   for(const [i,label] of ['🪙 Münze · klein','💵 Geldschein · mittel','💼 Geldkoffer · groß'].entries()){
    const field=el('label','scratch-host-field');
    field.append(el('span','',label));
    const input=el('input');input.type='number';input.inputMode='numeric';
    input.min='1';input.max='50000000';input.step='1';input.required=true;
    input.value=String(values[i]);input.dataset.coinIndex=String(i);
    field.append(input);moneyFields.append(field);
   }
   money.append(moneyFields);block.append(money);
   // These are conditional chances within the winning category. The
   // three money icons and the four collectible gift icons each total 100%.
   function symbolOddsSection(key,title,description,symbols,defaults){
    const wrap=el('div','scratch-host-odds-group');
    wrap.dataset.oddsGroup=key;
    wrap.append(el('h6','',title),el('small','',description));
    const inputs=el('div','scratch-host-fields scratch-host-odds-fields');
    const values=Array.isArray(settings[key])&&settings[key].length===symbols.length?
     settings[key]:defaults;
    for(const [i,symbol] of symbols.entries()){
     const field=el('label','scratch-host-field');
     field.append(el('span','',symbol+' (%)'));
     const input=el('input');input.type='number';input.inputMode='decimal';
     input.min='0';input.max='100';input.step='0.1';input.required=true;
     input.value=String(values[i]/10);input.dataset.symbolIndex=String(i);
     field.append(input);inputs.append(field);
    }
    wrap.append(inputs);
    const total=el('small','scratch-host-odds-total');
    function refreshTotal(){
     const values=[...inputs.querySelectorAll('input')].map(n=>Number(n.value));
     const sum=values.reduce((a,b)=>a+b,0);
     total.textContent='Summe: '+sum.toLocaleString('de-DE',{maximumFractionDigits:1})+' % / 100 %';
     total.dataset.valid=String(values.every(Number.isFinite)&&Math.abs(sum-100)<0.0001);
    }
    inputs.addEventListener('input',refreshTotal);refreshTotal();wrap.append(total);
    return wrap;
   }
   block.append(
    symbolOddsSection('moneySymbolWeights','🎲 Geldsymbol-Wahrscheinlichkeiten',
     'Wie oft welches Geldsymbol erscheint, wenn ein Geldgewinn gezogen wurde.',
     ['🪙 Münze','💵 Geldschein','💼 Geldkoffer'],[334,333,333]),
    symbolOddsSection('giftSymbolWeights','🎁 Geschenk-Wahrscheinlichkeiten',
     'Welches Geschenkzeichen eine gewonnene Freischaltung darstellt.',
     ['🎁 Geschenk','💝 Herzgeschenk','🎀 Schleife','🧧 Roter Umschlag'],[250,250,250,250])
   );
   const summary=el('small','scratch-host-total');
   const update=()=>{
    const values=['none','coins','unlock'].map(k=>Number(block.querySelector('[data-key="'+k+'"]').value));
    const total=values.reduce((a,b)=>a+b,0);
    summary.textContent='Hauptkategorien: '+total.toLocaleString('de-DE',{maximumFractionDigits:1})+' % / 100 %';
    summary.dataset.valid=Math.abs(total-100)<0.001?'true':'false';
   };
   fields.addEventListener('input',update);update();block.append(summary);root.append(block);
  }
  $('scratch-host-feedback').textContent='';
  hostDialog.showModal();
 }
 function readSettings(){
  const variants={};
  const parsePercent=(input)=>{
   const value=Number(input?.value);
   if(!Number.isFinite(value)||value<0||value>100||Math.abs(value*10-Math.round(value*10))>0.000001)
    throw Error('Gewichtungen müssen in Schritten von 0,1 % zwischen 0 und 100 liegen.');
   return Math.round(value*10);
  };
  for(const [id] of VARIANT_LABELS){
   const block=$('scratch-host-variants').querySelector('[data-variant="'+id+'"]');
   if(!block)throw Error('Einstellungen für '+id+' fehlen.');
   const input=key=>block.querySelector('[data-key="'+key+'"]');
   const weights={none:parsePercent(input('none')),coins:parsePercent(input('coins')),
    unlock:parsePercent(input('unlock'))};
   if(weights.none+weights.coins+weights.unlock!==1000)
    throw Error('Die drei Hauptchancen müssen bei jedem Los genau 100 % ergeben.');
   const extraCoinChance=Number(input('extraCoinChance').value);
   const maxPrizes=Number(input('maxPrizes').value);
   if(!Number.isInteger(extraCoinChance)||extraCoinChance<0||extraCoinChance>100)
    throw Error('Die zusätzliche Münzchance muss zwischen 0 und 100 % liegen.');
   if(!Number.isInteger(maxPrizes)||maxPrizes<1||maxPrizes>10)
    throw Error('Ungültige Anzahl gleichzeitiger Gewinne.');
   const coinAmounts=Array.from({length:3},(_,i)=>Number(
    block.querySelector('[data-coin-index="'+i+'"]')?.value));
   if(!coinAmounts.every(amount=>Number.isSafeInteger(amount)&&amount>=1&&amount<=50000000)||
    coinAmounts[0]>=coinAmounts[1]||coinAmounts[1]>=coinAmounts[2])
    throw Error('Geldbeträge müssen ganze Münzen zwischen 1 und 50.000.000 sein: 🪙 kleiner als 💵, 💵 kleiner als 💼.');
   const readSymbolWeights=(key,count)=>{
    const section=block.querySelector('[data-odds-group="'+key+'"]');
    const values=Array.from({length:count},(_,i)=>
     parsePercent(section?.querySelector('[data-symbol-index="'+i+'"]')));
    if(values.reduce((sum,value)=>sum+value,0)!==1000)
     throw Error('Die Wahrscheinlichkeiten bei '+(key==='moneySymbolWeights'?'🪙 💵 💼':'🎁 💝 🎀 🧧')+
      ' müssen zusammen genau 100 % ergeben.');
    return values;
   };
   const moneySymbolWeights=readSymbolWeights('moneySymbolWeights',3);
   const giftSymbolWeights=readSymbolWeights('giftSymbolWeights',4);
   variants[id]={weights,extraCoinChance,maxPrizes,coinAmounts,moneySymbolWeights,giftSymbolWeights};
  }
  return {version:1,freeEnabled:$('scratch-host-free-enabled').checked,variants};
 }
 // A SINGLE silver surface covers the entire playing grid. The player can
 // start anywhere and drag across every symbol without lifting the finger.
 // Progress counts actual transparent silver pixels, not clicks or distance.
 let unifiedCover=null,initialOpaque=0,moveNumber=0;
 const SAMPLE_ALPHA_MIN=64;
 function opaqueSamples(canvas){
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
  let count=0;
  // Uniformly sample the entire coating, including every cell, but not gaps.
  for(let i=3;i<data.length;i+=12)if(data[i]>SAMPLE_ALPHA_MIN)count++;
  return count;
 }
 function setScratchProgress(percent){
  const p=Math.max(0,Math.min(100,percent));
  $('scratch-progress').textContent=p+' % freigerubbelt · ab 90 % automatische Aufdeckung';
  const meter=$('scratch-progress-meter');
  if(meter){meter.value=p;meter.setAttribute('aria-valuenow',String(p))}
 }
 function revealedPremiumCells(canvas){
  if(stage.dataset.variant!=='premium_27')return [];
  const rect=board.getBoundingClientRect();
  if(!rect.width||!rect.height)return [];
  const pixels=canvas.getContext('2d',{willReadFrequently:true})
   .getImageData(0,0,canvas.width,canvas.height).data;
  const found=[];
  // A 5 × 5 interior sample avoids borders and silver-free grid gaps.
  // Only count tiles the user has substantially revealed, not unseen prizes.
  for(const [i,cell] of [...board.querySelectorAll('.scratch-field')].entries()){
   const r=cell.getBoundingClientRect();
   let uncovered=0;
   for(let y=0;y<5;y++)for(let x=0;x<5;x++){
    const px=Math.max(0,Math.min(canvas.width-1,Math.floor(
     (r.left-rect.left+r.width*(.2+.15*x))*canvas.width/rect.width)));
    const py=Math.max(0,Math.min(canvas.height-1,Math.floor(
     (r.top-rect.top+r.height*(.2+.15*y))*canvas.height/rect.height)));
    if(pixels[(py*canvas.width+px)*4+3]<=SAMPLE_ALPHA_MIN)uncovered++;
   }
   if(uncovered>=13)found.push(i);
  }
  return found;
 }
 function measureScratchCover(canvas){
  if(finished||unifiedCover!==canvas||!initialOpaque)return;
  const remaining=opaqueSamples(canvas);
  const fraction=Math.max(0,Math.min(1,1-remaining/initialOpaque));
  setScratchProgress(Math.floor(fraction*100));
  if(stage.dataset.variant==='premium_27')updatePremiumCounter(revealedPremiumCells(canvas));
  if(fraction>=.9)finish();
 }
 function makeField(symbol){
  const cell=el('div','scratch-field');
  const face=el('span','scratch-cell-symbol',symbol);
  face.setAttribute('aria-hidden','true');
  cell.append(face);
  if(symbol==='🧊'&&['snow_collect','premium_27'].includes(stage.dataset.variant)){
   cell.classList.add('scratch-dud');
   cell.append(el('small','scratch-cell-dud-label','Niete'));
  }
  return cell;
 }
 function attachUnifiedCover(){
  const cells=Array.from(board.querySelectorAll('.scratch-field'));
  if(!cells.length)return;
  const boardRect=board.getBoundingClientRect();
  if(boardRect.width<1||boardRect.height<1)throw Error('SCRATCH_BOARD_LAYOUT_INVALID');
  const canvas=el('canvas','scratch-unified-cover');
  canvas.setAttribute('aria-label','Gesamtes Rubbellos mit Finger oder Maus ohne Absetzen freirubbeln');
  canvas.setAttribute('role','button');
  canvas.setAttribute('tabindex','0');
  canvas.setAttribute('title','Beginne irgendwo und wische über das komplette Spielfeld. Ab 90 Prozent wird es automatisch geöffnet.');
  canvas.width=Math.round(boardRect.width);
  canvas.height=Math.round(boardRect.height);
  board.append(canvas);
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.globalCompositeOperation='source-over';
  for(const cell of cells){
   const r=cell.getBoundingClientRect();
   const inset=2;
   const x=r.left-boardRect.left+inset,y=r.top-boardRect.top+inset;
   const w=Math.max(1,r.width-inset*2),h=Math.max(1,r.height-inset*2);
   ctx.save();
   ctx.beginPath();
   if(typeof ctx.roundRect==='function')ctx.roundRect(x,y,w,h,Math.min(w,h)*.09);
   else ctx.rect(x,y,w,h);
   ctx.clip();
   const g=ctx.createLinearGradient(x,y,x+w,y+h);
   g.addColorStop(0,'#8095a2');g.addColorStop(.45,'#ebf1f0');g.addColorStop(1,'#8b9faa');
   ctx.fillStyle=g;ctx.fillRect(x,y,w,h);
   ctx.strokeStyle='#c2d6d8';ctx.lineWidth=1;
   for(let d=-h;d<w+h;d+=12){
    ctx.beginPath();ctx.moveTo(x+d,y);ctx.lineTo(x+d+h,y+h);ctx.stroke();
   }
   ctx.fillStyle='#496171';
   ctx.font='700 '+Math.max(9,Math.min(15,h*.20))+'px system-ui';
   ctx.textAlign='center';
   ctx.fillText('❄',x+w/2,y+h/2+4);
   ctx.restore();
  }
  unifiedCover=canvas;
  initialOpaque=opaqueSamples(canvas);
  moveNumber=0;
  setScratchProgress(0);
  ctx.globalCompositeOperation='destination-out';
  let activePointer=null,last=null;
  const point=e=>{
   const r=canvas.getBoundingClientRect();
   return {x:(e.clientX-r.left)*canvas.width/r.width,
           y:(e.clientY-r.top)*canvas.height/r.height};
  };
  const stroke=e=>{
   if(activePointer!==e.pointerId||finished||unifiedCover!==canvas)return;
   e.preventDefault();
   const p=point(e);
   const brush=Math.max(20,Math.min(55,Math.min(boardRect.width/parseInt(board.style.getPropertyValue('--scratch-cols')||'3',10),boardRect.height/Math.ceil(cells.length/parseInt(board.style.getPropertyValue('--scratch-cols')||'3',10)))*.55));
   ctx.lineWidth=brush;ctx.lineCap='round';ctx.lineJoin='round';
   if(last){ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);ctx.stroke()}
   else{ctx.beginPath();ctx.arc(p.x,p.y,brush/2,0,Math.PI*2);ctx.fill()}
   last=p;
   if(++moveNumber%4===0)measureScratchCover(canvas);
  };
  canvas.addEventListener('pointerdown',e=>{
   if(finished||activePointer!==null)return;
   activePointer=e.pointerId;last=null;
   canvas.setPointerCapture?.(e.pointerId);
   stroke(e);
  });
  canvas.addEventListener('pointermove',stroke);
  const stop=e=>{
   if(e.pointerId!==activePointer)return;
   activePointer=null;last=null;
   measureScratchCover(canvas);
  };
  canvas.addEventListener('pointerup',stop);
  canvas.addEventListener('pointercancel',stop);
  // Keyboard-only access stays possible without restoring per-cell clicks.
  canvas.addEventListener('keydown',e=>{
   if(e.key==='Enter'||e.key===' '){e.preventDefault();finish()}
  });
 }
 function updatePremiumCounter(revealed=[]){
  const progress=premiumScratchProgress(ticket?.board,revealed);
  const counter=stage.querySelector('.scratch-premium-counter');
  if(!progress||!counter)return;
  counter.querySelector('[data-premium-symbol-count]').textContent=progress.count+' / 27';
  // Never disclose the ticket's unseen total before the silver is removed.
  counter.querySelector('[data-premium-found]').textContent=finished?
   progress.total+' echte Symbole insgesamt · 🧊 zählt nicht':
   progress.count+' echte Symbole entdeckt · 🧊 zählt nicht';
  // Also frame the 20/24 reward illustrations already printed at the
  // bottom-right of the premium artwork, without covering or changing art.
  const artwork=$('scratch-card-art');
  artwork.dataset.premiumGold20=String(progress.count>=20&&progress.goldAwarded);
  artwork.dataset.premiumGold24=String(progress.count>=24&&progress.premiumAwarded);
  for(const [goal,awarded] of [[20,progress.goldAwarded],[24,progress.premiumAwarded]]){
   const line=counter.querySelector('[data-premium-milestone="'+goal+'"]');
   if(!line)continue;
   const reached=progress.count>=goal&&awarded;
   line.classList.toggle('is-earned',reached);
   line.dataset.earned=String(reached);
   line.querySelector('[data-milestone-progress]').textContent=
    Math.min(progress.count,goal)+' / '+goal;
   const state=line.querySelector('[data-milestone-state]');
   state.textContent=reached?'✓ ERREICHT':goal===24&&progress.count>=24&&progress.giftRowRequired?
    '3 gleiche Geschenke nötig':'Noch nicht erreicht';
  }
 }
 function drawPrizeTable(result,entries=[]){
  let panel=stage.querySelector('.scratch-prize-sidebar');
  if(!panel){panel=el('aside','scratch-prize-sidebar');stage.append(panel)}
  panel.replaceChildren();
  if(result?.board?.variantId==='premium_27'){
   const counter=el('section','scratch-premium-counter');
   counter.setAttribute('aria-label','Premium-Symbolzähler und Belohnungsstufen');
   const header=el('div','scratch-premium-counter-header');
   header.append(el('span','','🔎 Symbole gesammelt'),
    el('strong','scratch-premium-counter-number','0 / 27'));
   header.querySelector('strong').dataset.premiumSymbolCount='';
   counter.append(header);
   const found=el('small','scratch-premium-found','0 Symbole freigerubbelt');
   found.dataset.premiumFound='';counter.append(found);
   for(const [goal,name,description] of [
    [20,'🪙 Gold-Belohnung','20 Symbole'],
    [24,'🎁 Premium-Belohnung',[3,4].includes(result.board.symbolVersion)?
     '24 Symbole + 3 gleiche Geschenke':'24 Symbole']
   ]){
    const line=el('div','scratch-premium-milestone');
    line.dataset.premiumMilestone=String(goal);line.dataset.earned='false';
    const left=el('span','');
    left.append(el('strong','',name),el('small','',description));
    const right=el('span','scratch-premium-milestone-status');
    const amount=el('strong','', '0 / '+goal);amount.dataset.milestoneProgress='';
    const state=el('small','','Noch nicht erreicht');state.dataset.milestoneState='';
    right.append(amount,state);line.append(left,right);counter.append(line);
   }
   panel.append(counter);
  }
  // Rebuild an explicit list of CURRENT prizes from the verified Render receipt.
  // Each amount and unlock remains readable, including additional coin awards.
  if(finished){
   const prizes=Array.isArray(result?.winnings)?result.winnings:entries;
   const sourceWins=Array.isArray(result?.board?.wins)?result.board.wins:[];
   const section=el('section','scratch-current-awards');
   section.setAttribute('aria-label','Aktuell gewonnene Belohnungen');
   section.append(el('h4','scratch-current-title',prizes.length?
    '🏆 Jetzt gewonnen · '+prizes.length+(prizes.length===1?' Belohnung':' Belohnungen'):
    '❄️ Dieses Los ist eine Niete'));
   const total=Number.isSafeInteger(result?.totalCoins)?result.totalCoins:
    prizes.filter(p=>p?.type==='coins').reduce((a,p)=>a+(p.amount||0),0);
   const unlocks=prizes.filter(p=>p?.type==='unlock').length;
   section.append(el('div','scratch-current-summary',
    '🪙 '+num(total)+' Münzen erhalten'+(unlocks?' · 🎁 '+unlocks+' Freischaltung'+(unlocks===1?'':'en'):'')));
   if(prizes.length){
    const list=el('div','scratch-current-grid');
    prizes.forEach((prize,i)=>{
     const win=sourceWins[i];
     const rule=prize.milestone||win?.rule||(prize.bonus?'bonus':'row-3');
     const where=prize.bonus?'🎉 Zusatzgewinn':
      rule==='gold-20'?'⭐ 20 Symbole':
      rule==='premium-24'?'🎁 24 Symbole':
      rule==='row-3'?'🎟️ Dreierreihe':
      rule==='gift-three-connected'?'🎁 Verbundene Geschenke':'🎟️ Gewinnkombination';
     const entry=el('div','scratch-current-item'+(prize.type==='unlock'?' is-unlock':''));
     entry.append(el('small','scratch-current-source',where));
     entry.append(el('strong','scratch-current-value',prize.type==='coins'?
      (prize.symbol||'🪙')+' '+num(prize.amount)+' Münzen':
      (prize.symbol||'🎁')+' '+(prize.prize?.name||'Neue Freischaltung')));
     if(prize.x2)entry.append(el('small','scratch-current-multiplier','✨ ×2 Gewinn'));
     list.append(entry);
    });
    section.append(list);
   }else section.append(el('div','scratch-current-empty','Keine Gewinnkombination – versuche es mit einem weiteren Rubbellos.'));
   panel.append(section);
  }
  panel.append(el('h4','','Gewinntabelle'));
  const tier=result?.tier||'simple';
  const amounts=coinAmountsFor(tier,result?.board?.variantId||null,result);
  const awarded=new Set(entries.map(p=>p?.type==='coins'?p.symbol||'🪙':p?.type==='unlock'?p.symbol||'🎁':''));
  const giftSymbols=[3,4].includes(result?.board?.symbolVersion)?['🎁','💝','🎀','🧧']:['🎁'];
  const wonGifts=giftSymbols.filter(symbol=>awarded.has(symbol));
  const names=[['🪙',amounts[0]+' Münzen'],['💵',amounts[1]+' Münzen'],['💼',amounts[2]+' Münzen'],[giftSymbols.join(' '),[3,4].includes(result?.board?.symbolVersion)?'Freischaltung · 3 gleiche Geschenke':'Freischaltung']];
  for(const [symbol,label] of names){
   const won=awarded.has(symbol)||(symbol===giftSymbols.join(' ')&&wonGifts.length>0);
   const line=el('div','scratch-prize-entry'+(won?' is-won':''));
   line.append(el('span','',symbol),el('span','',label));
   if(won)line.append(el('strong','',wonGifts.length&&symbol===giftSymbols.join(' ')?wonGifts.join(' ')+' ✓ Gewinn':'✓ Gewinn'));
   panel.append(line);
  }
  const remaining=status?.remainingMainPrizes;
  panel.append(el('div','scratch-prize-remaining',Number.isInteger(remaining)?
   '🎁 Noch verfügbare Hauptgewinne: '+remaining:
   '🎁 Hauptgewinn-Bestand: derzeit nicht verfügbar'));
  // Keep the full card graphic untouched; award results belong to the
  // dedicated, compact right panel, not over the bottom three card rows.
  panel.append(results,$('scratch-winning-lines'));
  updatePremiumCounter(finished&&result?.board?.variantId==='premium_27'?
   result.board.cells.map((_,i)=>i):[]);
 }
 function showTicket(result){
  ticket=result;finished=false;unifiedCover=null;initialOpaque=0;
  stage.classList.remove('is-revealed');
  stage.hidden=false;reveal.classList.remove('revealed');results.hidden=true;
  $('scratch-ticket-finish').hidden=true;$('scratch-reveal-button').hidden=true;
  const conf=VARIANTS[result.board?.variantId],cells=result.board?.cells;
  stage.dataset.variant=result.board?.variantId||'legacy';
  stage.dataset.tier=result.tier||'simple';
  $('scratch-ticket-title').textContent=conf?
   conf[0]+' · '+(SCRATCH_TICKET_TYPES.find(t=>t.id===result.tier)?.label||'')+'-Rubbellos':
   '🎟️ Älteres Rubbellos';
  const payoutRule=result.board?.variantId==='premium_27'&&result.board?.symbolVersion===4?
   'Drei gleiche Geldsymbole 🪙 💵 💼 in einer waagerechten Reihe gewinnen. 30 % der Lose erreichen 20 Symbolfelder: Dafür gibt es feste 1.000 Münzen. Ab 24 Symbolfeldern zusätzlich eine Freischaltung mit 3 gleichen Geschenken. 🧊 zählt nicht.':
   result.board?.variantId==='elf'&&result.board?.symbolVersion===3?
   'Geld: durchgehender Weg gleicher Symbole von links nach rechts. Geschenk: 3 identische, waagerecht oder senkrecht verbundene Geschenkzeichen.':
   result.board?.variantId==='premium_27'&&result.board?.symbolVersion===3?
   'Drei gleiche Gewinnsymbole waagerecht; Geld ab 20 Symbolfeldern; Freischaltung ab 24 Symbolfeldern UND 3 gleichen Geschenkzeichen in einer Reihe. 🧊 zählt nicht.':
   result.board?.symbolVersion===2&&result.board?.variantId==='premium_27'?
   'Drei gleiche Gewinnsymbole waagerecht, Geld ab 20 Symbolfeldern, 🎁 Freischaltung ab 24 Symbolfeldern. 🧊 zählt nicht.':null;
  $('scratch-variant-rule').textContent=conf?conf[0]+' · Gewinnregel: '+(payoutRule||conf[1]):
   'Älteres Los – dieses Ergebnis wurde vor dem neuen Spielfeldsystem gespeichert';
  board.parentElement.querySelector('.scratch-premium-symbol-count')?.remove();
  const legend=$('scratch-symbol-legend');
  if(legend){legend.hidden=![2,3,4].includes(result.board?.symbolVersion);
   legend.textContent=legend.hidden?'':symbolLegend(result.tier,coinAmountsFor(result.tier,result.board?.variantId,result))}
  board.replaceChildren();board.removeAttribute('style');
  if(conf&&Array.isArray(cells)&&cells.length===conf[2]*conf[3]){
   board.style.setProperty('--scratch-cols',conf[3]);
   for(const symbol of cells)board.append(makeField(symbol));
   attachUnifiedCover();
  }else{
   // Never construct an invented matching combination for a legacy receipt.
   board.textContent='Älteres Rubbellos ohne gespeichertes Symbolfeld';
   $('scratch-progress').textContent='Älteres Los – keine Rubbeltextur gespeichert';
   $('scratch-reveal-button').hidden=false;
  }
  drawPrizeTable(result);
  drawShop();
  // The fixed ticket fills the viewport. Never scroll the underlying page
  // when it opens; on resize its artwork remains within the window.
  document.body.classList.add('scratch-ticket-open');
 }
 function showWinningElfPaths(wins){
  if(stage.dataset.variant!=='elf')return;
  const fields=Array.from(board.querySelectorAll('.scratch-field'));
  const rect=board.getBoundingClientRect();
  if(!rect.width||!rect.height)return;
  const namespace='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(namespace,'svg');
  svg.classList.add('scratch-path-highlight');
  svg.setAttribute('viewBox','0 0 1000 800');
  svg.setAttribute('preserveAspectRatio','none');
  svg.setAttribute('aria-hidden','true');
  for(const win of wins){
   if(!['path','gift-three-connected'].includes(win.rule)||!Array.isArray(win.indices)||win.indices.length<3)continue;
   const points=win.indices.map(index=>{
    const cell=fields[index];
    if(!cell)return null;
    const r=cell.getBoundingClientRect();
    return [Math.round((r.left+r.width/2-rect.left)*1000/rect.width),
            Math.round((r.top+r.height/2-rect.top)*800/rect.height)].join(',');
   });
   if(points.includes(null))continue;
   const line=document.createElementNS(namespace,'polyline');
   line.setAttribute('points',points.join(' '));
   svg.append(line);
  }
  if(svg.childElementCount)board.append(svg);
 }
 function finish(){
  if(!ticket||finished)return;
  finished=true;
  stage.classList.add('is-revealed');
  if(unifiedCover)unifiedCover.hidden=true;
  for(const cell of board.querySelectorAll('.scratch-field'))cell.classList.add('uncovered');
  const wins=ticket.board?.wins||[];
  const visibleCells=board.querySelectorAll('.scratch-field');
  const goldIndices=stage.dataset.variant==='premium_27'?
   premiumWinningRowIndices(wins):
   [...new Set(wins.flatMap(win=>win.indices||[]))];
  for(const i of goldIndices)visibleCells[i]?.classList.add('scratch-winning-cell');
  showWinningElfPaths(wins);
  reveal.classList.add('revealed');
  $('scratch-progress').textContent='100 % aufgedeckt ✓';
  const meter=$('scratch-progress-meter');if(meter){meter.value=100;meter.setAttribute('aria-valuenow','100')}
  if(stage.dataset.variant==='premium_27'&&Array.isArray(ticket.board?.cells))
   updatePremiumCounter(ticket.board.cells.map((_,i)=>i));
  const entries=Array.isArray(ticket.winnings)?ticket.winnings:
   ticket.type==='none'?[]:[ticket.type==='coins'?{type:'coins',amount:ticket.amount}:{type:'unlock',prize:ticket.prize}];
  $('scratch-result-value').textContent=entries.length?
   entries.map(prizeLabel).join(' · '):'❌ Niete – keine gültige Gewinnkombination';
  $('scratch-result-kind').textContent=
   (entries.length?entries.length+' Gewinne insgesamt':'')+
   (ticket.rareMainMultiplier?' · 💎 Ultra-selten: Hauptgewinn ×2':
    ticket.multiplier===2?' · ✨ ×2-Multiplikator':'');
  const list=$('scratch-winning-lines');list.replaceChildren();
  for(const [i,win] of wins.entries()){
   const description=win.rule==='gold-20'?'20 Symbolfelder':win.rule==='premium-24'?([3,4].includes(ticket.board?.symbolVersion)?'24 Symbolfelder + 3 gleiche Geschenkzeichen':'24 Symbolfelder'):win.rule==='row-3'?'Dreierreihe':win.rule==='gift-three-connected'?'3 verbundene Geschenkzeichen':'Gewinn '+(i+1);
   const line=el('div','scratch-prize-line',description+': '+prizeLabel(win.prize));
   if(win.prize?.x2)line.append(el('small','', ' · '+num(win.prize.baseAmount)+' × 2'));
   list.append(line);
  }
  for(const prize of entries.filter(p=>p?.bonus===true)){
   const source=Number.isInteger(prize.sourceWin)?wins[prize.sourceWin]:null;
   if(!source)continue;
   list.append(el('div','scratch-prize-line scratch-prize-bonus',
    '🎉 Zusatzgewinn zur Gewinnkombination '+(prize.sourceWin+1)+': '+prizeLabel(prize)));
  }
  drawPrizeTable(ticket,entries);
  list.hidden=!entries.length;results.hidden=false;
  $('scratch-reveal-button').hidden=true;$('scratch-ticket-finish').hidden=false;
  notice(entries.length?'🎉 Gewinne sind bereits sicher auf deinem Profil gutgeschrieben.':
   '❄️ Niete – auf dieser Karte gibt es keine gültige Gewinnkombination.');
 }
 async function load(){
  const id=++requestId;
  if(!account()){status=null;ticket=null;canManageScratch=false;stage.hidden=true;document.body.classList.remove('scratch-ticket-open');hostDialog?.close();drawShop();notice('🔐 Bitte mit dem DOG-Onlineprofil anmelden.');return}
  try{
   const r=await query('');
   if(id!==requestId)return;
   status=r.scratch;canManageScratch=r.canManageScratch===true;
   if(!ticket&&status?.lastResult?.board&&status.lastResult.commandId!==acknowledged())
    showTicket(status.lastResult);
   drawShop();
   notice(ticket?'❄️ Dein letztes Los wurde wiederhergestellt.':
    '🎄 Wische ohne Absetzen über das gesamte Spielfeld. Bei 90 % wird automatisch aufgedeckt.');
  }catch(e){if(id!==requestId)return;status=null;canManageScratch=false;drawShop();notice('⚠️ '+(e.message||'Verbindung nicht verfügbar'))}
 }
 async function buy(tier,free,variantId,voucher=false){
  if(!account()||busy||ticket)return;
  if(!SCRATCH_SHOP_VARIANTS.some(c=>c.id===variantId&&c.tier===tier))return;
  busy=true;drawShop();
  pending=pending?.tier===tier&&pending.free===free&&pending.variantId===variantId&&
   pending.voucher===voucher?pending:
   {tier,variantId,free,voucher,commandId:'scratch-'+crypto.randomUUID()};
  notice('🎟️ Los wird auf Render gebucht und das Symbolfeld erstellt …');
  try{
   const r=await query('/buy',pending);
   if(!r.result||!r.scratch)throw Error('INVALID_SCRATCH_RESULT');
   status=r.scratch;pending=null;showTicket(r.result);
   notice('❄️ Beginne irgendwo und rubbele in einer Bewegung über alle Felder. Bei 90 % öffnet das Los automatisch.');
  }catch(e){
   notice('⚠️ '+(e.message==='SCRATCH_NOT_ENOUGH_COINS'?'Nicht genügend Münzen.':
    e.message==='SCRATCH_DAILY_ALREADY_USED'?'Gratis-Los heute bereits eingelöst.':
    e.message==='SCRATCH_NO_VOUCHER'?'Kein gesammelter Rubbellos-Gutschein mehr vorhanden.':e.message));
  }finally{busy=false;drawShop()}
 }
 $('scratch-reveal-button').addEventListener('click',finish);
 $('scratch-ticket-finish').addEventListener('click',()=>{
  if(!ticket)return;
  acknowledge(ticket.commandId);ticket=null;finished=false;stage.hidden=true;
  document.body.classList.remove('scratch-ticket-open');
  drawShop();notice('🎄 Bereit für dein nächstes Rubbellos.');
 });
 $('scratch-refresh').addEventListener('click',()=>void load());
 $('scratch-host-settings').addEventListener('click',openSettings);
 $('scratch-host-close').addEventListener('click',()=>hostDialog.close());
 $('scratch-host-cancel').addEventListener('click',()=>hostDialog.close());
 hostDialog?.addEventListener('click',e=>{if(e.target===hostDialog)hostDialog.close()});
 // These settings apply globally across all DOG rooms. A missing or invalid
 // room code must not silently suppress saving them.
 // Native number input validation can suppress "submit" entirely. Provide
 // an explicit message instead of making the Save button seem unresponsive.
 $('scratch-host-form').addEventListener('invalid',e=>{
  const field=e.target;
  const name=field.closest('label')?.querySelector('span')?.textContent||'Eingabe';
  const feedback=$('scratch-host-feedback');
  feedback.textContent='⚠️ Bitte „'+name+'“ überprüfen. Das Feld muss einen gültigen Wert enthalten.';
 },true);
 $('scratch-host-form').addEventListener('submit',async e=>{
  e.preventDefault();
  const feedback=$('scratch-host-feedback'),save=$('scratch-host-save');
  if(save.disabled)return;
  if(!account()){feedback.textContent='⚠️ Bitte zuerst mit deinem DOG-Onlineprofil anmelden.';return;}
  try{
   const settings=readSettings();
   save.disabled=true;feedback.textContent='💾 Speichere auf Render …';
   const response=await query('/settings',{settings});
   if(!response.settings)throw Error('Speichern wurde vom Server nicht bestätigt.');
   if(!status)status={};
   status.settings=response.settings;
   hostDialog.close();drawShop();
   notice('✅ Einstellungen gespeichert. Sie gelten für alle Spieler und künftig gekaufte Lose.');
  }catch(error){feedback.textContent='⚠️ '+(error.message||'Speichern fehlgeschlagen');}
  finally{save.disabled=false;}
 });
 window.addEventListener('spielonline-change',()=>{
  requestId++;status=null;ticket=null;canManageScratch=false;stage.hidden=true;document.body.classList.remove('scratch-ticket-open');hostDialog?.close();void load();
 });
 drawShop();return {load};
}
