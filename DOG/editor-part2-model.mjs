export const SIZE=1000, COLORS=['red','blue','green'], MAX_TRACK=300, MAX_BOSSES=100;
const validInt=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
const validPoint=p=>p!==null&&typeof p==='object'&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=16&&p.x<=984&&p.y>=16&&p.y<=984;
const point=p=>({x:Math.round(p.x*100)/100,y:Math.round(p.y*100)/100});
export function blank(count=160,bosses=1){
 if(!validInt(count,1,MAX_TRACK)||!validInt(bosses,1,MAX_BOSSES))throw Error('Ungültige Feldanzahl');
 return {schema:'dog-grinch-board-v1',part:2,size:SIZE,track:Array(count).fill(null),starts:Object.fromEntries(COLORS.map(c=>[c,[null,null]])),strike:null,bosses:Array(bosses).fill(null),areas:defaultAreas(count),features:[],areaOverrides:{},sideFields:[],wall:null,prison:null,enemies:[],spawnPoints:[]};
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
 s.sideFields=normalizeSideFields(raw.sideFields??[],s.track);
 s.wall=normalizeWall(raw.wall??null);
 s.prison=normalizePrison(raw.prison??null);
 const enemies=raw.enemies??[];if(!Array.isArray(enemies)||enemies.length>150)throw Error('Maximal 150 Feindfelder.');s.enemies=enemies.map(clean);
 const spawnPoints=raw.spawnPoints??[];if(!Array.isArray(spawnPoints)||spawnPoints.length>50)throw Error('Maximal 50 Gegnerportale.');s.spawnPoints=spawnPoints.map(clean);
 s.areaOverrides={};for(const [k,v] of Object.entries(raw.areaOverrides??{})){if(!validInt(Number(k),0,s.track.length-1)||!s.track[Number(k)]||!validInt(v,0,3))throw Error('Ungültige Gebietszuordnung');s.areaOverrides[k]=v;}
 const issues=conflicts(s);if(issues.length)throw Error(issues[0]);
 return s;
}
export function getField(s,ref){
 if(ref.kind==='spawn')return s.spawnPoints[ref.index]??null;
 if(ref.kind==='enemy')return s.enemies[ref.index]??null;
 if(ref.kind==='track')return s.track[ref.index]??null;
 if(ref.kind==='side')return s.sideFields.find(f=>f.id===ref.index)?.position??null;
 if(ref.kind==='start')return s.starts[ref.color]?.[ref.index]??null;
 if(ref.kind==='strike')return s.strike;
 if(ref.kind==='boss'){const b=s.bosses[ref.index];return b&&Object.hasOwn(b,'trackIndex')?s.track[b.trackIndex]:b??null;}
 return null;
}
export function refs(s){
 return [...s.track.map((_,index)=>({kind:'track',index})),...COLORS.flatMap(color=>[0,1].map(index=>({kind:'start',color,index}))),{kind:'strike'},...s.bosses.map((_,index)=>({kind:'boss',index})),...s.sideFields.map(f=>({kind:'side',index:f.id})),...Array.from({length:Math.min(150,s.enemies.length+1)},(_,index)=>({kind:'enemy',index})),...Array.from({length:Math.min(50,s.spawnPoints.length+1)},(_,index)=>({kind:'spawn',index}))];
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
 if(r.kind==='spawn'){if(!validInt(r.index,0,Math.min(49,n.spawnPoints.length))||(p!==null&&!validPoint(p)))throw Error('Ungültige Portalposition.');if(r.index===n.spawnPoints.length&&p===null)return normalize(n);n.spawnPoints[r.index]=p===null?null:point(p);return normalize(n);}
 if(r.kind==='enemy'){if(!validInt(r.index,0,Math.min(149,n.enemies.length))||(p!==null&&!validPoint(p)))throw Error('Ungültige Feindposition.');if(r.index===n.enemies.length&&p===null)return normalize(n);n.enemies[r.index]=p===null?null:point(p);return normalize(n);}
 if(r.kind==='side'){const f=n.sideFields.find(f=>f.id===r.index);if(!f)throw Error('Seitenfeld fehlt.');if(p===null)n.sideFields=n.sideFields.filter(f=>f.id!==r.index);else f.position=p;return normalize(n);}
 const v=p===null?null:r.kind==='boss'&&p.trackIndex!==undefined?{trackIndex:p.trackIndex}:point(p);
 if(r.kind==='track'&&validInt(r.index,0,n.track.length-1)){
  n.track[r.index]=v;if(v===null){n.bosses=n.bosses.map(b=>b?.trackIndex===r.index?null:b);n.features=n.features.filter(f=>f.trackIndex!==r.index);delete n.areaOverrides[r.index];n.sideFields=n.sideFields.map(f=>f.anchor===r.index?{...f,anchor:null}:f);}
 }else if(r.kind==='start'&&COLORS.includes(r.color)&&validInt(r.index,0,1))n.starts[r.color][r.index]=v;
 else if(r.kind==='strike')n.strike=v;
 else if(r.kind==='boss'&&validInt(r.index,0,n.bosses.length-1))n.bosses[r.index]=v;
 else throw Error('Ungültiges Feld');
 return normalize(n);
}
export function resize(s,count,bossCount){
 if(!validInt(count,1,MAX_TRACK)||!validInt(bossCount,1,MAX_BOSSES))throw Error('Ungültige Feldanzahl');
 const n=structuredClone(s);n.track=Array.from({length:count},(_,i)=>s.track[i]??null);
 if(count!==s.track.length){n.areas=defaultAreas(count).map((a,i)=>({...s.areas[i],end:a.end}));n.features=n.features.filter(f=>f.trackIndex<count);n.sideFields=n.sideFields.map(f=>f.anchor!==null&&f.anchor>=count?{...f,anchor:null}:f);n.areaOverrides=Object.fromEntries(Object.entries(n.areaOverrides).filter(([i])=>Number(i)<count));}
 n.bosses=Array.from({length:bossCount},(_,i)=>{const b=s.bosses[i];return b?.trackIndex>=count?null:b??null;});
 return normalize(n);
}
export function status(s){
 const track=s.track.filter(Boolean).length,starts=COLORS.reduce((n,c)=>n+s.starts[c].filter(Boolean).length,0),bosses=s.bosses.filter(Boolean).length;
 const adventureIssues=featureIssues(s),zoneIssues=areaIssues(s);
 return {track,starts,bosses,strike:Number(Boolean(s.strike)),adventureIssues,zoneIssues,complete:track===s.track.length&&starts===6&&bosses===s.bosses.length&&Boolean(s.strike)&&!conflicts(s).length&&!adventureIssues.length&&!zoneIssues.length};
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

export const FEATURE_TYPES=Object.freeze({teleportIn:'🌀 Teleporter-Eingang',teleportOut:'🌀 Teleporter-Ziel',teleportSwitch:'🔮 Teleporter-Schalter',door:'🚪 Verschlossene Tür',key:'🔑 Schlüssel',checkpoint:'🚩 Kontrollpunkt',safe:'🛡️ Schutzfeld',gift:'🎁 Geschenkfeld',trap:'⚠️ Fallenfeld',spawn:'👾 Gegnerportal auf Laufweg',lever:'🎚️ Hebel'});
export const LINKED_TYPES=['teleportIn','teleportOut','teleportSwitch','door','key','lever'];
export const LEVER_OWNERS=Object.freeze({all:'Alle Spieler',red:'🔴 Nur Rot',blue:'🔵 Nur Blau',green:'🟢 Nur Grün'});
function normalizeLeverOwner(owner){const value=owner??'all';if(!Object.hasOwn(LEVER_OWNERS,value))throw Error('Ungültige Hebelfarbe.');return value;}
export function canUseLever(lever,color){return COLORS.includes(color)&&(normalizeLeverOwner(lever.owner)==='all'||lever.owner===color);}
export const LEVER_MODES=Object.freeze({held:'Solange besetzt',toggle:'An / Aus bei Betreten',permanent:'Dauerhaft nach Betreten',timed:'Für mehrere Zugrunden'});
export const LEVER_EFFECTS=Object.freeze({custom:'Später festlegen',door:'Tür offen halten',teleport:'Teleporter aktivieren',spawn:'Gegnernachschub stoppen',safe:'Gruppenschutz',fog:'Nächstes Gebiet enthüllen'});
export function defaultAreas(count){return Array.from({length:4},(_,i)=>({name:['Der Wald','Das Eisland','Das Spielzeugdorf','Der Grinch-Berg'][i],end:Math.ceil((i+1)*count/4),fogRect:null,polygon:null}));}
function normalizeAreas(areas,count){
 if(!Array.isArray(areas)||areas.length!==4)throw Error('Genau vier Gebiete erforderlich');
 let prev=0;
 return areas.map((a,i)=>{
  if(!a||!validInt(a.end,count<4?prev:prev+1,count)||i===3&&a.end!==count||i<3&&count>=4&&a.end>count-(3-i))throw Error('Gebietsgrenzen müssen aufsteigend sein und am letzten Feld enden');
  prev=a.end;const name=String(a.name||'Gebiet '+(i+1)).trim().slice(0,60)||'Gebiet '+(i+1);
  let fogRect=null;
  if(a.fogRect!=null){const {x,y,w,h}=a.fogRect;if(![x,y,w,h].every(Number.isFinite)||x<0||y<0||w<10||h<10||x+w>1000.01||y+h>1000.01)throw Error('Ungültige Nebelfläche');fogRect={x,y,w,h};}
  return {name,end:a.end,fogRect,polygon:a.polygon==null?null:normalizePolygon(a.polygon)};
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
  const entry={type:f.type,trackIndex:f.trackIndex,group};
  if(f.type==='door'&&f.checkpoint===true)entry.checkpoint=true;
  if(f.type==='lever'){
   const mode=f.mode??'held',effect=f.effect??'custom',rounds=f.rounds??2;
   if(!Object.hasOwn(LEVER_MODES,mode)||!Object.hasOwn(LEVER_EFFECTS,effect)||!validInt(rounds,1,20))throw Error('Ungültige Hebeleinstellung.');
   entry.mode=mode;entry.effect=effect;entry.owner=normalizeLeverOwner(f.owner);if(mode==='timed')entry.rounds=rounds;
  }
  return entry;
 });
}
export function setAreas(s,areas){return normalize({...s,areas});}
export function areaOf(s,index){if(!validInt(index,0,s.track.length-1)||!s.track[index])return -1;const manual=s.areaOverrides?.[index];return validInt(manual,0,3)?manual:-1;}
export function visibleArea(s,index,unlocked=1){const a=areaOf(s,index);return a<0||a<unlocked;}
export function setFeature(s,index,type,group='1',settings={}){const old=s.features.find(f=>f.trackIndex===index);if(type==='checkpoint'&&old?.type==='door')return normalize({...s,features:s.features.map(f=>f===old?{...f,checkpoint:true}:f)});return normalize({...s,features:[...s.features.filter(f=>f.trackIndex!==index),...(type?[{type,trackIndex:index,group,...(type==='door'&&(old?.type==='checkpoint'||old?.checkpoint===true)?{checkpoint:true}:{}),...(type==='lever'?{mode:settings.mode,effect:settings.effect,rounds:settings.rounds,owner:settings.owner}:{})}]:[])]});}
export function featureIssues(s){
 const issues=[],doorGroups=new Map(),teleGroups=new Map();
 const levers=[...s.features.filter(f=>f.type==='lever'),...s.sideFields.map(f=>({...f,trackIndex:f.anchor}))];
 for(const f of s.sideFields)if(f.anchor===null)issues.push('Hebel H'+f.id+': Verbindung zum Hauptweg fehlt.');
 for(const f of s.features){const map=['door','key'].includes(f.type)?doorGroups:['teleportIn','teleportOut','teleportSwitch'].includes(f.type)?teleGroups:null;if(map){if(!map.has(f.group))map.set(f.group,[]);map.get(f.group).push(f);}}
 for(const [id,fs] of doorGroups){const doors=fs.filter(f=>f.type==='door'),keys=fs.filter(f=>f.type==='key');const lever=levers.some(f=>f.trackIndex!==null&&f.effect==='door'&&f.group===id&&doors.length&&f.trackIndex<Math.min(...doors.map(d=>d.trackIndex)));if(!doors.length||keys.length>1||(!keys.length&&!lever))issues.push('Türgruppe '+id+': Tür und ein Schlüssel oder erreichbarer Hebel nötig.');else if(keys.length&&keys[0].trackIndex>=Math.min(...doors.map(f=>f.trackIndex)))issues.push('Schlüssel '+id+' muss vor der ersten zugehörigen Tür liegen.');}
 for(const [id,fs] of teleGroups){const count=t=>fs.filter(f=>f.type===t).length;if(count('teleportIn')!==1||count('teleportOut')!==1||count('teleportSwitch')>1)issues.push('Teleporter '+id+': genau ein Eingang, ein Ziel, optional ein Schalter.');else{const sw=fs.find(f=>f.type==='teleportSwitch'),out=fs.find(f=>f.type==='teleportOut');if(sw&&sw.trackIndex>out.trackIndex)issues.push('Teleporter '+id+': Schalter darf nicht hinter dem Ziel liegen.');}}
 for(const f of levers){if(f.effect==='door'&&!doorGroups.get(f.group)?.some(d=>d.type==='door'))issues.push('Hebel '+(f.id?'H'+f.id:'auf Feld '+(f.trackIndex+1))+': passende Tür fehlt.');if(f.effect==='teleport'&&!teleGroups.get(f.group)?.some(d=>d.type==='teleportIn'))issues.push('Hebel '+(f.id?'H'+f.id:'auf Feld '+(f.trackIndex+1))+': passender Teleporter fehlt.');}
 return issues;
}

const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
function onSegment(a,b,p){return Math.abs(cross(a,b,p))<1e-5&&p.x>=Math.min(a.x,b.x)-1e-5&&p.x<=Math.max(a.x,b.x)+1e-5&&p.y>=Math.min(a.y,b.y)-1e-5&&p.y<=Math.max(a.y,b.y)+1e-5;}
function intersects(a,b,c,d){return cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0||onSegment(a,b,c)||onSegment(a,b,d)||onSegment(c,d,a)||onSegment(c,d,b);}
export function normalizePolygon(raw){
 if(!Array.isArray(raw)||raw.length<3||raw.length>240)throw Error('Eine Fläche braucht 3 bis 240 Punkte.');
 const pts=raw.map(p=>{if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>1000||p.y<0||p.y>1000)throw Error('Gebietspunkt außerhalb des Bretts.');return point(p);});
 if(pts.length>3&&Math.hypot(pts[0].x-pts.at(-1).x,pts[0].y-pts.at(-1).y)<2)pts.pop();
 let sum=0,n=pts.length;for(let i=0;i<n;i++){const a=pts[i],b=pts[(i+1)%n];if(Math.hypot(a.x-b.x,a.y-b.y)<1)throw Error('Eckpunkte zu dicht.');sum+=a.x*b.y-b.x*a.y;for(let j=i+2;j<n;j++){if(i===0&&j===n-1)continue;if(intersects(a,b,pts[j],pts[(j+1)%n]))throw Error('Umrandung darf sich nicht selbst kreuzen.');}}
 if(Math.abs(sum)<200)throw Error('Fläche zu klein.');return pts;
}
export function pointInPolygon(p,poly){if(!p||!poly)return 0;let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[j],b=poly[i];if(onSegment(a,b,p))return 1;if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;}return inside?2:0;}
export function setPolygon(s,i,polygon){if(!validInt(i,0,3))throw Error('Gebiet wählen.');return setAreas(s,s.areas.map((a,j)=>i===j?{...a,polygon,fogRect:null}:a));}
export function setAreaOverride(s,index,area){if(!s.track[index])throw Error('Zuerst ein Lauffeld auswählen.');const areaOverrides={...s.areaOverrides};if(area===null)delete areaOverrides[index];else areaOverrides[index]=area;return normalize({...s,areaOverrides});}
// Drawing a region is independent of assigning track fields. Unassigned fields are valid.
export function areaIssues(s){return s.areas.some(a=>a.polygon)&&s.areas.some(a=>!a.polygon)?['Noch nicht alle vier Gebietsflächen gezeichnet.']:[];}
export function assignAreaRange(s,first,last,area){
 if(!validInt(first,0,s.track.length-1)||!validInt(last,first,s.track.length-1)||(area!==null&&!validInt(area,0,3)))throw Error('Gültigen Feldbereich und ein Gebiet wählen.');
 const areaOverrides={...s.areaOverrides};let count=0;
 for(let i=first;i<=last;i++){if(!s.track[i])continue;count++;if(area===null)delete areaOverrides[i];else areaOverrides[i]=area;}
 if(!count)throw Error('In diesem Bereich sind noch keine Lauffelder gesetzt.');
 return normalize({...s,areaOverrides});
}

