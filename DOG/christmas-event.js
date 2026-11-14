/**
 * DOG Weihnachtsevent – Kapitel 1, visual design shell.
 *
 * This module NEVER awards currency, claims an unlocked item, posts to the
 * server, or saves preview levels. Later live progression must be verified
 * by the authenticated Render backend and must not trust this preview.
 */
const $=id=>document.getElementById(id);
const tabs=['village','buildings','tree','story','gifts','chapters'];
const COSTS=[0,20,40,65,95];
const TREE_THRESHOLDS=[4,5,7,9,11,13,15,17,19,20];
const FIELDS=[10,12,15,18,20];
const definitions=[
  {id:'tower',icon:'⭐',title:'Weihnachtslichter-Turm',summary:'Mehr leuchtende Geschenkfelder auf dem DOG-Brett.',
    visuals:['Eine kleine Laternenhütte ohne Schmuck.','Fensterlicht, erster Kranz und etwas Schnee.','Goldene Girlanden machen das Haus weihnachtlich.','Ein hoher Turmaufsatz mit Glocken und Laternen.','Ein prachtvoller Turm trägt einen großen Weihnachtsstern.'],
    effects:['10 Lichtfelder','12 Lichtfelder','15 Lichtfelder','18 Lichtfelder','20 Lichtfelder']},
  {id:'workshop',icon:'🎁',title:'Wichtelwerkstatt',summary:'Bessere Chancen auf zusätzliche Sammelobjekte.',
    visuals:['Eine einfache Holzwerkstatt mit wenigen Paketen.','Erste Geschenke und ein Tannenkranz.','Paketstapel, Girlanden und geschmückte Fenster.','Ein Schornstein, mehr Werkbänke und Wichteltrubel.','Eine große, funkelnde Werkstatt mit festlicher Beleuchtung.'],
    effects:['5 % Zusatzchance','10 % Zusatzchance','15 % Zusatzchance','20 % Zusatzchance','25 % Zusatzchance']},
  {id:'bakery',icon:'🍪',title:'Weihnachtsbäckerei',summary:'Mehr gemeinsame Weihnachtslichter aus gesammelten Geschenken.',
    visuals:['Ein schlichtes kleines Backhaus.','Die Fenster leuchten und ein erster Kranz erscheint.','Lebkuchenstand und warme Lichter im Schaufenster.','Größere Backstube, Schornstein und Lichtergirlanden.','Eine prächtige Zuckerbäckerei voller festlichem Glanz.'],
    effects:['Grundwert','+10 % Lichter','+20 % Lichter','+30 % Lichter','+40 % Lichter']},
  {id:'inn',icon:'🕯️',title:'Friedensherberge',summary:'Gemeinschaftsbonus nach vollständig abgeschlossenen Partien.',
    visuals:['Eine kleine, einfache Herberge.','Kranz an der Tür und Kerzen in den Fenstern.','Laternen am Weg und mehr Zimmer für die Dorfbewohner.','Festlicher Dachaufbau und immer hellere Fenster.','Ein großes, warm leuchtendes Haus der Freundschaft.'],
    effects:['Kein Rundenbonus','+1 Licht / Partie','+2 Lichter / Partie','+3 Lichter / Partie','+4 Lichter / Partie']}
];
const treeNames=[
  'Junger Baum','Erste Funken','Adventszauber','Erste Girlanden','Baum der Hoffnung',
  'Sternenzauber','Weihnachtswunder','Glanz der Weihnacht','Der strahlende Stern','Das große Weihnachtslicht'
];
const treeDetails=[
  'Ein kleiner, noch ungeschmückter Tannenbaum steht mitten in Lichtertal.',
  'Die ersten kleinen Weihnachtslichter erscheinen zwischen den Zweigen.',
  'Bunte Kugeln und ein erster Weihnachtsschmuck machen den Baum lebendiger.',
  'Goldene Girlanden kommen hinzu und der Baum ist deutlich gewachsen.',
  'Der Baum wird voller und die Lichter verbreiten eine warme Atmosphäre.',
  'Immer mehr glitzernde Dekorationen und Sterne lassen den Baum strahlen.',
  'Die Weihnachtsbeleuchtung wird dichter und der Baum überragt den Dorfplatz.',
  'Leuchtende Girlanden erhellen nun auch die Straßen des Dorfes.',
  'Der große Stern auf der Spitze wird sichtbar. Die ganze Stadt erwartet den großen Moment.',
  'Der prachtvolle Weihnachtsbaum erleuchtet das ganze Weihnachtsdorf.'
];
const preview={tower:1,workshop:1,bakery:1,inn:1};
function treeLevel(){
  const points=Object.values(preview).reduce((a,b)=>a+b,0);
  return TREE_THRESHOLDS.filter(t=>points>=t).length;
}
function buildingCard(entry){
 const root=document.createElement('article');root.className='building-card';
 root.innerHTML='<div class="building-card-head"><span class="building-card-icon" aria-hidden="true">'+entry.icon+'</span><div><h3>'+entry.title+'</h3><p>'+entry.summary+'</p></div></div>'
   +'<div class="building-card-info"><strong data-building-effect></strong><span data-building-visual></span></div>'
   +'<div class="level-row"><label for="preview-'+entry.id+'">Entwicklungsstufe</label><output for="preview-'+entry.id+'" data-building-value></output></div>'
   +'<input id="preview-'+entry.id+'" type="range" min="1" max="5" step="1" value="1" aria-label="Vorschau der Entwicklungsstufe für '+entry.title+'">'
   +'<div class="building-level-markers" aria-hidden="true">'+Array.from({length:5},()=>'<span></span>').join('')+'</div>';
 const range=root.querySelector('input');
 range.addEventListener('input',()=>{preview[entry.id]=Number(range.value);refreshPreview()});
 return root;
}
const grid=$('building-grid');
for(const item of definitions)grid.append(buildingCard(item));
const steps=$('tree-steps');
treeNames.forEach((name,i)=>{
 const box=document.createElement('div');
 box.className='tree-step';box.dataset.treeStep=String(i+1);
 box.innerHTML='<strong>✦ '+(i+1)+'</strong><span>'+name+'</span>';
 steps.append(box);
});
function refreshPreview(){
 const total=Object.values(preview).reduce((a,b)=>a+b,0),tree=treeLevel();
 for(const d of definitions){
  const level=preview[d.id],card=$('preview-'+d.id).closest('.building-card');
  $('preview-'+d.id).value=String(level);
  card.querySelector('[data-building-effect]').textContent=d.effects[level-1]+' · Vorschau';
  card.querySelector('[data-building-visual]').textContent=d.visuals[level-1];
  card.querySelector('[data-building-value]').textContent='Stufe '+level+' / 5';
  card.querySelectorAll('.building-level-markers>span').forEach((dot,i)=>dot.classList.toggle('active',i<level));
  const art=$('art-'+d.id);
  if(art)art.dataset.level=String(level);
 }
 const view=$('village-view');
 view.dataset.tree=String(tree);
 view.dataset.snow=String(tree<=2?1:tree<=4?2:tree<=6?3:tree<=8?4:5);
 const growth=.59+((tree-1)/9)*.41;
 $('art-tree').setAttribute('transform','translate(612 565) scale('+growth.toFixed(4)+') translate(0 -565)');
 $('stat-building-levels').textContent=total+' / 20';
 $('stat-tree-level').textContent=tree+' / 10';
 $('village-stage-text').textContent=tree===1?'Anfangszustand · Vorschau':tree===10?'Prachtvolles Weihnachtsdorf · Vorschau':'Baum Stufe '+tree+' · Vorschau';
 $('tree-current-title').textContent='Stufe '+tree+' · '+treeNames[tree-1];
 $('tree-current-copy').textContent=treeDetails[tree-1];
 $('tree-progress-fill').style.width=(tree*10)+'%';
 $('tree-progress-label').textContent=tree+' von 10 Entwicklungsstufen · '+total+' von 20 Gebäudestufen';
 for(const item of steps.children)item.classList.toggle('selected',Number(item.dataset.treeStep)===tree);
}
$('village-preview-reset').addEventListener('click',()=>{
 for(const d of definitions)preview[d.id]=1;
 refreshPreview();
});
function validReturn(){
 const raw=new URLSearchParams(location.search).get('return');
 if(!raw)return null;
 try{
  const url=new URL(raw,location.href);
  if(url.origin!==location.origin||!/\/(?:DOG\/index\.html|hub-lobby\.html)$/.test(url.pathname))return null;
  if(url.username||url.password)return null;
  return url.href;
 }catch{return null}
}
const returnTarget=validReturn();
if(returnTarget)$('event-return').href=returnTarget;
function showPanel(id,{updateHistory=true}={}){
 if(!tabs.includes(id))return;
 for(const name of tabs){
  const active=id===name;
  const tab=$('tab-'+name),panel=$('panel-'+name);
  tab.setAttribute('aria-selected',String(active));
  tab.tabIndex=active?0:-1;
  panel.hidden=!active;
 }
 if(updateHistory&&location.hash!=='#'+id)history.replaceState(null,'','#'+id);
 if(window.scrollY>0)window.scrollTo({top:0,behavior:'instant'});
}
for(const id of tabs){
 const tab=$('tab-'+id);
 tab.addEventListener('click',()=>showPanel(id));
 tab.addEventListener('keydown',event=>{
  if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  event.preventDefault();
  const from=tabs.indexOf(id),next=event.key==='Home'?0:event.key==='End'?tabs.length-1:
     (from+(event.key==='ArrowUp'||event.key==='ArrowLeft'?-1:1)+tabs.length)%tabs.length;
  showPanel(tabs[next]);$('tab-'+tabs[next]).focus();
 });
}
document.querySelectorAll('[data-open-tab]').forEach(button=>{
 button.addEventListener('click',()=>showPanel(button.dataset.openTab));
});
window.addEventListener('hashchange',()=>showPanel(location.hash.slice(1),{updateHistory:false}));
showPanel(tabs.includes(location.hash.slice(1))?location.hash.slice(1):'village',{updateHistory:false});
refreshPreview();
