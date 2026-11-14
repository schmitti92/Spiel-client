import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {BOARD_STYLES,loadAppearance,saveAppearance} from '../DOG/appearance-registry.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const simple=['schiefer','pergament','holz','bergsee','goldwellen'];
const premium=['royalMarmor','maerchental','alpenland','kuestenabenteuer','royalKarten','zauberwald'];

test('five fieldless classic plates are in the repository',()=>{
 for(const id of simple){
  const theme=BOARD_STYLES[id];
  assert.ok(theme?.image?.endsWith('.svg'),id);
  const file=resolve(root,'DOG',theme.image);
  assert.ok(existsSync(file),id+': missing SVG');
  const xml=readFileSync(file,'utf8');
  assert.match(xml,/viewBox="0 0 1024 1024"/,id);
  assert.doesNotMatch(xml,/\b(?:START|ZIEL|track|data-piece)\b/gi,id);
 }
});

test('premium themes have a safe SVG fallback until uploaded WEBP exists',()=>{
 for(const id of premium){
  const theme=BOARD_STYLES[id];
  assert.ok(theme,id);
  assert.match(theme.image,/^\.\/(?:assets\/boards|Bilder\/Spielhintergrundbilder)\/[a-z-]+\.webp$/,id);
  assert.match(theme.fallbackImage,/^\.\/assets\/boards\/[a-z]+\.svg$/,id);
  assert.ok(existsSync(resolve(root,'DOG',theme.fallbackImage)),id);
 }
});

test('lobby selection is independent of saved DOG game state',()=>{
 const values=new Map([['spielportal:dog:local-v1','INVARIANT']]);
 const storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 for(const id of [...simple,...premium]){
  const result=saveAppearance({...loadAppearance(storage),board:id},storage);
  assert.equal(result.board,id);
  assert.equal(values.get('spielportal:dog:local-v1'),'INVARIANT');
 }
});

test('both lobbies contain the independent background picker',()=>{
 for(const path of ['spielauswahl-lokal.html','hub-lobby.html']){
  const html=readFileSync(resolve(root,path),'utf8');
  assert.match(html,/data-dog-board-picker/,path);
  assert.match(html,/board-picker\.js/,path);
 }
});
