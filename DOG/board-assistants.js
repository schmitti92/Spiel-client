/**
 * DOG board-construction assistants.
 *
 * The live DOG engine always knows start indices 0/16/32/48.
 * The editor only changes their coordinates, never their identities.
 * A home/house connector is a visual guide, NOT an extra track square.
 * The goal entrance reference is the previous circuit square.
 */
import {clone} from './editor-model.js';

export const SEAT_LABELS=Object.freeze(['Rot','Blau','Grün','Gelb']);
export const EXIT_INDICES=Object.freeze([0,16,32,48]);
export const GOAL_ENTRY_INDICES=Object.freeze([63,15,31,47]);
export const HOUSE_LAYOUTS=Object.freeze(['square','row','column']);
const allowed=(p)=>p && Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=30&&p.x<=730&&p.y>=30&&p.y<=730;
const rounded=n=>Math.round(n*10)/10;
const point=(x,y)=>({x:rounded(x),y:rounded(y)});
const vector=(dx,dy)=>{
  const norm=Math.hypot(dx,dy);
  if(!Number.isFinite(norm)||norm<.01)throw Error('Wähle eine Richtung.');
  return {x:dx/norm,y:dy/norm};
};
const properSeat=(seat)=>{
  if(!Number.isInteger(seat)||seat<0||seat>3)throw Error('Wähle Rot, Blau, Grün oder Gelb.');
  return seat;
};
const properSpacing=(spacing)=>{
  if(!Number.isFinite(spacing)||spacing<24||spacing>64)throw Error('Wähle einen Abstand von 24 bis 64.');
  return spacing;
};
export const exitIndex=seat=>EXIT_INDICES[properSeat(seat)];
export const goalEntryIndex=seat=>GOAL_ENTRY_INDICES[properSeat(seat)];
export function referencePoints(draft,seat){
  const s=properSeat(seat);
  return {
    exitIndex:EXIT_INDICES[s],exit:draft.track[EXIT_INDICES[s]]||null,
    goalEntryIndex:GOAL_ENTRY_INDICES[s],goalEntry:draft.track[GOAL_ENTRY_INDICES[s]]||null
  };
}
export function validateGroupPlacement(draft,kind,seat,candidates,minDistance=23){
  properSeat(seat);
  if(!['goals','homes'].includes(kind)||!Array.isArray(candidates)||candidates.length!==4)
    throw Error('Die 4er-Gruppe ist ungültig.');
  for(const p of candidates)if(!allowed(p))throw Error('Eine Position liegt außerhalb des Brettes. Ändere Richtung oder Abstand.');
  const occupied=[];
  draft.track.forEach((p,i)=>{if(p)occupied.push({p,label:'Lauffeld '+i});});
  for(const type of ['goals','homes'])for(let owner=0;owner<4;owner++)
    draft[type][owner].forEach((p,i)=>{
      if(p && !(type===kind && owner===seat))occupied.push({p,label:(type==='goals'?'Zielfeld ':'Startplatz ')+(i+1)+' '+SEAT_LABELS[owner]});
    });
  for(let i=0;i<candidates.length;i++){
    for(const old of occupied){
      if(Math.hypot(candidates[i].x-old.p.x,candidates[i].y-old.p.y)<minDistance)
        throw Error('Die neuen Felder würden '+old.label+' überlappen.');
    }
    for(let j=i+1;j<candidates.length;j++){
      if(Math.hypot(candidates[i].x-candidates[j].x,candidates[i].y-candidates[j].y)<minDistance)
        throw Error('Die neuen Felder überlappen sich. Wähle einen größeren Abstand.');
    }
  }
  return true;
}
export function buildGoalLane(draft,seat,{dx=0,dy=1,spacing=28,first=null}={}){
  const s=properSeat(seat),gap=properSpacing(spacing),dir=vector(dx,dy);
  const entrance=draft.track[GOAL_ENTRY_INDICES[s]];
  if(!entrance && !first && !draft.goals[s][0])throw Error('Setze zuerst das Einlauffeld '+GOAL_ENTRY_INDICES[s]+' oder positioniere Zielfeld 1 manuell.');
  // If goal #1 already exists and first is omitted, keep its location fixed.
  // Otherwise place it one field spacing away from the preceding track square.
  const firstPoint=first||draft.goals[s][0]||point(entrance.x+dir.x*gap,entrance.y+dir.y*gap);
  const row=Array.from({length:4},(_,i)=>point(firstPoint.x+dir.x*gap*i,firstPoint.y+dir.y*gap*i));
  validateGroupPlacement(draft,'goals',s,row);
  const next=clone(draft);next.goals[s]=row;
  return next;
}
export function buildHomeGroup(draft,seat,{
  layout='square',dx=0,dy=1,spacing=28,distance=94,center=null,first=null
}={}){
  const s=properSeat(seat),gap=properSpacing(spacing),dir=vector(dx,dy);
  if(!HOUSE_LAYOUTS.includes(layout))throw Error('Unbekannte Startplatz-Anordnung.');
  if(!Number.isFinite(distance)||distance<30||distance>250)throw Error('Haus-Abstand muss zwischen 30 und 250 liegen.');
  const start=draft.track[EXIT_INDICES[s]];
  if(!start&&!center&&!first&&!draft.homes[s][0])throw Error('Setze zuerst das farbige Ausstiegsfeld '+EXIT_INDICES[s]+' oder platziere Startplatz 1 manuell.');
  const middle=center||(start?point(start.x+dir.x*distance,start.y+dir.y*distance):null);
  const offset=[-1.5,-.5,.5,1.5];
  const firstPoint=first||draft.homes[s][0];
  const origin=firstPoint||(layout==='square'?point(middle.x-gap*.5,middle.y-gap*.5):
    layout==='row'?point(middle.x-gap*1.5,middle.y):point(middle.x,middle.y-gap*1.5));
  const row=layout==='square'?
    [[0,0],[1,0],[0,1],[1,1]].map(([ox,oy])=>point(origin.x+ox*gap,origin.y+oy*gap)):
    [0,1,2,3].map(k=>layout==='row'?point(origin.x+k*gap,origin.y):point(origin.x,origin.y+k*gap));
  validateGroupPlacement(draft,'homes',s,row);
  const next=clone(draft);next.homes[s]=row;
  return next;
}
export function getTrackConnections(draft,{min=20,max=75}={}){
  const links=[],missing=[],broken=[];let segments=[];
  for(let i=0;i<64;i++){
    const j=(i+1)%64,a=draft.track[i],b=draft.track[j];
    if(!a||!b){missing.push({from:i,to:j,hasFrom:!!a,hasTo:!!b});continue;}
    const distance=rounded(Math.hypot(a.x-b.x,a.y-b.y));
    const info={from:i,to:j,distance,a,b,valid:distance>=min&&distance<=max};
    links.push(info);
    if(!info.valid)broken.push(info);
  }
  let current=[];
  // Segments are useful for locating blocks, even when they wrap at 63 -> 0.
  for(let i=0;i<64;i++){
    if(draft.track[i])current.push(i);
    else if(current.length){segments.push(current);current=[];}
  }
  if(current.length)segments.push(current);
  const first=segments[0],last=segments.at(-1);
  if(segments.length>1 && first[0]===0 && last.at(-1)===63){
    segments=[last.concat(first),...segments.slice(1,-1)];
  }
  const occupied=draft.track.filter(Boolean).length;
  return {links,missing,broken,segments,occupied,
    closed:occupied===64&&missing.length===0&&broken.length===0,
    unconnected:64-links.length};
}
export function straightGaps(draft,{maxMissing=6}={}){
  const options=[];
  for(let from=0;from<64;from++){
    if(!draft.track[from])continue;
    let n=0;
    for(let k=1;k<=maxMissing;k++){
      if(draft.track[(from+k)%64])break;
      n++;
    }
    const next=(from+n+1)%64;
    if(n>0&&n<=maxMissing&&draft.track[next])
      options.push({from,to:next,missing:n});
  }
  return options;
}
export function connectStraightGap(draft,from,{step=28,tolerance=2.5,maxMissing=6}={}){
  const gap=properSpacing(step);
  const option=straightGaps(draft,{maxMissing}).find(x=>x.from===from);
  if(!option)throw Error('Hier liegt keine kurze gerade Lücke mit zwei Endfeldern.');
  const {to,missing}=option;
  const a=draft.track[from],b=draft.track[to],distance=Math.hypot(b.x-a.x,b.y-a.y);
  if(Math.abs(distance/(missing+1)-gap)>tolerance)
    throw Error('Die Endpunkte passen nicht zum gewählten Feldabstand. Diese Strecke hat vermutlich eine Kurve. Verbinde sie Feld für Feld.');
  const steps=Array.from({length:missing},(_,i)=>{
    const fraction=(i+1)/(missing+1);
    return point(a.x+(b.x-a.x)*fraction,a.y+(b.y-a.y)*fraction);
  });
  const next=clone(draft);
  // Keep all new positions away from any unrelated track/goal/home point.
  const existing=[];
  next.track.forEach((p,i)=>{if(p)existing.push({p,label:'Lauffeld '+i});});
  for(const type of ['goals','homes'])next[type].forEach((row,seat)=>row.forEach((p,i)=>{
    if(p)existing.push({p,label:type+' '+seat+':'+i});
  }));
  for(const [i,p] of steps.entries()){
    if(!allowed(p))throw Error('Ein Verbindungspunkt liegt außerhalb des Spielbretts.');
    for(const old of existing)if(Math.hypot(old.p.x-p.x,old.p.y-p.y)<23)
      throw Error('Die neue Verbindung kollidiert mit '+old.label+'.');
    for(let j=0;j<i;j++)if(Math.hypot(steps[j].x-p.x,steps[j].y-p.y)<23)
      throw Error('Die Verbindung hätte überlappende Felder.');
  }
  steps.forEach((p,i)=>{next.track[(from+i+1)%64]=p;});
  return {draft:next,added:missing,from,to};
}
