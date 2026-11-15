import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CHRISTMAS_STORY_CHAPTERS,unlockedStoryChapters,initChristmasStory} from '../DOG/christmas-story.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Lichtertal narrative has ten ordered, substantial stages and a conclusion',()=>{
 assert.deepEqual(CHRISTMAS_STORY_CHAPTERS.map(c=>c.level),Array.from({length:10},(_,i)=>i+1));
 assert.equal(new Set(CHRISTMAS_STORY_CHAPTERS.map(c=>c.title)).size,10);
 assert.equal(CHRISTMAS_STORY_CHAPTERS[0].title,'Ein unerwarteter Besuch');
 assert.equal(CHRISTMAS_STORY_CHAPTERS[9].title,'Das Licht über Lichtertal');
 for(const chapter of CHRISTMAS_STORY_CHAPTERS){
  assert.ok(chapter.tree.length>4);
  assert.ok(chapter.paragraphs.length>=3);
  assert.ok(chapter.paragraphs.every(text=>text.length>120));
  assert.ok(chapter.paragraphs.join(' ').includes('Pip'));
 }
 const story=CHRISTMAS_STORY_CHAPTERS.flatMap(c=>c.paragraphs).join(' ');
 for(const character of ['Chris','Vanessa','David','Pip'])assert.ok(story.includes(character));
});

test('only server-verified tree stages unlock the next part',()=>{
 for(const stage of [0,1,2,5,9,10,11,100]){
  assert.equal(unlockedStoryChapters(stage,false),1,'offline previews never reveal future content');
 }
 assert.equal(unlockedStoryChapters(1,true),1);
 assert.equal(unlockedStoryChapters(2,true),2);
 assert.equal(unlockedStoryChapters(6,true),6);
 assert.equal(unlockedStoryChapters(10,true),10);
 assert.equal(unlockedStoryChapters(100,true),10);
 assert.equal(unlockedStoryChapters(-10,true),1);
 assert.equal(unlockedStoryChapters(null,true),1);
});

