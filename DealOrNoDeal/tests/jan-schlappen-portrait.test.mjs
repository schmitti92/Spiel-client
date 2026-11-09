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

test('Jan Schlappen portrait is a native, complete and browser-decodable WebP image',()=>{
 const data=read('assets/jan-schlappen.webp');
 assert.equal(data.toString('ascii',0,4),'RIFF');
 assert.equal(data.toString('ascii',8,12),'WEBP');
 assert.equal(data.toString('ascii',12,16),'VP8 ');
 assert.equal(data.readUInt32LE(4)+8,data.length,'incomplete RIFF content');
 assert.equal(data.readUInt32LE(16)+20,data.length,'incomplete WebP VP8 chunk');
 assert.ok(data.length>1000,'portrait data should not be empty');
 // The old SVG embedded an incomplete base64-encoded WebP. Do not reuse it.
 assert.notEqual(data[0],60,'direct WebP must not be an SVG/XML wrapper');
});
test('Jan avatar 14 uses the WebP everywhere including lobby, player portraits, commentary and finals',()=>{
 assert.match(lobby,/14:'\.\/assets\/jan-schlappen\.webp'/);
 assert.match(client,/avatarId===14\?'jan-schlappen\.webp'/);
 assert.match(client,/winnerPlayer\.avatar===14\?'assets\/jan-schlappen\.webp'/);
 assert.match(commentary,/"image": "jan-schlappen\.webp"/);
 assert.doesNotMatch(lobby,/jan-schlappen\.svg/);
 assert.doesNotMatch(client,/jan-schlappen\.svg/);
 assert.doesNotMatch(commentary,/jan-schlappen\.svg/);
 assert.match(game,/commentary-lines\.js\?v=20261109-jan-portrait-fix/);
 assert.match(game,/app\.js\?v=20261109-jan-portrait-fix/);
 assert.doesNotThrow(()=>new Script(client));
 assert.doesNotThrow(()=>new Script(commentary));
});
