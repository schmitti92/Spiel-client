/**
 * Meta-Sammelalbum: twelve Lichtertal Christmas images.
 * IDs are permanent. Five rewards are tied to official, highest-ever world
 * levels; the other seven have no defined unlock rule and remain locked.
 * Current artwork is a TEMPORARY preview; custom card paintings will replace
 * these assets when uploaded. No client progress or Bingo prize can unlock one.
 */
export const META_ALBUM_THEMES=Object.freeze([
 Object.freeze({
  id:'weihnachtsevent-1',title:'Weihnachtsevent 1',icon:'🎄',
  subtitle:'12 Lichtertal-Bilder',
  description:'Die vier Gebäude auf Level 5, der Baum auf Level 10: Sammelbilder aus Lichtertal.',
  pictures:Object.freeze([
   Object.freeze({"id":"meta-christmas1-01","unlockId":"meta:christmas1:picture:01","number":1,"name":"Weihnachtsbaum","icon":"🎄","image":"DOG/weihnachtsevent-bilder/weihnachtsbaum_stufe_10.png","description":"Das große Weihnachtslicht im Zentrum von Lichtertal.","kind":"tree","buildingId":null,"requiredLevel":10,"status":"locked"}),
   Object.freeze({"id":"meta-christmas1-02","unlockId":"meta:christmas1:picture:02","number":2,"name":"Weihnachtsbäckerei","icon":"🍪","image":"DOG/weihnachtsevent-bilder/weihnachtsbaeckerei_stufe_5.png","description":"Die festlich ausgebaute Weihnachtsbäckerei von Lichtertal.","kind":"building","buildingId":"bakery","requiredLevel":5,"status":"locked"}),
   Object.freeze({"id":"meta-christmas1-03","unlockId":"meta:christmas1:picture:03","number":3,"name":"Wichtelwerkstatt","icon":"🎁","image":"DOG/weihnachtsevent-bilder/Wichtelwerkstatt_Stufe_5.png","description":"Die Wichtelwerkstatt in ihrer höchsten Ausbaustufe.","kind":"building","buildingId":"workshop","requiredLevel":5,"status":"locked"}),
   Object.freeze({"id":"meta-christmas1-04","unlockId":"meta:christmas1:picture:04","number":4,"name":"Weihnachtslichter-Turm","icon":"⭐","image":"DOG/weihnachtsevent-bilder/weihnachtslichter_turm_stufe_5.png","description":"Der Weihnachtslichter-Turm im festlichen Glanz.","kind":"building","buildingId":"tower","requiredLevel":5,"status":"locked"}),
   Object.freeze({"id":"meta-christmas1-05","unlockId":"meta:christmas1:picture:05","number":5,"name":"Friedensherberge","icon":"🕯️","image":"DOG/weihnachtsevent-bilder/Herberge_Stufe_5.png","description":"Die erleuchtete Friedensherberge in Lichtertal.","kind":"building","buildingId":"inn","requiredLevel":5,"status":"locked"}),
   Object.freeze({"id":"meta-christmas1-06","unlockId":"meta:christmas1:picture:06","number":6,"name":"Geschenkefabrik","icon":"🎁","image":"DealOrNoDeal/assets/weihnachts_event/08_wichtelwerkstatt.png","description":"Die festliche Fabrik voller Geschenke. Eigenes Sammelbild ist geplant.","kind":"planned","buildingId":null,"requiredLevel":null,"status":"locked"}),
   Object.freeze({"id":"meta-christmas1-07","unlockId":"meta:christmas1:picture:07","number":7,"name":"Weihnachtsmarkt","icon":"🎡","image":"DealOrNoDeal/assets/weihnachts_event/01_winterdorf.png","description":"Ein leuchtender Weihnachtsmarkt. Eigenes Sammelbild ist geplant.","kind":"planned","buildingId":null,"requiredLevel":null,"status":"locked"}),
   Object.freeze({"id":"meta-christmas1-08","unlockId":"meta:christmas1:picture:08","number":8,"name":"Lebkuchenhaus","icon":"🍬","image":"DealOrNoDeal/assets/weihnachts_event/02_lebkuchenhaus.png","description":"Ein zauberhaftes Haus aus Lebkuchen und Zuckerguss.","kind":"planned","buildingId":null,"requiredLevel":null,"status":"locked"}),
   Object.freeze({"id":"meta-christmas1-09","unlockId":"meta:christmas1:picture:09","number":9,"name":"Rentierstall","icon":"🦌","image":"DealOrNoDeal/assets/weihnachts_event/04_rentier.png","description":"Der gemütliche Stall der Weihnachtsrentiere.","kind":"planned","buildingId":null,"requiredLevel":null,"status":"locked"}),
   Object.freeze({"id":"meta-christmas1-10","unlockId":"meta:christmas1:picture:10","number":10,"name":"Schneemannplatz","icon":"☃️","image":"DealOrNoDeal/assets/weihnachts_event/07_schneekugel.png","description":"Ein winterlicher Platz voller Schneemänner.","kind":"planned","buildingId":null,"requiredLevel":null,"status":"locked"}),
   Object.freeze({"id":"meta-christmas1-11","unlockId":"meta:christmas1:picture:11","number":11,"name":"Schlittenwerkstatt","icon":"🛷","image":"DealOrNoDeal/assets/weihnachts_event/06_weihnachtszug.png","description":"Eine Werkstatt für die schnellen Weihnachtsschlitten.","kind":"planned","buildingId":null,"requiredLevel":null,"status":"locked"}),
   Object.freeze({"id":"meta-christmas1-12","unlockId":"meta:christmas1:picture:12","number":12,"name":"Weihnachtspostamt","icon":"💌","image":"DealOrNoDeal/assets/weihnachts_event/03_weihnachtsmann.png","description":"Das Postamt für Briefe an den Weihnachtsmann.","kind":"planned","buildingId":null,"requiredLevel":null,"status":"locked"})
  ])
 })
]);
export const META_ALBUM_PICTURES=Object.freeze(META_ALBUM_THEMES.flatMap(theme=>theme.pictures));
export const metaAlbumThemeById=id=>META_ALBUM_THEMES.find(theme=>theme.id===id)||META_ALBUM_THEMES[0];
export const META_ALBUM_PAGE_SIZE=6;
export const metaAlbumPageCount=theme=>Math.max(1,Math.ceil((theme?.pictures?.length||0)/META_ALBUM_PAGE_SIZE));
export function metaAlbumPage(theme,requestedIndex=0){
 const count=metaAlbumPageCount(theme);
 const index=Number.isFinite(requestedIndex)?Math.min(count-1,Math.max(0,Math.trunc(requestedIndex))):0;
 const pictures=theme?.pictures?.slice(index*META_ALBUM_PAGE_SIZE,(index+1)*META_ALBUM_PAGE_SIZE)||[];
 return Object.freeze({index,count,pictures:Object.freeze(pictures),
  emptySlots:META_ALBUM_PAGE_SIZE-pictures.length});
}
/** Strictly server-confirmed: a received array of IDs without matching
 * source and corresponding milestone does NOT grant ownership.
 */
export function isMetaAlbumPictureUnlocked(picture,status){
 if(!picture||picture.kind==='planned'||!status||status.version!==2||
   status.eventId!=='weihnachtsevent-1'||status.source!=='dog-lichtertal-event')return false;
 const row=status.milestones?.find(m=>m?.id===picture.id&&m?.unlockId===picture.unlockId);
 return row?.state==='unlocked'&&Array.isArray(status.unlockedIds)&&
   status.unlockedIds.includes(picture.unlockId);
}
const ids=new Set(META_ALBUM_PICTURES.map(p=>p.id));
const unlockIds=new Set(META_ALBUM_PICTURES.map(p=>p.unlockId));
if(META_ALBUM_PICTURES.length!==12||ids.size!==12||unlockIds.size!==12||
 META_ALBUM_PICTURES.some(p=>p.status!=='locked'||!/^meta:christmas1:picture:\d{2}$/.test(p.unlockId)))
 throw Error('META_ALBUM_INVALID_PICTURE_CATALOG');
