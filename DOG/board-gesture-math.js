/** Pure viewport math for DOG board pinch gestures; no game state. */
export function boardGestureTarget(start,current,rect,{boardSize=760,minZoom=1,maxZoom=3}={}){
 const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
 const zoom=clamp(start.zoom*(start.distance>0&&current.distance>0?current.distance/start.distance:1),minZoom,maxZoom);
 const side=Math.min(rect.width,rect.height);
 if(!(side>0))return {zoom:start.zoom,center:{...start.center}};
 const midX=rect.left+rect.width/2, midY=rect.top+rect.height/2;
 const baseScale=side/boardSize;
 const anchorX=start.center.x+(start.mid.x-midX)/(baseScale*start.zoom);
 const anchorY=start.center.y+(start.mid.y-midY)/(baseScale*start.zoom);
 const half=boardSize/(2*zoom);
 return {
  zoom,
  center:{
   x:clamp(anchorX-(current.x-midX)/(baseScale*zoom),half,boardSize-half),
   y:clamp(anchorY-(current.y-midY)/(baseScale*zoom),half,boardSize-half)
  }
 };
}

/**
 * Finds the track pawn under a slightly imprecise board tap.
 * Only used after a source pawn was selected for a swap. Never returns
 * array indices: an inactive fourth colour may leave gaps in pawn IDs.
 */
export function nearestTrackPawn(pieces,point,trackPoints,maxRadius=24){
 if(!Array.isArray(pieces)||!Array.isArray(trackPoints)||!Number.isFinite(point?.x)||!Number.isFinite(point?.y)||!Number.isFinite(maxRadius)||maxRadius<0)return null;
 let nearest=null,distanceSquared=maxRadius*maxRadius;
 for(const piece of pieces){
  if(piece?.place!=='track'||!Number.isInteger(piece.pos))continue;
  const p=trackPoints[piece.pos];
  if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))continue;
  const d=(p.x-point.x)**2+(p.y-point.y)**2;
  if(d<=distanceSquared){nearest=piece.id;distanceSquared=d;}
 }
 return nearest;
}

/**
 * Convert a pointer/touch to SVG board units. Android WebViews differ:
 * some support DOMPoint, others only the SVGPoint fallback.
 */
export function boardEventPoint(svg,event,Point=typeof DOMPoint==='function'?DOMPoint:null){
 const matrix=svg?.getScreenCTM?.();
 if(!matrix||!Number.isFinite(event?.clientX)||!Number.isFinite(event?.clientY))return null;
 try{
  const inverse=matrix.inverse();
  if(Point)return new Point(event.clientX,event.clientY).matrixTransform(inverse);
  const fallback=svg.createSVGPoint?.();
  if(fallback){
   fallback.x=event.clientX;fallback.y=event.clientY;
   return fallback.matrixTransform(inverse);
  }
 }catch(_){return null;}
 return null;
}

/** Closest visible track or finish field; the logical move is checked separately. */
export function nearestBoardField(point,trackPoints,goalPoints,maxRadius=34){
 if(!Number.isFinite(point?.x)||!Number.isFinite(point?.y)||!Array.isArray(trackPoints)||!Array.isArray(goalPoints))return null;
 let nearest=null,best=maxRadius*maxRadius;
 const visit=(p,key,seat)=>{
  if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))return;
  const distance=(p.x-point.x)**2+(p.y-point.y)**2;
  if(distance<best){best=distance;nearest=seat===undefined?{key,p}:{key,p,seat};}
 };
 trackPoints.forEach((p,i)=>visit(p,'track:'+i));
 goalPoints.forEach((group,seat)=>group?.forEach((p,i)=>visit(p,'goal:'+i,seat)));
 return nearest;
}
