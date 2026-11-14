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