function normalizeSideFields(raw,track){
 if(!Array.isArray(raw)||raw.length>150)throw Error('Maximal 150 Seitenfelder.');
 const ids=new Set();
 return raw.map(f=>{
  if(!f||f.type!=='lever'||!validInt(f.id,1,1000000)||ids.has(f.id)||!validPoint(f.position))throw Error('Ungültiges Hebel-Seitenfeld.');
  ids.add(f.id);
  if(f.anchor!==null&&(!validInt(f.anchor,0,track.length-1)||!track[f.anchor]))throw Error('Seitenfeld braucht ein vorhandenes Anschlussfeld.');
  const group=String(f.group??'1').trim(),mode=f.mode??'held',effect=f.effect??'custom',rounds=f.rounds??2;
  if(!/^[-a-zA-Z0-9_]{1,16}$/.test(group)||!Object.hasOwn(LEVER_MODES,mode)||!Object.hasOwn(LEVER_EFFECTS,effect)||!validInt(rounds,1,20))throw Error('Ungültige Hebeleinstellung.');
  return {id:f.id,type:'lever',position:point(f.position),anchor:f.anchor,group,mode,effect,owner:normalizeLeverOwner(f.owner),...(mode==='timed'?{rounds}:{})};
 });
}
export function addSideLever(s,position,anchor,settings={}){
 if(!validInt(anchor,0,s.track.length-1)||!s.track[anchor])throw Error('Zuerst Anschlussfeld am Hauptweg wählen.');
 const id=Math.max(0,...s.sideFields.map(f=>f.id))+1;
 return normalize({...s,sideFields:[...s.sideFields,{id,type:'lever',position,anchor,group:settings.group,mode:settings.mode,effect:settings.effect,rounds:settings.rounds,owner:settings.owner}]});
}
export function updateSideLever(s,id,settings){
 if(!s.sideFields.some(f=>f.id===id))throw Error('Hebel fehlt.');
 const patch={};for(const k of ['anchor','group','mode','effect','rounds','owner'])if(Object.hasOwn(settings,k))patch[k]=settings[k];
 return normalize({...s,sideFields:s.sideFields.map(f=>f.id===id?{...f,...patch}:f)});
}

