/* Single-device visual preview: use the ORIGINAL SKYJO engine with two existing AI players.
   Only enabled by explicit mode=local&testPlayers=2. Never touches online rooms. */
(()=>{
 'use strict';
 const q=new URLSearchParams(location.search);
 if(q.get('testPlayers')!=='2'||q.get('mode')!=='local')return;
 let attempts=0;
 let finished=false;
 const MAX_ATTEMPTS=150;
 function report(message){
   console.warn('[SKYJO test preview]',message);
   const node=document.createElement('div');
   node.setAttribute('role','alert');
   node.textContent='Testmodus: '+message;
   node.style.cssText='position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:2147483647;background:#142b3d;color:#fff;border:1px solid #e7ba67;border-radius:10px;padding:12px 16px;max-width:90vw;font:14px system-ui;box-shadow:0 5px 24px #0008';
   document.body.appendChild(node);
 }
 const timer=setInterval(()=>{
   if(finished){clearInterval(timer);return;}
   if(++attempts>MAX_ATTEMPTS){
     finished=true;clearInterval(timer);
     report('Das Spiel konnte nicht automatisch gestartet werden. Bitte die Seite neu laden oder den lokalen Modus manuell öffnen.');
     return;
   }
   const game=window.Game;
   if(typeof game?.selectSetupMode!=='function'||typeof game?.startAIFromSetup!=='function')return;
   const count=document.getElementById('aiCount');
   if(!count)return;
   finished=true;
   clearInterval(timer);
   try{
     game.selectSetupMode('ai');
     const countAfter=document.getElementById('aiCount')||count;
     countAfter.value='2';
     countAfter.dispatchEvent(new Event('change',{bubbles:true}));
     const difficulty=document.getElementById('aiDifficulty');
     if(difficulty)difficulty.value='normal';
     game.startAIFromSetup();
   }catch(err){
     console.error('[SKYJO test preview]',err);
     report('Automatischer Start fehlgeschlagen. Bitte den lokalen Computer-Modus manuell starten.');
   }
 },100);
})();
