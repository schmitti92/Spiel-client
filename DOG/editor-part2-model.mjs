export const SIZE=1000, COLORS=['red','blue','green'], MAX_TRACK=300, MAX_BOSSES=100;
const validInt=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
const validPoint=p=>p!==null&&typeof p==='object'&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=16&&p.x<=984&&p.y>=16&&p.y<=984;
const point=p=>({x:Math.round(p.x*100)/100,y:Math.round(p.y*100)/100});
export function blank(count=160,bosses=1){
 if(!validInt(count,1,MAX_TRACK)||!validInt(bosses,1,MAX_BOSSES))throw Error('Ungültige Feldanzahl');
 return {schema:'dog-grinch-board-v1',part:2,size:SIZE,track:Array(count).fill(null),starts:Object.fromEntries(COLORS.map(c=>[c,[null,null]])),strike:null,bosses:Array(bosses).fill(null)};
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
  n.track[r.index]=v;if(v===null)n.bosses=n.bosses.map(b=>b?.trackIndex===r.index?null:b);
 }else if(r.kind==='start'&&COLORS.includes(r.color)&&validInt(r.index,0,1))n.starts[r.color][r.index]=v;
 else if(r.kind==='strike')n.strike=v;
 else if(r.kind==='boss'&&validInt(r.index,0,n.bosses.length-1))n.bosses[r.index]=v;
 else throw Error('Ungültiges Feld');
 return normalize(n);
}
export function resize(s,count,bossCount){
 if(!validInt(count,1,MAX_TRACK)||!validInt(bossCount,1,MAX_BOSSES))throw Error('Ungültige Feldanzahl');
 const n=structuredClone(s);n.track=Array.from({length:count},(_,i)=>s.track[i]??null);
 n.bosses=Array.from({length:bossCount},(_,i)=>{const b=s.bosses[i];return b?.trackIndex>=count?null:b??null;});
 return normalize(n);
}
export function status(s){
 const track=s.track.filter(Boolean).length,starts=COLORS.reduce((n,c)=>n+s.starts[c].filter(Boolean).length,0),bosses=s.bosses.filter(Boolean).length;
 return {track,starts,bosses,strike:Number(Boolean(s.strike)),complete:track===s.track.length&&starts===6&&bosses===s.bosses.length&&Boolean(s.strike)&&!conflicts(s).length};
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
