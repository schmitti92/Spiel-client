import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('daily complimentary tickets are no longer displayed or submitted',()=>{
 const shop=source('DOG/christmas-scratch-ui.js');
 assert.doesNotMatch(shop,/Tagesfreilos öffnen/);
 assert.doesNotMatch(shop,/const free=el\('button','scratch-free'/);
 assert.doesNotMatch(shop,/buy\(option\.tier,true,option\.id\)/);
 assert.match(shop,/if\(free\)\{showAlert\(/);
 assert.match(shop,/void buy\(option\.tier,false,option\.id\)/);
 assert.match(shop,/scratch-earned-voucher/,'earned vouchers remain redeemable');
 assert.match(shop,/scratch-host-settings'\)\.hidden=true/,'global host gear stays hidden');
});
test('Christmas page removes outdated daily ticket promise but preserves coins and developer preview',()=>{
 const page=source('DOG/christmas-event.html');
 const dev=source('DOG/christmas-dev-mode.js');
 assert.doesNotMatch(page,/täglich ein einfaches Gratis-Los ermöglichen/);
 assert.match(page,/Tägliche Gratislose und unbegrenzte kostenlose Lose sind deaktiviert/);
 assert.match(page,/id="scratch-host-settings"[^>]+hidden style="display:none!important"/);
 assert.match(dev,/Testmünzen/);
 assert.match(dev,/nur lokale Testansichten|Nur lokale Testansichten/i);
});
