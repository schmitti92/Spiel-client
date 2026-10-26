/* SKYJO V20: deterministic loader with retries, integrity and visible errors. */
(async function(){
  'use strict';
  const script=document.currentScript;
  const baseUrl=script && script.src;
  const app=document.getElementById('app');
  function fail(message,error){
    console.error('[SKYJO V20]',message,error||'');
    if(app){app.replaceChildren();const panel=document.createElement('div');panel.setAttribute('role','alert');panel.style.cssText='margin:32px auto;max-width:520px;padding:24px;border-radius:14px;background:#17353a;color:white;font:16px system-ui;text-align:center';const title=document.createElement('strong');title.textContent='SKYJO konnte nicht vollständig geladen werden';const p=document.createElement('p');p.textContent=message;const button=document.createElement('button');button.type='button';button.textContent='Erneut versuchen';button.style.cssText='padding:12px 20px;border:0;border-radius:8px;cursor:pointer';button.onclick=()=>location.reload();panel.append(title,p,button);app.append(panel);}
  }
  async function fetchWithRetry(name,attempts=3){
    let last;
    for(let i=0;i<attempts;i++){
      try{const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);try{const assetUrl=new URL(name,baseUrl);assetUrl.searchParams.set('build',new URL(baseUrl).searchParams.get('v')||'4');const response=await fetch(assetUrl,{cache:'no-store',signal:controller.signal});if(!response.ok)throw Error(name+': HTTP '+response.status);return await response.text();}finally{clearTimeout(timer);}}
      catch(e){last=e;}
    }
    throw Error('Datei nicht erreichbar: '+name+' ('+String(last)+')');
  }
  async function sha256(text){const bytes=new TextEncoder().encode(text);const hash=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join('');}
  try{
    if(!baseUrl)throw Error('Loader-URL nicht verfügbar');
    if(!window.SKYJO_ACTION_DEFINITIONS||Object.keys(window.SKYJO_ACTION_DEFINITIONS).length!==9)throw Error('Spezialkarten-Katalog fehlt oder ist unvollständig');
    const manifest=JSON.parse(await fetchWithRetry('skyjo_action-manifest.json'));
    if(!manifest.parts||!Number.isInteger(manifest.version)||manifest.version<19)throw Error('Ungültige SKYJO-Modulliste');
    const names=Object.keys(manifest.parts);
    if(names.length!==35)throw Error('Erwartet: 35 Logikteile, gefunden: '+names.length);
    const texts=await Promise.all(names.map(n=>fetchWithRetry(n)));
    for(let i=0;i<names.length;i++){
      if(await sha256(texts[i])!==manifest.parts[names[i]])throw Error('Prüfsumme stimmt nicht: '+names[i]);
    }
    const source=texts.join('');
    if(!source.trim())throw Error('Leere SKYJO-Spiellogik');
    const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
    try{const element=document.createElement('script');element.src=url;element.async=false;await new Promise((resolve,reject)=>{element.onload=resolve;element.onerror=()=>reject(Error('Spielskript konnte nicht gestartet werden'));document.head.appendChild(element);});}
    finally{URL.revokeObjectURL(url);}
  }catch(e){fail(e.message||'Unbekannter Ladefehler',e);}
})();
