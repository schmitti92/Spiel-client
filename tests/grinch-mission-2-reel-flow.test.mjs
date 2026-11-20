import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const markup=readFileSync(new URL('../DOG/grinch-campaign/mission-2-slot-preview.html',import.meta.url),'utf8');
const logic=readFileSync(new URL('../DOG/grinch-campaign/mission-2-slot-animation.js',import.meta.url),'utf8');

test('bonus reel starts as visually blank and only loads animated logic',()=>{
 assert.match(markup,/data-reel="bonus"/);
 assert.match(markup,/class="reel is-blank" data-reel="bonus"/);
 assert.match(markup,/mission-2-slot-animation\.js/);
 assert.match(markup,/\.reel\.is-blank\{background:transparent;box-shadow:none\}/);
});
test('main reel pair stops fully before any bonus reel spin',()=>{
 const reset=logic.indexOf('setReel(2, null); // remains white');
 const pair=logic.indexOf('await Promise.all([');
 const result=logic.indexOf("if (bonus) {",pair);
 const right=logic.indexOf('await spinReel(2,',result);
 assert.ok(reset>=0&&pair>reset&&result>pair&&right>result);
 assert.match(logic,/spinReel\(0,/);
 assert.match(logic,/spinReel\(1,/);
 assert.match(logic,/const outcome = drawSlotOutcome\(random\)/);
});
test('visible prize decoys are only intermediate spin symbols',()=>{
 assert.match(logic,/\.\.\.DECOY_FIELDS\.map/);
 assert.match(logic,/small: 'NUR DEKO', decoy: true/);
 assert.match(logic,/frames\.push\(finalSymbol\)/);
 assert.match(logic,/const primary = effects\.find\(e => e\.id === outcome\.first\)/);
 assert.match(logic,/const bonus = outcome\.second === null \? null/);
});
