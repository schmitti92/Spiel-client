/* Spielerportal 2.0 V7: E-Mail/Passwort, geführtes Online-Onboarding und sichere Cloud-Profile.
 * Keine lokalen Pseudo-Konten und keine clientseitig buchbaren Siege/XP.
 */
(function(){
'use strict';
const config=window.SPIELPORTAL_CONFIG||{}, fb=config.firebase||{};
const BASE=String(config.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
const configured=['apiKey','authDomain','projectId','appId'].every(k=>typeof fb[k]==='string'&&fb[k].length>5);
const COLORS=['#328cff','#ff5268','#20b986','#ffc741','#9261ec','#f281af'];
const current={status:configured?'initializing':'unconfigured',user:null,profile:null,error:'',message:'',configured};
let auth=null,api=null,revision=0,queue=Promise.resolve(),generation=0,submitting=false,dlg=null;
let wizard={step:0,email:'',password:'',avatar:0,avatarImage:null,color:COLORS[0],name:'',resume:false};
function state(){return current;}
function emit(){window.dispatchEvent(new CustomEvent('spielonline-change'));renderPanel();}
function setStatus(status,error=''){current.status=status;current.error=error;emit();}
function humanError(err){
 const code=String(err?.code||err?.message||err||'');
 const table=[['auth/email-already-in-use','Diese E-Mail-Adresse wird bereits verwendet. Bitte anmelden.'],['auth/invalid-email','Bitte eine gültige E-Mail-Adresse eingeben.'],['auth/weak-password','Das Passwort ist zu schwach.'],['auth/invalid-credential','E-Mail-Adresse oder Passwort ist falsch.'],['auth/wrong-password','E-Mail-Adresse oder Passwort ist falsch.'],['auth/unauthorized-domain','GitHub Pages ist bei Firebase noch nicht freigegeben.'],['auth/operation-not-allowed','E-Mail/Passwort-Anmeldung ist in Firebase deaktiviert.'],['auth/too-many-requests','Zu viele Versuche. Bitte später erneut versuchen.'],['PROFILE_FIREBASE_PROJECT_MISMATCH','Render und GitHub Pages benutzen unterschiedliche Firebase-Projekte.'],['PROFILE_CONFLICT','Dein Profil wurde zwischenzeitlich geändert. Bitte neu laden.'],['PROFILE_SETUP_FAILED','Das Profil konnte nicht vollständig erstellt werden. Bitte erneut versuchen.'],['ALREADY_COMPLETE','Dieses Konto hat bereits ein Profil. Bitte neu anmelden.'],['AbortError','Render antwortet momentan nicht. Bitte erneut versuchen.'],['Failed to fetch','Keine Verbindung zu Render. Bitte Internetverbindung prüfen.']];
 for(const [key,msg] of table)if(code.includes(key))return msg;
 return code.slice(0,180)||'Unbekannter Fehler';
}
async function request(path,method='GET',body){
 if(!current.user)throw Error('LOGIN_REQUIRED');
 const token=await current.user.getIdToken();
 const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),90000);
 try{
  const response=await fetch(`${BASE}/api/profile/${path}`,{method,mode:'cors',cache:'no-store',headers:{Authorization:`Bearer ${token}`,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:ctrl.signal});
  let data;try{data=await response.json();}catch{throw Error(`Ungültige Serverantwort ${response.status}`);}
  if(!response.ok||!data.ok){const e=new Error(data.error||`HTTP_${response.status}`);e.status=response.status;throw e;}
  return data.profile;
 }finally{clearTimeout(timer);}
}
async function refresh(){
 if(!current.user)return null;
 const g=generation;setStatus('loading');
 try{
  const p=await request('me');if(g!==generation)return null;
  current.profile=p;revision=p.revision;
  if(p.setupComplete===false){setStatus('onboarding');if(!submitting)openRegistration(true);}
  else{setStatus('online');if(dlg?.open)dlg.close();}
  return p;
 }catch(e){if(g!==generation)return null;setStatus('error',humanError(e));throw e;}
}
function prefs(p){
 const result={name:p.name,color:p.color,favorite:p.favorite||'skyjo',avatar:p.avatar,avatarImage:p.avatarImage??null,edited:!!p.edited};
 for(const key of ['bio','banner','bannerImage','publicStats'])if(Object.prototype.hasOwnProperty.call(p,key))result[key]=p[key];
 return result;
}
function saveProfile(updated){
 if(current.status!=='online'||!current.user||!current.profile)return Promise.reject(Error('Online-Profil nicht bereit'));
 const uid=current.user.uid, payload=prefs(updated);
 queue=queue.catch(()=>{}).then(async()=>{
  if(current.user?.uid!==uid)throw Error('Konto wurde gewechselt.');
  const profile=await request('me','PUT',{...payload,expectedRevision:revision});
  if(current.user?.uid!==uid)return;
  current.profile=profile;revision=profile.revision;emit();return profile;
 }).catch(async e=>{
  if(current.user?.uid===uid){current.error=humanError(e);try{await refresh();}catch{}current.error=humanError(e);emit();}
  throw e;
 });
 return queue;
}
async function loginEmail(email,password){if(!auth)throw Error('Firebase lädt noch.');return api.signInWithEmailAndPassword(auth,email,password);}
async function registerEmail(email,password){if(!auth)throw Error('Firebase lädt noch.');return api.createUserWithEmailAndPassword(auth,email,password);}
async function logout(){if(!auth)throw Error('Firebase lädt noch.');await api.signOut(auth);if(document.getElementById('profile-root'))location.assign('index.html');}
async function resetPassword(email){if(!auth)throw Error('Firebase lädt noch.');await api.sendPasswordResetEmail(auth,email);}
function safeHTML(t){return String(t||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function avatarTile(n,selected){return `<button type="button" class="spw-avatar ${selected===n?'chosen':''}" data-wz-avatar="${n}" aria-label="Profilbild ${n+1}" aria-pressed="${selected===n}"><span style="background-image:url('profile-avatars.webp');background-size:400% 200%;background-position:${(n%4)*100/3}% ${Math.floor(n/4)*100}%"></span></button>`;}
function brandHeader(step=null){
 const labels=['Konto','Profilbild','Farbe','Spielername'];
 const subtitles=['Sicher anmelden','Dein persönlicher Look','Dein eigener Stil','Dein Auftritt'];
 const icons=['✉','▧','◉','★'];
 return `<header class="spw-header"><div class="spw-brand"><span class="spw-brand-icon" aria-hidden="true">👑</span><div class="spw-brand-title"><strong>SPIELEPORTAL <span class="spw-brand-dot">2.0</span></strong><small>GEMEINSAM SPIELEN · ONLINE</small></div><span class="spw-brand-badge"><span class="spw-online-dot"></span> ONLINE-PROFIL</span></div><div class="spw-header-bottom"><span>DEIN SPIEL. DEIN PROFIL.</span><span>${step===null?'SICHER ANMELDEN':`REGISTRIERUNG · ${step+1} VON 4`}</span></div>${step===null?'':`<nav class="spw-stepbar" aria-label="Registrierungsfortschritt">${labels.map((t,i)=>`<div class="spw-step ${i===step?'current':i<step?'done':''}" ${i===step?'aria-current="step"':''}><span class="spw-step-num">${i<step?'✓':icons[i]}</span><span class="spw-step-copy"><strong>${t}</strong><small>${subtitles[i]}</small></span></div>`).join('')}</nav><div class="spw-progress" aria-hidden="true">${labels.map((_,i)=>`<i class="${i<=step?'active':''}"></i>`).join('')}</div>`}</header>`;
}
function previewPanel(){
 const style=previewImage(),name=safeHTML(wizard.name||'Dein Spielername');
 return `<aside class="spw-visual" aria-label="Live-Vorschau deines Spielerprofils"><span class="spw-orbit spw-orbit-a" aria-hidden="true">✦</span><span class="spw-orbit spw-orbit-b" aria-hidden="true">✧</span><span class="spw-orbit spw-orbit-c" aria-hidden="true">✦</span><div class="spw-preview-kicker"><span class="spw-live-dot"></span> LIVE-VORSCHAU</div><div class="spw-profile-card" style="--spw-color:${wizard.color}"><div class="spw-preview-banner"><span class="spw-preview-crown">♛</span><span class="spw-preview-rank">MEIN SPIELERPROFIL</span></div><div class="spw-card-core"><span class="spw-mini-avatar" style="${style};--spw-color:${wizard.color}"></span><div class="spw-mini-name" data-spw-preview-name>${name}</div><div class="spw-mini-subtitle">Bereit für deine nächste Partie</div><div class="spw-mini-tags"><span>🎲 Brettspiel-Fan</span><span>✨ Gemeinsam spielen</span></div><div class="spw-card-rule"></div><div class="spw-preview-trio"><span>🎮<small>4 Spiele</small></span><span>☁<small>Online</small></span><span>★<small>Dein Profil</small></span></div></div></div><div class="spw-visual-bottom"><span class="spw-color-swatch" style="--swatch:${wizard.color}"></span><span>Dein persönlicher Look wird hier live sichtbar. Später jederzeit anpassbar.</span></div><div class="spw-visual-trust">☁ Auf deinen Geräten synchronisiert</div></aside>`;
}
function showForm(body,step=null,mode='wizard'){
 ensureDialog();dlg.querySelector('#spw-body').innerHTML=brandHeader(step)+`<div class="spw-shell ${mode==='login'?'spw-login':''}"><div class="spw-main">${body}</div>${previewPanel()}</div><footer class="spw-footer"><button class="spw-link" type="button" data-wz-cancel>${step===null?'Schließen':'Registrierung abbrechen'}</button></footer>`;if(dlg)dlg.scrollTop=0;
}
function ensureDialog(){
 if(dlg)return dlg;
 const style=document.createElement('style');style.textContent=`

 /* SPIELEPORTAL V3 — unified profile-page visual language */
 .spw-dialog{--spw-blue:#237fdf;--spw-navy:#102f62;--spw-muted:#667f9b;--spw-line:#e2ebf7;border:0;border-radius:28px;padding:0;width:min(95vw,810px);max-width:810px;max-height:min(94dvh,900px);overflow:auto;background:#fff;color:var(--spw-navy);box-shadow:0 30px 110px rgba(4,24,61,.36),0 0 0 1px rgba(255,255,255,.6);font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;scrollbar-width:thin;overscroll-behavior:contain}
 .spw-dialog::backdrop{background:rgba(5,22,48,.69);backdrop-filter:blur(8px)}
 .spw-dialog[open]{z-index:100000}
 .spw-inner{padding:0}
 .spw-header{padding:18px clamp(17px,3.3vw,32px) 15px;border-bottom:1px solid #e8eef8;background:linear-gradient(115deg,#fff,#f1f8ff 70%,#eef4ff)}
 .spw-brand{display:flex;align-items:center;gap:11px}
 .spw-brand-icon{display:grid;place-items:center;width:39px;height:39px;flex:0 0 39px;background:#dcefff;border:1px solid #c6e0ff;border-radius:13px;font-size:21px;box-shadow:0 6px 14px #357ac821}
 .spw-brand-title{display:grid;gap:3px}.spw-brand-title strong{color:#153867;font-size:14px;letter-spacing:-.15px;font-weight:900}.spw-brand-title small{font-size:9px;letter-spacing:1.6px;color:#7b94ae;font-weight:850}
 .spw-brand-badge{margin-left:auto;white-space:nowrap;border:1px solid #d2e4fa;background:#fff;color:#2c6eb1;padding:6px 10px;font-size:10px;font-weight:900;border-radius:999px}
 .spw-stepbar{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-top:20px;list-style:none;padding:0}
 .spw-step{display:flex;align-items:center;min-width:0;gap:7px;color:#91a7bb;font-size:10px;font-weight:800;line-height:1.2;white-space:nowrap}
 .spw-step-num{display:grid;place-items:center;width:25px;height:25px;flex:0 0 25px;border-radius:50%;border:1px solid #dce7f4;background:#edf3fa;color:#7f9ab4;font-size:11px;font-weight:900}
 .spw-step.current{color:#155eaf}.spw-step.current .spw-step-num{color:white;background:linear-gradient(135deg,#1796ed,#316de8);border-color:#1d83df;box-shadow:0 4px 12px #2186e94d}
 .spw-step.done{color:#3988a6}.spw-step.done .spw-step-num{background:#dcf5ef;color:#15876b;border-color:#b7e9dc}
 .spw-progress{display:flex;gap:5px;margin-top:11px}.spw-progress i{display:block;flex:1;height:4px;border-radius:50px;background:#e4edf8}.spw-progress i.active{background:linear-gradient(90deg,#239fe7,#4273ed)}
 .spw-shell{display:grid;grid-template-columns:minmax(0,1.08fr) minmax(210px,.8fr);align-items:stretch}
 .spw-main{padding:25px clamp(19px,3vw,32px) 20px;min-width:0}
 .spw-eyebrow{display:inline-flex;align-items:center;gap:7px;color:#4279a9;text-transform:uppercase;font-size:10px;letter-spacing:1px;font-weight:900}
 .spw-main h2{font-size:clamp(24px,3.1vw,34px);line-height:1.12;font-weight:950;letter-spacing:-1.05px;color:#102e60;margin:10px 0 10px}
 .spw-sub{color:#667f99;font-size:13px;line-height:1.6;margin:0 0 20px}
 .spw-form{display:grid;gap:12px}.spw-field{display:grid;gap:7px;color:#294a71;font-size:12px;font-weight:850}.spw-field input{width:100%;min-height:49px;padding:11px 13px;background:#f8fbff;border:1.5px solid #dce8f6;border-radius:13px;font-family:inherit;font-size:14px;color:#18395c;outline:none;transition:border-color .16s,box-shadow .16s}
 .spw-field input::placeholder{color:#9bb0c5}.spw-field input:focus{border-color:#419aee;background:#fff;box-shadow:0 0 0 4px #278fff16}
 .spw-form input:focus-visible,.spw-dialog button:focus-visible,.spw-upload:focus-within{outline:3px solid #79bafa;outline-offset:3px}
 .spw-actions{display:flex;gap:9px;margin-top:6px;align-items:stretch}.spw-primary,.spw-secondary{border:none;min-height:45px;padding:12px 14px;border-radius:13px;cursor:pointer;font-size:12px;font-weight:900;transition:transform .14s ease,filter .14s ease}
 .spw-primary{flex:1;background:linear-gradient(110deg,#148de8,#3669e7);color:white;box-shadow:0 7px 17px #2c74e430}.spw-secondary{background:#eaf3fd;color:#2c609a;border:1px solid #d7e7f8}.spw-primary:hover,.spw-secondary:hover{filter:brightness(1.04);transform:translateY(-1px)}.spw-primary:disabled,.spw-secondary:disabled{opacity:.55;cursor:wait;transform:none}
 .spw-link{border:0;padding:7px 2px;background:transparent;color:#286ab1;font-size:12px;font-weight:850;cursor:pointer;text-decoration:none}.spw-link:hover{text-decoration:underline;text-underline-offset:3px}
 .spw-error{color:#b52e47;font-size:12px;line-height:1.4;min-height:4px}.spw-error:not(:empty){padding:10px 11px;border-radius:10px;background:#fff0f3;border:1px solid #ffd6dc}
 .spw-inline-links{display:flex;flex-wrap:wrap;gap:7px 14px;align-items:center;justify-content:space-between;margin-top:4px}.spw-footer{padding:13px 18px;border-top:1px solid #edf1f7;background:#fcfdff;text-align:center}.spw-footer .spw-link{color:#8197ae;font-size:11px}
 .spw-info{display:flex;gap:8px;align-items:flex-start;margin-top:15px;padding:10px 12px;border-radius:12px;background:#f1f8ff;border:1px solid #e2effd;color:#68819b;font-size:11px;line-height:1.5}
 .spw-visual{position:relative;display:flex;flex-direction:column;justify-content:center;align-items:center;min-height:340px;overflow:hidden;isolation:isolate;padding:25px 21px;background:linear-gradient(145deg,#eaf6ff 0%,#f5f8ff 60%,#fff7ec 100%);border-left:1px solid #e3ecf8}
 .spw-visual:before{content:"";position:absolute;z-index:-1;inset:0 0 auto 0;height:53%;background:url('profile-hero.webp') right top / auto 100% no-repeat;opacity:.55;mask-image:linear-gradient(180deg,black,transparent)}
 .spw-visual:after{content:"";position:absolute;inset:auto -80px -130px auto;width:300px;height:300px;border-radius:50%;background:#d0e9ff66;filter:blur(5px);z-index:-1}
 .spw-preview-label{font-size:9px;text-transform:uppercase;letter-spacing:1.5px;font-weight:950;color:#6586ac;margin-bottom:16px}
 .spw-profile-card{width:100%;max-width:254px;text-align:center;background:#fff;border:1px solid #dfeaf8;border-radius:20px;box-shadow:0 15px 35px #28568629;padding:20px 15px 19px;position:relative}
 .spw-mini-avatar{position:relative;display:block;width:98px;height:98px;border-radius:50%;margin:0 auto 10px;background-color:#d8eaff;background-repeat:no-repeat;border:4px solid white;box-shadow:0 0 0 4px var(--spw-color,#328cff),0 8px 22px #164c8733}
 .spw-mini-name{font-size:19px;color:#103567;letter-spacing:-.6px;font-weight:950;overflow-wrap:anywhere}.spw-mini-subtitle{color:#8fa3b8;font-size:10px;margin-top:4px;font-weight:800}.spw-mini-tags{display:flex;gap:5px;justify-content:center;flex-wrap:wrap;margin-top:13px}.spw-mini-tags span{border-radius:99px;background:#e8f4ff;color:#3971ad;font-size:9px;font-weight:800;padding:6px 9px}.spw-mini-tags span+span{color:#8b6a2f;background:#fff4e6}
 .spw-visual-bottom{max-width:260px;font-size:11px;line-height:1.5;color:#728aaa;text-align:center;margin-top:19px;font-weight:700}
 .spw-avatars{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-top:9px}
 .spw-avatar{position:relative;aspect-ratio:1;min-width:0;border:2px solid #e2ecf7;border-radius:16px;background:#f2f8ff;padding:3px;cursor:pointer;box-shadow:0 3px 12px #164f8a12;transition:transform .16s,border-color .16s,box-shadow .16s}
 .spw-avatar span{display:block;width:100%;height:100%;border-radius:12px;background-color:#d9e9f8;background-repeat:no-repeat}
 .spw-avatar.chosen{border-color:#258ee9;box-shadow:0 0 0 3px #aee0ff,0 6px 16px #164f8a25}.spw-avatar.chosen:after{content:'✓';position:absolute;right:-6px;top:-7px;width:21px;height:21px;display:grid;place-items:center;border-radius:50%;color:white;font-size:12px;font-weight:950;background:#1a88e4;border:2px solid white}.spw-avatar:hover{transform:translateY(-2px)}
 .spw-upload{display:flex;align-items:center;justify-content:center;gap:9px;padding:13px 12px;border:1.5px dashed #8cbeec;background:#f0f8ff;color:#276aab;border-radius:14px;font-size:12px;font-weight:900;cursor:pointer}.spw-upload:hover{background:#e7f4ff}.spw-upload input{display:none}.spw-divider{display:flex;gap:10px;align-items:center;justify-content:center;color:#9cacbe;font-size:10px;font-weight:900;margin:13px 0}.spw-divider:before,.spw-divider:after{content:'';height:1px;flex:1;background:#e0eaf5}
 .spw-tip{margin:9px 0 11px;color:#7189a3;font-size:10px;line-height:1.5}
 .spw-colors{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:12px 0 16px}
 .spw-color{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-width:0;padding:11px 6px;border:2px solid #e3ebf6;background:#fbfdff;color:#4e6987;border-radius:14px;cursor:pointer;transition:border-color .15s,transform .15s,background .15s;font-size:10px;font-weight:900}
 .spw-color i{display:grid;place-items:center;width:37px;height:37px;background:var(--c);border-radius:50%;box-shadow:0 4px 10px #284e8033;color:white;font-style:normal;font-size:20px}.spw-color.chosen{border-color:#3292e9;background:#f0f8ff;color:#1767b6}.spw-color:hover{transform:translateY(-1px)}.spw-color:not(.chosen) i:before{content:''}.spw-color.chosen i:before{content:'✓'}
 .spw-final-note{margin-top:14px;padding:13px 14px;border-radius:13px;background:#f1f9ff;color:#476b93;font-size:11px;line-height:1.55;border:1px solid #dfecfb}.spw-final-note strong{color:#285e9b}
 .spw-login-avatar{width:58px;height:58px;display:grid;place-items:center;font-size:28px;border-radius:18px;color:#2a6ba9;background:#eaf4ff;border:1px solid #d1e5fa;box-shadow:0 6px 17px #2d76c81c;margin-bottom:15px}
 .spw-login .spw-main{padding-top:32px;padding-bottom:30px}.spw-login .spw-visual{min-height:380px}
 .spw-confirm-row{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:-3px}
 .spw-error.spw-success{color:#167e65;background:#e9f9f3;border-color:#b9e9d6}
 @media(max-width:730px){.spw-dialog{width:min(96vw,540px)}.spw-shell{grid-template-columns:1fr}.spw-visual{min-height:0;padding:15px 18px 18px;border-left:0;border-top:1px solid #e2ecf7;background:#f1f8ff}.spw-profile-card{display:flex;align-items:center;gap:13px;max-width:100%;text-align:left;padding:10px 14px;border-radius:13px}.spw-mini-avatar{width:54px;height:54px;flex:0 0 54px;margin:0;border-width:3px;box-shadow:0 0 0 2px var(--spw-color,#328cff)}.spw-preview-label,.spw-mini-tags,.spw-visual-bottom,.spw-mini-subtitle{display:none}.spw-mini-name{font-size:15px}.spw-header{padding:14px 19px 12px}.spw-main{padding:22px 19px 18px}.spw-login .spw-visual{min-height:0}.spw-visual:before{display:none}}
 @media(max-width:470px){.spw-dialog{width:calc(100vw - 18px);max-height:calc(100dvh - 18px);border-radius:20px}.spw-step{gap:4px;font-size:8px}.spw-step-num{width:21px;height:21px;flex-basis:21px;font-size:9px}.spw-brand-badge{font-size:9px;padding:5px 8px}.spw-main h2{font-size:25px}.spw-avatars{gap:7px}.spw-avatar{border-radius:12px}.spw-avatar span{border-radius:9px}.spw-colors{gap:6px}.spw-color{padding:8px 3px}.spw-color i{width:31px;height:31px}.spw-visual{padding:11px 14px}.spw-inline-links{justify-content:center}.spw-login-avatar{margin-bottom:10px}}
 @media(prefers-reduced-motion:reduce){.spw-dialog *, .spw-dialog *:before,.spw-dialog *:after{transition:none!important;animation:none!important}}

/* ===============================================================
   SPIELEPORTAL DESIGN V4 — Royal Cloud / premium multi-step UI
   Visual layer only: Firebase logic and game code unchanged.
   =============================================================== */
.spw-dialog{--spw-blue:#158fe4;--spw-navy:#112e58;--spw-text:#23496f;width:min(96vw,990px);max-width:990px;max-height:min(95dvh,950px);border:1px solid rgba(255,255,255,.8);border-radius:30px;box-shadow:0 38px 115px rgba(3,22,52,.46),0 0 0 7px rgba(255,255,255,.08);overflow:auto;background:#fff}
.spw-dialog::backdrop{background:radial-gradient(circle at 50% 20%,rgba(58,119,192,.26),transparent 48%),rgba(3,19,43,.79);backdrop-filter:blur(12px) saturate(120%)}
.spw-header{padding:18px clamp(22px,3.2vw,38px) 19px;background:radial-gradient(ellipse at 89% -40%,#d8ecff,transparent 48%),linear-gradient(125deg,#fff 8%,#f5faff 68%,#edf6ff);border-bottom:1px solid #ddeaf8;position:relative;overflow:hidden}
.spw-header:after{content:'✦';position:absolute;right:20%;top:-39px;font-size:130px;color:rgba(61,148,229,.038);transform:rotate(-18deg);pointer-events:none}
.spw-brand-icon{width:47px;height:47px;flex-basis:47px;border-radius:16px;background:linear-gradient(140deg,#e5f5ff,#d9e6ff);font-size:26px;box-shadow:inset 0 1px 0 #fff,0 9px 17px #195b9a20}
.spw-brand-title strong{font-size:16px;letter-spacing:-.5px}.spw-brand-dot{font-size:9px;letter-spacing:.05em;vertical-align:middle;display:inline-block;padding:2px 5px;color:#286cbd;background:#e1f1ff;border:1px solid #c6e3ff;border-radius:6px;margin-left:2px}.spw-brand-title small{font-size:8px;letter-spacing:1.55px}
.spw-brand-badge{display:flex;align-items:center;gap:7px;padding:8px 12px;box-shadow:0 3px 13px rgba(27,89,152,.08);color:#246dad;font-size:9px;letter-spacing:.5px}
.spw-online-dot,.spw-live-dot{width:7px;height:7px;border-radius:50%;display:inline-block;background:#18c58d;box-shadow:0 0 0 3px #c9f8e6}
.spw-header-bottom{display:flex;justify-content:space-between;gap:12px;margin:13px 0 0;padding-top:10px;border-top:1px solid #e6effb;color:#8ca3b9;font-weight:900;font-size:9px;letter-spacing:1.25px}
.spw-header-bottom span:last-child{color:#387ebd}
.spw-stepbar{margin-top:16px;gap:7px}.spw-step{gap:8px;padding:8px;border:1px solid #e5edf7;border-radius:13px;background:#ffffffa6;box-shadow:0 4px 10px rgba(22,90,147,.035);line-height:1.25;transition:background .2s,border-color .2s,transform .2s}.spw-step.current{background:linear-gradient(125deg,#eaf6ff,#f3f8ff);border-color:#bddcf7;box-shadow:0 5px 13px #178ce515}.spw-step.done{background:#f1fbf8;border-color:#ceeee4}
.spw-step-num{width:30px;height:30px;flex-basis:30px;font-size:15px;border-radius:10px}.spw-step.current .spw-step-num{background:linear-gradient(145deg,#0b98ec,#3d6be6);border:1px solid #b1dcff;box-shadow:0 5px 10px rgba(34,120,225,.25)}
.spw-step-copy{display:grid;gap:2px;min-width:0}.spw-step-copy strong{font-size:10px;letter-spacing:-.1px}.spw-step-copy small{font-size:8px;white-space:normal;font-weight:750;color:#95a7b9}.spw-step.current .spw-step-copy small{color:#4783b2}
.spw-progress{margin-top:10px;gap:7px}.spw-progress i{height:4px;background:#e4eef9;transition:background .25s}.spw-progress i.active{background:linear-gradient(90deg,#31b2eb,#3477e6)}
.spw-shell{grid-template-columns:minmax(0,1.13fr) minmax(290px,.87fr)}
.spw-main{padding:clamp(23px,2.8vw,34px) clamp(22px,3.1vw,38px) 27px}
.spw-eyebrow{gap:9px;font-size:9px;letter-spacing:1.18px;color:#4682b7;font-weight:950}.spw-eyebrow-icon{width:28px;height:28px;display:grid;place-items:center;background:#e8f4ff;border:1px solid #d4e8fc;color:#2d75bb;border-radius:9px;font-size:15px}
.spw-main h2{font-weight:1000;letter-spacing:-1.5px;font-size:clamp(29px,3.4vw,39px);line-height:1.08;margin:14px 0 12px}.spw-main h2 em{font-style:normal;color:#2186dc;background:linear-gradient(100deg,#1689df,#5279e5);background-clip:text;-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.spw-sub{max-width:440px;font-size:12px;line-height:1.7;color:#6d8298;margin-bottom:15px}
.spw-benefits{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:18px}.spw-benefits span{font-size:10px;font-weight:850;color:#4280b5;background:#eff7ff;border:1px solid #deedfc;padding:7px 10px;border-radius:999px}
.spw-form{gap:12px}.spw-field{font-size:11px;color:#31577d;gap:6px}.spw-input-wrap{display:flex;align-items:center;min-height:50px;background:linear-gradient(180deg,#faffff,#f6faff);border:1.5px solid #dae8f6;border-radius:13px;transition:border-color .2s,box-shadow .2s}.spw-input-wrap:focus-within{background:#fff;border-color:#4395e7;box-shadow:0 0 0 4px #308df016}.spw-input-wrap input{width:100%;min-width:0;height:48px;min-height:48px;padding:10px 11px;background:transparent!important;border:none!important;border-radius:0!important;box-shadow:none!important;font-size:13px}.spw-input-wrap input:focus{box-shadow:none!important;outline:0}
.spw-leading{width:34px;margin-left:10px;display:grid;place-items:center;font-size:16px;color:#6a9bc4;flex:0 0 34px;border-right:1px solid #e1ebf6;height:27px}
.spw-eye{font-size:16px;min-width:40px;min-height:39px;margin-right:4px;background:transparent;color:#6587a5;border:0;border-radius:10px;cursor:pointer}.spw-eye:hover{background:#eaf4fd}.spw-eye:focus-visible{outline:2px solid #3488e1}
.spw-strength{display:grid;gap:7px;margin:0 0 1px}.spw-strength-head{display:flex;justify-content:space-between;gap:8px;font-size:10px;color:#8ca0b3;font-weight:800}.spw-strength-head strong{color:#4b85b4}.spw-strength-track{height:5px;border-radius:99px;background:#e5edf5;overflow:hidden}.spw-strength-track i{display:block;height:100%;width:0%;border-radius:99px;background:linear-gradient(90deg,#ff9b6d,#e4c365);transition:width .22s,background .22s}.spw-strength-track i[data-strength="2"]{background:#e2b04d}.spw-strength-track i[data-strength="3"]{background:#63bba6}.spw-strength-track i[data-strength="4"]{background:linear-gradient(90deg,#33c48c,#2599db)}.spw-strength-rules{display:flex;flex-wrap:wrap;gap:9px;font-size:9px;color:#9baabd}.spw-strength-rules span.pass{color:#1e9876;font-weight:850}.spw-confirm-status{font-size:10px;color:#7890a9;padding-left:2px}.spw-confirm-status.ok{color:#168664;font-weight:850}.spw-confirm-status.mismatch{color:#bc5b4d}
.spw-actions{margin-top:10px}.spw-primary,.spw-secondary{min-height:49px;border-radius:13px;letter-spacing:.1px;font-size:11px;transition:transform .14s,box-shadow .14s,filter .14s}.spw-primary{background:linear-gradient(115deg,#109beb 0%,#316dea 100%);box-shadow:0 7px 18px #267deb35;text-align:center}.spw-primary span{font-size:17px;margin-left:5px}.spw-secondary{background:#f0f6ff;color:#366a9d;border-color:#dceafa}.spw-primary:hover{box-shadow:0 10px 23px #267deb45}.spw-primary:active,.spw-secondary:active{transform:scale(.985)}.spw-primary:disabled{cursor:wait}
.spw-inline-links{font-size:10px;color:#8497ac}.spw-link{font-size:11px;color:#2673b9}.spw-info{border-radius:13px;background:linear-gradient(115deg,#f1f9ff,#fafcff);border-color:#e0eefb;color:#728ba4;font-size:10px;margin-top:17px}
.spw-section-label{display:flex;align-items:center;justify-content:space-between;gap:7px;font-size:9px;font-weight:950;letter-spacing:1.1px;color:#6786a8;margin:17px 0 8px}.spw-section-label small{font-size:9px;letter-spacing:0;color:#9bacbe;font-weight:800}
.spw-avatars{gap:8px;margin-top:0}.spw-avatar{padding:5px;border:1.5px solid #d9e9f7;border-radius:17px;background:#f5faff;box-shadow:0 5px 15px #1e528416}.spw-avatar span{border-radius:12px}.spw-avatar.chosen{border:2px solid #348ce8;box-shadow:0 0 0 3px #cdeeff,0 8px 22px #156eb625;transform:translateY(-2px)}
.spw-divider{margin:13px 0;color:#a6b5c8;font-size:9px;letter-spacing:.7px}
.spw-upload{justify-content:flex-start;padding:12px;background:linear-gradient(125deg,#f3faff,#eaf5ff);border:1.5px dashed #88bee9;border-radius:16px}.spw-upload-selected{border-style:solid;border-color:#73c8ac;background:linear-gradient(115deg,#f0fdf8,#edf8ff)}.spw-upload-symbol{height:41px;width:41px;flex:0 0 41px;display:grid;place-items:center;border-radius:12px;background:#d9edff;color:#2b82c9;font-size:25px;font-weight:900}.spw-upload-copy{display:grid;gap:2px;text-align:left;flex:1;min-width:0}.spw-upload-copy strong{font-size:11px;color:#2462a0}.spw-upload-copy small{font-size:9px;color:#7f9db7;font-weight:700;line-height:1.4}.spw-upload-arrow{font-size:17px;color:#438cc6}.spw-photo-tip{margin:9px 0 3px;display:flex;gap:6px;font-size:10px;color:#7c93ad}
.spw-colors{grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:12px 0 18px}.spw-color{border-radius:16px;min-height:94px;padding:10px 7px;gap:6px;background:#f9fcff}.spw-color i{width:39px;height:39px;box-shadow:0 3px 0 #fff,0 0 0 4px color-mix(in srgb,var(--c),white 77%),0 7px 15px #244d761b}.spw-color span{font-size:10px}.spw-color small{font-size:8px;color:#a5b1c0}.spw-color.chosen{border-color:#318de6;background:#eff8ff;box-shadow:0 0 0 3px #d3efff,0 10px 20px #2b72b81b}.spw-color.chosen small{color:#2e82c8;font-weight:850}
.spw-color-feature{display:flex;gap:11px;align-items:center;padding:12px 13px;border:1px solid #e2effa;border-radius:15px;background:#f6faff}.spw-color-feature-glow{display:grid;place-items:center;flex:0 0 39px;width:39px;height:39px;font-size:25px;border-radius:12px;background:var(--swatch);color:white;box-shadow:0 5px 18px color-mix(in srgb,var(--swatch),transparent 66%)}.spw-color-feature strong,.spw-color-feature small{display:block}.spw-color-feature strong{font-size:11px;color:#2a618f}.spw-color-feature small{margin-top:3px;font-size:9px;line-height:1.5;color:#8196ae}
.spw-name-meta{display:flex;justify-content:space-between;gap:9px;font-size:10px;color:#90a3b7;margin-top:-5px}.spw-name-meta strong{color:#407cae;font-variant-numeric:tabular-nums}
.spw-review{border:1px solid #dfecf9;border-radius:17px;background:linear-gradient(140deg,#fbfdff,#f0f8ff);padding:14px 16px;display:grid;gap:11px;margin:4px 0}.spw-review-title{font-size:9px;font-weight:950;color:#6d98b9;letter-spacing:1.1px}.spw-review>div{display:flex;justify-content:space-between;gap:12px;font-size:10px;border-bottom:1px solid #e5eff8;padding-bottom:8px}.spw-review>div:last-child{border:0;padding-bottom:0}.spw-review>div span{color:#8099b4}.spw-review>div strong{max-width:52%;overflow-wrap:anywhere;color:#315d88;text-align:right}.spw-review-dot{display:inline-block;width:11px;height:11px;background:var(--swatch);border-radius:50%;vertical-align:middle;margin-right:3px;border:1px solid #fff;box-shadow:0 0 0 1px #d3e2ef}
.spw-final-note{font-size:10px;border-color:#cfe9fd;background:linear-gradient(120deg,#edf9ff,#fbfdff)}
.spw-visual{min-height:420px;padding:30px 25px;background:radial-gradient(circle at 95% 15%,rgba(245,206,120,.18),transparent 36%),radial-gradient(circle at 5% 70%,#dceefe,transparent 55%),linear-gradient(145deg,#ecf7ff,#f7f9ff 60%,#fff5e9);border-left:1px solid #deebf8}
.spw-visual:before{height:51%;background-image:linear-gradient(to bottom,transparent,rgba(245,250,255,.6)),url('profile-hero.webp');opacity:.6;background-size:cover,auto 100%;background-position:center,right top;mask-image:linear-gradient(#000,transparent)}
.spw-visual:after{content:' ';bottom:-160px;right:-105px;width:340px;height:340px;background:linear-gradient(145deg,#c5e6ff80,#dbd3ff60);filter:blur(15px)}
.spw-orbit{position:absolute;font-size:34px;color:rgba(60,145,223,.25);pointer-events:none;animation:spwFloat 6s ease-in-out infinite}.spw-orbit-a{left:8%;top:15%}.spw-orbit-b{right:9%;top:21%;animation-delay:2s}.spw-orbit-c{right:8%;bottom:14%;font-size:21px;animation-delay:4s}@keyframes spwFloat{50%{transform:translateY(-10px) rotate(15deg)}}
.spw-preview-kicker{font-size:9px;letter-spacing:1.9px;font-weight:950;color:#457da7;display:flex;align-items:center;gap:9px;margin-bottom:17px}.spw-live-dot{height:7px;width:7px;box-shadow:0 0 0 4px #d9faed}
.spw-profile-card{max-width:298px;width:100%;padding:0;border-radius:23px;overflow:hidden;box-shadow:0 22px 45px rgba(21,61,102,.25),0 0 0 7px rgba(255,255,255,.32);border:1px solid #e3eafb;background:#fff;transform:translateZ(0);animation:spwCardAppear .45s ease both}@keyframes spwCardAppear{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}
.spw-preview-banner{height:103px;display:flex;align-items:flex-start;justify-content:space-between;padding:13px;background:radial-gradient(circle at 20% 0%,color-mix(in srgb,var(--spw-color),white 40%),transparent 52%),linear-gradient(120deg,#1f4d8d,#398bd3 55%,#69c9e9);position:relative;isolation:isolate}.spw-preview-banner:after{content:'✦  ✧  ✦';position:absolute;right:15px;bottom:8px;font-size:23px;color:rgba(255,255,255,.16);letter-spacing:8px}.spw-preview-crown{font-size:23px;color:#ffe6a5;text-shadow:0 2px 6px #0006}.spw-preview-rank{font-size:8px;letter-spacing:.7px;font-weight:900;color:#fff;border:1px solid #ffffff55;border-radius:999px;padding:5px 8px;background:#ffffff20}
.spw-card-core{padding:0 18px 17px;margin-top:-53px;position:relative}.spw-mini-avatar{width:105px;height:105px;border:5px solid white;box-shadow:0 0 0 4px var(--spw-color,#328cff),0 13px 24px #143f7d35;margin:0 auto 16px}.spw-mini-name{font-size:21px;letter-spacing:-.65px;color:#173762}.spw-mini-subtitle{color:#869db3;margin-top:5px}.spw-mini-tags{margin-top:13px}.spw-mini-tags span{font-size:8.5px;padding:6px 8px}.spw-card-rule{height:1px;background:#e8eff7;margin:17px 0 13px}.spw-preview-trio{display:grid;grid-template-columns:repeat(3,1fr);gap:3px}.spw-preview-trio span{font-size:19px;color:#2b84d7;font-weight:900}.spw-preview-trio small{display:block;font-size:8px;font-weight:750;color:#829ab2;margin-top:4px}
.spw-visual-bottom{max-width:280px;display:flex;align-items:flex-start;gap:10px;color:#6f8da8;font-size:10px;margin-top:22px;line-height:1.5;text-align:left}.spw-color-swatch{width:19px;height:19px;background:var(--swatch);border:3px solid white;box-shadow:0 0 0 2px #cbe3f6,0 4px 9px #1a6cad25;border-radius:50%;flex:0 0 19px}.spw-visual-trust{margin-top:14px;font-size:9px;font-weight:850;color:#7da0bd;letter-spacing:.2px}
.spw-footer{padding:13px;background:linear-gradient(110deg,#fff,#f6faff);border-top:1px solid #e2eef9}.spw-footer .spw-link{font-size:10px}
.spw-login-avatar{height:63px;width:63px;font-size:30px;border-radius:19px;background:linear-gradient(125deg,#e5f6ff,#edf1ff);box-shadow:0 9px 25px #287bb521}.spw-login .spw-main{padding-top:34px;padding-bottom:30px}
/* Tablet + mobile: all controls stay reachable, details collapse sensibly */
@media(max-width:820px){.spw-dialog{width:min(97vw,680px)}.spw-shell{grid-template-columns:1fr}.spw-visual{padding:15px 22px;background:#eef7ff;min-height:0;border-left:0;border-top:1px solid #e2eff8}.spw-visual:before,.spw-orbit,.spw-visual-bottom,.spw-visual-trust{display:none}.spw-preview-kicker{margin-bottom:10px}.spw-profile-card{width:min(100%,420px);max-width:420px;display:block;box-shadow:0 6px 18px #286b9a22;border-radius:15px;animation:none}.spw-preview-banner{display:none}.spw-card-core{display:flex;align-items:center;gap:12px;margin:0;padding:10px 12px;text-align:left}.spw-mini-avatar{width:55px;height:55px;flex:0 0 55px;margin:0;border-width:3px;box-shadow:0 0 0 2px var(--spw-color)}.spw-mini-name{font-size:15px}.spw-mini-subtitle{font-size:9px}.spw-mini-tags,.spw-card-rule,.spw-preview-trio{display:none}.spw-visual .spw-preview-kicker{font-size:8px}.spw-header{padding:14px 21px}.spw-main{padding:22px 23px 18px}.spw-step-copy small{display:none}}
@media(max-width:500px){.spw-dialog{width:calc(100vw - 12px);max-height:calc(100dvh - 12px);border-radius:20px}.spw-header{padding:12px 16px 13px}.spw-brand-icon{width:38px;height:38px;flex-basis:38px;font-size:21px;border-radius:12px}.spw-brand-title strong{font-size:13px}.spw-brand-title small{font-size:7px}.spw-brand-badge{font-size:7px;letter-spacing:0;padding:6px 7px}.spw-header-bottom{font-size:7px;letter-spacing:.5px;margin-top:10px;padding-top:8px}.spw-stepbar{gap:5px;margin-top:12px}.spw-step{display:flex;flex-direction:column;justify-content:center;gap:5px;padding:6px 3px;border-radius:10px}.spw-step-num{width:23px;height:23px;flex-basis:auto;border-radius:8px;font-size:12px}.spw-step-copy strong{font-size:8px}.spw-main{padding:20px 18px 17px}.spw-main h2{font-size:29px}.spw-sub{font-size:11px;line-height:1.55;margin-bottom:13px}.spw-field{font-size:11px}.spw-avatars{gap:7px}.spw-avatar{padding:3px;border-radius:13px}.spw-avatar span{border-radius:9px}.spw-colors{gap:6px}.spw-color{min-height:85px;gap:5px;padding:7px 3px;border-radius:12px}.spw-color i{width:31px;height:31px}.spw-color span{font-size:9px}.spw-color small{font-size:7px}.spw-review{padding:11px}.spw-review>div{font-size:9px}.spw-visual{padding:10px 15px}.spw-preview-kicker{display:none}.spw-profile-card{max-width:100%}.spw-card-core{padding:7px 10px}.spw-mini-avatar{width:45px;height:45px;flex-basis:45px}.spw-mini-name{font-size:13px}.spw-mini-subtitle{display:block;font-size:8px}.spw-actions{gap:7px}.spw-secondary,.spw-primary{min-height:44px;padding:10px 9px;font-size:10px}.spw-inline-links{justify-content:center}}
@media(prefers-reduced-motion:reduce){.spw-orbit,.spw-profile-card{animation:none!important}.spw-dialog *{scroll-behavior:auto!important}}

`;document.head.appendChild(style);
 dlg=document.createElement('dialog');dlg.className='spw-dialog';dlg.setAttribute('aria-label','Online-Spielerprofil');dlg.innerHTML='<div class="spw-inner" id="spw-body"></div>';document.body.appendChild(dlg);
 dlg.addEventListener('submit',handleSubmit);
 dlg.addEventListener('input',e=>{
  if(e.target.matches('[data-wz-name]')){const val=e.target.value.trim();const out=dlg.querySelector('[data-spw-preview-name]');if(out)out.textContent=val||'Dein Spielername';const review=dlg.querySelector('[data-spw-review-name]');if(review)review.textContent=val||'Noch offen';const counter=dlg.querySelector('[data-spw-name-counter]');if(counter)counter.textContent=`${e.target.value.length} / 24`;}
  if(e.target.matches('[data-wz-password],[data-wz-confirm]')){
   const pw=dlg.querySelector('[data-wz-password]')?.value||'';const repeat=dlg.querySelector('[data-wz-confirm]')?.value||'';
   const score=(pw.length>=8?1:0)+(/[a-zA-Z]/.test(pw)&&/[0-9]/.test(pw)?1:0)+(/[A-Z]/.test(pw)&&/[a-z]/.test(pw)?1:0)+(/[^a-zA-Z0-9]/.test(pw)?1:0);
   const strength=dlg.querySelector('[data-spw-strength-bar]'),label=dlg.querySelector('[data-spw-strength-label]');
   if(strength){strength.style.width=(pw?Math.max(15,score*25):0)+'%';strength.dataset.strength=String(score);}
   if(label)label.textContent=!pw?'Noch nicht eingegeben':score>=4?'Sehr stark':score>=3?'Stark':score>=2?'Mittel':'Noch zu schwach';
   const length=dlg.querySelector('[data-spw-rule="length"]'),mix=dlg.querySelector('[data-spw-rule="mix"]');if(length){length.classList.toggle('pass',pw.length>=8);length.textContent=(pw.length>=8?'✓':'○')+' Mind. 8 Zeichen';}if(mix){const good=/[a-zA-Z]/.test(pw)&&/[0-9]/.test(pw);mix.classList.toggle('pass',good);mix.textContent=(good?'✓':'○')+' Buchstaben & Ziffern';}
   const confirmation=dlg.querySelector('[data-spw-confirm-status]');if(confirmation){const ok=!!repeat&&pw===repeat;confirmation.textContent=!repeat?'Beide Passwörter müssen übereinstimmen.':ok?'✓ Die Passwörter stimmen überein.':'⚠ Die Passwörter sind noch unterschiedlich.';confirmation.classList.toggle('ok',ok);confirmation.classList.toggle('mismatch',!!repeat&&!ok);if(ok){const msg=dlg.querySelector('.spw-error');if(msg?.textContent.includes('übereinstimmen'))msg.textContent='';}}
  }
 });
 dlg.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.wzVisibility){const inp=dlg.querySelector(`[name="${b.dataset.wzVisibility}"]`);if(inp){const visible=inp.type==='password';inp.type=visible?'text':'password';b.setAttribute('aria-pressed',String(visible));b.setAttribute('aria-label',visible?'Passwort verbergen':'Passwort anzeigen');b.textContent=visible?'🙈':'👁';}return;}
  if(b.dataset.wzAvatar!==undefined){wizard.avatar=Number(b.dataset.wzAvatar);wizard.avatarImage=null;renderWizard();}
  if(b.dataset.wzColor){wizard.color=b.dataset.wzColor;renderWizard();}
  if(b.dataset.wzBack!==undefined){wizard.step=Math.max(wizard.resume?1:0,wizard.step-1);renderWizard();}
  if(b.dataset.wzOpen==='login')openLogin();
  if(b.dataset.wzOpen==='register')openRegistration();
  if(b.dataset.wzOpen==='reset')openReset();
  if(b.dataset.wzCancel!==undefined){dlg.close();if(document.getElementById('profile-root')&&!state().profile?.setupComplete)location.assign('index.html');}
 });
 dlg.addEventListener('change',async e=>{
  if(!e.target.matches('[data-wz-file]'))return;
  const file=e.target.files?.[0];if(!file)return;
  const error=dlg.querySelector('.spw-error'),next=dlg.querySelector('[data-wz-next]');
  if(next)next.disabled=true;error.textContent='Bild wird vorbereitet …';
  try{wizard.avatarImage=await shrinkImage(file);renderWizard();}
  catch(ex){error.textContent=humanError(ex);if(next)next.disabled=false;}
 });
 return dlg;
}
async function shrinkImage(file){
 if(!/^image\/(jpeg|png|webp)$/.test(file.type))throw Error('Bitte JPG, PNG oder WebP wählen (kein SVG oder GIF).');
 if(file.size>10*1024*1024)throw Error('Das Foto darf maximal 10 MB groß sein.');
 const url=URL.createObjectURL(file);
 try{
  const img=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('Bild konnte nicht geöffnet werden.'));im.src=url;});
  if(!img.naturalWidth||!img.naturalHeight)throw Error('Ungültiges Bild.');
  for(const size of [256,224,192,160]){
   const c=document.createElement('canvas');c.width=c.height=size;
   const ctx=c.getContext('2d');if(!ctx)throw Error('Bildverarbeitung wird nicht unterstützt.');
   const side=Math.min(img.naturalWidth,img.naturalHeight),sx=(img.naturalWidth-side)/2,sy=(img.naturalHeight-side)/2;
   ctx.drawImage(img,sx,sy,side,side,0,0,size,size);
   const result=c.toDataURL('image/jpeg',size===256?.77:.68);
   if(result.length<=130000)return result;
  }
  throw Error('Das Bild konnte nicht ausreichend verkleinert werden.');
 }finally{URL.revokeObjectURL(url);}
}
function show(){ensureDialog();if(!dlg.open)dlg.showModal();}
function previewImage(){if(wizard.avatarImage)return `background-image:url('${wizard.avatarImage}');background-size:cover`;
 const n=wizard.avatar;return `background-image:url('profile-avatars.webp');background-size:400% 200%;background-position:${(n%4)*100/3}% ${Math.floor(n/4)*100}%`;}
