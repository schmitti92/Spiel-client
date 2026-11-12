import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=new URL('../',import.meta.url);
const pages=[
 'dog-ascension.html','dog-boss.html','dog-boss10.html','dog-expedition.html',
 'dog-forge.html','dog-group-boss.html','dog-private-preview.html','dog-tor-map.html'
];
const css=fs.readFileSync(new URL('dog-event-tabs.css',root),'utf8');
test('The only visible event links belong to the central register',()=>{
 assert.match(css,/body a\[href\]:not\(\.dog-event-tabs__tab\)/);
 assert.match(css,/display:none!important/);
 for(const page of pages){
  const html=fs.readFileSync(new URL(page,root),'utf8');
  assert.match(html,/dog-event-tabs\.css\?v=20261112-only-top-tabs2/,page);
  assert.match(html,/dog-event-tabs\.js\?v=/,page);
 }
});
test('Boss selection remains discoverable without a second navigation link',()=>{
 const map=fs.readFileSync(new URL('dog-tor-map.html',root),'utf8');
 const script=fs.readFileSync(new URL('dog-event-tabs.js',root),'utf8');
 assert.match(map,/gate-boss-navigation-hint/);
 assert.match(script,/groupBosses\.some/);
 assert.match(css,/#gate-boss-button:not\(\[hidden\]\)/);
});
