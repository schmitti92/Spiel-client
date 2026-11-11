import test from 'node:test';
import assert from 'node:assert/strict';
import {
 APPEARANCE_STORAGE_KEY,DEFAULT_APPEARANCE,
 BOARD_STYLES,PIECE_STYLES,CARD_STYLES,EVENT_PACKS,
 normalizeAppearance,resolveAppearance,loadAppearance,saveAppearance,validAssetPath,assetBackground
} from '../DOG/appearance-registry.js';
import {makeDefaultLayout} from '../DOG/board-layout.js';

test('DOG supports board backgrounds, multiple pawn palettes and five visual card themes',()=>{
 assert.ok(Object.keys(BOARD_STYLES).length>=4);
 assert.ok(Object.keys(PIECE_STYLES).length>=4);
 assert.equal(Object.keys(CARD_STYLES).length,5);
 for(const [id,theme] of Object.entries(BOARD_STYLES)){
  assert.equal(typeof theme.page,'string',id);
  assert.equal(typeof theme.frame,'string',id);
  assert.equal(theme.wood.length,5,id);
  assert.equal(theme.surface.length,3,id);
  assert.equal(theme.center.length,2,id);
 }
 for(const [id,palette] of Object.entries(PIECE_STYLES)){
  assert.equal(palette.colors.length,4,id);
  assert.ok(palette.colors.every(color=>/^#[0-9a-f]{6}$/i.test(color)),id);
 }
 for(const [id,card] of Object.entries(CARD_STYLES)){
  assert.equal(typeof card.label,'string',id);
  for(const prop of ['face','special','border','specialBorder','ink','back','emblem'])assert.ok(card[prop],id+': '+prop);
 }
});
test('invalid or unknown style selections safely fall back to classic defaults',()=>{
 assert.deepEqual(normalizeAppearance({board:'fake',cards:'invalid',pieces:null,event:'x'}),DEFAULT_APPEARANCE);
 assert.deepEqual(normalizeAppearance(null),DEFAULT_APPEARANCE);
 const selected=normalizeAppearance({board:'winter',cards:'royal',pieces:'pastel',other:'wrong'});
 assert.equal(selected.board,'winter');
 assert.equal(selected.cards,'royal');
 assert.equal(selected.pieces,'pastel');
 assert.equal(selected.event,'none');
 assert.equal('other' in selected,false);
});
test('presentation registry options are immutable and event registry has safe baseline',()=>{
 assert.equal(Object.isFrozen(BOARD_STYLES),true);
 assert.equal(Object.isFrozen(PIECE_STYLES.classic.colors),true);
 assert.equal(EVENT_PACKS.none.board,null);
 const resolved=resolveAppearance({board:'forest',cards:'dark',pieces:'neon'});
 assert.equal(resolved.board,BOARD_STYLES.forest);
 assert.equal(resolved.pieces,PIECE_STYLES.neon);
 assert.equal(resolved.cards,CARD_STYLES.dark);
 assert.equal(resolved.event,EVENT_PACKS.none);
});
test('individual DOG cosmetic choice persists independently of game state',()=>{
 const data=new Map([['spielportal:dog:local-v1','DO_NOT_TOUCH']]);
 const storage={
  getItem:key=>data.get(key)||null,
  setItem:(key,value)=>data.set(key,value),
  removeItem:key=>data.delete(key)
 };
 const appearance=saveAppearance({board:'midnight',pieces:'contrast',cards:'winter'},storage);
 assert.deepEqual(loadAppearance(storage),appearance);
 assert.equal(data.get('spielportal:dog:local-v1'),'DO_NOT_TOUCH');
 assert.ok(data.has(APPEARANCE_STORAGE_KEY));
 data.set(APPEARANCE_STORAGE_KEY,'not json');
 assert.deepEqual(loadAppearance(storage),DEFAULT_APPEARANCE);
});
test('changing DOG presentation never changes approved geometry or game card identities',()=>{
 const original=makeDefaultLayout();
 const ids=[0,16,32,48].map(i=>original.track[i]);
 const winter=resolveAppearance({board:'winter',pieces:'pastel',cards:'forest'});
 const studio=resolveAppearance({board:'studio',pieces:'classic',cards:'classic'});
 assert.notDeepEqual(winter.pieces.colors,studio.pieces.colors);
 assert.notDeepEqual(winter.board.surface,studio.board.surface);
 assert.deepEqual([0,16,32,48].map(i=>makeDefaultLayout().track[i]),ids);
 assert.deepEqual(makeDefaultLayout(),original);
});

test('artwork filenames are local-only, with fallback for missing or unsafe paths',()=>{
 assert.equal(validAssetPath('./assets/board/winter.webp'),true);
 assert.equal(validAssetPath('./assets/cards/royal/back.png'),true);
 assert.equal(validAssetPath('../assets/private.png'),false);
 assert.equal(validAssetPath('./assets/../secret.png'),false);
 assert.equal(validAssetPath('https://example.org/tracker.png'),false);
 assert.equal(validAssetPath('javascript:alert(1)'),false);
 assert.equal(assetBackground(null,'linear-gradient(red,blue)'),'linear-gradient(red,blue)');
 assert.equal(assetBackground('https://example.org/bad.png','blue'),'blue');
 assert.match(assetBackground('./assets/cards/classic/front.webp','white'),/^url\("\.\/assets\/cards\/classic\/front\.webp"\)/);
});
