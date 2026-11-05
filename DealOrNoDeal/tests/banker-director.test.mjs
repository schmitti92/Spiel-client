import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const html=readFileSync(resolve(root,'game.html'),'utf8');
const js=readFileSync(resolve(root,'js/banker.js'),'utf8');
const css=readFileSync(resolve(root,'css/broadcast.css'),'utf8');

test('the full-stage banker portrait includes a live director caption',()=>{
 assert.match(html,/id="banker-director-caption"/);
 assert.match(html,/class="banker-call-portrait"/);
 assert.match(css,/#banker-call \.banker-director-caption/);
 assert.match(css,/#banker-call \.banker-call-card\{[\s\S]*?scrollbar-gutter:stable/);
});
test('vote direction uses public counts and never discloses individual decisions',()=>{
 assert.match(js,/const castVotes=h\.decisions\.length/);
 assert.match(js,/directorCaption\.textContent=/);
 assert.match(js,/voteProgress\.dataset\.stage=/);
 assert.match(js,/Entscheidungen geheim/);
 assert.doesNotMatch(js,/directorCaption\.textContent\s*=\s*[^;]*\.deal/);
});
test('voting and banker presentation remain usable without animations',()=>{
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/\.banker-director-caption\{animation:none!important\}/);
 assert.match(css,/#banker-call #banker-vote-progress-fill\{transition:none!important\}/);
});
