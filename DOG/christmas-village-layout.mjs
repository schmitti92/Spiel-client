/**
 * DOG / Lichtertal: stable 1200 x 670 village sprite reservations.
 * These bounds describe the maximum VISIBLE alpha artwork, NOT the PNG canvas.
 * Sprite positioning in christmas-event.js clamps to both width and height.
 * Consequently every stage lies inside its stage reservation.
 *
 * Always reserve a gap from every other building/tree: a mixed-level village
 * must be as safe as an all-level-five preview. No game progress is stored here.
 */
export const VILLAGE_SCENE_WIDTH=1200;
export const VILLAGE_SCENE_HEIGHT=670;
export const VILLAGE_MIN_CLEARANCE=16;
export const sceneLayouts=Object.freeze({
 tower:     {cx:145, ground:389,w:237,h:280,growth:[.82,.86,.91,.96,1]},
 workshop:  {cx:1058,ground:389,w:258,h:280,growth:[.78,.83,.89,.94,1]},
 luckhouse: {cx:366, ground:401,w:172,h:190,growth:[.65,.74,.82,.91,1]},
 academy:   {cx:844, ground:401,w:138,h:190,growth:[.65,.74,.82,.91,1]},
 bakery:    {cx:303, ground:609,w:274,h:191,growth:[.74,.80,.87,.94,1]},
 inn:       {cx:922, ground:609,w:288,h:191,growth:[.76,.81,.88,.94,1]},
 tree:      {cx:610, ground:504,w:280,h:394,growth:[.54,.59,.65,.71,.76,.81,.86,.91,.96,1]}
});

// The Grinch cave is a HUGE BACKDROP, not an eighth physical building.
// It fills the photographed mountain/horizon area the user highlighted,
// stays behind the six houses and behind the (visually) level-one tree.
// Background and foreground may overlap by design; the building collision
// checker still guarantees minimum clearance between physical buildings.
export const grinchSkyLayout=Object.freeze({
 cx:610,ground:435,w:970,h:415,growth:[1,.97,.94,.90,.85]
});

/** Bounding box guaranteed to contain a sprite's alpha-visible pixels.
 * Real sprites are scaled via min(maxWidth/alphaW, maxHeight/alphaH), and their
 * ground-contact / centre anchors are stable across all development levels. */
export function villageSpriteBounds(id,stage){
 const item=sceneLayouts[id],level=Number(stage);
 if(!item||!Number.isInteger(level)||level<1||level>item.growth.length)throw new RangeError('Unknown village sprite/stage: '+id+'/'+stage);
 const factor=item.growth[level-1],w=item.w*factor,h=item.h*factor;
 return {left:item.cx-w/2,right:item.cx+w/2,top:item.ground-h,bottom:item.ground};
}
/** Axis clearance (negative = overlapping in both dimensions). */
export function villageSpriteClearance(a,b){
 return Math.max(
  b.left-a.right,a.left-b.right,
  b.top-a.bottom,a.top-b.bottom
 );
}
export function verifyVillageSpriteLayout(minClearance=VILLAGE_MIN_CLEARANCE){
 const failures=[],ids=Object.keys(sceneLayouts);
 for(const id of ids)for(let level=1;level<=sceneLayouts[id].growth.length;level++){
  const a=villageSpriteBounds(id,level);
  if(a.left<0||a.right>VILLAGE_SCENE_WIDTH||a.top<0||a.bottom>VILLAGE_SCENE_HEIGHT)
   failures.push(id+' stage '+level+' exceeds village scene');
  for(const other of ids.slice(ids.indexOf(id)+1))
   for(let otherLevel=1;otherLevel<=sceneLayouts[other].growth.length;otherLevel++){
    const b=villageSpriteBounds(other,otherLevel);
    const gap=villageSpriteClearance(a,b);
    if(gap+1e-7<minClearance)
     failures.push(id+' '+level+' vs '+other+' '+otherLevel+': '+gap.toFixed(2)+'px gap, need '+minClearance);
   }
 }
 return failures;
}
