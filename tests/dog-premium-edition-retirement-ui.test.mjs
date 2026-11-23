import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const ui=read('../DOG/christmas-other-edition-ui.js');
const css=read('../DOG/christmas-scratch-other-edition.css');
const shop=read('../DOG/christmas-scratch-ui.js');
const event=read('../DOG/christmas-event.js');

test('DOG Premium: only the currently active premium run shows the retire control',()=>{
 assert.match(ui,/id="oe-retire-premium"/);
 assert.match(ui,/active!=='premium_27'\|\|!ongoing/);
 assert.match(ui,/\$\('oe-retire-premium'\)\.disabled=busy\|\|!ongoing/);
 assert.match(css,/\.scratch-other-edition-retire\[hidden\]\{display:none!important\}/);
});
test('DOG Premium: user confirms, and request identifies current edition and revision',()=>{
 assert.match(ui,/if\(!window\.confirm\(warning\)\)return/);
 assert.match(ui,/query\('\/editions\/premium_27\/retire'/);
 assert.match(ui,/editionId:previous\.id,expectedRevision:previous\.revision/);
 assert.match(ui,/confirmation:'RETIRE_PREMIUM_27'/);
 assert.match(ui,/previous\.issued\+' bereits ausgegebene Lose bleiben samt Gewinnen erhalten/);
 assert.match(ui,/editions\.premium_27=null/);
 assert.match(ui,/drawShop\(\)/);
});
test('DOG Premium: new UI modules are cache-busted and no other edition is retired',()=>{
 assert.match(shop,/christmas-other-edition-ui\.js\?v=2/);
 assert.match(event,/christmas-scratch-ui\.js\?v=92/);
 assert.doesNotMatch(ui,/query\('\/editions\/'\+active\+'\/retire'/);
});
