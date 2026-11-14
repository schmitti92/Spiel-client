import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {CARD_EDITIONS,CARD_EDITION,CARD_FILE_NAMES,CARD_VISUALS,cardBackImage,cardVisual,loadCardEdition,saveCardEdition} from '../DOG/card-visuals.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..','DOG');
const expected=new Set(['1-11','2','3','4','5','6','7','8','9','10','12','13','tausch','joker','rueckseite']);

test('all registered card editions have a full, normalized 700x980 PNG deck',()=>{
 assert.equal(Object.keys(CARD_FILE_NAMES).length,14);
 for(const [id,edition] of Object.entries(CARD_EDITIONS)){
  assert.equal(edition.width,700,id);
  assert.equal(edition.height,980,id);
  const actual=new Set([...Object.values(CARD_FILE_NAMES),'rueckseite']);
  assert.deepEqual(actual,expected,id);
  for(const name of expected){
   const file=resolve(root,edition.base.replace(/^\.\//,''),name+'.png');
   const bytes=readFileSync(file);
   assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a',id+'/'+name);
   assert.equal(bytes.readUInt32BE(16),700,id+'/'+name+' width');
   assert.equal(bytes.readUInt32BE(20),980,id+'/'+name+' height');
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

test('home-exit pictures do not falsely mark the 12 card',()=>{
 assert.equal(CARD_VISUALS['1/11'].kind,'home');
 assert.equal(CARD_VISUALS['13'].kind,'home');
 assert.equal(CARD_VISUALS['12'].kind,'number');
});
