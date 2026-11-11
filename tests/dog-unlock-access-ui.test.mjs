import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const page=source('DOG/index.html');
const client=source('DOG/app.js');
const select=source('spielauswahl-online.js');
const hub=source('hub-lobby.js');
const local=source('spielauswahl-lokal.html');

test('Local DOG boots only after an authenticated server unlock check',()=>{
 assert.match(page,/id="dog-access-gate"/);
 assert.match(page,/id="dog-game-layout" hidden/);
 assert.match(page,/\.layout\[hidden\]\{display:none\}/);
 assert.match(client,/api\/hub\/dog-access/);
 assert.match(client,/data\.unlocked!==true/);
 assert.match(client,/currentAccessUid\(\)!==uid/);
 assert.match(client,/if\(online\)\{dogLayout\.hidden=false;accessGate\.hidden=true;void initOnline\(\);\}/);
 assert.match(client,/if\(!recover\(\)\)newGame\(\);else\{render\(\);scheduleAI\(\);\}/);
 assert.doesNotMatch(client,/if\(online\)\{void initOnline\(\);\}else if\(!recover\(\)\)newGame\(\)/);
});

test('DOG locked warning is human-readable in both online lobbies',()=>{
 assert.match(select,/DOG_LOCKED_UNTIL_GATE_100/);
 assert.match(select,/Tor 100/);
 assert.match(hub,/DOG_LOCKED_UNTIL_GATE_100/);
 assert.match(local,/Freischaltung durch Tor 100/);
});
