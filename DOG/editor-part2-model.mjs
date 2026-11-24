export const SIZE=1000, COLORS=['red','blue','green'], MAX_TRACK=300, MAX_BOSSES=100;
const validInt=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
const validPoint=p=>p!==null&&typeof p==='object'&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=16&&p.x<=984&&p.y>=16&&p.y<=984;
const point=p=>({x:Math.round(p.x*100)/100,y:Math.round(p.y*100)/100});
export function blank(count=160,bosses=1){
 if(!validInt(count,1,MAX_TRACK)||!validInt(bosses,1,MAX_BOSSES))throw Error('Ungültige Feldanzahl');
 return {schema:'dog-grinch-board-v1',part:2,size:SIZE,track:Array(count).fill(null),starts:Object.fromEntries(COLORS.map(c=>[c,[null,null]])),strike:null,bosses:Array(bosses).fill(null),areas:defaultAreas(count),features:[]};
}
export function normalize(raw){
 if(!raw||raw.schema!=='dog-grinch-board-v1'||raw.part!==2||raw.size!==SIZE||!Array.isArray(raw.track)||!Array.isArray(raw.bosses))throw Error('Kein Teil-2-Brett');
 const s=blank(raw.track.length,raw.bosses.length);
 const clean=p=>{if(p===null)return null;if(!validPoint(p))throw Error('Ungültige Koordinaten');return point(p);};
 s.track=raw.track.map(clean);
 for(const c of COLORS){if(!Array.isArray(raw.starts?.[c])||raw.starts[c].length!==2)throw Error('Genau zwei Startplätze je Farbe nötig');s.starts[c]=raw.starts[c].map(clean);}
 s.strike=clean(raw.strike);
 s.bosses=raw.bosses.map(b=>{
  if(b===null)return null;
  if(Object.hasOwn(b,'trackIndex')){if(!validInt(b.trackIndex,0,s.track.length-1)||!s.track[b.trackIndex])throw Error('Boss verweist auf fehlendes Lauffeld');return {trackIndex:b.trackIndex};}
  return clean(b);
 });
 s.areas=normalizeAreas(raw.areas??defaultAreas(s.track.length),s.track.length);
 s.features=normalizeFeatures(raw.features??[],s.track);
 const issues=conflicts(s);if(issues.length)throw Error(issues[0]);
 return s;
}
export function getField(s,ref){
 if(ref.kind==='track')return s.track[ref.index]??null;
 if(ref.kind==='start')return s.starts[ref.color]?.[ref.index]??null;
 if(ref.kind==='strike')return s.strike;
 if(ref.kind==='boss'){const b=s.bosses[ref.index];return b&&Object.hasOwn(b,'trackIndex')?s.track[b.trackIndex]:b??null;}
 return null;
}
export function refs(s){
 return [...s.track.map((_,index)=>({kind:'track',index})),...COLORS.flatMap(color=>[0,1].map(index=>({kind:'start',color,index}))),{kind:'strike'},...s.bosses.map((_,index)=>({kind:'boss',index}))];
}
export const key=r=>r.kind+':'+(r.color??'')+':'+(r.index??0);
export function conflicts(s){
 const all=refs(s).filter(r=>!(r.kind==='boss'&&s.bosses[r.index]?.trackIndex!==undefined)).map(r=>({r,p:getField(s,r)})).filter(x=>x.p);
 const errors=[];
 for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++)if(Math.hypot(all[i].p.x-all[j].p.x,all[i].p.y-all[j].p.y)<26)errors.push('Felder überschneiden sich: '+key(all[i].r)+' / '+key(all[j].r));
 const anchors=s.bosses.filter(b=>b?.trackIndex!==undefined).map(b=>b.trackIndex);
 if(new Set(anchors).size!==anchors.length)errors.push('Pro Lauffeld nur ein Bossmarker.');
 return errors;
}
export function setField(s,r,p){
 const n=structuredClone(s);
 const v=p===null?null:r.kind==='boss'&&p.trackIndex!==undefined?{trackIndex:p.trackIndex}:point(p);
 if(r.kind==='track'&&validInt(r.index,0,n.track.length-1)){
  n.track[r.index]=v;if(v===null){n.bosses=n.bosses.map(b=>b?.trackIndex===r.index?null:b);n.features=n.features.filter(f=>f.trackIndex!==r.index);}
 }else if(r.kind==='start'&&COLORS.includes(r.color)&&validInt(r.index,0,1))n.starts[r.color][r.index]=v;
 else if(r.kind==='strike')n.strike=v;
 else if(r.kind==='boss'&&validInt(r.index,0,n.bosses.length-1))n.bosses[r.index]=v;
 else throw Error('Ungültiges Feld');
 return normalize(n);
}
export function resize(s,count,bossCount){
 if(!validInt(count,1,MAX_TRACK)||!validInt(bossCount,1,MAX_BOSSES))throw Error('Ungültige Feldanzahl');
 const n=structuredClone(s);n.track=Array.from({length:count},(_,i)=>s.track[i]??null);
 if(count!==s.track.length){n.areas=defaultAreas(count);n.features=n.features.filter(f=>f.trackIndex<count);}
 n.bosses=Array.from({length:bossCount},(_,i)=>{const b=s.bosses[i];return b?.trackIndex>=count?null:b??null;});
 return normalize(n);
}
export function status(s){
 const track=s.track.filter(Boolean).length,starts=COLORS.reduce((n,c)=>n+s.starts[c].filter(Boolean).length,0),bosses=s.bosses.filter(Boolean).length;
 const adventureIssues=featureIssues(s);
 return {track,starts,bosses,strike:Number(Boolean(s.strike)),adventureIssues,complete:track===s.track.length&&starts===6&&bosses===s.bosses.length&&Boolean(s.strike)&&!conflicts(s).length&&!adventureIssues.length};
}
export function template(count=160,bossCount=3){
 const s=blank(count,bossCount),cols=Math.ceil(Math.sqrt(count*1.45)),rows=Math.ceil(count/cols);
 const gap=Math.min(44,Math.floor(850/Math.max(cols-1,rows-1,1)));
 if(gap<26)throw Error('Zu viele Felder für die automatische Vorlage');
 s.track=s.track.map((_,i)=>{const row=Math.floor(i/cols),col=i%cols;return {x:75+(row%2?cols-1-col:col)*gap,y:140+row*gap};});
 COLORS.forEach((c,i)=>s.starts[c]=[{x:75+i*100,y:55},{x:110+i*100,y:55}]);
 s.strike={x:410,y:55};
 s.bosses=s.bosses.map((_,i)=>i<count?{trackIndex:Math.floor((i+1)*count/(bossCount+1))}:null);
 // When there are more boss slots than distinct track fields, leave extras unplaced.
 const seen=new Set();s.bosses=s.bosses.map(b=>b&&seen.has(b.trackIndex)?null:b?(seen.add(b.trackIndex),b):null);
 return normalize(s);
}

