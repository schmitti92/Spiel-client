/**
 * Device-local motion preferences. No room state, network messages or rules.
 * Accessibility wins over any local visual preference.
 */
export const DOG_MOTION_KEY='dog:motion:v1';
export const DOG_MOTION_MODES=Object.freeze(['normal','fast','off']);
export function normalizeMotionMode(value){
 return DOG_MOTION_MODES.includes(value)?value:'normal';
}
export function loadMotionMode(storage=typeof localStorage==='undefined'?null:localStorage){
 try{return normalizeMotionMode(storage?.getItem(DOG_MOTION_KEY));}catch{return 'normal';}
}
export function saveMotionMode(value,storage=typeof localStorage==='undefined'?null:localStorage){
 const mode=normalizeMotionMode(value);
 try{storage?.setItem(DOG_MOTION_KEY,mode);}catch(_){}
 return mode;
}
export function motionFactor(mode='normal',reducedMotion=false){
 if(reducedMotion||normalizeMotionMode(mode)==='off')return 0;
 return mode==='fast'?.62:1;
}
export function applyMotionMode(mode,root=typeof document!=='undefined'?document.documentElement:null){
 const choice=normalizeMotionMode(mode);
 if(root)root.dataset.dogMotion=choice;
 return choice;
}
