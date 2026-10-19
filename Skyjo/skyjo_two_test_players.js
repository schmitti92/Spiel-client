/* Optional single-device preview: reuses the normal SKYJO Action engine and its existing AI. */
(()=>{
 const q=new URLSearchParams(location.search);
 if(q.get('testPlayers')!=='2'||q.get('mode')!=='local')return;
 let tries=0;
 const timer=setInterval(()=>{
   if(++tries>120){clearInterval(timer);return;}
   if(!window.Game?.selectSetupMode||!window.Game?.startAIFromSetup)return;
   clearInterval(timer);
   try{
     window.Game.selectSetupMode('ai');
     const count=document.getElementById('aiCount');
     if(!count){return;}
     count.value='2';
     const difficulty=document.getElementById('aiDifficulty');
     if(difficulty)difficulty.value='normal';
     window.Game.startAIFromSetup();
   }catch(err){console.error('[skyjo preview]',err);}
 },100);
})();
