import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=new URL('../',import.meta.url);
const pages=[
 'dog-ascension.html','dog-boss.html','dog-boss10.html','dog-expedition.html',
 'dog-forge.html','dog-group-boss.html','dog-private-preview.html','dog-tor-map.html'
];
const css=fs.readFileSync(new URL('dog-event-tabs.css',root),'utf8');
test('Shared tabs navigate, with a map-only gameplay boss entry',()=>{
 assert.match(css,/body a\[href\]:not\(\.dog-event-tabs__tab\):not\(#gate-boss-button\)/);
 assert.match(css,/display:none!important/);
 assert.match(css,/#gate-boss-button\\[hidden\\]\\{display:none!important\\}/);
 for(const page of pages){
  const html=fs.readFileSync(new URL(page,root),'utf8');
  assert.match(html,/dog-event-tabs\.css\?v=20261112-boss-from-map2/,page);
  assert.match(html,/dog-event-tabs\.js\?v=/,page);
 }
});
test('Boss arenas are selected on the 100-gate map instead of top tabs',()=>{
 const map=fs.readFileSync(new URL('dog-tor-map.html',root),'utf8');
 const mapScript=fs.readFileSync(new URL('dog-tor-map.js',root),'utf8');
 const navigation=fs.readFileSync(new URL('dog-event-tabs.js',root),'utf8');
 assert.match(map,/id="gate-boss-button"/);
 assert.doesNotMatch(map,/gate-boss-navigation-hint/);
 assert.match(mapScript,/boss\.href='\.\/dog-boss10\.html'/);
 assert.match(mapScript,/boss\.href='\.\/dog-group-boss\.html\?gate='/);
 assert.doesNotMatch(navigation,/groupBosses|Bosse 20–100|Boss 10/);
});
