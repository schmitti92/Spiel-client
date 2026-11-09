import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const finale=read('js/finale.js');
const css=read('css/finale-ceremony-premium.css');
const html=read('game.html');

test('personal case finale has a complete full-size goldstudio stage',()=>{
 assert.doesNotThrow(()=>new Script(finale));
 for(const cls of [
  'finale-ceremony-progress','finale-vault-metal-rail','finale-vault-emblem',
  'finale-vault-clasps','finale-vault-unlock-glow','finale-vault-inner-caption',
  'finale-stage-light-left','finale-stage-light-right','finale-stage-flash','finale-stage-stars'
 ])assert.ok(html.includes('class="'+cls+'"')||html.includes(' '+cls+'"'),cls);
 assert.ok(html.includes('./css/finale-ceremony-premium.css?v=20261109-personal-cases-show-v2'));
 assert.ok(html.includes('./js/finale.js?v=20261109-personal-cases-show-v2'));
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css, /finale-golden-unlock/);
 assert.match(css, /finale-vault-lid/);
 assert.match(css, /finale-vault-value/);
 assert.match(html,/id="finale-watch-again"/);
 assert.match(finale,/\$\('finale-watch-again'\)\.addEventListener\('click',replayFinaleSequence\)/);
});
test('the original server-supplied final values and winner logic remain authoritative',()=>{
 for(const statement of [
  'g.finalValues.map','ascending=[...entries].sort','Math.max(...entries.map(x=>x.f.payout))',
  'winners=entries.filter(x=>x.f.payout===top)','spotlightValue.textContent=eur(entry.f.amount)',
  'x.note.textContent','replayFinaleLocally','finaleElapsed','dealServerNow()'
 ])assert.ok(finale.includes(statement),statement);
 assert.ok(finale.includes('const slotLength=reduced?1450:3800;'));
 assert.ok(finale.includes('const openAfter=reduced?180:1450;'));
 assert.ok(finale.includes("finaleLater(()=>showMiniCase(entry),reduced?0:1150)"));
 assert.ok(finale.includes('if(finaleElapsed>=openAt)showMiniCase(entry)'), 'late joining spectators catch up');
 assert.ok(finale.includes("ceremonyProgress.textContent='🏆 DIE TATSÄCHLICHE AUSZAHLUNG ENTSCHEIDET 🏆'"));
 assert.match(finale, /sessionStorage\.setItem\('finale-watched:/);
 assert.doesNotMatch(css,/\bfetch\(|localStorage|firebase|\/api\//i);
});
