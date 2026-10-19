/* Wood Modern v2: isolated display controls; never changes game rules or score. */
(()=>{'use strict';
 const params=new URLSearchParams(location.search);if(!['wood','premium'].includes(params.get('skin')))return;
 document.documentElement.classList.add('skyjo-wood-modern');if(params.get('skin')==='premium')document.documentElement.classList.add('skyjo-premium-wood');
 const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href='skyjo_wood_modern.css?v=3';document.head.appendChild(sheet);
 function init(){document.body.classList.add('skyjo-wood-modern');if(params.get('skin')==='premium')document.body.classList.add('skyjo-premium-wood');
  const dock=document.createElement('div');dock.id='skyjo-wood-dock';dock.hidden=true;
  const reactions=document.createElement('div');reactions.className='wood-reactions';
  const panel=document.createElement('section');panel.id='skyjo-wood-panel';panel.hidden=true;panel.setAttribute('aria-label','Sprüche und Einstellungen');
  const close=document.createElement('button');close.textContent='✕';close.className='wood-close';close.setAttribute('aria-label','Schließen');close.onclick=()=>panel.hidden=true;
  const heading=document.createElement('h3');panel.append(close,heading);
  const content=document.createElement('div');panel.append(content);
  const show=(title,build)=>{heading.textContent=title;content.replaceChildren();build(content);panel.hidden=false};
  const add=(root,label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;root.append(b);return b};
  const emoji=['😡','🙈','😭','😂'];
  emoji.forEach(e=>add(reactions,e,()=>{const old=document.getElementById('skyjo-wood-reaction');old?.remove();const el=document.createElement('div');el.id='skyjo-wood-reaction';el.textContent=e;document.body.append(el);el.animate([{opacity:0,transform:'translateX(-50%) scale(.5)'},{opacity:1,transform:'translateX(-50%) scale(1)'},{opacity:0,transform:'translateX(-50%) translateY(-50px)'}],{duration:1400,fill:'forwards'}).finished.then(()=>el.remove()).catch(()=>el.remove())}));
  add(reactions,'💬 Sprüche',()=>show('💬 Sprüche',root=>{const quotes=[['Humor','Wenn der Plan nicht klappt, hilft manchmal ein neuer.'],['Bibel','Alles hat seine Zeit. – Prediger 3,1'],['Bürohumor','Das Meeting war erfolgreich: Wir brauchen noch ein Meeting.']];quotes.forEach(([name,line])=>add(root,name,()=>{const p=document.createElement('p');p.textContent=line;root.append(p)}))}));
  add(reactions,'☰ Menü',()=>show('☰ Anzeige & Bedienung',root=>{
   add(root,'Regeln',()=>{const match=[...document.querySelectorAll('button')].find(b=>/regeln|anleitung/i.test(b.textContent)&&!dock.contains(b));if(match){panel.hidden=true;match.click()}else{const p=document.createElement('p');p.textContent='Regeln über das bestehende Spielmenü öffnen.';root.append(p)}});
   add(root,'Animationen reduzieren',()=>document.body.classList.toggle('wood-reduced-motion'));
   add(root,'Menü schließen',()=>panel.hidden=true);
  }));
  dock.append(reactions);document.body.append(dock,panel);
  const sync=()=>{const playing=document.body.classList.contains('is-playing');dock.hidden=!playing;if(!playing)panel.hidden=true};
  new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});sync();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();