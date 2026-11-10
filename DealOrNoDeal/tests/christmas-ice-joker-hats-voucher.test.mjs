import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const html=read('Weihnachtsevent2/index.html');
const script=read('Weihnachtsevent2/online-ice.js');
const css=read('Weihnachtsevent2/joker-hats-voucher.css');

test('Joker gift shows an additional Christmas Hats voucher only when the server awarded it',()=>{
 assert.doesNotThrow(()=>new Script(script,{filename:'online-ice.js'}));
 assert.match(script,/gift\.kind==='joker'\?'1 Kofferblick-Joker'\+\(gift\.hatsVoucher===1/);
 assert.match(script,/hatsVoucher:gift\?\.hatsVoucher===1,stage:'image'/);
 assert.match(script,/if\(data\.result\?\.monsterSpinsGranted===3\)/);
 assert.match(script,/data\.result\?\.hatsVoucherGranted===1/);
 assert.match(script,/celebration\.hatsVoucher\?'<div class="v44-hats-voucher-gift"/);
 assert.match(script,/href="\.\.\/weihnachtsmuetzen\.html"/);
 assert.doesNotMatch(script,/(?:bonusTickets|freeVoucherUsed)\s*(?:\+\+|=)/);
});
test('recovered gift displays the voucher from persistent authoritative prize history',()=>{
 const beginning=script.indexOf('function recoveredGift(){');
 const ending=script.indexOf('\nfunction render(){',beginning);
 assert.ok(beginning>=0&&ending>beginning);
 const recovered=script.slice(beginning,ending);
 assert.match(recovered,/const gift=\(state\.prizes\|\|\[\]\)\.find/);
 assert.match(recovered,/gift\.hatsVoucher===1/);
 assert.match(recovered,/hatsVoucher:gift\?\.hatsVoucher===1/);
 assert.doesNotMatch(recovered,/fetch\(|request\(/);
});
test('Joker coupon reward art and refreshed client script are served on the same page',()=>{
 assert.match(html,/joker-hats-voucher\.css\?v=20261110-joker-voucher-v1/);
 assert.match(html,/online-ice\.js\?v=20261110-autoplay40-v1/);
 assert.match(css,/\.v44-hats-voucher-gift/);
 assert.match(css,/\.v44-hats-voucher-link/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
