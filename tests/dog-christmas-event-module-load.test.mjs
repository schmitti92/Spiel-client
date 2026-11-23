import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const modulePaths=[
 'christmas-event.js',
 'christmas-intro-gate.js',
 'christmas-tree-films.js',
 'christmas-building-films.js',
 'christmas-building-costs.js',
 'christmas-tree-progression.js',
 'christmas-tree-rewards-ui.js',
 'christmas-story.js',
 'christmas-scratch-ui.js',
 'christmas-player-levels-ui.js',
 'christmas-research-ui.js',
 'christmas-tab-badges.js',
 'christmas-content-zoom.js',
 'christmas-sidebar-fit.js',
 'christmas-player-statistics-ui.js',
 'christmas-village-layout.mjs',
 'christmas-grinch-event.js',
 'christmas-dev-mode.js',
 'christmas-chris-reset.js',
 'christmas-village-import-guard.mjs',
 'video-library-catalog.js',
 'video-library-watched.js',
 'video-library.js'
];
const file=name=>new URL('../DOG/'+name,import.meta.url);
const read=name=>readFileSync(file(name),'utf8');

test('all directly imported modules parse, so a film status typo cannot break village and tabs',()=>{
 for(const name of modulePaths){
  const url=file(name);
  assert.ok(existsSync(url),name+' must exist');
  const checked=spawnSync(process.execPath,['--check',fileURLToPath(url)],{encoding:'utf8'});
  assert.equal(checked.status,0,name+' syntax error: '+checked.stderr);
 }
});
test('event, archive and entry page request current compatible film modules',()=>{
 const event=read('christmas-event.js');
 const tree=read('christmas-tree-films.js');
 const building=read('christmas-building-films.js');
 const gate=read('christmas-intro-gate.js');
 const page=read('christmas-event.html');
 const catalog=read('video-library-catalog.js');
 assert.match(event,/import \{initChristmasTreeFilms\} from '\.\/christmas-tree-films\.js\?v=6'/);
 assert.match(event,/import \{initChristmasBuildingFilms\} from '\.\/christmas-building-films\.js\?v=10'/);
 assert.match(gate,/import\('\.\/christmas-event\.js\?v=190'\)/);
 assert.match(page,/christmas-intro-gate\.js\?v=52/);
 assert.match(catalog,/christmas-tree-films\.js\?v=6/);
 assert.match(tree,/status\.textContent='🎬 Baumstufe '/);
 assert.match(tree,/chapter\.clips\.length\+\(autoContinue\?/);
 assert.match(building,/christmasBuildingFilmForUpgrade/);
 assert.match(event,/showLiveVillage\(\{village:result\.village/);
 assert.match(event,/\$\('tab-'\+id\)/);
});
