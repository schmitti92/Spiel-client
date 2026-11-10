/**
 * DOG Classic · versioned 64-field board geometry.
 * Four matching quarter-sectors, 16 cells each, with four protected
 * starts, four private four-slot goal lanes, and four four-piece homes.
 *
 * Presentation only: no game state, scoring or card logic lives here.
 */
export const BOARD_LAYOUT_ID = 'classic-corner-board-v2';
export const BOARD_VIEWBOX = 760;
const SECTOR = Object.freeze([
  [145,122],[176,108],[207,102],[238,102],
  [269,108],[300,108],[331,109],[362,109],
  [393,109],[424,109],[455,108],[486,108],
  [517,102],[548,102],[579,108],[611,122]
]);
const GOAL = Object.freeze([[182,164],[182,196],[182,228],[182,260]]);
const HOME = Object.freeze([[247,164],[247,196],[247,228],[247,260]]);
export const START_INDICES = Object.freeze([0,16,32,48]);
export const TRACK_COUNT = 64;
export const SEAT_COUNT = 4;
export const GOAL_COUNT = 4;
export const HOME_COUNT = 4;
export const COLORS_CLASSIC = Object.freeze(['#e85b54','#58a9ed','#50bf80','#ecc354']);
const rotate = ([x,y],quarter) => {
  switch (((quarter%4)+4)%4) {
    case 0:return {x,y};
    case 1:return {x:760-y,y:x};
    case 2:return {x:760-x,y:760-y};
    default:return {x:y,y:760-x};
  }
};
export const TRACK_POINTS = Object.freeze(Array.from({length:64},(_,i)=>Object.freeze(rotate(SECTOR[i%16],Math.floor(i/16)))));
export const GOAL_POINTS = Object.freeze(Array.from({length:4},(_,owner)=>Object.freeze(GOAL.map(p=>Object.freeze(rotate(p,owner))))));
export const HOME_POINTS = Object.freeze(Array.from({length:4},(_,owner)=>Object.freeze(HOME.map(p=>Object.freeze(rotate(p,owner))))));
export const trackPoint = i => TRACK_POINTS[(i%64+64)%64];
export const goalPoint = (owner,i) => GOAL_POINTS[owner]?.[i]||null;
export const homePoint = (owner,i) => HOME_POINTS[owner]?.[i]||null;
export const isStartField = i => Number.isInteger(i)&&i>=0&&i<64&&i%16===0;
export function assertBoardLayout() {
  const unique = pts => new Set(pts.map(p=>p.x+','+p.y)).size===pts.length;
  if(TRACK_POINTS.length!==64 || !unique(TRACK_POINTS))throw Error('DOG_TRACK_LAYOUT_INVALID');
  for(let owner=0;owner<4;owner++){
    if(GOAL_POINTS[owner].length!==4||HOME_POINTS[owner].length!==4)throw Error('DOG_GOAL_LAYOUT_INVALID');
    if(!unique(GOAL_POINTS[owner])||!unique(HOME_POINTS[owner]))throw Error('DOG_HOME_LAYOUT_INVALID');
  }
  return true;
}
assertBoardLayout();
