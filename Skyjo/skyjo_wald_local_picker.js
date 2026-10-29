/* Lokale Wald-Auswahl: keine Online-Lobby, keine Serveraufrufe, keine Spiellogikänderung. */
(()=>{'use strict';
 const q=new URLSearchParams(location.search);
 if(q.get('mode')!=='local')return;
 const KEY='skyjo_local_board_choice_v1';
 let choice=q.get('board')==='wald'?'wald':'standard';if(q.get('board')!=='wald'){try{choice=localStorage.getItem(KEY)==='wald'?'wald':'standard'}catch(_e){}}
 function apply(){document.body.dataset.skyjoLocalBoard=choice;}
 function select(value){choice=value==='wald'?'wald':'standard';try{localStorage.setItem(KEY,choice)}catch(_e){}apply();update();}
 function update(){const sel=document.getElementById('skyjo-local-board-select');if(sel&&sel.value!==choice)sel.value=choice;}
 function mount(){
  apply();
  const app=document.getElementById('app');if(!app)return;
  const setup=app.querySelector('#target');
  if(!setup)return;
  if(document.getElementById('skyjo-local-board-picker')){update();return;}
  const host=setup.closest('.panel')||setup.parentElement?.parentElement||app;
  const field=document.createElement('div');field.id='skyjo-local-board-picker';
  field.style.cssText='margin:12px 0;padding:12px 16px;border:1px solid #a88145;border-radius:12px;background:#123a30;color:#f9e8bc';
  const label=document.createElement('label');label.htmlFor='skyjo-local-board-select';label.textContent='🌲 Spielbrett (nur lokal)';label.style.cssText='display:block;font-weight:700;margin-bottom:8px';
  const sel=document.createElement('select');sel.id='skyjo-local-board-select';sel.style.cssText='width:100%;min-height:42px;border-radius:8px;padding:8px;background:#102d27;color:white;border:1px solid #d0a969';
  for(const [value,title] of [['standard','Klassisch'],['wald','Wald-Edition 🌲']]){const o=document.createElement('option');o.value=value;o.textContent=title;sel.appendChild(o)}
  sel.value=choice;sel.addEventListener('change',()=>select(sel.value));
  const note=document.createElement('small');note.textContent='Die Auswahl gilt nur auf diesem Gerät. Regeln und Spieler bleiben unverändert.';note.style.cssText='display:block;margin-top:6px;opacity:.85';
  field.append(label,sel,note);host.appendChild(field);
 }
 let scheduled=false;function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;mount()})}
 function start(){mount();const app=document.getElementById('app');if(app)new MutationObserver(schedule).observe(app,{childList:true,subtree:true})}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
