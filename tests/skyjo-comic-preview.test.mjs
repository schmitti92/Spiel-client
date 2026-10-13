// Isolated comic-preview regression checks. Run: node --test tests/skyjo-comic-preview.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../Skyjo/skyjo_comic_preview.html',import.meta.url),'utf8');
test('comic preview is a separate HTML document',()=>{assert.match(html,/<!doctype html>/i);assert.match(html,/id="stage"/);});
test('landscape-only with portrait rotate hint',()=>{assert.match(html,/@media\(orientation:portrait\)/);assert.match(html,/Bitte ins Querformat drehen/);});
test('all three supported player counts',()=>{for(const n of [3,4,5])assert.match(html,new RegExp('<option value="'+n+'">'));});
test('opponent positions are declared for each player count',()=>{for(const n of [3,4,5])assert.match(html,new RegExp(n+":\\['enemy-left-top'"));});
test('demo interactions are labeled and never pretend to be live gameplay',()=>{assert.match(html,/DEMO – keine Verbindung zur laufenden Partie/);assert.match(html,/DEMO: Eine Karte wurde gezogen/);});
test('no write requests or server mutations in the standalone preview',()=>{assert.doesNotMatch(html,/fetch\s*\(|XMLHttpRequest|WebSocket\s*\(|\.send\s*\(/);});
