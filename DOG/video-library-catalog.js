/** Movie inventory is derived from the actual original DOG film catalogs.
 * Adding a new film to this library cannot bypass the server's allowlist.
 */
import {CHRISTMAS_TREE_FILMS} from './christmas-tree-films.js?v=5';
import {CHRISTMAS_BUILDING_FILMS} from './christmas-building-films.js?v=10';

const film=(id,category,icon,title,description,clips,poster=null)=>
 Object.freeze({id,category,icon,title,description,
  clips:Object.freeze([...clips]),poster});

export const DOG_VIDEO_CATALOG=Object.freeze([
 film('welcome','DOG','🐾','Willkommen in der DOG-Spiellobby',
  'Die Begrüßung zu eurem gemeinsamen Spieleabend.',
  ['./assets/42667997_1795277919445597.mp4'],'./assets/dog-lobby-dock.png'),
 film('intro','Weihnachtsgeschichte','🎄','Das Weihnachtswunder von Lichtertal',
  'Vier Szenen: die Legende, die Ankunft und der erste Weihnachtsfunke.',
  ['./assets/281209346_1795276244245420.mp4',
   './assets/905698533_1795276252169292.mp4',
   './assets/1072510991_1795276258065893.mp4',
   './assets/658840420_1795276265000111.mp4'],
  './assets/lichtertal-intro-poster.jpg'),
 film('first-light','Weihnachtsgeschichte','✨','Der erste Funke',
  'Der erste gemeinsame Weihnachtslicht-Fund in Lichtertal.',
  ['./assets/Lichtertal_Der_erste_Funke_120_Sekunden.mp4'],'./assets/lichtertal-intro-poster.jpg'),
 ...[2,3,4].map(level=>film('tree-'+level,'Weihnachtsbaum','🌲',
  CHRISTMAS_TREE_FILMS[level].title,'Baumstufe '+level+' · '+CHRISTMAS_TREE_FILMS[level].subtitle,
  CHRISTMAS_TREE_FILMS[level].clips,
  './weihnachtsevent-bilder/weihnachtsbaum_stufe_'+level+'.png')),
 ...[['bakery','🍪','Weihnachtsbäckerei'],['workshop','🎁','Wichtelwerkstatt'],
  ['inn','🕯️','Friedensherberge'],['tower','🔔','Weihnachtslichter-Turm'],
  ['luckhouse','🎟️','Weihnachts-Glückshaus'],['academy','📚','XP-Wichtel-Akademie']].map(([id,icon,title])=>
  film('building-'+id+'-3','Gebäudegeschichten',icon,
   CHRISTMAS_BUILDING_FILMS[id][3].title,
   title+' · Stufe 3 · '+CHRISTMAS_BUILDING_FILMS[id][3].subtitle,
   CHRISTMAS_BUILDING_FILMS[id][3].clips,CHRISTMAS_BUILDING_FILMS[id][3].poster)),
 ...[['bakery','🍪','Weihnachtsbäckerei'],['workshop','🎁','Wichtelwerkstatt'],
  ['inn','🕯️','Friedensherberge'],['tower','🔔','Weihnachtslichter-Turm'],
  ['luckhouse','🎟️','Weihnachts-Glückshaus']].map(([id,icon,title])=>
  film('building-'+id,'Gebäudegeschichten',icon,
   CHRISTMAS_BUILDING_FILMS[id][5].title,
   title+' · Stufe 5 · '+CHRISTMAS_BUILDING_FILMS[id][5].subtitle,
   CHRISTMAS_BUILDING_FILMS[id][5].clips,CHRISTMAS_BUILDING_FILMS[id][5].poster))
]);
export const DOG_VIDEO_IDS=Object.freeze(DOG_VIDEO_CATALOG.map(f=>f.id));
export const getDogFilm=id=>DOG_VIDEO_CATALOG.find(f=>f.id===id)||null;
