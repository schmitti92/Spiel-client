/**
 * DOG · Lichtertal seasonal full-page wallpapers (not board designs).
 * Asset filenames come from files already uploaded to main.
 *
 * These are CATALOGUE PREVIEWS ONLY until the authenticated Christmas event
 * backend grants their unlockId to the currently signed-in player.
 *
 * Never infer ownership from file presence, preview stage, localStorage or
 * a user-editable browser setting. The classic DOG scene registry must not
 * offer them as selectable wallpapers while no verified entitlement exists.
 */
const ROOT='./assets/backgrounds/';
const RAW=Object.freeze([
  ['01','Märchenhafter Weihnachtswald','Lichtertal_Vollbild_Neu_01_Maerchenwald.webp','✨','forest'],
  ['02','Realistische Mondnacht','Lichtertal_Vollbild_Neu_02_Realistische_Mondnacht.webp','🌙','indigo'],
  ['03','Aquarell-Weihnachtskarte','Lichtertal_Vollbild_Neu_03_Weihnachtskarte_Aquarell.webp','🎨','ember'],
  ['04','Winterwelt in Low-Poly-3D','Lichtertal_Vollbild_Neu_04_Low_Poly_3D.webp','❄️','cyan'],
  ['05','Magischer Polarlicht-Fjord','Lichtertal_Vollbild_Neu_05_Magischer_Polarlicht_Fjord.webp','🌌','violet']
]);
export const CHRISTMAS_PAGE_BACKGROUNDS=Object.freeze(RAW.map(([no,name,file,icon,artTone])=>Object.freeze({
  id:'christmas-page-background-'+no,
  name,
  icon,
  artTone,
  image:ROOT+file,
  unlockId:'christmas2026:scene:'+no,
  status:'planned',
  description:'Exklusiver Vollbild-Seitenhintergrund für DOG. Wird später als Belohnung im Lichtertal-Weihnachtsevent freigeschaltet – nicht als DOG-Spielbrett.'
})));
