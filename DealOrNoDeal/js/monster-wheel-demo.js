'use strict';
/* Monster wheel demo: a fully local, read-only preview.
 * No authentication, no server requests, no coupons, no balance changes.
 * The snapshot below is used ONLY when a live prize catalogue is unavailable.
 * Live draws always use the catalogue delivered by the backend.
 */
(()=>{
 const slot=(id,label,short,icon,kind,quantity=0,extra={})=>Object.freeze({id,label,short,icon,kind,quantity,...extra});
 const DEMO_CATALOG=Object.freeze([
 slot('cash-random-1','Zufallsgewinn: 100 € bis 2 Mio. €','100 € – 2 Mio.','🎲','randomCash'),
 slot('lucky-1-1','1 goldener Hammer','1× Gold','✨','hammer',1,{hammer:'lucky'}),
 slot('giftzwerg','Muffiger Giftzwerg – exklusiver Charakter','Giftzwerg','🧌','avatar',1,{avatarId:15,featured:'character'}),
 slot('single-1-1','1 einfacher Hammer','1× Einfach','🔨','hammer',1,{hammer:'single'}),
 slot('joker-5','5 Kofferblick-Joker','5× Joker','🃏','joker',5),
 slot('cash-random-2','Zufallsgewinn: 100 € bis 2 Mio. €','100 € – 2 Mio.','🎲','randomCash'),
 slot('double-5','5 Doppel-Hammer','5× Doppel','⚒️','hammer',5,{hammer:'double'}),
 slot('gold-5','5 Goldpakete','5× Gold','🎁','pack',5,{packId:'large',featured:'goldpack'}),
 slot('lucky-3','3 goldene Hammer','3× Gold','🔨','hammer',3,{hammer:'lucky'}),
 slot('joker-1-1','1 Kofferblick-Joker','1× Joker','🃏','joker',1),
 slot('cash-random-3','Zufallsgewinn: 100 € bis 2 Mio. €','100 € – 2 Mio.','🎲','randomCash'),
 slot('lucky-10','10 goldene Hammer','10× Gold','🔨','hammer',10,{hammer:'lucky'}),
 slot('premium-3','3 Premiumpakete','3× Premium','👑','pack',3,{packId:'premium',featured:'premium'}),
 slot('single-1-2','1 einfacher Hammer','1× Einfach','🔨','hammer',1,{hammer:'single'}),
 slot('cash-2m','2 Millionen €','2 Mio.','💶','cash',200000000),
 slot('cash-random-4','Zufallsgewinn: 100 € bis 2 Mio. €','100 € – 2 Mio.','🎲','randomCash'),
 slot('lucky-1-2','1 goldener Hammer','1× Gold','✨','hammer',1,{hammer:'lucky'}),
 slot('gold-4','4 Goldpakete','4× Gold','🎁','pack',4,{packId:'large',featured:'goldpack'}),
 slot('joker-1-2','1 Kofferblick-Joker','1× Joker','🃏','joker',1),
 slot('lucky-5','5 goldene Hammer','5× Gold','🔨','hammer',5,{hammer:'lucky'}),
 slot('cash-random-5','Zufallsgewinn: 100 € bis 2 Mio. €','100 € – 2 Mio.','🎲','randomCash'),
 slot('single-1-3','1 einfacher Hammer','1× Einfach','🔨','hammer',1,{hammer:'single'}),
 slot('cash-10m','10 Millionen €','10 Mio.','💰','cash',1000000000),
 slot('joker-1-3','1 Kofferblick-Joker','1× Joker','🃏','joker',1),
 slot('lucky-1-3','1 goldener Hammer','1× Gold','✨','hammer',1,{hammer:'lucky'})
]);
 function draw(slots=DEMO_CATALOG,random=Math.random){
  if(!Array.isArray(slots)||slots.length!==25)throw Error('TEST_CATALOG_UNAVAILABLE');
  const unit=()=>Math.min(1-Number.EPSILON,Math.max(0,Number(random())));
  const index=Math.floor(unit()*slots.length);
  const selected=slots[index];
  if(!selected||typeof selected.id!=='string')throw Error('TEST_SLOT_UNAVAILABLE');
  const amountCents=selected.kind==='randomCash'
   ?(100+Math.floor(unit()*1_999_901))*100
   :selected.kind==='cash'?selected.quantity:0;
  return {prize:{...selected,index,amountCents},revealed:[],isTest:true};
 }
 window.ChristmasMonsterDemo=Object.freeze({catalog:DEMO_CATALOG,draw});
})();
