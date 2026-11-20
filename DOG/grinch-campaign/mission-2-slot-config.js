/**
 * Grinch mission 2 – slot preview contract.
 * Exactly 40 playable effects. The three free-ticket panels are decorative,
 * clearly identified as unwinnable Grinch decoys: never sample from them.
 * Client preview only; official room outcomes must be selected by the server.
 */
export const EFFECT_IDS=Object.freeze(Array.from({length:40},(_,i)=>i+1));
export const DECOY_FIELDS=Object.freeze([10,50,100].map(count=>Object.freeze({
  id:'decoy-free-'+count,kind:'decoy',count,label:count+' Gratislose',
  selectable:false,canAward:false
})));
export const DOUBLE_SLOT_CHANCE=0.10;
export const CATEGORY_BY_ID=id=>Math.floor((id-1)/10);
function pickIndex(length,random){
  if(!Number.isInteger(length)||length<1)throw Error('No eligible slot effects');
  const value=Number(random());
  if(!Number.isFinite(value)||value<0||value>=1)throw Error('Invalid random value');
  return Math.floor(value*length);
}
export function drawSlotOutcome(random=Math.random){
  const first=EFFECT_IDS[pickIndex(EFFECT_IDS.length,random)];
  const double=random()<DOUBLE_SLOT_CHANCE;
  const eligibleSecond=EFFECT_IDS.filter(id=>CATEGORY_BY_ID(id)!==CATEGORY_BY_ID(first));
  const second=double?eligibleSecond[pickIndex(eligibleSecond.length,random)]:null;
  return Object.freeze({first,second,double});
}
