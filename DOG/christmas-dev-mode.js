/**
 * Lichtertal: browser-only development previews.
 * PIN 123 is a convenience lock, not security or an authorization token.
 * Never send these values as game, prize or research API arguments.
 */
const BUILDINGS=[
 ['tower','⭐ Weihnachtslichter-Turm'],['workshop','🎁 Wichtelwerkstatt'],
 ['bakery','🍪 Weihnachtsbäckerei'],['inn','🕯️ Friedensherberge'],
 ['luckhouse','🎟️ Weihnachts-Glückshaus'],['academy','📚 XP-Wichtel-Akademie']
];
const SKILLS=[
 ['card_swap','🃏 Magischer Kartentausch',1],['thaw','🛡️ Weihnachtsschutz',2],
 ['xp','📚 Wichtelwissen',10],['win_xp','🏆 Siegerakademie',10],
 ['discount','🎟️ Glückshaus-Rabatt',10],['coin_bonus','💰 Goldene Gewinnforschung',10],
 ['pity','🍀 Trostengel',5],['free_ticket','🎫 Wichtel-Losfabrik',10],
 ['spot_ticket','🔍 Verborgener Losfinder',1],['spot_light','🌟 Lichtfeld-Entdecker',1],
 ['lights_bonus','⭐ Sternensammler',10],['builder','🏗️ Weihnachtsbaumeister',3]
];
const LOCAL_KEY='dog-christmas-dev-preview-v1:';
const SESSION_KEY='dog-christmas-dev-pin-v1:';
const clamp=(n,min,max)=>Math.max(min,Math.min(max,Number.isFinite(Number(n))?Math.round(Number(n)):min));
const defaults=()=>({
 active:false,buildings:Object.fromEntries(BUILDINGS.map(x=>[x[0],1])),
 tree:1,playerLevel:1,points:0,lights:0,coins:0,grinch:true,caveStage:1,
 research:Object.fromEntries(SKILLS.map(x=>[x[0],0]))
});
const cost=(max,level,id)=>{
 if(['card_swap','spot_ticket','spot_light'].includes(id))return id==='card_swap'?5:3;
 if(max===10)return level<=3?1:level<=7?2:3;
 if(max===5)return [1,1,2,2,3][level-1];
 return level;
};
function sanitized(raw){
 const source=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
 const value=defaults();
 value.active=source.active===true;
 value.grinch=source.grinch!==false;
 value.buildings=Object.fromEntries(BUILDINGS.map(([id])=>[id,clamp(source.buildings?.[id]??1,1,5)]));
 value.research=Object.fromEntries(SKILLS.map(([id,,max])=>[id,clamp(source.research?.[id]??0,0,max)]));
 value.tree=clamp(source.tree??1,1,10);
 value.playerLevel=clamp(source.playerLevel??1,1,50);
 value.points=clamp(source.points??0,0,100000);
 value.lights=clamp(source.lights??0,0,1000000);
 value.coins=clamp(source.coins??0,0,1000000);
 value.caveStage=clamp(source.caveStage??1,1,5);
 return value;
}
const css=[
 'html:not(.dog-dev-grinch) #tab-grinch,html:not(.dog-dev-grinch) #panel-grinch,html:not(.dog-dev-grinch) [data-open-grinch],html:not(.dog-dev-grinch) [data-research-open-tab="grinch"],html:not(.dog-dev-grinch) #grinch-sky-scene,html:not(.dog-dev-grinch) #grinch-scene-toggle{display:none!important}',
 'html:not(.dog-dev-active) #village-max-test{display:none!important}',
 '#dog-dev-launch{display:none;width:100%;margin-top:10px;padding:10px;border:1px solid #b89b61;border-radius:12px;background:#162e38;color:#f9eacb;font:inherit;font-weight:750;cursor:pointer}',
 '#dog-dev-launch.is-visible{display:block}',
 '#dog-dev-launch.is-active{background:#3e300d;color:#fff4be;border-color:#e7c574}',
 '.dog-dev-dialog{width:min(620px,calc(100vw - 24px));max-height:88dvh;overflow:auto;padding:0;border:1px solid #bfa773;border-radius:19px;background:#122634;color:#fdf4dd;box-shadow:0 24px 90px #000b;z-index:2147483600}',
 '.dog-dev-dialog::backdrop{background:#021017d9;backdrop-filter:blur(4px)}',
 '.dog-dev-panel{padding:20px;font:inherit}.dog-dev-heading{display:flex;align-items:start;justify-content:space-between;gap:12px}',
 '.dog-dev-heading h2{margin:0;font-size:1.25rem;color:#f8dc91}.dog-dev-heading p{font-size:.85rem;opacity:.8;margin:5px 0 0}',
 '.dog-dev-close{background:none;border:0;font-size:24px;color:#fff;cursor:pointer}',
 '.dog-dev-dialog button,.dog-dev-dialog input{font:inherit}.dog-dev-button{padding:9px 11px;border:1px solid #d5b971;border-radius:9px;background:#4b3a16;color:#fff3d0;cursor:pointer}',
 '.dog-dev-button:disabled{opacity:.4;cursor:not-allowed}.dog-dev-button-secondary{background:#233e48;border-color:#65808c}',
 '.dog-dev-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:9px 0}.dog-dev-row label{flex:1;font-size:.88rem}',
 '.dog-dev-row output{min-width:48px;text-align:right;color:#ffe4a5;font-weight:800}',
 '.dog-dev-row input[type="range"]{width:35%;min-width:90px;accent-color:#edbf54}',
 '.dog-dev-row input[type="number"]{width:100px;background:#071a25;color:white;border:1px solid #536e79;border-radius:8px;padding:6px}',
 '.dog-dev-tabs{display:flex;gap:7px;flex-wrap:wrap;margin:13px 0}.dog-dev-section{padding:13px;margin:10px 0;background:#193442;border:1px solid #395663;border-radius:12px}',
 '.dog-dev-section h3{margin:0 0 9px;font-size:1rem;color:#ffe2a0}.dog-dev-actions{display:flex;gap:8px;flex-wrap:wrap}',
 '.dog-dev-state{padding:11px;border:1px solid #b5a062;border-radius:12px;background:#262f2b;font-weight:750}',
 '.dog-dev-pin input{width:110px;max-width:35vw;padding:10px;border-radius:9px;background:#091d29;color:white;border:1px solid #bca46e}',
 '.dog-dev-info{font-size:.77rem;opacity:.78;line-height:1.5}.dog-dev-fields[hidden],.dog-dev-pin[hidden]{display:none!important}'
].join('\n');

