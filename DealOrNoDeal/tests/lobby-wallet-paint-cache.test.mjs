import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const html=readFileSync(new URL('../lobby.html',import.meta.url),'utf8');
const begin=html.indexOf("let lastWalletRenderKey='';");
const end=html.indexOf('async function refreshBalances()',begin);
assert.ok(begin>=0&&end>begin,'wallet DOM signature guard exists');
const walletCode=html.slice(begin,end);

test('Deal lobby leaves unchanged wallet portraits alone across repeated room updates',()=>{
 let rebuilds=0;
 const wallet={
  children:[],
  get childElementCount(){return this.children.length},
  replaceChildren(...nodes){rebuilds++;this.children=nodes},
  append(...nodes){this.children.push(...nodes)}
 };
 const createElement=tag=>({
  tag,children:[],className:'',textContent:'',
  append(...nodes){this.children.push(...nodes)},
  setAttribute(){}
 });
 const state={
  room:{players:[{uid:'a',name:'A',host:true,me:true},{uid:'b',name:'B',me:false}]},
  roomAvatars:{a:1,b:2},balances:[{id:'a',balance:100,games:2,wins:1},{id:'b',balance:200,games:3,wins:2}],
  selectedAvatar:1,chrisBonusEligible:false,chrisBonusBusy:false,
  user:()=>({uid:'a'}),
  avatarPortraitPath:n=>'avatar-'+n+'.webp',
  euros:n=>String(n),
  claimChrisBonus:()=>{},
  $:id=>id==='wallet-grid'?wallet:{href:'shop.html'},
  document:{createElement}
 };
 runInNewContext(walletCode+';globalThis.paintBalances=paintBalances;',state);
 state.paintBalances();
 assert.equal(rebuilds,1);
 assert.equal(wallet.childElementCount,2);
 state.paintBalances();
 state.paintBalances();
 assert.equal(rebuilds,1,'three identical live updates must not recreate avatars');
 state.balances=[{id:'a',balance:150,games:3,wins:1},state.balances[1]];
 state.paintBalances();
 assert.equal(rebuilds,2,'a legitimate balance change must be visible');
 state.roomAvatars={a:1,b:3};
 state.paintBalances();
 assert.equal(rebuilds,3,'a different player portrait must refresh the wallet');
 state.chrisBonusEligible=true;
 state.paintBalances();
 assert.equal(rebuilds,4,'promotional claim availability must refresh the card');
});
