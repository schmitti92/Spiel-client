/**
 * Meta-Sammelalbum: cross-game picture collection.
 *
 * Only PREVIEWS exist so far. This is independent of the DOG cosmetic
 * collection and the existing Deal or No Deal Christmas card ownership.
 * Each illustration must later be granted individually by an authenticated
 * event endpoint on Render. Uploaded artwork, localStorage, URL parameters
 * and the old Christmas card album must not grant anything here.
 *
 * Extend META_ALBUM_THEMES with another theme when it is actually created.
 */
const ASSET_ROOT='DealOrNoDeal/assets/weihnachts_event/';
const christmasOne=Object.freeze([
 Object.freeze({id:'meta-christmas1-01',unlockId:'meta:christmas1:picture:01',number:1,name:'Winterdorf',icon:'🏘️',image:ASSET_ROOT+'01_winterdorf.png',description:'Das verschneite Dorf im warmen Lichterglanz.',status:'locked'}),
 Object.freeze({id:'meta-christmas1-02',unlockId:'meta:christmas1:picture:02',number:2,name:'Lebkuchenhaus',icon:'🍪',image:ASSET_ROOT+'02_lebkuchenhaus.png',description:'Ein süßes Weihnachtshaus voller festlicher Details.',status:'locked'}),
 Object.freeze({id:'meta-christmas1-03',unlockId:'meta:christmas1:picture:03',number:3,name:'Weihnachtsmann',icon:'🎅',image:ASSET_ROOT+'03_weihnachtsmann.png',description:'Der Weihnachtsmann macht sich für die Bescherung bereit.',status:'locked'}),
 Object.freeze({id:'meta-christmas1-04',unlockId:'meta:christmas1:picture:04',number:4,name:'Rentier Rudolf',icon:'🦌',image:ASSET_ROOT+'04_rentier.png',description:'Ein treuer Begleiter durch die Winternacht.',status:'locked'}),
 Object.freeze({id:'meta-christmas1-05',unlockId:'meta:christmas1:picture:05',number:5,name:'Weihnachtsbaum',icon:'🎄',image:ASSET_ROOT+'05_weihnachtsbaum.png',description:'Ein festlich geschmückter Baum als Herzstück der Weihnachtszeit.',status:'locked'}),
 Object.freeze({id:'meta-christmas1-06',unlockId:'meta:christmas1:picture:06',number:6,name:'Weihnachtszug',icon:'🚂',image:ASSET_ROOT+'06_weihnachtszug.png',description:'Eine magische Zugfahrt durch den Schnee.',status:'locked'}),
 Object.freeze({id:'meta-christmas1-07',unlockId:'meta:christmas1:picture:07',number:7,name:'Schneekugel',icon:'🔮',image:ASSET_ROOT+'07_schneekugel.png',description:'Ein kleines Weihnachtswunder hinter Glas.',status:'locked'}),
 Object.freeze({id:'meta-christmas1-08',unlockId:'meta:christmas1:picture:08',number:8,name:'Wichtelwerkstatt',icon:'🎁',image:ASSET_ROOT+'08_wichtelwerkstatt.png',description:'In der Werkstatt werden die Geschenke vorbereitet.',status:'locked'}),
 Object.freeze({id:'meta-christmas1-09',unlockId:'meta:christmas1:picture:09',number:9,name:'Polarlichter',icon:'🌌',image:ASSET_ROOT+'09_polarlichter.png',description:'Die funkelnden Lichter des winterlichen Himmels.',status:'locked'})
]);
export const META_ALBUM_THEMES=Object.freeze([
 Object.freeze({
  id:'weihnachtsevent-1',
  title:'Weihnachtsevent 1',
  icon:'🎄',
  subtitle:'Die neun Weihnachtsbilder',
  description:'Neun besondere Erinnerungen zum Sammeln. Alle Bilder werden später einzeln im Weihnachtsevent freigeschaltet.',
  pictures:christmasOne
 })
]);
export const META_ALBUM_PICTURES=Object.freeze(META_ALBUM_THEMES.flatMap(theme=>theme.pictures));
export const metaAlbumThemeById=id=>META_ALBUM_THEMES.find(theme=>theme.id===id)||META_ALBUM_THEMES[0];
/** Secure default: no event-specific grant endpoint has been connected. */
export const isMetaAlbumPictureUnlocked=()=>false;
const ids=new Set(META_ALBUM_PICTURES.map(item=>item.id));
const unlockIds=new Set(META_ALBUM_PICTURES.map(item=>item.unlockId));
if(ids.size!==META_ALBUM_PICTURES.length||unlockIds.size!==META_ALBUM_PICTURES.length||
 META_ALBUM_PICTURES.some(item=>item.status!=='locked'||!/^meta:christmas1:picture:\d{2}$/.test(item.unlockId))){
 throw Error('META_ALBUM_INVALID_PICTURE_CATALOG');
}
