import {compileBoard,createInspection,visibleField,COLOR_NAMES} from './mission-4-board.mjs?v=1';
import {createTouchViewport} from './mission-4-touch.mjs?v=1';
import {createCards,testDiscard,testDeal,testChooseCard,placeTestPiece,TYPES,SEATS} from './mission-4-cards.mjs?v=1';
const $=id=>document.getElementById(id),svg=$('board'),NS='http://www.w3.org/2000/svg';
const palette={red:'#e95252',blue:'#429be8',green:'#43b66b'},zones=['#3f9673','#4b9bc8','#ad855e'];
const symbols={safe:'🛡',checkpoint:'🚩',door:'🚪',spawn:'🌀',key:'🔑',gift:'🎁',trap:'⚠',teleportIn:'🌀',teleportOut:'🌀',lever:'🎚'};
const el=(tag,attrs,parent=svg)=>{const e=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);parent.append(e);return e;};
const txt=(p,t,size=12,fill='#ebf6fa',parent=svg)=>{const e=el('text',{x:p.x,y:p.y,'text-anchor':'middle','dominant-baseline':'central','font-size':size,'font-weight':700,fill,'pointer-events':'none'},parent);e.textContent=t;return e;};
const pts=a=>a.map(p=>p.x+','+p.y).join(' ');
function circle(p,r,fill,stroke,label,detail){const g=el('g',{'data-detail':detail||label,role:'button',tabindex:0,'aria-label':detail||label});el('circle',{cx:p.x,cy:p.y,r,fill,stroke,'stroke-width':2},g);txt(p,label,14,'#fff',g);return g;}
async function init(){
 const response=await fetch('./mission-4-layout.json');if(!response.ok)throw Error('Brett konnte nicht geladen werden.');
 const b=compileBoard(await response.json()),s=createInspection(b),raw=b.source;
 let cards=createCards(),selected=null,picking=false;
 const cardName=t=>t==='swap'?'Tausch':t==='joker'?'Joker':t;
 const option=(value,label)=>{const o=document.createElement('option');o.value=value;o.textContent=label;return o;};
 const status=message=>{$('test-status').textContent=message;};
 const attempt=fn=>{try{fn();}catch(e){status(e.message);}};
 $('test-piece').replaceChildren(...s.pieces.map(p=>option(p.id,COLOR_NAMES[p.color]+' '+p.id.split('-').at(-1))));
 $('test-field').replaceChildren(...b.fields.filter(f=>f.position).map(f=>option(f.number,'Feld '+f.number)));
 $('test-type').replaceChildren(...TYPES.map(t=>option(t,cardName(t))));
 function renderCards(){
  const seat=cards.current,hand=cards.hands[seat];if(!hand.some(c=>c.id===selected))selected=null;
  $('phase').textContent='Phase '+cards.phase+' · Runde '+cards.round;
  $('turn').textContent='👑 '+COLOR_NAMES[SEATS[seat]]+' ist dran';
  $('draw-count').textContent=cards.draw.length;$('discard-count').textContent=cards.discard.length;$('last-card').textContent=cards.last?cardName(cards.last.type):'–';
  $('players').replaceChildren(...SEATS.map((color,i)=>{const p=document.createElement('div');p.className='player'+(i===seat?' active':'');p.style.setProperty('--player-color',palette[color]);const name=document.createElement('strong');name.textContent=(i===seat?'👑 ':'')+COLOR_NAMES[color];const n=document.createElement('small');n.textContent=cards.hands[i].length+' Karten · 2 Figuren';p.append(name,n);return p;}));
  const handEl=$('hand');handEl.replaceChildren();for(const card of hand){const btn=document.createElement('button');btn.type='button';btn.className='dog-test-card';btn.textContent=cardName(card.type);btn.setAttribute('aria-pressed',String(card.id===selected));btn.onclick=()=>{selected=selected===card.id?null:card.id;renderCards();};handEl.append(btn);}
  $('test-discard').disabled=selected===null;
  const old=$('test-slot').value;$('test-slot').replaceChildren(...hand.map((c,i)=>option(i,(i+1)+': '+cardName(c.type))));if(hand[Number(old)]&&old!=='')$('test-slot').value=old;
  $('history').replaceChildren(...cards.history.map(t=>{const p=document.createElement('p');p.textContent=t.replace(/^red ·/,'Rot ·').replace(/^blue ·/,'Blau ·').replace(/^green ·/,'Grün ·');return p;}));
 }
 function place(field){s.pieces=placeTestPiece(b,s.pieces,$('test-piece').value,field);picking=false;$('pick-field').setAttribute('aria-pressed','false');status(field===null?'Figur am Start.':'Figur auf Feld '+field+' gesetzt (Test).');draw();}
 $('place-piece').onclick=()=>attempt(()=>place(Number($('test-field').value)));
 $('return-piece').onclick=()=>attempt(()=>place(null));
 $('pick-field').onclick=()=>{picking=!picking;$('pick-field').setAttribute('aria-pressed',String(picking));status(picking?'Tippe ein sichtbares Lauffeld an.':'Brettauswahl beendet.');};
 $('choose-card').onclick=()=>attempt(()=>{cards=testChooseCard(cards,cards.current,Number($('test-slot').value),$('test-type').value);selected=null;renderCards();status('Testkarte eingesetzt. Der Stapel enthält weiterhin genau 110 Karten.');});
 $('test-discard').onclick=()=>attempt(()=>{cards=testDiscard(cards,selected);selected=null;renderCards();status('Karte testweise abgelegt – keine Figurenbewegung.');});
 $('new-deal').onclick=()=>attempt(()=>{cards=testDeal(cards);selected=null;renderCards();status('Neue Kartenphase verteilt (Test).');});
 $('unlock-section').onclick=()=>{s.section=Number($('test-section').value);s.revealAll=false;$('all').checked=false;draw();status('Abschnitt '+s.section+' testweise geöffnet.');};
 $('reset-test').onclick=()=>{if(!confirm('Lokalen Karten- und Brett-Test neu beginnen?'))return;Object.assign(s,createInspection(b));cards=createCards();selected=null;picking=false;$('pick-field').setAttribute('aria-pressed','false');$('all').checked=true;renderCards();draw();status('Test zurückgesetzt.');};
 $('track-count').textContent=b.fields.length-b.missing.length+'/'+b.fields.length;
 $('free').textContent=s.pieces.length;$('captives').textContent=s.captives.length;
 for(const note of b.notes){const p=document.createElement('p');p.textContent=note;$('notes').append(p);}
 const zoneButtons=b.sections.map(z=>{const btn=document.createElement('button');btn.textContent=z.id+' · '+z.name+' ('+(z.from+1)+'–'+(z.to+1)+')';btn.onclick=()=>{s.section=z.id;s.revealAll=false;$('all').checked=false;draw();};$('sections').append(btn);return btn;});
 $('all').onchange=()=>{s.revealAll=$('all').checked;draw();};
 function draw(){
  svg.replaceChildren();el('rect',{x:0,y:0,width:1000,height:1000,fill:'#142b38'});
  for(const z of b.sections){el('polygon',{points:pts(z.polygon),fill:zones[z.id-1],'fill-opacity':(s.revealAll||z.id<=s.section)?0.19:0.04,stroke:zones[z.id-1],'stroke-width':2,'stroke-opacity':.65});}
  for(let i=1;i<b.fields.length;i++){const a=b.fields[i-1],f=b.fields[i];if(visibleField(b,s,a)&&visibleField(b,s,f))el('line',{x1:a.position.x,y1:a.position.y,x2:f.position.x,y2:f.position.y,stroke:'#b4c7cf','stroke-width':3});}
  for(const f of b.fields){if(!visibleField(b,s,f))continue;const p=f.position,mark=f.feature;const g=circle(p,13,mark?.type==='safe'?'#255987':'#eaf0ef',zones[f.section-1],mark?symbols[mark.type]||'•':'','Feld '+f.number+' · '+b.sections[f.section-1].name+(mark?' · '+mark.type:''));g.setAttribute('data-track-number',f.number);if(!mark)txt(p,String(f.number),10,'#18303d',g);else txt({x:p.x,y:p.y+22},String(f.number),10,'#e5f0f5',g);}
  for(const f of raw.sideFields){const anchor=b.fields[f.anchor];if(!anchor||!visibleField(b,s,anchor))continue;const p=f.position,a=anchor.position;el('line',{x1:a.x,y1:a.y,x2:p.x,y2:p.y,stroke:'#d5aa65','stroke-dasharray':'5 4','stroke-width':2});circle(p,13,palette[f.owner]||'#8f7040','#efc577','🎚','Hebel H'+f.id+' · '+(COLOR_NAMES[f.owner]||'Alle')+' · Anschluss '+(f.anchor+1));txt({x:p.x,y:p.y+22},'H'+f.id,10);}
  if(s.revealAll||s.section>=2){el('polyline',{points:pts(raw.wall.points),fill:'none',stroke:'#8893a2','stroke-width':12,'stroke-linecap':'round','stroke-linejoin':'round','data-detail':'Höhleneingang · Verteidigungsursprung'});(raw.enemies||[]).forEach((p,i)=>{if(p)circle(p,13,'#753c45','#f6b1a1','👾','Fernkämpfer F'+(i+1));});}
  (raw.spawnPoints||[]).forEach((p,i)=>{if(p&&(s.revealAll||(i===0?s.section>=1:s.section>=3)))circle(p,13,'#264259','#7ee2e0','🌀','Gegnerportal P'+(i+1));});
  if(s.revealAll||s.section>=3){raw.bosses.forEach((p,i)=>{if(p){const q=p.trackIndex===undefined?p:raw.track[p.trackIndex];if(q)circle(q,14,'#7446a0','#e2b6f3','👑','Boss B'+(i+1));}});const q=raw.prison,z=q.size;el('rect',{x:q.position.x-z/2,y:q.position.y-z/2,width:z,height:z,rx:7,fill:'#18252e',stroke:'#9eacb5','stroke-width':3,'data-detail':'Gefängnis · neun Gefangene'});for(const c of s.captives)circle(c.position,z*.075,palette[c.color],'#e9f0f5','',COLOR_NAMES[c.color]+' · gefangen');for(let i=1;i<8;i++){const x=q.position.x-z/2+i*z/8;el('line',{x1:x,x2:x,y1:q.position.y-z/2+12,y2:q.position.y+z/2-5,stroke:'#a1adb5','stroke-width':2,'pointer-events':'none'});}}
  for(const p of s.pieces){if(p.field&&!visibleField(b,s,b.fields[p.field-1]))continue;const g=circle(p.position,14,palette[p.color],'#eaf4fa','●',COLOR_NAMES[p.color]+' · freie Figur '+p.id.split('-')[1]);g.setAttribute('data-piece',p.id);if(p.field)g.setAttribute('data-track-number',p.field);}
  if(raw.strike)circle(raw.strike,14,'#e49a3c','#ffe1a0','S','Gemeinsames Schlagfeld');
  zoneButtons.forEach((btn,i)=>btn.setAttribute('aria-pressed',String(!s.revealAll&&s.section===i+1)));
 }
 const select=e=>{const g=e.target.closest('[data-detail]');const d=g?.getAttribute('data-detail');if(d)$('selection').textContent=d;if(picking&&g?.hasAttribute('data-track-number')){const field=Number(g.getAttribute('data-track-number'));$('test-field').value=field;attempt(()=>place(field));return;}if(g?.hasAttribute('data-piece'))$('test-piece').value=g.getAttribute('data-piece');};svg.addEventListener('click',select);svg.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(e);}});draw();renderCards();
 createTouchViewport(svg,$('zoom-out'),$('zoom-in'),$('zoom-reset'));
}
init().catch(e=>{$('notes').textContent='Fehler: '+e.message;console.error(e);});
