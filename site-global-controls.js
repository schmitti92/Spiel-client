/* Shared page controls for all games and event screens.
 * Adds a real browser reload beside the existing fullscreen button, or supplies
 * a compact global fullscreen/reload pair on screens without header controls.
 * No polling, database requests, or game state changes.
 */
(()=>{
 'use strict';
 if(window.__siteGlobalControlsInstalled)return;
 window.__siteGlobalControlsInstalled=true;
 const STYLE_ID='site-global-controls-style';
 const TEXT_REFRESH='↻ Aktualisieren';
 const TEXT_FULLSCREEN='⛶ Vollbild';
 function addStyle(){
  if(document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');style.id=STYLE_ID;
  style.textContent=`
    .site-page-control{
      box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;
      gap:5px;min-height:33px;max-width:100%;padding:7px 11px;
      border:1px solid #d3b779;border-radius:9px;
      background:linear-gradient(150deg,#233f58,#11283c);
      color:#fff2d1;font:800 12px/1.15 system-ui,sans-serif;
      white-space:nowrap;cursor:pointer;text-shadow:0 1px 2px #0008;
      box-shadow:inset 0 1px 0 #fff3,0 3px 10px #0005;
      touch-action:manipulation;
    }
    .site-page-control:hover{border-color:#ffe0a0;filter:brightness(1.1)}
    .site-page-control:focus-visible{outline:2px solid #ffe7a0;outline-offset:2px}
    .site-page-control:disabled{opacity:.55;cursor:default}
    .site-page-toolbar{position:fixed;right:calc(8px + env(safe-area-inset-right,0px));
      top:calc(8px + env(safe-area-inset-top,0px));z-index:2147483000;
      display:flex;align-items:center;gap:5px;max-width:calc(100vw - 16px);
      padding:4px;border:1px solid #dbb772;border-radius:12px;
      background:#071b2aea;box-shadow:0 4px 16px #000a}
    .site-page-toast{position:fixed;top:58px;right:10px;z-index:2147483001;
      max-width:min(350px,92vw);padding:10px 14px;border:1px solid #eac986;
      border-radius:10px;background:#142d44;color:#ffebbc;font:700 13px system-ui;
      box-shadow:0 10px 28px #0009}
    @media(max-width:630px){
      .site-page-toolbar .site-page-control{min-width:36px;padding:7px 9px;font-size:0}
      .site-page-toolbar .site-page-control .site-page-icon{font-size:18px}
      .site-page-control.site-page-inline{padding:6px 8px;font-size:11px}
    }
  `;
  (document.head||document.documentElement).append(style);
 }
 function toast(message){
  let n=document.getElementById('site-page-toast');
  if(!n){n=document.createElement('div');n.id='site-page-toast';n.className='site-page-toast';
    n.setAttribute('role','status');n.setAttribute('aria-live','polite');document.body.append(n)}
  n.textContent=message;
  // The message stays until the next interaction; avoid background timers.
 }
 function create(kind,existing){
  const b=document.createElement('button');b.type='button';
  b.id='site-page-'+kind;
  b.className=(existing?.className&&typeof existing.className==='string'?existing.className+' ':'')+'site-page-control'+(existing?' site-page-inline':'');
  const ic=document.createElement('span');ic.className='site-page-icon';ic.setAttribute('aria-hidden','true');
  ic.textContent=kind==='refresh'?'↻':'⛶';
  const tx=document.createElement('span');tx.className='site-page-text';tx.textContent=kind==='refresh'?'Aktualisieren':'Vollbild';
  b.append(ic,tx);
  b.title=kind==='refresh'?'Diese Seite neu laden':'Vollbildmodus ein- oder ausschalten';
  b.setAttribute('aria-label',kind==='refresh'?'Seite aktualisieren':'Vollbild ein- oder ausschalten');
  if(kind==='refresh'){
   b.addEventListener('click',()=>window.location.reload());
  }else{
   b.setAttribute('aria-pressed','false');
   async function toggle(){
    try{
     if(document.fullscreenElement){
      if(document.exitFullscreen)await document.exitFullscreen();
      else throw Error('BROWSER_UNSUPPORTED');
     }else if(document.documentElement.requestFullscreen){
      await document.documentElement.requestFullscreen();
     }else throw Error('BROWSER_UNSUPPORTED');
    }catch(error){toast('Vollbild ist in diesem Browser nicht verfügbar. Nutze gegebenenfalls das Browser-Menü.')}
   }
   b.addEventListener('click',toggle);
   document.addEventListener('fullscreenchange',()=>{
    const active=!!document.fullscreenElement;
    b.setAttribute('aria-pressed',String(active));
    tx.textContent=active?'Vollbild beenden':'Vollbild';
   });
  }
  return b;
 }
 const visible=e=>!!(e&&e.isConnected&&e.getClientRects().length&&!e.closest('dialog,[hidden],[aria-hidden="true"]'));
 function collectButtons(){
  return Array.from(document.querySelectorAll('button')).filter(visible);
 }
 function isFull(e){
  const id=e.id||'',title=e.title||'',aria=e.getAttribute('aria-label')||'',t=(e.textContent||'').trim().slice(0,40);
  return /(?:vollbild|full.?screen)/i.test([id,title,aria,t].join(' '))&&e.id!=='site-page-fullscreen';
 }
 function isPageReload(e){
  if(['studio-refresh','reloadPageBtn','site-page-refresh'].includes(e.id))return true;
  const title=e.title||'',aria=e.getAttribute('aria-label')||'';
  return /(?:seite|page)\s*(?:neu\s*laden|aktualisieren|reload|refresh)/i.test(title+' '+aria);
 }
 function init(){
  if(!document.body||document.getElementById('site-page-toolbar')||document.getElementById('site-page-refresh'))return;
  addStyle();
  const buttons=collectButtons();
  const fs=buttons.filter(isFull).sort((a,b)=>a.getBoundingClientRect().top-b.getBoundingClientRect().top)[0];
  const reload=buttons.filter(isPageReload).sort((a,b)=>a.getBoundingClientRect().top-b.getBoundingClientRect().top)[0];
  // Existing header fullscreen: use the same row and visual classes.
  if(fs){
   const linked=reload&&reload.parentElement===fs.parentElement
    &&Math.abs(reload.getBoundingClientRect().top-fs.getBoundingClientRect().top)<65;
   if(linked)return; // Both buttons are already present at the intended location.
   fs.insertAdjacentElement('afterend',create('refresh',fs));
   return;
  }
  // Pages with a real reload button in the top header only need fullscreen.
  if(reload&&reload.getBoundingClientRect().top<180){
   reload.insertAdjacentElement('beforebegin',create('fullscreen',reload));
   return;
  }
  // Other pages get two always-accessible buttons at the upper-right corner.
  const group=document.createElement('div');group.id='site-page-toolbar';
  group.className='site-page-toolbar';group.setAttribute('role','group');
  group.setAttribute('aria-label','Seitensteuerung');
  group.append(create('fullscreen'),create('refresh'));
  document.body.append(group);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
