/** One transport for every MiniGame Engine 2.0 game. No game-specific connections. */
const base=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
export function currentUser(){const s=window.SpielOnline?.state?.();return s?.status==='online'&&s?.user?.getIdToken?s.user:null;}
export async function engine2Request(path,body){
 const user=currentUser();if(!user)throw Error('Bitte zuerst mit deinem Profil anmelden.');
 const token=await user.getIdToken();
 const response=await fetch(base+'/api/engine2'+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const data=await response.json().catch(()=>({ok:false,error:'INVALID_RESPONSE'}));
 if(!response.ok||!data.ok)throw Error(data.error||'SERVER_ERROR');
 return data;
}
export const engine2Room=(code)=>engine2Request('/rooms/'+encodeURIComponent(code));
export const engine2Action=(code,action,data={})=>engine2Request('/rooms/'+encodeURIComponent(code)+'/'+action,data);
