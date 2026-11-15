/**
 * DOG · five Christmas-themed NAMEPLATE / player-name frame previews.
 * Unlike board frames, these decorate the future player name display.
 * They are deliberately locked and cosmetic-only. Owning an asset or editing
 * local storage must NEVER grant these future event entitlements.
 */
export const CHRISTMAS_NAME_FRAMES=Object.freeze([
  Object.freeze({
    id:'christmas-nameframe-sternengold',name:'Sternengold',frameTheme:'sternengold',
    frameIcon:'⭐',cornerIcon:'✦',unlockId:'christmas2026:nameframe:01',
    description:'Ein königlicher, rotgoldener Weihnachts-Namensrahmen mit funkelnden Sternen.'
  }),
  Object.freeze({
    id:'christmas-nameframe-frostkristall',name:'Frostkristall',frameTheme:'frostkristall',
    frameIcon:'❄️',cornerIcon:'❅',unlockId:'christmas2026:nameframe:02',
    description:'Ein silberblauer Namensrahmen aus Eis und Schneekristallen.'
  }),
  Object.freeze({
    id:'christmas-nameframe-tannenzauber',name:'Tannenzauber',frameTheme:'tannenzauber',
    frameIcon:'🎄',cornerIcon:'❋',unlockId:'christmas2026:nameframe:03',
    description:'Ein tiefgrüner Weihnachtsrahmen mit Tannenzweigen und roten Schmucksteinen.'
  }),
  Object.freeze({
    id:'christmas-nameframe-lebkuchen',name:'Lebkuchenfest',frameTheme:'lebkuchen',
    frameIcon:'🍪',cornerIcon:'♥',unlockId:'christmas2026:nameframe:04',
    description:'Ein warmer Lebkuchenrahmen mit Zuckerguss, Zimt und festlichem Gebäck.'
  }),
  Object.freeze({
    id:'christmas-nameframe-polarlicht',name:'Polarlicht-Magie',frameTheme:'polarlicht',
    frameIcon:'🌌',cornerIcon:'✧',unlockId:'christmas2026:nameframe:05',
    description:'Ein magischer Namensrahmen in Lila und Türkis mit schimmernden Polarlichtern.'
  })
]);
// This is a preview catalogue. Real unlocks will require verified player
// entitlements from Render, independently awarded for each unlockId.
export const isChristmasNameFrameUnlocked=()=>false;
