import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';

const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const html=read('weihnachtswelt.html'),client=read('js/dog-album-season2.js'),css=read('css/dog-album-embedded.css');

test('DOG card collection client parses with the new bulk flow',()=>{
 assert.doesNotThrow(()=>new Script(client));
 assert.match(client,/async function openPacks\(tasks\)/);
 assert.match(client,/async function settleBatch\(uid,entry\)/);
 assert.match(client,/vouchersOnly/);
 assert.match(client,/quantity/);
 assert.match(client,/sessionStorage\.setItem\(batchKey\(uid\)/);
 assert.match(client,/clearBatch\(uid\)/);
});

test('each pack has one, five, and all-free options; global ALL never auto-purchases',()=>{
 assert.match(client,/\['one','1 öffnen','pack'\]/);
 assert.match(client,/\['five','5 öffnen','packFive'\]/);
 assert.match(client,/\['all','Alle Gratispakete','packAll'\]/);
 assert.match(client,/openAllFreePacks/);
 assert.match(client,/Math\.min\(10,remaining\),true/);
 assert.match(html,/id="dog-open-all-free"/);
 assert.match(html,/Nur deine vorhandenen Paketgutscheine/);
 assert.match(css,/dog-pack-multi-actions/);
 assert.match(css,/@media\(max-width:640px\)/);
});

test('card reveal is paginated and has all cards and receipt status',()=>{
 assert.match(html,/id="dog-reveal-title"/);
 assert.match(html,/id="dog-reveal-summary"/);
 assert.match(html,/id="dog-reveal-pages"/);
 assert.match(html,/id="dog-reveal-prev"/);
 assert.match(html,/id="dog-reveal-next"/);
 assert.match(client,/REVEAL_PAGE_SIZE=36/);
 assert.match(client,/openedCards\.slice\(from,to\)/);
 assert.match(client,/openedCards\.filter\(card=>card\.isNew\)/);
 assert.match(client,/queueCompletedBoards\(boards\)/);
 assert.match(client,/maybeClaimBingos\(\)/);
});
