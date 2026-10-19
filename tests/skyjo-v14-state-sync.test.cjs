 'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const dir=path.resolve(__dirname,'../Skyjo');const manifest=JSON.parse(fs.readFileSync(path.join(dir,'skyjo_action-manifest.json')));
assert.equal(manifest.version,19);let source='';for(const [name,hash] of Object.entries(manifest.parts)){const b=fs.readFileSync(path.join(dir,name));assert.equal(crypto.createHash('sha256').update(b).digest('hex'),hash);source+=b.toString('utf8')}new vm.Script(source);
function extract(name){let start=source.indexOf('function '+name+'(');assert.ok(start>=0,name);let brace=source.indexOf('{',start),depth=0,quote=null,escape=false;for(let i=brace;i<source.length;i++){let c=source[i];if(quote){if(escape)escape=false;else if(c==='\\')escape=true;else if(c===quote)quote=null;continue}if(c==='"'||c==="'"||c==='`'){quote=c;continue}if(c==='{')depth++;if(c==='}'&&!--depth)return source.slice(start,i+1)}throw Error(name)}
function run(name,ctx,call){vm.createContext(ctx);vm.runInContext(extract(name)+';'+call,ctx)}
// A defense card is consumed exactly once, transferred to the discard pile and the second attack is not blocked.
let logs=[],toasts=[],defense={type:'defense',id:'shield'};
let state={players:[{name:'A',actions:[]},{name:'B',actions:[defense]}],actionDiscard:[]};
let ctx={state,log:x=>logs.push(x),toast:x=>toasts.push(x)};
run('consumeDefense',ctx,'globalThis.first=consumeDefense(1);globalThis.second=consumeDefense(1)');
assert.equal(ctx.first,true);assert.equal(ctx.second,false);assert.equal(state.players[1].actions.length,0);assert.equal(state.actionDiscard.length,1);assert.equal(state.actionDiscard[0],defense);
// Invalid player and absent action arrays must not consume anything.
run('consumeDefense',ctx,'globalThis.invalid=consumeDefense(999)');assert.equal(ctx.invalid,false);
// A stale target selection must not mutate any cards.
let changed=0,closed=0,rendered=0;
state={currentPlayer:0,players:[{name:'A'},{name:'B'}]};let ui={mode:'otherSwapSelect',selected:[{pi:0,zone:'grid',idx:99},{pi:1,zone:'grid',idx:99}]};
run('finishOtherSwap',{state,ui,cloud:{enabled:false},getSlot:()=>null,closeModal:()=>closed++,toast:()=>{},render:()=>rendered++,setSlot:()=>changed++},'finishOtherSwap()');
assert.equal(changed,0);assert.equal(closed,1);assert.equal(rendered,1);assert.equal(ui.selected.length,0);
// Non-actor device must not perform a swap.
changed=0;closed=0;rendered=0;ui={mode:'otherSwapSelect',selected:[{pi:0},{pi:1}]};
run('finishOtherSwap',{state,ui,cloud:{enabled:true},isMyActorDevice:()=>false,closeModal:()=>closed++,render:()=>rendered++,setSlot:()=>changed++},'finishOtherSwap()');
assert.equal(changed,0);assert.equal(closed,1);
console.log('SKYJO V14: defense consumption, stale selection and unauthorized multiplayer swap protections passed.');
