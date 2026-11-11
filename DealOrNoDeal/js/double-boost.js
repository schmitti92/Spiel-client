'use strict';
// One voluntary, server-authoritative x2 payout purchase per player/match.
// Shown only while this player's personal case has not been selected.
(()=>{
 const stage=document.querySelector('.case-stage');if(!stage)return;
 const panel=document.createElement('div');
 panel.id='deal-double-boost';
 panel.className='deal-double-boost';
 panel.hidden=true;
 panel.innerHTML='<div class="deal-double-boost-mark" aria-hidden="true">✦ <b>×2</b> ✦</div><div class="deal-double-boost-copy"><strong>💎 Doppelter Gewinn für diese Partie</strong><span>Auch Bankerangebote ×2 · einmalig 5.000.000 € Spielgeld</span><small id="deal-double-boost-info" role="status" aria-live="polite"></small></div><button id="deal-double-boost-buy" type="button">Für 5.000.000 € aktivieren</button><span id="deal-double-boost-active" class="deal-double-boost-active" hidden>✓ ×2 AKTIV</span>';
 stage.insertBefore(panel,stage.querySelector('#turn-spotlight')||stage.firstChild);
 const buy=panel.querySelector('#deal-double-boost-buy');
 const active=panel.querySelector('#deal-double-boost-active');
 const info=panel.querySelector('#deal-double-boost-info');
 let pending=false,feedback='',lastGameId=null;
 const errors={BOOST_INSUFFICIENT_FUNDS:'Du brauchst mindestens 5.000.000 € auf deinem Spielkonto.',BOOST_WINDOW_CLOSED:'Der Bonus kann nur vor der Wahl deines persönlichen Koffers gekauft werden.',INVALID_WALLET_BALANCE:'Dein Kontostand konnte nicht geprüft werden.',MATCH_NOT_FOUND:'Die Partie wurde nicht gefunden.'};
 function renderBoost(game){
  if(game?.id!==lastGameId){feedback='';lastGameId=game?.id||null}
  const player=game?.players?.find(p=>p.id===myId());
  const eligible=!!player&&game.phase==='select'&&player.case===null;
  panel.hidden=!eligible;
  if(!eligible)return;
  const enabled=player.doublePayout===true;
  panel.dataset.active=enabled?'yes':'no';
  buy.hidden=enabled;
  buy.disabled=pending||busy;
  active.hidden=!enabled;
  info.textContent=enabled?'Nur deine Geldgewinne werden verdoppelt; Kofferwerte und Sonderpreise bleiben unverändert.':feedback||'Nur dein Gewinn wird ×2; die anderen Spieler bleiben unbeeinflusst.';
 }
 buy.addEventListener('click',async()=>{
  if(pending||busy||!g||g.phase!=='select')return;
  const player=g.players?.find(p=>p.id===myId());
  if(!player||player.case!==null||player.doublePayout)return;
  pending=true;feedback='Kauf wird sicher gespeichert …';renderBoost(g);
  try{
   const data=await request('POST','/double-boost');
   if(data.game?.id===g?.id){
    if(typeof applyDealState==='function')applyDealState(data.game);
    else if(data.game.revision>g.revision)g=data.game;
   }
   feedback=data.alreadyActive?'Dein Bonus war bereits aktiviert. Es wurde nichts erneut abgezogen.':'5.000.000 € bezahlt. Dein ×2-Bonus ist jetzt aktiv.';
  }catch(e){
   feedback='⚠️ '+(errors[e.message]||e.message||'Kauf fehlgeschlagen');
  }finally{pending=false;renderBoost(g)}
 });
 window.DealDoubleBoost={render:renderBoost};
})();
