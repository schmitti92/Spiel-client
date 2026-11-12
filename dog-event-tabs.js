/* Einheitliche 100-Tore-Navigation. Client-only: keine Netzwerk- oder Datenbankaufrufe. */
(()=>{'use strict';
 const pages=[
  ['dog-expedition.html','📦 Start & Lager','Kisten und Rohstoffe'],
  ['dog-tor-map.html','🗺️ 100-Tore-Karte','Alle Tore und fünf Welten'],
  ['dog-forge.html','⚒️ Schmiede','Waffen, Rüstung und Fähigkeiten'],
  ['dog-merchant.html','💎 Händler','Rohstoffe im Verhältnis 10:1 tauschen'],
  ['dog-ascension.html','✨ Aufstieg','Neue Schmiedestufen'],
  ['dog-boss10.html','🐉 Boss 10','Gemeinsamer Boss 10'],
  ['dog-boss.html','🔥 Tor-1-Arena','Bisherige Testarena']
 ];
 const groupBosses=[[20,'Schattenfürst'],[30,'Kristallwurm'],[40,'Dornenkönig'],
  [50,'Hüter der Tiefe'],[60,'Flammendrache'],[70,'Seelenrichter'],
  [80,'Eisenkoloss'],[90,'Festungswächter'],[100,'Der letzte Wächter']];
 const current=(location.pathname.split('/').pop()||'').toLowerCase();
 const query=new URLSearchParams(location.search);
 const rawRoom=query.get('room')||'';
 const room=/^(?:\d{3}|[A-HJ-NP-Z2-9]{6})$/.test(rawRoom)?rawRoom:'';
 const gate=Number(query.get('gate'));
 const node=(tag,cls,label)=>{
  const item=document.createElement(tag);
  if(cls)item.className=cls;
  if(label!==undefined)item.textContent=label;
  return item;
 };
 const href=(file,params={})=>{
  const q=new URLSearchParams();
  for(const [key,value] of Object.entries(params))q.set(key,String(value));
  if(room)q.set('room',room);
  return './'+file+(q.toString()?'?'+q.toString():'');
 };
 function mount(){
  if(!document.body||document.querySelector('.dog-event-tabs'))return;
  const bar=node('div','dog-event-tabs'),inner=node('div','dog-event-tabs__inner');
  const brand=node('div','dog-event-tabs__brand');
  brand.append(node('span','dog-event-tabs__seal','🏰'));
  const brandText=node('span','dog-event-tabs__brand-text');
  brandText.append(node('strong','','RETTET DOG'),node('small','','DIE 100 TORE'));
  brand.append(brandText);
  const rail=node('nav','dog-event-tabs__rail');
  rail.setAttribute('aria-label','Navigation zu allen 100-Tore-Spielbereichen');
  function addLink(file,label,title,extra=''){
   const active=current===file;
   const a=node('a','dog-event-tabs__tab'+(active?' is-active':'')+(extra?' '+extra:''),label);
   a.href=href(file);a.title=title;
   if(active)a.setAttribute('aria-current','page');
   rail.append(a);
  }
  for(const [file,label,title] of pages){
   addLink(file,label,title);
   if(file==='dog-boss10.html'){
    const wrap=node('label','dog-event-tabs__group'+(current==='dog-group-boss.html'?' is-active':''));
    wrap.append(node('span','','🐲 Bosse 20–100'));
    const select=node('select','dog-event-tabs__select');
    select.setAttribute('aria-label','Gruppenboss-Tor auswählen');
    const placeholder=node('option','','Tor wählen ▾');placeholder.value='';select.append(placeholder);
    for(const [n,name] of groupBosses){
     const option=node('option','','Tor '+n+' · '+name);option.value=String(n);select.append(option);
    }
    select.value=current==='dog-group-boss.html'&&groupBosses.some(([n])=>n===gate)?String(gate):'';
    select.addEventListener('change',()=>{
     const n=Number(select.value);
     if(groupBosses.some(([allowed])=>allowed===n)){
      window.location.assign(href('dog-group-boss.html',{gate:n}));
     }
    });
    wrap.append(select);rail.append(wrap);
   }
  }
  addLink('hub-lobby.html','🎮 Spielelobby','Zur Spielelobby','is-exit');
  const deal=node('a','dog-event-tabs__tab is-exit','🎲 Deal or No Deal');
  deal.href=href('DealOrNoDeal/lobby.html',room?{stay:1}:{});
  deal.title='Zurück zum Deal-or-No-Deal-Spiel';rail.append(deal);
  inner.append(brand,rail);bar.append(inner);
  document.body.insertBefore(bar,document.body.firstChild);
  if(['dog-boss.html','dog-boss10.html','dog-group-boss.html'].includes(current)){
   document.body.classList.add('dog-event-combat');
  }
  document.body.classList.add('dog-event-tabs-ready');
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();