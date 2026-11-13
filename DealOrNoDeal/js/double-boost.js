'use strict';
// Server-authoritative optional x2 payout: cost comes from host economy settings.
(()=>{
 const stage=document.querySelector('.case-stage');if(!stage)return;
 const panel=document.createElement('div');panel.id='deal-double-boost';panel.className='deal-double-boost';panel.hidden=true;
 panel.innerHTML='<div class="deal-double-boost-mark" aria-hidden="true">✦ <b>×2</b> ✦</div><div class="deal-double-boost-copy"><strong>💎 ×2-Auszahlungsbonus</strong><span></span><small id="deal-double-boost-info" role="status" aria-live="polite"></small></div><button id="deal-double-boost-buy" type="button"></button><span id="deal-double-boost-active" hidden>✓ ×2 aktiviert</span>';
 stage.insertBefore(panel,stage.querySelector('#turn-spotlight')||stage.firstChild);
 const buy=panel.querySelector('#deal-double-boost-buy'),active=panel.querySelector('#deal-double-boost-active'),info=panel.querySelector('#deal-double-boost-info'),description=panel.querySelector('.deal-double-boost-copy span');
 const eur=amount=>(amount/100).toLocaleString('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0});
 const economy=()=>window.DealEconomy?.current?.()||{prices:{doubleBoost:300000000},doubleBoostEnabled:true};
 let pending=false,feedback='',lastGameId=null;
 const errors={BOOST_INSUFFICIENT_FUNDS:'Nicht genügend Geld auf deinem Spielkonto.',BOOST_WINDOW_CLOSED:'Dieser Bonus ist nur vor der Wahl deines Koffers verfügbar.',BOOST_DISABLED:'Der Host hat den ×2-Bonus deaktiviert.',PRICE_CHANGED:'Der Host hat den Preis geändert. Bitte den neuen Preis prüfen.',INVALID_WALLET_BALANCE:'Dein Kontostand konnte nicht geprüft werden.',MATCH_NOT_FOUND:'Die Partie wurde nicht gefunden.'};
 function renderBoost(game){
  if(game?.id!==lastGameId){feedback='';lastGameId=game?.id||null}
  const player=game?.players?.find(p=>p.id===myId()),eligible=!!player&&game.phase==='select'&&player.case===null;
  panel.hidden=!eligible;if(!eligible)return;
  const settings=economy(),price=Number(settings.prices?.doubleBoost??300000000);
  const enabled=player.doublePayout===true,allowed=settings.doubleBoostEnabled!==false;
  panel.dataset.active=enabled?'yes':'no';buy.hidden=enabled;buy.disabled=pending||busy||!allowed;active.hidden=!enabled;
  buy.textContent='Für '+eur(price)+' aktivieren';
  description.textContent='Normale Siegerwertung · ×2 erst am Ende · maximal 50.000.000 € · Preis: '+eur(price);
  info.textContent=enabled?'Der Gewinn wird erst nach der Siegerwertung verdoppelt, höchstens auf 50.000.000 €.':!allowed?'🔒 Der ×2-Bonus wurde vom Host deaktiviert.':feedback||'Die Gewinner und Platzierungen bleiben unverändert.';
 }
 buy.addEventListener('click',async()=>{
  if(pending||busy||!g||g.phase!=='select'||economy().doubleBoostEnabled===false)return;
  const player=g.players?.find(p=>p.id===myId());
  if(!player||player.case!==null||player.doublePayout)return;
  const expectedCost=Number(economy().prices?.doubleBoost??300000000);
  pending=true;feedback='Kauf wird sicher gespeichert …';renderBoost(g);
  try{
   const data=await request('POST','/double-boost',{expectedCost});
   if(data.game?.id===g?.id){
    if(typeof applyDealState==='function')applyDealState(data.game);
    else if(data.game.revision>g.revision)g=data.game;
   }
   feedback=data.alreadyActive?'Bereits aktiviert – keine erneute Abbuchung.':eur(data.cost)+' bezahlt. Der ×2-Bonus ist aktiv.';
  }catch(e){
   feedback='⚠️ '+(errors[e.message]||e.message||'Kauf fehlgeschlagen');
   if(e.message==='PRICE_CHANGED')try{await window.DealEconomy?.load?.(true)}catch{}
  }finally{pending=false;renderBoost(g)}
 });
 window.addEventListener('deal-economy-updated',()=>{if(typeof g!=='undefined')renderBoost(g)});
 window.DealDoubleBoost={render:renderBoost};
})();
