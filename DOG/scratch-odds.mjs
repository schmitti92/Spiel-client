/** Stable precision-safe 100% distribution for all DOG scratch prize categories. */
// Keep one manually edited probability exact, and distribute the remaining
// percentage in tenths (1000 parts = 100.0%) over the other icons.
export function rebalanceOdds(source,selected,desired){
 const old=source.map(n=>Math.max(0,Math.round(Number(n)||0)));
 const fixed=Math.max(0,Math.min(1000,Math.round(Number(desired)||0)));
 if(old.length<2||selected<0||selected>=old.length)throw Error('EDITION_ODDS_INVALID');
 const rest=1000-fixed,others=old.map((_,i)=>i).filter(i=>i!==selected);
 const total=others.reduce((sum,i)=>sum+old[i],0);
 const pieces=others.map(i=>({
  i,raw:total?old[i]*rest/total:rest/others.length
 }));
 const next=old.map(()=>0);next[selected]=fixed;
 for(const part of pieces)next[part.i]=Math.floor(part.raw);
 let missing=1000-next.reduce((a,b)=>a+b,0);
 pieces.sort((a,b)=>(b.raw-Math.floor(b.raw))-(a.raw-Math.floor(a.raw))||a.i-b.i);
 for(let k=0;k<missing;k++)next[pieces[k%pieces.length].i]++;
 return next;
}
