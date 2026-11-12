/* 100 Tore — class-bound appearance registry.
 * Class is supplied only by the server's locked DOG hero choice.
 * Asset names, levels and cosmetic labels NEVER change server-side item IDs. */
(()=>{'use strict';
 const tiers=[5,10,15,19,20];
 const names=Object.freeze({
  krieger:Object.freeze({
   label:'⚔️ Krieger',weapon:Object.freeze(['Anfängerschwert','Stahlbreitschwert','Runenschwert','Astralklinge','Drachentöter']),
   armor:Object.freeze(['Lederharnisch','Stahlplattenpanzer','Runenplattenrüstung','Astralrüstung','Drachenpanzer'])
  }),
  magierin:Object.freeze({
   label:'✨ Magierin',weapon:Object.freeze(['Funkenstab','Kristallstab','Runenfokus','Astralstab','Phönixzepter']),
   armor:Object.freeze(['Novizenrobe','Kristallgewand','Runenmantel','Astralrobe','Phönixgewand'])
  }),
  waechter:Object.freeze({
   label:'🛡️ Wächter',weapon:Object.freeze(['Wächterhammer','Stahlstreithammer','Runenhammer','Astralhammer','Drachenhammer']),
   armor:Object.freeze(['Wächterharnisch','Stahlbollwerk','Runenbastion','Astralpanzer','Drachenbollwerk'])
  })
 });
 const fallback=Object.freeze({
  weapon:['Schmiedeklinge','Stahlklinge','Runenklinge','Astralklinge','Drachenklinge'],
  armor:['Lederpanzer','Stahlpanzer','Runenrüstung','Astralrüstung','Drachenrüstung']
 });
 const normalize=value=>Object.hasOwn(names,value)?value:null;
 const stage=level=>Math.max(1,tiers.findIndex(limit=>Number(level)<=limit)+1||5);
 const name=(heroClass,type,level)=>{
  const tier=stage(level)-1;
  const c=normalize(heroClass);
  return (c?names[c]?.[type]:fallback[type])?.[tier]||
   (type==='weapon'?'Waffe':'Rüstung');
 };
 const image=(heroClass,type,level)=>{
  if(type!=='weapon'&&type!=='armor')return '';
  const c=normalize(heroClass);
  return c?'./dog-forge-art/heroes/'+c+'-'+type+'-'+stage(level)+'.svg':
   './dog-forge-art/'+type+'-'+stage(level)+'.svg';
 };
 const label=heroClass=>names[normalize(heroClass)]?.label||'Held noch nicht gewählt';
 window.DogHeroEquipment=Object.freeze({normalize,stage,name,image,label});
})();