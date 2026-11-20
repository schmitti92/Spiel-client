/**
 * DOG Grinch campaign – independent mission definitions.
 * Nothing in this folder imports or mutates the classic DOG game state.
 * Only mission 1 is playable; the other entries describe future stages.
 */
export const MISSIONS = Object.freeze([
  Object.freeze({
    id:1,slug:'weg-zum-berg',title:'Der Weg zum Berg',subtitle:'Was ist mit Weihnachten geschehen?',
    playersMax:3,piecesPerPlayer:5,forcedLossesPerPlayer:1,
    goal:'Pro Spieler genau ein Portal-Zielfeld. Jede der vier geretteten Figuren wird dort sofort nach Welt 2 teleportiert.',
    goalType:'single-portal-per-player',teleportAtTrackSteps:64,teleportCountToComplete:4,
    theme:'mountain-road',
    trailHints:[
      {field:8,icon:'🔎',title:'Die ersten Spuren',message:'Im Schnee sind merkwürdige Spuren zu sehen. Sie führen in Richtung Berg.'},
      {field:24,icon:'🌫️',title:'Der Nebelpass',message:'Zwischen den Felsen schwebt dichter Nebel. Ein leises Dröhnen liegt in der Luft.'},
      {field:40,icon:'⚡',title:'Das grüne Leuchten',message:'Ein grüner Energiestrahl zuckt über den Bergkamm. Jemand muss hier eine gewaltige Maschine bedienen.'},
      {field:56,icon:'❄️',title:'Der eisige Weg',message:'Im Eis steckt ein Stück Weihnachtsschmuck. Hier muss jemand vor euch entlanggekommen sein.'}
    ],
    effects:{quakeEvery:12,fogEvery:7,clueEvery:9},
    enabled:true
  }),
  Object.freeze({id:2,title:'Der verfluchte Aufstieg',playersMax:3,piecesPerPlayer:4,forcedLossesPerPlayer:1,goalType:'single-portal-per-player',teleportAtTrackSteps:64,teleportCountToComplete:3,trailHints:[],goal:'Eine versteckte Falle entfernt in Mission 2 genau eine weitere Figur je Spieler. Die übrigen drei werden nach Welt 3 gerettet.',slotEffects:40,doubleSlotChance:0.10,slotAtEveryDeal:true,theme:'ice-ascent',enabled:true}),
  Object.freeze({id:3,title:'Die erste Begegnung',playersMax:3,piecesPerPlayer:3,forcedLossesPerPlayer:1,theme:'grinch-encounter',enabled:false}),
  Object.freeze({id:4,title:'Befreiung aus der Höhle',playersMax:3,piecesPerPlayer:2,forcedLossesPerPlayer:0,theme:'prison-rescue',enabled:false}),
  Object.freeze({id:5,title:'Die letzte Schlacht',playersMax:3,piecesPerPlayer:5,forcedLossesPerPlayer:0,theme:'final-battle',enabled:false})
]);
export const MISSION_1=MISSIONS[0];
