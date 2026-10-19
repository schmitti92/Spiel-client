const assert=require('node:assert/strict'),fs=require('node:fs');const read=p=>fs.readFileSync(p,'utf8');const html=read('Skyjo/skyjo_host_test.html'),js=read('Skyjo/skyjo_host_test.js'),css=read('Skyjo/skyjo_piles_actions.css');
for(const id of ['draw-deck','draw-discard','discard-card','discard-face','swap-card','discard-reveal','remaining','discard'])assert.ok(html.includes('id="'+id+'"'),'missing '+id);
for(const x of ['skyjo_piles_actions.css?v=1','skyjo_host_test.js?v=8','aria-pressed="true"','aria-label="Oberste Karte vom Ablagestapel nehmen"'])assert.ok(html.includes(x),x);
for(const x of ["$('discard-face')","$('discard-card')","top===undefined?'–':String(top)","pile-selected","chosen","s.pending.source==='deck'"])assert.ok(js.includes(x),x);
for(const x of ['.pile-back','.pile-face.neg','.pile-face.zero','.pile-face.low','.pile-face.mid','.pile-face.high','.move-choice button.chosen','grid-template-rows:minmax(0,1fr) 86px 53px'])assert.ok(css.includes(x),x);
assert.ok(!js.includes("$('remaining').textContent=String(s.discard.length)"));
console.log('Pile card faces, draw labels, selection states and layout assertions passed');
