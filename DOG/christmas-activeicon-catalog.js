/**
 * DOG: five collectible, Christmas-themed active-turn symbol previews.
 *
 * These are visual prototypes and independent FUTURE event rewards.
 * Catalogue presence does not grant ownership; the gold crown remains
 * the only selectable active-turn emblem until a verified Render-backed
 * entitlement and equipment path is implemented.
 */
export const CHRISTMAS_ACTIVE_ICONS=Object.freeze([
 Object.freeze({
  id:'christmas-activeicon-star',name:'Weihnachtsstern',icon:'⭐',accent:'✦',
  iconTheme:'star',unlockId:'christmas2026:activeicon:01',
  description:'Ein strahlender goldener Weihnachtsstern mit rotgoldenem Glanz – später als Aktivsymbol freischaltbar.'
 }),
 Object.freeze({
  id:'christmas-activeicon-icecrown',name:'Eiskrone',icon:'👑',accent:'❄️',
  iconTheme:'icecrown',unlockId:'christmas2026:activeicon:02',
  description:'Eine funkelnde Eiskrone in Frostblau und Silber – später als Aktivsymbol freischaltbar.'
 }),
 Object.freeze({
  id:'christmas-activeicon-pinetree',name:'Tannenzauber',icon:'🎄',accent:'✧',
  iconTheme:'pinetree',unlockId:'christmas2026:activeicon:03',
  description:'Ein festlich beleuchteter Tannenbaum mit smaragdgrünem Schimmer – später als Aktivsymbol freischaltbar.'
 }),
 Object.freeze({
  id:'christmas-activeicon-bells',name:'Glockenzauber',icon:'🔔',accent:'✦',
  iconTheme:'bells',unlockId:'christmas2026:activeicon:04',
  description:'Eine goldene Weihnachtsglocke mit festlichem Rubinrot – später als Aktivsymbol freischaltbar.'
 }),
 Object.freeze({
  id:'christmas-activeicon-aurora',name:'Polarlicht-Stern',icon:'🌟',accent:'✧',
  iconTheme:'aurora',unlockId:'christmas2026:activeicon:05',
  description:'Ein leuchtender Polarlicht-Stern in Türkis und Violett – später als Aktivsymbol freischaltbar.'
 })
]);
export const isChristmasActiveIconUnlocked=()=>false;
