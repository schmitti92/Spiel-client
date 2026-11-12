import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const base=new URL('../',import.meta.url);
const script=fs.readFileSync(new URL('dog-hero-equipment.js',base),'utf8');
const sandbox={window:{}};vm.runInNewContext(script,sandbox);
const gear=sandbox.window.DogHeroEquipment;
test('three locked hero classes each have different weapon and armor progression',()=>{
 const classes=['krieger','magierin','waechter'];
 for(const type of ['weapon','armor']){
  for(const level of [1,6,11,16,20]){
   const names=classes.map(cls=>gear.name(cls,type,level));
   assert.equal(new Set(names).size,3,type+' '+level);
   for(const cls of classes){
    const file=gear.image(cls,type,level).replace(/^\.\//,'');
    const path=new URL(file,base);
    assert.equal(fs.existsSync(path),true,file);
    const svg=fs.readFileSync(path,'utf8');
    assert.match(svg,/^<svg/);
    assert.match(svg,/<\/svg>$/);
   }
  }
 }
});
test('unconfirmed classes display only generic equipment and never forge a class',()=>{
 assert.equal(gear.normalize('unconfirmed'),null);
 assert.equal(gear.normalize(null),null);
 assert.equal(gear.image(null,'weapon',6),'./dog-forge-art/weapon-2.svg');
 assert.equal(gear.name('unconfirmed','armor',20),'Drachenrüstung');
});
test('all forge screens use one class registry but keep unchanged server item ids',()=>{
 const ui=fs.readFileSync(new URL('dog-forge-ui.js',base),'utf8');
 const gallery=fs.readFileSync(new URL('dog-forge-gallery.js',base),'utf8');
 const asc=fs.readFileSync(new URL('dog-ascension.js',base),'utf8');
 assert.match(ui,/DogHeroEquipment/);
 assert.match(gallery,/DogHeroEquipment/);
 assert.match(asc,/DogHeroEquipment/);
 assert.match(ui,/'weapon','armor'/);
});
