/**
 * DOG · 20 reale Weihnachtsprofilbilder (IDs 16–35).
 * Bisherige 16 Standard-Avatare bleiben unverändert.
 *
 * Nur der Katalog ist vorbereitet. Es gibt aktuell KEINE bestätigten
 * serverseitigen Weihnachts-Freischaltungen für diese IDs.
 * Niemals einen lokalen Flag oder Query-Parameter als Eigentumsbeweis nehmen.
 */
export const CHRISTMAS_AVATARS=Object.freeze([
  Object.freeze({id:'christmas-avatar-01',avatar:16,name:'Weihnachtsmann',image:'./Bilder/Profilbilder/01_weihnachtsmann.webp',unlockId:'christmas2026:avatar:01'}),
  Object.freeze({id:'christmas-avatar-02',avatar:17,name:'Frau Weihnachtsmann',image:'./Bilder/Profilbilder/02_frau_weihnachtsmann.webp',unlockId:'christmas2026:avatar:02'}),
  Object.freeze({id:'christmas-avatar-03',avatar:18,name:'Rentier Rudolf',image:'./Bilder/Profilbilder/03_rentier_rudolf.webp',unlockId:'christmas2026:avatar:03'}),
  Object.freeze({id:'christmas-avatar-04',avatar:19,name:'Schneemann',image:'./Bilder/Profilbilder/04_schneemann.webp',unlockId:'christmas2026:avatar:04'}),
  Object.freeze({id:'christmas-avatar-05',avatar:20,name:'Weihnachtswichtel',image:'./Bilder/Profilbilder/05_weihnachtswichtel.webp',unlockId:'christmas2026:avatar:05'}),
  Object.freeze({id:'christmas-avatar-06',avatar:21,name:'Weihnachtswichtelin',image:'./Bilder/Profilbilder/06_wichtelin.webp',unlockId:'christmas2026:avatar:06'}),
  Object.freeze({id:'christmas-avatar-07',avatar:22,name:'Weihnachts-Eisbär',image:'./Bilder/Profilbilder/07_eisbaer.webp',unlockId:'christmas2026:avatar:07'}),
  Object.freeze({id:'christmas-avatar-08',avatar:23,name:'Weihnachtspinguin',image:'./Bilder/Profilbilder/08_weihnachtspinguin.webp',unlockId:'christmas2026:avatar:08'}),
  Object.freeze({id:'christmas-avatar-09',avatar:24,name:'Lebkuchenmann',image:'./Bilder/Profilbilder/09_lebkuchenmann.webp',unlockId:'christmas2026:avatar:09'}),
  Object.freeze({id:'christmas-avatar-10',avatar:25,name:'Nussknacker',image:'./Bilder/Profilbilder/10_nussknacker.webp',unlockId:'christmas2026:avatar:10'}),
  Object.freeze({id:'christmas-avatar-11',avatar:26,name:'Weihnachtskatze',image:'./Bilder/Profilbilder/11_weihnachtskatze.webp',unlockId:'christmas2026:avatar:11'}),
  Object.freeze({id:'christmas-avatar-12',avatar:27,name:'Weihnachtshund',image:'./Bilder/Profilbilder/12_weihnachtshund.webp',unlockId:'christmas2026:avatar:12'}),
  Object.freeze({id:'christmas-avatar-13',avatar:28,name:'Schneeeule',image:'./Bilder/Profilbilder/13_schneeeule.webp',unlockId:'christmas2026:avatar:13'}),
  Object.freeze({id:'christmas-avatar-14',avatar:29,name:'Weihnachtskrippe',image:'./Bilder/Profilbilder/14_weihnachtskrippe.webp',unlockId:'christmas2026:avatar:14'}),
  Object.freeze({id:'christmas-avatar-15',avatar:30,name:'Schneekugel',image:'./Bilder/Profilbilder/15_schneekugel.webp',unlockId:'christmas2026:avatar:15'}),
  Object.freeze({id:'christmas-avatar-16',avatar:31,name:'Adventskranz',image:'./Bilder/Profilbilder/16_adventskranz.webp',unlockId:'christmas2026:avatar:16'}),
  Object.freeze({id:'christmas-avatar-17',avatar:32,name:'Weihnachtsbaum',image:'./Bilder/Profilbilder/17_weihnachtsbaum.webp',unlockId:'christmas2026:avatar:17'}),
  Object.freeze({id:'christmas-avatar-18',avatar:33,name:'Weihnachtskamin',image:'./Bilder/Profilbilder/18_weihnachtskamin.webp',unlockId:'christmas2026:avatar:18'}),
  Object.freeze({id:'christmas-avatar-19',avatar:34,name:'Geschenkesack',image:'./Bilder/Profilbilder/19_geschenkesack.webp',unlockId:'christmas2026:avatar:19'}),
  Object.freeze({id:'christmas-avatar-20',avatar:35,name:'Weihnachtsschlitten',image:'./Bilder/Profilbilder/20_weihnachtsschlitten.webp',unlockId:'christmas2026:avatar:20'})
]);
/** Secure default until the Weihnachtsevent supplies verified entitlements. */
export function isChristmasAvatarUnlocked(avatarId){
  return false;
}
