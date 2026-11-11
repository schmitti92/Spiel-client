import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 STUDIO_VERSION,STUDIO_FORMATS,STUDIO_TYPES,createTemplate,createScene,
 createItem,normalizeProject,safeColor,safeImage,rgba
} from '../studio-model.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('index.html');
const js=read('studio.js');
const css=read('studio.css');

test('Boss project includes all five independent cinematic screens',()=>{
 const project=createTemplate('boss');
 assert.equal(project.version,STUDIO_VERSION);
 assert.deepEqual(project.screens.map(s=>s.name),[
  'Vor dem Kampf','Boss erscheint','Minispiel','Sieg','Niederlage'
 ]);
 assert.equal(project.width,1440);
 assert.equal(project.height,810);
 assert.ok(project.screens.every(s=>s.items.length>=4));
 assert.equal(new Set(project.screens.map(s=>s.id)).size,5);
 assert.ok(project.screens.find(s=>s.name==='Minispiel').items
  .some(i=>i.text.includes('REAKTION')));
});

test('All three game templates support distinct editable views and independent backgrounds',()=>{
 const forge=createTemplate('forge'),lobby=createTemplate('lobby'),empty=createTemplate('empty');
 assert.deepEqual(forge.screens.map(s=>s.name),[
  'Schmiede','Waffe verbessern','Materialien','Upgrade-Erfolg'
 ]);
 assert.deepEqual(lobby.screens.map(s=>s.name),[
  'Hauptlobby','Spielauswahl','Raum & Spieler'
 ]);
 assert.deepEqual(empty.screens.map(s=>s.name),['Freie Ansicht']);
 assert.notEqual(forge.screens[0].id,forge.screens[1].id);
 forge.screens[0].background.color='#abcdef';
 assert.notEqual(forge.screens[1].background.color,'#abcdef');
 assert.ok(forge.screens[0].items.length>0);
});

test('Every generic drawing element is editable with independent transparency and visual styles',()=>{
 for(const type of STUDIO_TYPES){
  const item=createItem(type);
  assert.equal(item.type,type);
  assert.ok(item.id&&item.w>0&&item.h>0);
  assert.ok(item.opacity>=0&&item.opacity<=100);
  assert.ok(typeof item.fill==='string'&&typeof item.stroke==='string');
 }
 const panel=createItem('panel',10,20,400,200,'Glas');
 assert.equal(panel.opacity,60);
 assert.equal(panel.blur,12);
 assert.equal(panel.borderWidth,2);
 assert.equal(createItem('text').opacity,0);
 assert.equal(rgba('#ff8040',0),'rgba(255,128,64,0)');
 assert.equal(rgba('#ff8040',75),'rgba(255,128,64,0.75)');
});

test('Export/import round-trip preserves all view content while generating separate ids',()=>{
 const document=createTemplate('boss');
 document.screens[0].items[0].text='Die neue Boss-LP';
 document.screens[3].background.overlayOpacity=82;
 const loaded=normalizeProject(JSON.parse(JSON.stringify(document)));
 assert.equal(loaded.screens.length,5);
 assert.equal(loaded.screens[0].items[0].text,'Die neue Boss-LP');
 assert.equal(loaded.screens[3].background.overlayOpacity,82);
 assert.notEqual(loaded.id,document.id);
 assert.notEqual(loaded.screens[0].id,document.screens[0].id);
 assert.notEqual(loaded.screens[0].items[0].id,document.screens[0].items[0].id);
 assert.equal(STUDIO_FORMATS['390x844'][0],390);
});

test('Untrusted JSON files cannot inject HTML, hostile image URLs or unlimited shapes',()=>{
 assert.throws(()=>normalizeProject(null),/INVALID_PROJECT/);
 assert.throws(()=>normalizeProject({screens:[]}),/INVALID_PROJECT/);
 const empty=createTemplate('empty');
 empty.width=777;
 assert.throws(()=>normalizeProject(empty),/INVALID_FORMAT/);
 empty.width=1440;
 empty.screens[0].background.image='javascript:alert(1)';
 empty.screens[0].background.color='expression(alert(1))';
 empty.screens[0].items.push({
  type:'text',text:'<img onerror=alert(1)>',x:-500,y:NaN,w:99999,h:0,
  color:'url(javascript:alert(1))',src:'https://example.com/remote.png'
 });
 const clean=normalizeProject(empty),it=clean.screens[0].items[0];
 assert.equal(clean.screens[0].background.image,'');
 assert.equal(clean.screens[0].background.color,'#10243e');
 assert.equal(it.src,'');assert.equal(it.color,'#ffffff');
 assert.equal(it.x,0);assert.equal(it.w,3000);assert.equal(it.h,10);
 assert.equal(it.text,'<img onerror=alert(1)>','Text remains editable, not executed');
 assert.equal(safeImage('data:text/html;base64,AAAA'),'');
 assert.equal(safeColor('red'),'#ffffff');
});

test('Standalone editor uses native ES modules without importing the live game runtime',()=>{
 assert.match(html,/<script type="module" src="\.\/studio\.js\?v=1"><\/script>/);
 assert.match(js,/from '\.\/studio-model\.mjs'/);
 assert.doesNotMatch(js,/firebase|serverfinal|SpielOnline|api\/dog|GitHub\.token/i);
 assert.match(js,/localStorage\.setItem\(STUDIO_STORAGE_KEY/);
 assert.match(js,/function exportProject\(/);
 assert.match(js,/async function exportPng\(/);
 assert.match(js,/canvas\.toBlob\(/);
 assert.match(js,/function importProject\(/);
 assert.match(js,/function compressImage\(/);
});

test('All canvas tools and inspector controls have unique corresponding HTML elements',()=>{
 const required=[
 'project-name','new-project','template-picker','artboard','canvas-backdrop',
 'canvas-overlay','canvas-grid','canvas-content','scene-tabs','rename-screen',
 'duplicate-screen','delete-screen','undo-btn','redo-btn','background-file',
 'item-file','project-file','background-color','background-fit',
 'background-overlay','overlay-opacity','background-blur',
 'prop-opacity','prop-blur','prop-radius','prop-fill','prop-stroke',
 'prop-text','prop-x','prop-y','prop-w','prop-h','prop-lock','prop-hide',
 'layer-list','export-png','export-json','fullscreen-btn','preview-btn',
 'screen-size','grid-toggle','snap-toggle'
 ];
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(new Set(ids).size,ids.length,'HTML ids must be unique');
 for(const id of required)assert.ok(ids.includes(id),'Missing #'+id);
 for(const type of STUDIO_TYPES)assert.ok(html.includes('data-add="'+type+'"'));
 assert.match(css,/\.canvas-item\.is-selected/);
 assert.match(css,/\.canvas-backdrop/);
 assert.match(css,/\.scene-tab\[aria-current=true\]/);
});

test('Moving, resizing, scene management, drag/drop editing and history are wired',()=>{
 for(const name of ['switchScene','addScene','renameScene','duplicateScene','deleteScene',
  'addItem','selectItem','startDrag','dragMove','stopDrag','applyProperties',
  'applyBackground','renderLayers','writeLocal','checkpoint','undo'])
  assert.ok(js.includes('function '+name+'('),'Missing editor function '+name);
 assert.match(js,/setPointerCapture/);
 assert.match(js,/ResizeObserver/);
 assert.match(js,/body\.classList\.toggle\('is-preview'\)/);
 assert.match(js,/requestFullscreen/);
 assert.match(js,/\.addEventListener\('keydown'/);
});
