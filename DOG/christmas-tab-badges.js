/** Tiny DOG Weihnachtsmenü action counters.
 * One authenticated on-demand metadata summary at page entry; village
 * affordability uses the village GET already requested by the main page.
 * No intervals, room subscriptions or Firestore client SDK calls.
 */
import {CHRISTMAS_BUILDING_IDS,christmasUpgradeCost} from './christmas-building-costs.js?v=3';

const safe=n=>Number.isSafeInteger(n)&&n>=0?n:0;

/** Maximum number of DIFFERENT buildings that the currently available
 * lights could upgrade once, spending the shared balance only once.
 * Cheapest eligible upgrades first; does not imply all buttons can be
 * purchased simultaneously and does not count future hypothetical upgrades.
 */
export function affordableDogChristmasBuildings(village,{canUpgrade=true}={}){
 if(!village||!canUpgrade)return 0;
 const budget=village.lightsTenths;
 if(!Number.isSafeInteger(budget)||budget<0)return 0;
 const costs=CHRISTMAS_BUILDING_IDS.map(id=>christmasUpgradeCost(village.levels?.[id]))
  .filter(cost=>Number.isSafeInteger(cost)&&cost>0)
  .map(cost=>cost*10).sort((a,b)=>a-b);
 let remaining=budget,count=0;
 for(const price of costs){
  if(price>remaining)break;
  remaining-=price;count++;
 }
 return count;
}
export function safeChristmasPersonalBadges(source){
 if(!source||typeof source!=='object')return null;
 return {scratch:safe(source.scratch),research:safe(source.research),level:safe(source.level)};
}
const TITLES=Object.freeze({
 buildings:'Die sechs Gebäude',scratch:'Rubbellose',
 research:'Weihnachtsforschung',level:'Mein Spielerlevel'
});
const DESCRIPTION=Object.freeze({
 buildings:'verschiedene Gebäude aktuell mit den vorhandenen Weihnachtslichtern ausbaubar',
 scratch:'kostenlose Rubbellose verfügbar',
 research:'freie Forschungspunkte vorhanden',
 level:'Levelbelohnungen abholbereit'
});
const MAX_BADGE=99;
export function initChristmasTabBadges({
 getUser=()=>window.SpielOnline?.state?.()?.user,
 getPreview=()=>false,
 base=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,''),
 doc=document,
 target=window
}={}){
 const nodes=new Map();
 for(const id of Object.keys(TITLES)){
  const tab=doc.getElementById('tab-'+id);
  if(!tab)continue;
  const badge=doc.createElement('span');
  badge.className='christmas-tab-badge';
  badge.hidden=true;
  badge.setAttribute('aria-hidden','true');
  tab.append(badge);
  nodes.set(id,{tab,badge});
 }
 let personal=null,village=null,villageAllowed=false,readUid=null,pending=null,serial=0;
 const uid=()=>getUser()?.uid||null;
 let authUid=uid();
 function paint(){
  const disabled=Boolean(getPreview()),account=uid();
  const values={
   buildings:!disabled&&account?affordableDogChristmasBuildings(village,{canUpgrade:villageAllowed}):0,
   scratch:!disabled&&account?safe(personal?.scratch):0,
   research:!disabled&&account?safe(personal?.research):0,
   level:!disabled&&account?safe(personal?.level):0
  };
  for(const [id,{tab,badge}]of nodes){
   const n=values[id];
   badge.hidden=n===0;
   badge.textContent=n>MAX_BADGE?MAX_BADGE+'+':String(n);
   const detail=n>0?' · '+n+' '+DESCRIPTION[id]:'';
   tab.setAttribute('aria-label',TITLES[id]+detail);
   tab.title=TITLES[id]+detail;
   tab.classList.toggle('has-christmas-actions',n>0);
  }
  return values;
 }
 function clearProfile(){
  serial++;pending=null;personal=null;readUid=null;village=null;villageAllowed=false;
  paint();
 }
 async function load({force=false}={}){
  const user=getUser();
  if(!user?.uid||typeof user.getIdToken!=='function'){clearProfile();return null;}
  const id=user.uid;
  if(!force&&personal&&readUid===id)return personal;
  if(pending&&pending.uid===id)return pending.promise;
  const request=++serial;
  let work=null;
  work=(async()=>{
   try{
    const token=await user.getIdToken();
    if(uid()!==id||request!==serial)return null;
    const response=await fetch(base+'/api/hub/dog/christmas-tab-badges',{
     cache:'no-store',headers:{Authorization:'Bearer '+token}
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok||data.ok!==true||!data.badges)
     throw Error(data.error||'CHRISTMAS_TAB_BADGES_UNAVAILABLE');
    if(uid()!==id||request!==serial)return null;
    personal=safeChristmasPersonalBadges(data.badges);
    readUid=id;
    paint();
    return personal;
   }catch(error){
    if(uid()===id&&request===serial){
     personal=null;readUid=null;paint();
     console.warn('[DOG Christmas Tab Badges] Status nicht verfügbar',error?.message||error);
    }
    return null;
   }finally{
    if(pending?.promise===work)pending=null;
   }
  })();
  pending={uid:id,promise:work};
  return work;
 }
 function setVillage(next,{allowed=false}={}){
  village=next||null;villageAllowed=allowed===true;
  paint();
 }
 target.addEventListener('dog-christmas-badges-update',event=>{
  if(!uid()||!personal||readUid!==uid())return;
  const values=safeChristmasPersonalBadges(event.detail);
  if(!values)return;
  const details=event.detail||{};
  for(const key of ['scratch','research','level'])
   if(Object.hasOwn(details,key))personal[key]=safe(details[key]);
  paint();
 });
 target.addEventListener('dog-christmas-badges-refresh',()=>{void load({force:true});});
 target.addEventListener('spielonline-change',()=>{
  const next=uid();
  // Profile state may emit several harmless updates while the same user is
  // logging in. Do not cancel an in-flight request and create extra reads.
  if(next===authUid)return;
  authUid=next;clearProfile();
  if(next)void load();
 });
 target.addEventListener('dog-christmas-dev-change',paint);
 return {load,setVillage,clearProfile,getCounts:paint};
}