/** Open cave entrance contour, defended by the future ranged-attack animation origin. No game rules. */
export function normalizeWall(raw){
 if(raw===null)return null;
 if(!raw||!['attack-origin','cave-entrance'].includes(raw.kind)||!Array.isArray(raw.points)||raw.points.length<2||raw.points.length>240)throw Error('Der Höhleneingang braucht 2 bis 240 Punkte.');
 const points=raw.points.map(p=>{if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>SIZE||p.y<0||p.y>SIZE)throw Error('Eingangspunkt außerhalb des Bretts.');return point(p);});
 for(let i=1;i<points.length;i++)if(Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y)<1)throw Error('Eingangspunkte liegen zu dicht zusammen.');
 return {kind:'cave-entrance',defenseOrigin:true,points};
}
export function setWall(s,points){return normalize({...s,wall:points===null?null:{kind:'cave-entrance',points}});}

/** Independent prison decoration and captive animation coordinates. */
export function normalizePrison(raw){
 if(raw===null)return null;
 if(!raw||raw.kind!=='captive-prison'||!raw.position||!Number.isFinite(raw.position.x)||!Number.isFinite(raw.position.y)||!validInt(raw.size,80,200))throw Error('Ungültiges Gefängnis.');
 const size=raw.size,position=point(raw.position),half=size/2;
 if(position.x-half<0||position.y-half<0||position.x+half>SIZE||position.y+half>SIZE)throw Error('Das Gefängnis muss vollständig auf dem Brett liegen.');
 const cells=COLORS.flatMap((color,row)=>Array.from({length:3},(_,col)=>({id:color+'-'+(col+1),color,position:point({x:position.x+(col-1)*size*.25,y:position.y+(row-1)*size*.22+size*.045})})));
 return {kind:'captive-prison',position,size,cells};
}
export function setPrison(s,position,size=120){return normalize({...s,prison:position===null?null:{kind:'captive-prison',position,size}});}
export function setBossPost(s,index,position){if(position!==null&&!validPoint(position))throw Error('Boss-Wachposten braucht eine freie Position neben dem Laufweg.');return setField(s,{kind:'boss',index},position);}
