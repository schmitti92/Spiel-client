(()=>{'use strict';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search),code=params.get('room')||'',api=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
const E=window.SkyjoPreviewEngine,names=['Du (Host)','🤖 Testspieler 1','🤖 Testspieler 2'];let s=null,auto=false,timer=null,verified=false,choice='swap';
function stop(){auto=false;if(timer!==null){clearTimeout(timer);timer=null}const b=$('auto-test');if(b)b.textContent='🤖 Auto-Test starten'}
function reset(){stop();s=E.create();choice='swap';render()}
function cardClass(card){return !card.up?'face-down':card.value<0?'open neg':card.value===0?'open zero':card.value<=4?'open low':card.value<=8?'open mid':'open high'}
function render(){if(!s)return;
 $('boards').replaceChildren();
 s.boards.forEach((cards,i)=>{const section=document.createElement('section');section.className='board'+(i===0?' self':'')+(E.current(s)===i&&!s.finished?' active-turn':'');
 const heading=document.createElement('h2');heading.textContent=names[i]+(E.current(s)===i&&!s.finished?' • dran':'');section.append(heading);
 const grid=document.createElement('div');grid.className='grid';
 cards.forEach((value,n)=>{const card=document.createElement(i===0?'button':'div');if(i===0){card.type='button';card.disabled=s.finished||auto||E.current(s)!==0||!s.pending||(choice==='discard-reveal'&&value.up);card.title=card.disabled?'':'Karte für den gewählten Zug auswählen';card.addEventListener('click',()=>hostPlace(n))}
 card.className='card '+cardClass(value);card.textContent=value.up?String(value.value):'SKYJO';card.setAttribute('aria-label',value.up?'Karte '+(n+1)+': '+value.value:'Karte '+(n+1)+' verdeckt');grid.append(card)});
 section.append(grid);$('boards').append(section)});
 $('remaining').textContent=String(s.deck.length);
 $('discard').textContent=s.discard.length?String(s.discard.at(-1)):'–';
 const top=s.discard.at(-1),face=$('discard-face'),card=$('discard-card');face.textContent=top===undefined?'–':String(top);card.className='pile-card pile-face '+(top===undefined?'empty':top<0?'neg':top===0?'zero':top<=4?'low':top<=8?'mid':'high');
 $('draw-deck').classList.toggle('pile-empty',s.deck.length===0);
 $('draw-deck').setAttribute('aria-label','Nachziehstapel: '+s.deck.length+' Karten. '+(s.pending?'Karte bereits gezogen':'Karte ziehen'));
 $('draw-discard').setAttribute('aria-label','Ablagestapel: '+(top===undefined?'leer':'oberste Karte '+top)+'. '+(s.pending?'Karte bereits gezogen':'Karte nehmen'));
 $('step').disabled=s.finished||!!s.pending;
 $('draw-deck').disabled=s.finished||auto||E.current(s)!==0||!!s.pending||(!s.deck.length&&s.discard.length<=1);
 $('draw-discard').disabled=s.finished||auto||E.current(s)!==0||!!s.pending||!s.discard.length;
 $('discard-reveal').disabled=!s.pending||s.pending.source!=='deck'||auto||E.current(s)!==0;
 $('discard-reveal').title=!s.pending?'Zuerst eine Karte vom Nachziehstapel ziehen':s.pending.source!=='deck'?'Nur mit einer Karte vom Nachziehstapel möglich':'Gezogene Karte ablegen und eine verdeckte Karte aufdecken';
 $('swap-card').disabled=!s.pending||auto||E.current(s)!==0;
 $('swap-card').title=!s.pending?'Zuerst eine Karte von einem Stapel ziehen':'Gezogene Karte gegen eine eigene Karte tauschen';
 $('discard-reveal').classList.toggle('chosen',!!s.pending&&choice==='discard-reveal');
 $('swap-card').classList.toggle('chosen',!!s.pending&&choice==='swap');
 $('draw-deck').classList.toggle('pile-selected',!!s.pending&&s.pending.source==='deck');
 $('draw-discard').classList.toggle('pile-selected',!!s.pending&&s.pending.source==='discard');
 $('discard-reveal').setAttribute('aria-pressed',String(choice==='discard-reveal'));
 $('swap-card').setAttribute('aria-pressed',String(choice==='swap'));
 const pending=s.pending?' · gezogene Karte: '+s.pending.value:'';
 if(s.finished){const results=s.boards.map((b,i)=>({name:names[i],score:b.reduce((sum,c)=>sum+c.value,0)}));$('status').textContent='🏆 Test beendet · '+results.map(x=>x.name+': '+x.score+' P.').join(' · ')}
 else if(E.current(s)===0)$('status').textContent=s.pending?'👑 '+(choice==='swap'?'Karte zum Tauschen antippen':'Verdeckte Karte aufdecken')+pending:'👑 Du bist dran – zuerst Nachziehstapel oder Ablagestapel antippen';
 else $('status').textContent=names[E.current(s)]+' ist dran';
}
function hostPlace(index){if(!verified||auto||!s||E.current(s)!==0)return;if(E.place(s,index,choice)){choice='swap';render()}}
function hostPick(source){if(!verified||auto||!s||E.current(s)!==0)return;if(E.pick(s,source)){choice='swap';render()}}
function step(){if(!verified||!s||s.finished||s.pending)return;const i=E.current(s);if(i===0){if(!E.pick(s,'deck'))E.pick(s,'discard');const hidden=s.boards[0].findIndex(c=>!c.up);const target=hidden>=0?hidden:0;E.place(s,target,'swap')}else E.bot(s);render()}
function schedule(){if(!auto||!s)return;if(s.finished){stop();return}timer=setTimeout(()=>{timer=null;if(document.hidden){stop();return}step();schedule()},550)}
$('draw-deck').onclick=()=>hostPick('deck');$('draw-discard').onclick=()=>hostPick('discard');
$('swap-card').onclick=()=>{choice='swap';render()};$('discard-reveal').onclick=()=>{choice='discard-reveal';render()};
$('step').onclick=()=>{stop();step()};$('reset').onclick=reset;
const autoBtn=document.createElement('button');autoBtn.id='auto-test';autoBtn.type='button';autoBtn.textContent='🤖 Auto-Test starten';$('scene').querySelector('footer').append(autoBtn);
autoBtn.onclick=()=>{if(auto){stop();render();return}if(!verified||!s||s.pending)return;if(s.finished)reset();auto=true;autoBtn.textContent='⏸ Auto-Test stoppen';schedule()};
async function boot(){try{
 if(!/^[A-HJ-NP-Z2-9]{6}$/.test(code))throw Error('Kein gültiger Raumcode.');
 let user=null;for(let i=0;i<30;i++){const state=window.SpielOnline?.state?.();if(state?.status==='online'&&state.user?.getIdToken){user=state.user;break}await new Promise(r=>setTimeout(r,300))}
 if(!user)throw Error('Bitte anmelden.');const token=await user.getIdToken();
 const res=await fetch(api+'/api/hub/rooms/'+code,{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:AbortSignal.timeout(12000)});if(!res.ok)throw Error('Raum konnte nicht geprüft werden.');
 const data=await res.json();if(data?.room?.host!==true||data.room.game!=='skyjo')throw Error('Nur der Host einer SKYJO-Lobby darf diese Vorschau öffnen.');
 verified=true;$('guard').textContent='✔ Host bestätigt – isolierter Kartentest bereit';$('game').hidden=false;reset()
 }catch(e){$('guard').textContent='⛔ '+e.message}}
document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();render()}});window.addEventListener('pagehide',stop);boot();
})();