export function initChristmasDeveloper(){
 const style=document.createElement('style');style.textContent=css;document.head.append(style);
 const button=document.createElement('button');button.type='button';button.id='dog-dev-launch';
 button.textContent='⚙️ Entwickler-Einstellungen';
 (document.querySelector('.sidebar-bottom')||document.body).append(button);
 const dialog=document.createElement('dialog');dialog.className='dog-dev-dialog';
 dialog.setAttribute('aria-label','DOG Entwickler-Einstellungen');
 dialog.innerHTML='<section class="dog-dev-panel"><header class="dog-dev-heading"><div><h2>🛠️ Chris · Entwicklerzentrale</h2><p>Nur lokale Testansichten – keine echten Gewinne oder Ausbauten.</p></div><button class="dog-dev-close" type="button" aria-label="Schließen">×</button></header>'+
 '<div class="dog-dev-pin"><p>🔒 Entwickler-PIN eingeben</p><div class="dog-dev-actions"><input type="password" inputmode="numeric" maxlength="3" autocomplete="off" placeholder="PIN" aria-label="Entwickler-PIN"><button class="dog-dev-button" type="button" data-action="unlock">Entsperren</button></div><p class="dog-dev-pin-error" role="status"></p></div>'+
 '<div class="dog-dev-fields" hidden><p class="dog-dev-state" id="dog-dev-status"></p><div class="dog-dev-actions"><button type="button" class="dog-dev-button" data-action="toggle">Entwicklermodus aktivieren</button><button type="button" class="dog-dev-button dog-dev-button-secondary" data-action="max">🏘️ Alles auf Maximum</button></div><div id="dog-dev-control-list"></div><div class="dog-dev-actions"><button type="button" class="dog-dev-button dog-dev-button-secondary" data-action="reset">↩ Testwerte zurücksetzen</button><button type="button" class="dog-dev-button dog-dev-button-secondary" data-action="close">Fertig</button></div><p class="dog-dev-info">Die Werte bleiben ausschließlich auf diesem Gerät und werden nie für Render-, Firebase- oder Belohnungsbuchungen verwendet. PIN 123 ist kein technischer Zugriffsschutz für öffentliche Dateien.</p></div></section>';
 document.body.append(dialog);
 const pinWrap=dialog.querySelector('.dog-dev-pin');
 const pinInput=pinWrap.querySelector('input');
 const fields=dialog.querySelector('.dog-dev-fields');
 const list=dialog.querySelector('#dog-dev-control-list');
 let uid=null,unlocked=false,state=defaults();
 const account=()=>{
  const s=window.SpielOnline?.state?.();
  return s?.status==='online'&&s?.user?.uid&&String(s.profile?.name||'').trim().toLowerCase()==='chris'
   ?s.user.uid:null;
 };
 const isActive=()=>Boolean(uid&&unlocked&&state.active);
 const hasGrinch=()=>isActive()&&state.grinch;
 const read=()=>sanitized(state);
 const notify=()=>{
  document.documentElement.classList.toggle('dog-dev-active',isActive());
  document.documentElement.classList.toggle('dog-dev-grinch',hasGrinch());
  button.classList.toggle('is-active',isActive());
  button.textContent=isActive()?'🧪 Entwicklermodus aktiv':'⚙️ Entwickler-Einstellungen';
  window.dispatchEvent(new CustomEvent('dog-christmas-dev-change'));
 };
 function save(next){
  if(!uid||!unlocked)return;
  state=sanitized(next);
  try{localStorage.setItem(LOCAL_KEY+uid,JSON.stringify(state));}catch{}
  notify();draw();
 }
 function control(label,min,max,value,update){
  const row=document.createElement('div');row.className='dog-dev-row';
  const name=document.createElement('label');name.textContent=label;
  const input=document.createElement('input');input.type='range';input.min=String(min);input.max=String(max);
  input.value=String(value);input.disabled=!state.active;
  const out=document.createElement('output');out.textContent=String(value);
  input.addEventListener('input',()=>{out.textContent=input.value;});
  input.addEventListener('change',()=>update(Number(input.value)));
  row.append(name,input,out);return row;
 }
 function numberControl(label,value,update){
  const row=document.createElement('div');row.className='dog-dev-row';
  const name=document.createElement('label');name.textContent=label;
  const input=document.createElement('input');input.type='number';input.min='0';input.max='1000000';
  input.value=String(value);input.disabled=!state.active;
  input.addEventListener('change',()=>update(Number(input.value)));
  row.append(name,input);return row;
 }
 function section(title){
  const block=document.createElement('section');block.className='dog-dev-section';
  const heading=document.createElement('h3');heading.textContent=title;block.append(heading);
  list.append(block);return block;
 }
 function draw(){
  pinWrap.hidden=unlocked;fields.hidden=!unlocked;
  if(!unlocked)return;
  dialog.querySelector('#dog-dev-status').textContent=isActive()?'🧪 Entwicklungsvorschau aktiv':'🌐 Echte Onlineansicht aktiv';
  dialog.querySelector('[data-action="toggle"]').textContent=state.active?'🌐 Zur echten Ansicht wechseln':'🧪 Entwicklermodus aktivieren';
  list.replaceChildren();
  const b=section('🏘️ Weihnachtsdorf');
  for(const [id,label] of BUILDINGS)b.append(control(label,1,5,state.buildings[id],n=>save({...state,buildings:{...state.buildings,[id]:n}})));
  b.append(control('🎄 Weihnachtsbaum',1,10,state.tree,n=>save({...state,tree:n})));
  const p=section('🏅 Spielerlevel und Testguthaben');
  p.append(control('Spielerlevel',1,50,state.playerLevel,n=>save({...state,playerLevel:n})));
  p.append(numberControl('Zusätzliche Forschungspunkte',state.points,n=>save({...state,points:n})));
  p.append(numberControl('Test-Weihnachtslichter',state.lights,n=>save({...state,lights:n})));
  p.append(numberControl('Testmünzen',state.coins,n=>save({...state,coins:n})));
  const r=section('🔬 Weihnachtsforschung');
  for(const [id,label,max] of SKILLS)
   r.append(control(label,0,max,state.research[id],n=>save({...state,research:{...state.research,[id]:n}})));
  const g=section('👹 Grinch Teil 2');
  const line=document.createElement('div');line.className='dog-dev-row';
  const label=document.createElement('label');label.textContent='Grinchhöhle und Missionsreiter anzeigen';
  const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=state.grinch;checkbox.disabled=!state.active;
  checkbox.addEventListener('change',()=>save({...state,grinch:checkbox.checked}));
  line.append(label,checkbox);g.append(line);
  g.append(control('Höhle · Grafikzustand',1,5,state.caveStage,n=>save({...state,caveStage:n})));
 }
 function syncAccount(){
  const next=account();
  if(next===uid){button.classList.toggle('is-visible',Boolean(uid));return;}
  uid=next;unlocked=false;state=defaults();
  if(uid){
   try{state=sanitized(JSON.parse(localStorage.getItem(LOCAL_KEY+uid)||'{}'));}catch{state=defaults();}
   try{unlocked=sessionStorage.getItem(SESSION_KEY+uid)==='1';}catch{}
  }
  button.classList.toggle('is-visible',Boolean(uid));
  if(!uid&&dialog.open)dialog.close();
  notify();draw();
 }
 button.addEventListener('click',()=>{syncAccount();if(!uid)return;draw();dialog.showModal();if(!unlocked)pinInput.focus();});
 dialog.querySelectorAll('[data-action="close"],.dog-dev-close').forEach(b=>b.addEventListener('click',()=>dialog.close()));
 function unlock(){
  if(!uid)return;
  if(pinInput.value!=='123'){dialog.querySelector('.dog-dev-pin-error').textContent='PIN nicht korrekt';return;}
  unlocked=true;pinInput.value='';dialog.querySelector('.dog-dev-pin-error').textContent='';
  try{sessionStorage.setItem(SESSION_KEY+uid,'1');}catch{}
  notify();draw();
 }
 dialog.querySelector('[data-action="unlock"]').addEventListener('click',unlock);
 pinInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();unlock();}});
 dialog.querySelector('[data-action="toggle"]').addEventListener('click',()=>save({...state,active:!state.active}));
 dialog.querySelector('[data-action="max"]').addEventListener('click',()=>save({
  ...state,active:true,tree:10,playerLevel:50,points:500,grinch:true,
  buildings:Object.fromEntries(BUILDINGS.map(x=>[x[0],5])),
  research:Object.fromEntries(SKILLS.map(x=>[x[0],x[2]]))
 }));
 dialog.querySelector('[data-action="reset"]').addEventListener('click',()=>{
  if(!confirm('Nur die LOKALEN Testwerte zurücksetzen? Echte Spielstände bleiben unverändert.'))return;
  save({...defaults(),active:true});
 });
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncAccount();});
 window.addEventListener('spielonline-change',syncAccount);
 syncAccount();
 return Object.freeze({
  isActive,hasGrinch,settings:read,
  researchData(real){
   if(!isActive()||!real?.skills)return real;
   const skills=real.skills.map(s=>({
    ...s,nextCost:state.research[s.id]<s.maxLevel?cost(s.maxLevel,state.research[s.id]+1,s.id):null
   }));
   const spent=skills.reduce((total,s)=>{
    for(let i=1;i<=state.research[s.id];i++)total+=cost(s.maxLevel,i,s.id);
    return total;
   },0);
   let earned=state.points;
   for(let n=2;n<=state.playerLevel;n++)earned+=n%10===0?3:n%5===0?2:1;
   return {...real,level:state.playerLevel,earned,spent,available:Math.max(0,earned-spent),
    levels:{...state.research},skills,cooldowns:{builderAt:0,freeTicketAt:0},pityNiets:0};
  },
  levelData(real){
   if(!isActive()||!real?.level)return real;
   const n=state.playerLevel,xpAt=x=>100*(x-1)+25*(x-1)*(x-2);
   const total=xpAt(n),next=n===50?null:xpAt(n+1);
   const level={...real.level,level:n,maxLevel:50,totalXp:total,xpIntoLevel:0,
    xpForNextLevel:next===null?0:next-total,xpRemaining:next===null?0:next-total,
    progressPercent:next===null?100:0,nextLevel:n===50?null:n+1};
   return {...real,level,academyXpPercent:(state.buildings.academy-1)*10,
    researchXpPercent:state.research.xp*10,researchWinXpPercent:state.research.win_xp*30};
  }
 });
}
