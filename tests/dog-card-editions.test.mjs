import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {CARD_EDITIONS,CARD_EDITION,CARD_FILE_NAMES,CARD_VISUALS,isCardEditionUnlocked,cardBackImage,cardVisual,loadCardEdition,saveCardEdition} from '../DOG/card-visuals.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..','DOG');
const expected=new Set(['1-11','2','3','4','5','6','7','8','9','10','12','13','tausch','joker','rueckseite']);

test('all registered card editions contain 15 correctly sized images, PNG or SVG',()=>{
 assert.equal(Object.keys(CARD_FILE_NAMES).length,14);
 for(const [id,edition] of Object.entries(CARD_EDITIONS)){
  const size=id==='kartendesign-02'?[1024,1536]:[700,980];
  assert.deepEqual([edition.width,edition.height],size,id);
  const actual=new Set([...Object.values(CARD_FILE_NAMES),'rueckseite']);
  assert.deepEqual(actual,expected,id);
  for(const name of expected){
   const ext=edition.extension||'png';
   const file=resolve(root,edition.base.replace(/^\.\//,''),name+'.'+ext);
   const bytes=readFileSync(file);
   if(ext==='svg'){
    const svg=bytes.toString('utf8');
    assert.match(svg,/\<svg\b/);
    assert.match(svg,new RegExp('width="'+edition.width+'"'));
    assert.match(svg,new RegExp('height="'+edition.height+'"'));
   }else{
    assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a',id+'/'+name);
    assert.equal(bytes.readUInt32BE(16),edition.width,id+'/'+name+' width');
    assert.equal(bytes.readUInt32BE(20),edition.height,id+'/'+name+' height');
   }
  }
 }
});

test('card editions are visual-only and persist locally',()=>{
 const store=new Map();
 const storage={getItem:key=>store.get(key)||null,setItem:(key,val)=>store.set(key,val)};
 assert.equal(loadCardEdition(storage),CARD_EDITION);
 assert.equal(saveCardEdition('unknown',storage),CARD_EDITION);
 assert.equal(saveCardEdition(CARD_EDITION,storage),CARD_EDITION);
 assert.equal(loadCardEdition(storage),CARD_EDITION);
 assert.match(cardVisual('7',CARD_EDITION).image,/\/normiert\/7\.png$/);
 assert.match(cardBackImage(CARD_EDITION),/\/normiert\/rueckseite\.png$/);
});

test('Christmas decks cannot be equipped from forged storage or direct selection',()=>{
 assert.deepEqual(Object.keys(CARD_EDITIONS),['kartendesign-01','kartendesign-02','kartendesign-03','kartendesign-04','kartendesign-05']);
 assert.equal(isCardEditionUnlocked('kartendesign-04'),true);
 assert.equal(isCardEditionUnlocked('kartendesign-05'),false);
 assert.equal(CARD_EDITIONS['kartendesign-05'].minPlayerLevel,20);
 assert.equal(isCardEditionUnlocked(CARD_EDITION),true);
 for(const id of ['kartendesign-02','kartendesign-03']){
  assert.equal(isCardEditionUnlocked(id),false,id);
  assert.match(CARD_EDITIONS[id].unlockId,/^christmas2026:cards:/);
  const data=new Map([['dog:card-edition:v1',id]]);
  const storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
  assert.equal(loadCardEdition(storage),CARD_EDITION);
  assert.equal(saveCardEdition(id,storage),CARD_EDITION);
  assert.equal(cardVisual('9',id).edition,CARD_EDITION);
  assert.equal(cardBackImage(id),cardBackImage(CARD_EDITION));
 }
});

test('home-exit pictures do not falsely mark the 12 card',()=>{
 assert.equal(CARD_VISUALS['1/11'].kind,'home');
 assert.equal(CARD_VISUALS['13'].kind,'home');
 assert.equal(CARD_VISUALS['12'].kind,'number');
});
