const assert=require('node:assert/strict'),fs=require('node:fs');
const E=require('../Skyjo/skyjo_host_preview_engine.js');
const js=fs.readFileSync('Skyjo/skyjo_host_test.js','utf8'),html=fs.readFileSync('Skyjo/skyjo_host_test.html','utf8');
for(const term of ['zuerst Nachziehstapel oder Ablagestapel','Zuerst eine Karte vom Nachziehstapel ziehen','Zuerst eine Karte von einem Stapel ziehen',"setAttribute('aria-label'"] )assert.ok(js.includes(term),term);
assert.ok(html.includes('skyjo_host_test.js?v=8'));
for(let n=0;n<40;n++){
 const s=E.create();
 assert.equal(E.place(s,0,'swap'),false,'cannot place before draw');
 assert.equal(E.pick(s,'deck'),true);
 assert.equal(E.pick(s,'discard'),false,'cannot draw twice');
 assert.equal(E.place(s,0,'discard-reveal'),true,'drawn deck card may be discarded to reveal');
 assert.equal(s.boards[0][0].up,true);
 assert.equal(s.pending,null);
 assert.equal(E.current(s),1);
 assert.equal(E.place(s,0,'swap'),false,'bot cannot place before draw');
 assert.equal(E.bot(s),true);
 assert.equal(E.current(s),2);
}
console.log('40 invalid-action and draw/reveal transition tests passed');
