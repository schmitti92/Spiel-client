import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Locked forge upgrades are not counted ready even with enough materials',()=>{
 const s=get('dog-forge-ui.js');
 assert.match(s,/const canUpgradeItem=id=>\{const q=quoteFor\(id\);return !!q&&!q.maxed&&!q.locked&&q.affordable;/);
 assert.match(s,/q.maxed\?'maxed-tag':q.locked\?'missing-tag':q.affordable\?'ready-tag'/);
 assert.match(s,/button.disabled=!usable\(\)\|\|!quote.affordable\|\|!!quote.locked/);
 assert.match(s,/if\(!usable\(\)\|\|!quote\|\|quote.maxed\|\|quote.locked\|\|!quote.affordable\)return/);
});
test('All essential forge controls remain in the document',()=>{
 const html=get('dog-forge.html');
 for(const id of ['forge-level-panel','forge-level-up','forge-level-sigils','forge-confirm','forge-confirm-submit','forge-stock','forge-gallery','forge-sound-toggle','forge-retry','forge-refresh','forge-exchange-confirm']){
  assert.match(html,new RegExp('id="'+id+'"'));
 }
 assert.match(html,/dog-forge-ui\.js\?v=20261112-audit1/);
});