export const FEATURE_TYPES=Object.freeze({teleportIn:'🌀 Teleporter-Eingang',teleportOut:'🌀 Teleporter-Ziel',teleportSwitch:'🔮 Teleporter-Schalter',door:'🚪 Verschlossene Tür',key:'🔑 Schlüssel',checkpoint:'🚩 Kontrollpunkt',safe:'🛡️ Schutzfeld',gift:'🎁 Geschenkfeld',trap:'⚠️ Fallenfeld',spawn:'👾 Gegnerportal'});
export const LINKED_TYPES=['teleportIn','teleportOut','teleportSwitch','door','key'];
export function defaultAreas(count){return Array.from({length:4},(_,i)=>({name:['Der Wald','Das Eisland','Das Spielzeugdorf','Der Grinch-Berg'][i],end:Math.ceil((i+1)*count/4),fogRect:null}));}
function normalizeAreas(areas,count){
 if(!Array.isArray(areas)||areas.length!==4)throw Error('Genau vier Gebiete erforderlich');
 let prev=0;
 return areas.map((a,i)=>{
  if(!a||!validInt(a.end,count<4?prev:prev+1,count)||i===3&&a.end!==count||i<3&&count>=4&&a.end>count-(3-i))throw Error('Gebietsgrenzen müssen aufsteigend sein und am letzten Feld enden');
  prev=a.end;const name=String(a.name||'Gebiet '+(i+1)).trim().slice(0,60)||'Gebiet '+(i+1);
  let fogRect=null;
  if(a.fogRect!=null){const {x,y,w,h}=a.fogRect;if(![x,y,w,h].every(Number.isFinite)||x<0||y<0||w<10||h<10||x+w>1000.01||y+h>1000.01)throw Error('Ungültige Nebelfläche');fogRect={x,y,w,h};}
  return {name,end:a.end,fogRect};
 });
}
function normalizeFeatures(features,track){
 if(!Array.isArray(features)||features.length>300)throw Error('Ungültige Spezialfelder');
 const occupied=new Set();
 return features.map(f=>{
  if(!f||!Object.hasOwn(FEATURE_TYPES,f.type)||!validInt(f.trackIndex,0,track.length-1)||!track[f.trackIndex])throw Error('Spezialfeld braucht ein vorhandenes Lauffeld');
  const group=LINKED_TYPES.includes(f.type)?String(f.group??'1').trim():'';
  if(LINKED_TYPES.includes(f.type)&&!/^[-a-zA-Z0-9_]{1,16}$/.test(group))throw Error('Verknüpfungs-ID: 1–16 Buchstaben, Zahlen, Bindestrich oder Unterstrich');
  if(occupied.has(f.trackIndex))throw Error('Nur ein Spezialmarker pro Lauffeld');occupied.add(f.trackIndex);
  return {type:f.type,trackIndex:f.trackIndex,group};
 });
}
export function setAreas(s,areas){return normalize({...s,areas});}
export function areaOf(s,index){return s.areas.findIndex(a=>index<a.end);}
export function visibleArea(s,index,unlocked=1){const a=areaOf(s,index);return a>=0&&a<unlocked;}
export function setFeature(s,index,type,group='1'){return normalize({...s,features:[...s.features.filter(f=>f.trackIndex!==index),...(type?[{type,trackIndex:index,group}]:[])]});}
export function featureIssues(s){
 const issues=[],doorGroups=new Map(),teleGroups=new Map();
 for(const f of s.features){const map=['door','key'].includes(f.type)?doorGroups:['teleportIn','teleportOut','teleportSwitch'].includes(f.type)?teleGroups:null;if(map){if(!map.has(f.group))map.set(f.group,[]);map.get(f.group).push(f);}}
 for(const [id,fs] of doorGroups){const doors=fs.filter(f=>f.type==='door'),keys=fs.filter(f=>f.type==='key');if(!doors.length||keys.length!==1)issues.push('Türgruppe '+id+': mindestens eine Tür und genau ein Schlüssel nötig.');else if(keys[0].trackIndex>=Math.min(...doors.map(f=>f.trackIndex)))issues.push('Schlüssel '+id+' muss vor der ersten zugehörigen Tür liegen.');}
 for(const [id,fs] of teleGroups){const count=t=>fs.filter(f=>f.type===t).length;if(count('teleportIn')!==1||count('teleportOut')!==1||count('teleportSwitch')>1)issues.push('Teleporter '+id+': genau ein Eingang, ein Ziel, optional ein Schalter.');else{const sw=fs.find(f=>f.type==='teleportSwitch'),out=fs.find(f=>f.type==='teleportOut');if(sw&&sw.trackIndex>out.trackIndex)issues.push('Teleporter '+id+': Schalter darf nicht hinter dem Ziel liegen.');}}
 return issues;
}
