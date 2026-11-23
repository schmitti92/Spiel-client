import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const ui=read('../DOG/christmas-other-edition-ui.js');
const css=read('../DOG/christmas-scratch-other-edition.css');
const shop=read('../DOG/christmas-scratch-ui.js');
const event=read('../DOG/christmas-event.js');
const gate=read('../DOG/christmas-intro-gate.js');
const html=read('../DOG/christmas-event.html');

test('DOG Premium: top of editor ALWAYS shows archive action, even without cached active edition',()=>{
 assert.match(ui,/id="oe-premium-manage"/);
 assert.match(ui,/id="oe-retire-premium"/);
 assert.ok(ui.indexOf('id="oe-retire-premium"') < ui.indexOf('id="oe-create"'),
  'archive action must be visible before the long settings form');
 assert.match(ui,/\$\('oe-premium-manage'\)\.hidden=active!=='premium_27'/);
 assert.match(ui,/\$\('oe-retire-premium'\)\.disabled=busy;/);
 assert.doesNotMatch(ui,/\$\('oe-retire-premium'\)\.hidden=active!=='premium_27'\|\|!ongoing/);
 assert.match(css,/\.scratch-other-edition-manage\[hidden\]\{display:none!important\}/);
});

test('DOG Premium: action fetches live edition and creator authorization before asking for confirmation',()=>{
 assert.match(ui,/query\('\/editions\/premium_27\/status'\)/);
 assert.match(ui,/if\(checked\.canRetire!==true\)/);
 assert.match(ui,/if\(!window\.confirm\(warning\)\)/);
 assert.match(ui,/query\('\/editions\/premium_27\/retire'/);
 assert.match(ui,/editionId:previous\.id,expectedRevision:previous\.revision/);
 assert.match(ui,/confirmation:'RETIRE_PREMIUM_27'/);
 assert.match(ui,/previous\.issued\+' bereits ausgegebene Lose bleiben samt Gewinnen erhalten/);
 assert.match(ui,/editions\.premium_27=null/);
 assert.match(ui,/drawShop\(\)/);
});

test('DOG Premium: live control uses fresh modules and cannot retire other scratch variants',()=>{
 assert.match(shop,/christmas-other-edition-ui\.js\?v=3/);
 assert.match(event,/christmas-scratch-ui\.js\?v=93/);
 assert.match(gate,/christmas-event\.js\?v=191/);
 assert.match(html,/christmas-intro-gate\.js\?v=54/);
 assert.match(html,/christmas-scratch-other-edition\.css\?v=4/);
 assert.doesNotMatch(ui,/query\('\/editions\/'\+active\+'\/retire'/);
});
