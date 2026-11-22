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

/** Bot visuals can be disabled independently of overall animation speed.
 * On by default; never sent to the room or Firebase. */
export const DOG_BOT_MOTION_KEY='dog:bot-motion:v1';
export function readDogBotMotion(storage=typeof localStorage==='undefined'?null:localStorage){
 try{return storage?.getItem(DOG_BOT_MOTION_KEY)!=='0';}catch{return true;}
}
export function writeDogBotMotion(enabled,storage=typeof localStorage==='undefined'?null:localStorage){
 const value=!!enabled;
 try{storage?.setItem(DOG_BOT_MOTION_KEY,value?'1':'0');}catch(_){}
 return value;
}

/**
 * Pace local computer turns only; never slow a human action or mutate the game.
 * A new BOT must wait until the previous BOT's piece animation is finished,
 * PLUS one full second. Consecutive actions of a split seven belong to the
 * same bot's turn and keep the usual short gap between individual steps.
 */
export const DOG_BOT_HANDOFF_PAUSE_MS=1000;
export function dogBotActionDelay({previousBotSeat=null,nextBotSeat=null,animationDuration=0}={}){
 const motion=Number.isFinite(animationDuration)?Math.max(0,animationDuration):0;
 const handoff=Number.isInteger(previousBotSeat)&&Number.isInteger(nextBotSeat)
   &&previousBotSeat!==nextBotSeat;
 return Math.max(320,motion+(handoff?DOG_BOT_HANDOFF_PAUSE_MS:240));
}