function renderWizard(preserveScroll=false){
 const prevOffset=dlg?.scrollTop||0;
 const i=wizard.step;
 const error='<div class="spw-error" role="alert" aria-live="polite"></div>';
 const back=wizard.resume?'':'<button class="spw-secondary" type="button" data-wz-back>← Zurück</button>';
 let body='';
 if(i===0)body=`<div class="spw-eyebrow"><span class="spw-eyebrow-icon">✉</span> SCHRITT 01 / 04 · KONTO ERSTELLEN</div><h2>Dein Abenteuer<br><em>beginnt hier.</em></h2><p class="spw-sub">Ein Konto für alle deine Spiele. Erstelle deinen sicheren Zugang – dein Profil gestalten wir gemeinsam im nächsten Schritt.</p><div class="spw-benefits"><span>☁ Geräteübergreifend</span><span>🔐 Sicherer Login</span></div><form class="spw-form" data-wz-step="0"><label class="spw-field"><span>E-Mail-Adresse</span><div class="spw-input-wrap"><span class="spw-leading" aria-hidden="true">✉</span><input name="email" type="email" inputmode="email" autocomplete="email" value="${safeHTML(wizard.email)}" required maxlength="254" placeholder="name@beispiel.de"></div></label><label class="spw-field"><span>Dein Passwort</span><div class="spw-input-wrap"><span class="spw-leading" aria-hidden="true">♧</span><input name="password" type="password" autocomplete="new-password" minlength="8" required placeholder="Mindestens 8 Zeichen" data-wz-password><button class="spw-eye" type="button" data-wz-visibility="password" aria-label="Passwort anzeigen" aria-pressed="false">👁</button></div></label><div class="spw-strength" aria-live="polite"><div class="spw-strength-head"><span>Passwort-Sicherheit</span><strong data-spw-strength-label>Noch nicht eingegeben</strong></div><div class="spw-strength-track"><i data-spw-strength-bar></i></div><div class="spw-strength-rules"><span data-spw-rule="length">○ Mind. 8 Zeichen</span><span data-spw-rule="mix">○ Buchstaben &amp; Ziffern</span></div></div><label class="spw-field"><span>Passwort wiederholen</span><div class="spw-input-wrap"><span class="spw-leading" aria-hidden="true">✓</span><input name="repeat" type="password" autocomplete="new-password" minlength="8" required placeholder="Passwort bestätigen" data-wz-confirm><button class="spw-eye" type="button" data-wz-visibility="repeat" aria-label="Passwortwiederholung anzeigen" aria-pressed="false">👁</button></div></label><div class="spw-confirm-status" data-spw-confirm-status aria-live="polite">Beide Passwörter müssen übereinstimmen.</div>${error}<div class="spw-actions"><button class="spw-primary" type="submit" data-wz-next>Weiter zu meinem Profilbild <span aria-hidden="true">→</span></button></div><div class="spw-inline-links"><span>Schon ein Spielerprofil?</span><button class="spw-link" type="button" data-wz-open="login">Jetzt anmelden</button></div></form><div class="spw-info"><span>🛡</span><span>Dein Passwort wird ausschließlich für Firebase Authentication verwendet – niemals als Teil deines öffentlichen Spielerprofils gespeichert.</span></div>`;
 if(i===1)body=`<div class="spw-eyebrow"><span class="spw-eyebrow-icon">▧</span> SCHRITT 02 / 04 · AVATAR WÄHLEN</div><h2>Zeig uns <em>dein Gesicht.</em></h2><p class="spw-sub">Wähle einen liebevoll gestalteten Charakter oder verwende ein ganz persönliches Foto aus deiner Galerie.</p><div class="spw-section-label"><span>UNSERE AVATARE</span><small>8 Motive zur Auswahl</small></div><div class="spw-avatars" role="group" aria-label="Profilbilder auswählen">${Array.from({length:8},(_,n)=>avatarTile(n,wizard.avatarImage?null:wizard.avatar)).join('')}</div><div class="spw-divider">ODER DEIN EIGENES BILD</div><label class="spw-upload ${wizard.avatarImage?'spw-upload-selected':''}"><span class="spw-upload-symbol">${wizard.avatarImage?'✓':'↑'}</span><span class="spw-upload-copy"><strong>${wizard.avatarImage?'Dein Galeriebild ist ausgewählt':'Foto aus der Galerie hochladen'}</strong><small>JPG, PNG oder WebP · automatisch zugeschnitten</small></span><span class="spw-upload-arrow">→</span><input type="file" accept="image/jpeg,image/png,image/webp" data-wz-file aria-label="Eigenes Profilbild aus Galerie wählen"></label><div class="spw-photo-tip"><span>✦</span> Dein ausgewähltes Bild siehst du sofort in der Profilvorschau.</div><form class="spw-form" data-wz-step="1">${error}<div class="spw-actions">${back}<button class="spw-primary" type="submit" data-wz-next>Mein Bild bestätigen <span aria-hidden="true">→</span></button></div></form>`;
 if(i===2)body=`<div class="spw-eyebrow"><span class="spw-eyebrow-icon">◉</span> SCHRITT 03 / 04 · LIEBLINGSFARBE</div><h2>Bring <em>Farbe ins Spiel.</em></h2><p class="spw-sub">Wähle deinen persönlichen Farbton. Er setzt Akzente am Avatar und verleiht deinem Spielerprofil deinen eigenen Stil.</p><div class="spw-section-label"><span>DEIN FARBSTIL</span><small>Wähle eine Farbe</small></div><div class="spw-colors" role="group" aria-label="Lieblingsfarbe wählen">${COLORS.map((c,n)=>`<button class="spw-color ${c===wizard.color?'chosen':''}" type="button" data-wz-color="${c}" aria-pressed="${c===wizard.color}" aria-label="${['Blau','Rot','Grün','Gelb','Violett','Rosa'][n]}"><i aria-hidden="true" style="--c:${c}"></i><span>${['Himmelblau','Korallrot','Mintgrün','Sonnengelb','Violett','Rosa'][n]}</span><small>${c===wizard.color?'Ausgewählt':'Auswählen'}</small></button>`).join('')}</div><div class="spw-color-feature"><div class="spw-color-feature-glow" style="--swatch:${wizard.color}">✦</div><div><strong>Dein Profil, deine Farbe</strong><small>Schau auf die farbige Umrandung deines Avatars in der Vorschau. Du kannst sie später jederzeit ändern.</small></div></div><form class="spw-form" data-wz-step="2">${error}<div class="spw-actions"><button class="spw-secondary" type="button" data-wz-back>← Zurück</button><button class="spw-primary" type="submit" data-wz-next>Farbe übernehmen <span aria-hidden="true">→</span></button></div></form>`;
 if(i===3)body=`<div class="spw-eyebrow"><span class="spw-eyebrow-icon">★</span> SCHRITT 04 / 04 · SPIELERNAME</div><h2>Und wie nennen<br>wir <em>dich?</em></h2><p class="spw-sub">Dieser Name erscheint bei deinen Spielen und im Profil. Mach ihn kurz, einprägsam und ganz zu deinem.</p><form class="spw-form" data-wz-step="3"><label class="spw-field"><span>Dein Spielername</span><div class="spw-input-wrap spw-name-wrap"><span class="spw-leading" aria-hidden="true">♛</span><input name="name" required minlength="2" maxlength="24" autocomplete="nickname" value="${safeHTML(wizard.name)}" placeholder="z. B. Chris" data-wz-name></div></label><div class="spw-name-meta"><span>Wird deinen Mitspielern angezeigt</span><strong data-spw-name-counter>${wizard.name.length} / 24</strong></div><div class="spw-review"><span class="spw-review-title">DEIN PROFIL AUF EINEN BLICK</span><div><span>✉ Online-Konto</span><strong>${safeHTML(wizard.email||current.user?.email||'E-Mail bestätigt')}</strong></div><div><span>▧ Profilbild</span><strong>${wizard.avatarImage?'Eigenes Foto':'Avatar '+(wizard.avatar+1)}</strong></div><div><span>◉ Profilfarbe</span><strong><i class="spw-review-dot" style="--swatch:${wizard.color}"></i> Gewählt</strong></div><div><span>★ Spielername</span><strong data-spw-review-name>${safeHTML(wizard.name||'Noch offen')}</strong></div></div>${error}<div class="spw-actions"><button class="spw-secondary" type="button" data-wz-back>← Zurück</button><button class="spw-primary" type="submit" data-wz-next>👑 Mein Profil erstellen</button></div></form><div class="spw-final-note"><strong>✨ Alles bereit?</strong> Dein Online-Konto wird erst beim Klick auf „Mein Profil erstellen“ angelegt. Anschließend öffnet sich deine Profilseite.</div>`;
 showForm(body,i);if(preserveScroll&&dlg)dlg.scrollTop=prevOffset;
}
function openRegistration(resume=false){
 if(resume&&current.profile?.setupComplete!==false)return;
 wizard={step:resume?1:0,email:resume?(current.user?.email||''):'',password:'',avatar:0,avatarImage:null,color:COLORS[0],name:'',resume};
 renderWizard();show();
}
function renderLogin(mode='login',err=''){
 const reset=mode==='reset';
 const body=`<div class="spw-login-avatar" aria-hidden="true">${reset?'🔑':'👋'}</div><div class="spw-eyebrow"><span class="spw-eyebrow-icon">${reset?'♧':'☁'}</span> ${reset?'DEIN KONTO WIEDERHERSTELLEN':'GUT, DASS DU DA BIST'}</div><h2>${reset?'Wieder Zugriff auf<br><em>dein Profil.</em>':'Willkommen<br><em>zurück!</em>'}</h2><p class="spw-sub">${reset?'Wir schicken dir einen Link, mit dem du ein neues Passwort vergeben kannst.':'Schön, dass du wieder dabei bist. Melde dich an und spiele mit deinem persönlichen Online-Profil weiter.'}</p><div class="spw-benefits"><span>🔐 Geschützte Anmeldung</span><span>☁ Online synchronisiert</span></div><form class="spw-form" data-wz-step="${reset?'reset':'login'}"><label class="spw-field"><span>E-Mail-Adresse</span><div class="spw-input-wrap"><span class="spw-leading" aria-hidden="true">✉</span><input name="email" type="email" inputmode="email" required autocomplete="email" placeholder="name@beispiel.de"></div></label>${reset?'':`<label class="spw-field"><span>Passwort</span><div class="spw-input-wrap"><span class="spw-leading" aria-hidden="true">♧</span><input name="password" type="password" required autocomplete="current-password" placeholder="Dein Passwort"><button class="spw-eye" type="button" data-wz-visibility="password" aria-label="Passwort anzeigen" aria-pressed="false">👁</button></div></label>`}<div class="spw-error" role="alert" aria-live="polite">${safeHTML(err)}</div><button class="spw-primary" data-wz-next type="submit">${reset?'Passwort-Link anfordern':'Bei meinem Profil anmelden'} <span aria-hidden="true">→</span></button><div class="spw-inline-links"><button class="spw-link" type="button" data-wz-open="${reset?'login':'reset'}">${reset?'← Zurück zur Anmeldung':'Passwort vergessen?'}</button><button class="spw-link" type="button" data-wz-open="register">Neues Profil anlegen</button></div></form><div class="spw-info"><span>🛡</span><span>Nur E-Mail-Adresse und Passwort – keine Anmeldung über Google oder andere Anbieter.</span></div>`;
 showForm(body,null,'login');show();
}
function openLogin(){renderLogin('login');}
function openReset(){renderLogin('reset');}
async function handleSubmit(ev){
 const form=ev.target.closest('[data-wz-step]');if(!form)return;ev.preventDefault();
 const next=form.querySelector('[data-wz-next]'),error=form.querySelector('.spw-error');
 if(submitting)return;
 const step=form.dataset.wzStep;
 try{
  if(step==='0'){
   const email=form.elements.email.value.trim().toLowerCase(),password=form.elements.password.value;
   if(password.length<8)throw Error('Mindestens 8 Zeichen für das Passwort verwenden.');
   if(password!==form.elements.repeat.value)throw Error('Beide Passwörter müssen übereinstimmen.');
   wizard.email=email;wizard.password=password;wizard.step=1;renderWizard();return;
  }
  if(step==='1'||step==='2'){wizard.step++;renderWizard();return;}
  if(step==='login'||step==='reset'){
   submitting=true;next.disabled=true;error.textContent='Bitte warten …';
   const email=form.elements.email.value.trim();
   if(step==='reset'){await resetPassword(email);error.textContent='Wenn die E-Mail registriert ist, erhältst du eine Nachricht.';return;}
   const cred=await loginEmail(email,form.elements.password.value);current.user=cred.user;
   const loaded=await refresh();if(loaded?.setupComplete===false)openRegistration(true);else dlg.close();return;
  }
  if(step==='3'){
   wizard.name=form.elements.name.value.replace(/[<>\u0000-\u001f\u007f]/g,'').replace(/\s+/g,' ').trim().slice(0,24);
   if(wizard.name.length<2)throw Error('Bitte mindestens zwei Zeichen eingeben.');
   submitting=true;next.disabled=true;error.textContent='Dein Online-Profil wird gespeichert …';
   // Account is created only when the FOUR steps have all been confirmed.
   if(!wizard.resume){const cred=await registerEmail(wizard.email,wizard.password);current.user=cred.user;wizard.resume=true;}
   wizard.password='';
   // Ensure the account's first Firestore document exists before completing it.
   await request('me');
   const profile=await request('complete','POST',{name:wizard.name,color:wizard.color,favorite:'skyjo',avatar:wizard.avatar,avatarImage:wizard.avatarImage,edited:true});
   current.profile=profile;revision=profile.revision;generation++;setStatus('online');
   dlg.close();location.assign('profile.html');return;
  }
 }catch(e){
  if(String(e.message)==='ALREADY_COMPLETE'){
   try{const p=await refresh();if(p?.setupComplete!==false){dlg.close();location.assign('profile.html');return;}}catch{}
  }
  error.textContent=humanError(e);if(next)next.disabled=false;
 }
 finally{submitting=false;}
}
function renderPanel(){
 const root=document.getElementById('online-account-panel');if(!root)return;
 const label={initializing:'⏳ Firebase lädt',unconfigured:'⚙️ Einrichtung erforderlich',loading:'⏳ Synchronisierung',onboarding:'✍️ Profil fertigstellen',online:'✅ Online verbunden',error:'⚠️ Verbindung prüfen',guest:'🔒 Nicht angemeldet'};
 const b=root.querySelector('[data-online-status]'),d=root.querySelector('[data-online-detail]');
 if(b)b.textContent=label[current.status]||'🔒 Nicht angemeldet';
 if(d)d.textContent=current.error||(current.status==='online'?`Angemeldet: ${current.user?.email||''} · Das Spielerprofil ist ausschließlich online gespeichert.`:'Für dein Online-Profil bitte anmelden oder ein neues Konto erstellen.');
 const guest=root.querySelector('[data-online-guest]'),signed=root.querySelector('[data-online-signed]');
 if(guest)guest.hidden=current.status==='online';if(signed)signed.hidden=current.status!=='online';
}
function initUI(){
 ensureDialog();
 if(document.getElementById('profile-root')){
  const guard=()=>{
   const ready=current.status==='online'&&!!current.profile?.setupComplete;
   document.body.classList.toggle('sp-account-ready',!!ready);
   if(!ready&&current.status==='guest'&&!dlg.open)openLogin();
   if(!ready&&current.status==='error'&&!dlg.open)renderLogin('login',current.error);
   if(!ready&&current.status==='onboarding'&&!dlg.open)openRegistration(true);
  };
  window.addEventListener('spielonline-change',guard);guard();
 }
 document.querySelectorAll('[data-online-action]').forEach(b=>b.addEventListener('click',async()=>{
  try{if(b.dataset.onlineAction==='logout')await logout();if(b.dataset.onlineAction==='retry')await refresh();if(b.dataset.onlineAction==='login')openLogin();if(b.dataset.onlineAction==='register')openRegistration();}
  catch(e){setStatus('error',humanError(e));}
 }));
 renderPanel();
}
window.SpielOnline={state,refresh,saveProfile,loginEmail,registerEmail,logout,resetPassword,openLogin,openRegistration,processImage:shrinkImage};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initUI);else initUI();
(async()=>{
 if(!configured){setStatus('unconfigured');return;}
 try{
  const [appModule,authModule]=await Promise.all([import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js')]);
  api=authModule;const app=appModule.initializeApp(fb,'spielportal-profile-v2');auth=authModule.getAuth(app);
  authModule.onAuthStateChanged(auth,async user=>{
   if(submitting&&user){current.user=user;return;}
   if(user&&current.user?.uid===user.uid&&current.profile)return;
   generation++;current.user=user;current.profile=null;revision=0;queue=Promise.resolve();
   if(user){try{await refresh();}catch{}}
   else setStatus('guest');
  },e=>setStatus('error',humanError(e)));
 }catch(e){setStatus('error',humanError(e));}
})();
})();