test('story reader and shared village wiring require real upgrades, not fake preview progression',()=>{
 const html=read('DOG/christmas-event.html');
 const client=read('DOG/christmas-event.js');
 const story=read('DOG/christmas-story.js');
 const css=read('DOG/christmas-story.css');
 for(const id of ['story-chapter-list','story-reading','story-progress-meter',
  'story-progress-label','story-state-note','story-next-action','story-refresh']){
  assert.match(html,new RegExp('id="'+id+'"'));
 }
 assert.match(client,/initChristmasStory/);
 assert.match(client,/treeLevel:villageLive\?tree:1,isVerified:Boolean\(villageLive\)/);
 assert.match(client,/if\(id==='story'\)/);
 assert.match(client,/void reloadVillage\(\)/);
 assert.match(client,/villageLive=null;villageHost=false/);
 assert.match(html,/christmas-story\.css\?v=\d+/);
 assert.match(css,/\.story-reader-layout/);
 assert.match(css,/\.story-chapter\.is-locked/);
 assert.match(story,/button\.disabled=!isOpen/);
 assert.match(story,/isOpen\?chapter\.title:'Noch nicht enthüllt'/);
 assert.doesNotMatch(story,/\bfetch\s*\(|localStorage|sessionStorage|onSnapshot|firebase|firestore|setInterval/);
});

test('unlocked story parts can be viewed and future chapter names are not rendered',()=>{
 class Element{
  constructor(tag){this.tag=tag;this.children=[];this.textContent='';this.attributes={};this.style={};this.hidden=false;this.disabled=false;}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=[...nodes];}
  setAttribute(key,value){this.attributes[key]=value;}
  addEventListener(){}
  querySelector(selector){return selector==='small'?this.small:null;}
 }
 const ids=Object.fromEntries(['story-chapter-list','story-reading','story-progress-label',
  'story-progress-fill','story-state-note','story-next-action',
  'story-upgrade-banner','story-progress-meter'].map(id=>[id,new Element('div')]));
 const tab=new Element('button');tab.small=new Element('small');ids['tab-story']=tab;
 const old=globalThis.document;
 globalThis.document={getElementById:id=>ids[id]||null,createElement:tag=>new Element(tag)};
 try{
  const screen=initChristmasStory({openTab:()=>{}});
  assert.equal(ids['story-chapter-list'].children.length,10);
  assert.equal(ids['story-chapter-list'].children.filter(c=>!c.disabled).length,1);
  const futureTitle=CHRISTMAS_STORY_CHAPTERS[4].title;
  assert.ok(!JSON.stringify(ids['story-chapter-list'].children).includes(futureTitle));
  screen.render({treeLevel:5,isVerified:false});
  assert.equal(ids['story-chapter-list'].children.filter(c=>!c.disabled).length,1);
  screen.render({treeLevel:3,isVerified:true,remaining:2});
  assert.equal(ids['story-chapter-list'].children.filter(c=>!c.disabled).length,3);
  assert.equal(ids['story-progress-label'].textContent,'3 von 10 Teilen freigeschaltet');
  assert.ok(!JSON.stringify(ids['story-chapter-list'].children).includes(futureTitle));
  screen.render({treeLevel:5,isVerified:true,remaining:1});
  assert.equal(ids['story-chapter-list'].children.filter(c=>!c.disabled).length,5);
  assert.match(ids['story-upgrade-banner'].textContent,/Teil 5/);
  assert.ok(ids['story-chapter-list'].children[4].children.some(n=>n.textContent===futureTitle));
  screen.render({treeLevel:10,isVerified:true});
  assert.equal(ids['story-chapter-list'].children.filter(c=>!c.disabled).length,10);
  screen.render({treeLevel:10,isVerified:false});
  assert.equal(ids['story-chapter-list'].children.filter(c=>!c.disabled).length,1);
  assert.equal(ids['story-upgrade-banner'].hidden,true);
 }finally{globalThis.document=old;}
});

test('village overview removes requested prose and preview controls but retains progress and Back',()=>{
 const html=read('DOG/christmas-event.html');
 const js=read('DOG/christmas-event.js');
 const css=read('DOG/christmas-event-royal.css');
 const top=html.split('<header class="event-top">')[1]?.split('</header>')[0];
 const village=html.split('id="panel-village"')[1]?.split('id="panel-buildings"')[0];
 assert.ok(top&&village,'header and village panels exist');
 assert.match(top,/id="event-return"[^>]*>↩ Zurück<\/a>/);
 assert.doesNotMatch(top,/event-brand|KAPITEL 1|DOG <em>WEIHNACHTEN<\/em>/);
 assert.doesNotMatch(village,/royal-intro|village-storyline|village-caption|village-preview-actions|event-footer-row/);
 for(const phrase of ['Die Weihnachtsreise beginnt','Unser gemeinsames Ziel',
  'Vollausbau prüfen','Nächste Entwicklungsstufe','Gebäude ansehen',
  'Gemeinsam bereiten wir das Dorf auf Weihnachten vor']){
  assert.ok(!village.includes(phrase),'removed overview text: '+phrase);
 }
 for(const id of ['stat-building-levels','stat-tree-level','stat-village-lights','stat-village-gifts']){
  assert.match(village,new RegExp('id="'+id+'"'),'keep live progress tile '+id);
 }
 assert.match(css,/\.event-top-actions\{margin-left:auto/);
 assert.match(css,/#panel-village \.village-shell/);
 assert.doesNotMatch(js,/\$\('village-preview-(next|reset|full|count)'\)/);
 assert.doesNotMatch(js,/\$\('village-scene-(title|caption)'\)/);
 assert.match(js,/storyScreen\.render\(/,'the existing tree-based story unlock remains');
});
