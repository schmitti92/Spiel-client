/** Persönlicher Forschungsbaum für DOG Weihnachten.
 * All state, purchases and claimed rewards are verified by the Render server.
 */
export function initChristmasResearch(){
 const $=id=>document.getElementById(id);
 const root=$('dog-research-shell');if(!root)return {load:async()=>{}};
 const base=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
 const status=$('dog-research-status'),summary=$('dog-research-summary'),cards=$('dog-research-cards');
 const categories=[['all','✨ Alle'],['game','🃏 Spiel'],['xp','📚 Erfahrung'],['scratch','🎟️ Rubbellose'],['village','🎄 Weihnachtsdorf']];
 const user=()=>{const s=window.SpielOnline?.state?.();return s?.status==='online'&&s?.user?.getIdToken?s.user:null};
 let data=null,filter='all',pending=null,requestId=0,working=false;
 const node=(tag,cls,text)=>{const a=document.createElement(tag);if(cls)a.className=cls;if(text!==undefined)a.textContent=String(text);return a};
 const message=(s,isError=false)=>{status.textContent=s;status.dataset.error=String(isError)};
 const format=n=>new Intl.NumberFormat('de-DE').format(n||0);
 function card(skill,now){
  const level=data.levels?.[skill.id]||0,max=skill.maxLevel,full=level>=max;
  const article=node('article','dog-research-card'+(!skill.enabled?' dog-research-card--preview':'')+(full?' dog-research-card--full':''));
  const top=node('div','dog-research-card-top');
  const icon=node('div','dog-research-icon',skill.icon);
  const info=node('div','dog-research-card-info');
  info.append(node('h3','',skill.name),node('span','dog-research-group',skill.category==='game'?'Spiel & Grinch':skill.category==='xp'?'Erfahrung & Level':skill.category==='scratch'?'Glück & Rubbellose':'Dorf & Weihnachten'));
  top.append(icon,info,node('span','dog-research-rank',level+' / '+max));
  article.append(top,node('p','dog-research-desc',skill.description),node('p','dog-research-effect',skill.steps));
  const dots=node('div','dog-research-dots');dots.setAttribute('aria-label',level+' von '+max+' Forschungsstufen');
  for(let i=0;i<max;i++){const dot=node('span',i<level?'is-owned':'');dots.append(dot)}
  article.append(dots);
  if(skill.id==='pity'&&level>0){
   article.append(node('p','dog-research-perk','🍀 '+data.pityNiets+' / '+(10-level)+' bezahlte Nieten bis zum nächsten einfachen Gratislos'));
  }
  if(['free_ticket','builder'].includes(skill.id)&&level>0){
   const target=skill.id==='builder'?data.cooldowns?.builderAt:data.cooldowns?.freeTicketAt;
   const wait=Number(target)>now?new Date(target).toLocaleString('de-DE',{dateStyle:'short',timeStyle:'short'}):null;
   article.append(node('p','dog-research-perk',wait?'⏳ Nächste Abholung: '+wait:'🎁 Belohnung kann abgeholt werden'));
   if(skill.id==='free_ticket'){
    const claimRow=node('div','dog-research-claim-row');
    const select=node('select','dog-research-tier');
    for(const [value,label] of [['simple','🎟️ Einfaches Los'],['medium','💎 Mittleres Los']]){
     const option=node('option','',label);option.value=value;select.append(option);
    }
    select.setAttribute('aria-label','Losart wählen');select.disabled=working;
    const btn=node('button','dog-research-claim','🎁 Los abholen');
    btn.disabled=working||Boolean(wait);
    btn.addEventListener('click',()=>void claim('free_ticket',select.value));
    claimRow.append(select,btn);article.append(claimRow);
   }else{
    const btn=node('button','dog-research-claim','⭐ '+level+' Weihnachtslichter einsammeln');
    btn.disabled=working||Boolean(wait);
    btn.addEventListener('click',()=>void claim('builder'));
    article.append(btn);
   }
  }
  const bottom=node('div','dog-research-card-bottom');
  if(!skill.enabled){
   bottom.append(node('span','dog-research-wait','🔒 Spielfunktion in Vorbereitung'));
  }else if(full){
   bottom.append(node('span','dog-research-max','✓ Vollständig erforscht'));
  }else{
   const cost=skill.nextCost;
   const button=node('button','dog-research-upgrade','✦ '+cost+' FP · Erforschen');
   button.disabled=working||data.available<cost;
   button.title=data.available<cost?'Nicht genügend Forschungspunkte':'Nächste Stufe freischalten';
   button.addEventListener('click',()=>void upgrade(skill));
   bottom.append(button);
  }
  article.append(bottom);return article;
 }
 function render(){
  if(!data)return;
  const owned=data.skills.filter(s=>data.levels[s.id]>0).length;
  summary.hidden=false;
  $('dog-research-points').textContent=format(data.available);
  $('dog-research-earned').textContent=format(data.earned);
  $('dog-research-spent').textContent=format(data.spent);
  $('dog-research-player-level').textContent=String(data.level);
  $('dog-research-unlocked').textContent=owned+' / '+data.skills.length;
  const tabs=$('dog-research-filters');tabs.replaceChildren();
  for(const [id,label] of categories){
   const btn=node('button','dog-research-filter'+(filter===id?' is-active':''),label);
   btn.type='button';btn.setAttribute('aria-pressed',String(filter===id));
   btn.addEventListener('click',()=>{filter=id;render()});tabs.append(btn);
  }
  cards.replaceChildren();
  const now=Date.now();
  for(const skill of data.skills.filter(s=>filter==='all'||s.category===filter))cards.append(card(skill,now));
 }
 async function call(endpoint,body=null){
  const current=user();if(!current)throw Error('Bitte zuerst anmelden.');
  const uid=current.uid,token=await current.getIdToken();
  if(user()?.uid!==uid)throw Error('Profil gewechselt.');
  const reply=await fetch(base+'/api/hub/dog/research'+endpoint,{
   method:body?'POST':'GET',mode:'cors',cache:'no-store',
   headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},
   body:body?JSON.stringify(body):undefined
  });
  const result=await reply.json().catch(()=>({}));
  if(!reply.ok||result.ok!==true)throw Error(result.error||'RESEARCH_SERVER_ERROR');
  if(user()?.uid!==uid)throw Error('Profil gewechselt.');
  return result.research;
 }
 async function upgrade(skill){
  if(working||!data||!skill.enabled||data.available<skill.nextCost)return;
  if(!window.confirm(skill.name+' auf Stufe '+((data.levels[skill.id]||0)+1)+' erforschen? Kosten: '+skill.nextCost+' FP.'))return;
  working=true;render();
  try{data=await call('/upgrade',{id:skill.id});message('✨ '+skill.name+' wurde erfolgreich erforscht!');}
  catch(e){message('⚠️ Forschung fehlgeschlagen: '+e.message,true);}
  finally{working=false;render();}
 }
 async function claim(type,tier){
  if(working)return;
  working=true;render();
  try{data=await call('/claim',{type,...(tier?{tier}:{})});message(type==='builder'?'⭐ Weihnachtslichter wurden dem gemeinsamen Dorf gutgeschrieben.':'🎟️ Dein Gratislos liegt jetzt als Gutschein im Rubbellos-Konto.');}
  catch(e){message('⚠️ Abholung fehlgeschlagen: '+e.message,true);}
  finally{working=false;render();}
 }
 async function load(){
  if(pending)return pending;
  const current=user(),id=++requestId;
  if(!current){summary.hidden=true;cards.replaceChildren();message('🔐 Bitte melde dich mit deinem Online-Spielerprofil an.',true);return}
  message('🔬 Persönliche Forschungen werden geladen …');
  pending=(async()=>{
   const result=await call('');
   if(id!==requestId||user()?.uid!==current.uid)return;
   data=result;render();message('✅ Alle Forschungspunkte und Verbesserungen gehören deinem Spielerkonto.');
  })();
  try{await pending}catch(e){if(id===requestId)message('⚠️ Forschungsdaten konnten nicht geladen werden: '+e.message,true);}
  finally{pending=null}
 }
 $('dog-research-refresh').addEventListener('click',()=>void load());
 window.addEventListener('spielonline-change',()=>{
  requestId++;data=null;summary.hidden=true;cards.replaceChildren();
  if($('tab-research')?.getAttribute('aria-selected')==='true')void load();
 });
 return {load};
}
