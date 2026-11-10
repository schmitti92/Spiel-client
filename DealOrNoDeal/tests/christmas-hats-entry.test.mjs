import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';
const root=resolve(fileURLToPath(new URL('.',import.meta.url)),'..');
const file=path=>readFileSync(resolve(root,path),'utf8');
const page=file('weihnachten.html');
const game=file('weihnachtsmuetzen.html');
const script=file('js/christmas-hats-entry.js');
const styles=file('css/christmas-hats-entry.css');

test('Mützen-Jackpot is a real fifth collection tab adjacent to Monster-Wheel',()=>{
 const tabs=page.match(/<nav id="event-collection-nav"[\s\S]*?<\/nav>/)?.[0]||'';
 assert.ok(tabs.indexOf('data-view="monster"')>=0);
 assert.ok(tabs.indexOf('data-view="hats"')>tabs.indexOf('data-view="monster"'));
 assert.ok(tabs.indexOf('data-view="hats"')<tabs.indexOf('data-view="bingo"'));
 assert.match(tabs,/aria-controls="event-hats"/);
 assert.match(page,/id="event-hats"[\s\S]*?role="tabpanel"/);
 assert.match(page,/const collectionViews=new Set\(\['album','hammer','monster','hats','bingo'\]\)/);
 assert.match(page,/christmas-hats-entry\.css/);
 assert.match(page,/christmas-hats-entry\.js/);
});

test('Voucher landing page shows an accessible one-time ticket and locks later entries',()=>{
 for(const id of ['hats-voucher-number','hats-voucher-label','hats-ticket-status','hats-entry-launch','hats-entry-refresh']){
  assert.equal([...page.matchAll(new RegExp('id="'+id+'"','g'))].length,1,id);
 }
 assert.match(page,/einen kostenlosen Gutschein/);
 assert.match(page,/Weitere Spielgutscheine werden später/);
 assert.match(script,/aria-disabled/);
 assert.match(script,/data\.state\?\.status==='playing'/);
 assert.match(script,/vouchers\.total/);
 assert.match(script,/vouchers\.free/);
 assert.match(script,/Fortsetzen verbraucht keinen weiteren Gutschein/);
 assert.match(script,/Spielgutschein ist aufgebraucht/);
});

test('Voucher display is read-only, authenticated and does not poll',()=>{
 assert.doesNotThrow(()=>new Script(script,{filename:'christmas-hats-entry.js'}));
 assert.match(script,/getIdToken\(\)/);
 assert.match(script,/fetch\(api\+'\/api\/christmas-hats\/me'/);
 assert.doesNotMatch(script,/\/api\/christmas-hats\/action/);
 assert.doesNotMatch(script,/setInterval\(/);
 assert.doesNotMatch(script,/localStorage\.setItem\(/);
 assert.match(script,/window\.addEventListener\('christmas-hats-view-open'/);
 assert.match(script,/window\.addEventListener\('spielonline-change'/);
});

test('Real game cannot start another run without a server-confirmed voucher',()=>{
 assert.match(game,/const hasVouchers=DEMO\|\|Number\(vouchers\?\.total\|\|0\)>0/);
 assert.match(game,/NO_HATS_VOUCHERS/);
 assert.match(game,/id="hats-locked"/);
 assert.match(game,/id="hats-voucher-indicator"/);
 assert.match(game,/hats-collection/);
 assert.match(styles,/body\[data-view="hats"\] #event-hats/);
 assert.match(styles,/\.event-collection-nav\{grid-template-columns:repeat\(5/);
});
