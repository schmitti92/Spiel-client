/**
 * DOG Grinch campaign – independent mission definitions.
 * Nothing in this folder imports or mutates the classic DOG game state.
 * Only mission 1 is playable; the other entries describe future stages.
 */
export const MISSIONS = Object.freeze([
  Object.freeze({
    id:1,slug:'weg-zum-berg',title:'Der Weg zum Berg',subtitle:'Was ist mit Weihnachten geschehen?',
    playersMax:3,piecesPerPlayer:5,forcedLossesPerPlayer:1,
    goal:'Die vier verbliebenen Figuren jedes Spielers ins Ziel bringen.',
    theme:'mountain-road',effects:{quakeEvery:12,fogEvery:7,clueEvery:9},
    enabled:true
  }),
  Object.freeze({id:2,title:'Der verfluchte Aufstieg',playersMax:3,piecesPerPlayer:4,forcedLossesPerPlayer:1,theme:'ice-ascent',enabled:false}),
  Object.freeze({id:3,title:'Die erste Begegnung',playersMax:3,piecesPerPlayer:3,forcedLossesPerPlayer:1,theme:'grinch-encounter',enabled:false}),
  Object.freeze({id:4,title:'Befreiung aus der Höhle',playersMax:3,piecesPerPlayer:2,forcedLossesPerPlayer:0,theme:'prison-rescue',enabled:false}),
  Object.freeze({id:5,title:'Die letzte Schlacht',playersMax:3,piecesPerPlayer:5,forcedLossesPerPlayer:0,theme:'final-battle',enabled:false})
]);
export const MISSION_1=MISSIONS[0];
