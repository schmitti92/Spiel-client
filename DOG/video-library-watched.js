/** Record a first completed movie viewing once per authenticated profile.
 * Replays and ordinary DOG turns never write. A failed/offline request is
 * ignored; it must never block the film or award any game prize.
 */
const BASE=String(globalThis.window?.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
const pending=new Set();
const allowed=new Set(['welcome','intro','first-light','tree-2','tree-3',
 'building-bakery','building-workshop','building-inn','building-tower','building-luckhouse']);
const current=()=>globalThis.window?.SpielOnline?.state?.();
const recordKey=(uid,id)=>'dog-videothek-watched-synced-v1:'+uid+':'+id;

export async function markDogVideoSeen(id){
 if(!allowed.has(id))return false;
 const person=current();
 if(person?.status!=='online'||!person.user?.uid||typeof person.user.getIdToken!=='function')return false;
 const uid=person.user.uid,key=recordKey(uid,id);
 try{if(localStorage.getItem(key)==='1')return true;}catch{}
 if(pending.has(key))return false;
 pending.add(key);
 try{
  const token=await person.user.getIdToken();
  if(current()?.user?.uid!==uid)return false;
  const response=await fetch(BASE+'/api/hub/dog/video-library/seen',{
   method:'POST',cache:'no-store',
   headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
   body:JSON.stringify({id})
  });
  if(!response.ok)return false;
  const body=await response.json();
  if(body.ok!==true||body.watched!==true||current()?.user?.uid!==uid)return false;
  try{localStorage.setItem(key,'1');}catch{}
  return true;
 }catch{return false;}
 finally{pending.delete(key);}
}
