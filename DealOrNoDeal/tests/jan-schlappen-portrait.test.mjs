import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(resolve(root,path));
const lobby=read('lobby.html').toString('utf8');
const game=read('game.html').toString('utf8');
const client=read('js/app.js').toString('utf8');
const commentary=read('js/commentary-lines.js').toString('utf8');

test('newly uploaded Jan Schlappen portrait is a full-size PNG and matches the source file',()=>{
 const portrait=read('assets/jan-schlappen.png');
 const uploaded=read('Weihnachtsevent2/Weihnachtsbilder/file_00000000164482109ba25ec234b2d9f7.png');
 assert.ok(portrait.equals(uploaded),'the actual GitHub-uploaded PNG should be used unchanged');
 assert.equal(portrait.subarray(0,8).toString('hex'),'89504e470d0a1a0a','PNG magic bytes');
 assert.ok(portrait.readUInt32BE(16)>=512,'the new portrait must be high resolution');
 assert.ok(portrait.readUInt32BE(20)>=512,'the new portrait must be high resolution');
 assert.ok(portrait.length>100000,'must not fall back to tiny corrupted old portrait');
});

test('Jan avatar 14 uses the new golden PNG in lobby, gameplay, commentary and victory screen',()=>{
 assert.match(lobby,/14:'\.\/assets\/jan-schlappen\.png'/);
 assert.match(client,/avatarId===14\?'jan-schlappen\.png'/);
 assert.match(client,/winnerPlayer\.avatar===14\?'assets\/jan-schlappen\.png'/);
 assert.match(commentary,/"image": "jan-schlappen\.png"/);
 for(const [name,source] of [['lobby',lobby],['app',client],['commentary',commentary]]){
  assert.doesNotMatch(source,/jan-schlappen\.(?:webp|svg)/,name+' must not use the old avatar image');
 }
 assert.match(game,/commentary-lines\.js\?v=20261109-jan-full-png-v2/);
 assert.match(game,/app\.js\?v=20261109-[a-z0-9-]+/,'portrait-bearing app script has a fresh versioned URL');
 assert.doesNotThrow(()=>new Script(client));
 assert.doesNotThrow(()=>new Script(commentary));
});