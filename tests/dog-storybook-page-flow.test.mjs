import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CHRISTMAS_STORY_CHAPTERS,initChristmasStory} from '../DOG/christmas-story.js';

test('all ten book chapters preserve six authored scenes each',()=>{
 assert.equal(CHRISTMAS_STORY_CHAPTERS.length,10);
 for(const chapter of CHRISTMAS_STORY_CHAPTERS){
  assert.equal(chapter.pages.length,6);
  for(const [heading,body] of chapter.pages){
   assert.ok(heading.length>=5);
   assert.ok(body.length>=400,'chapter '+chapter.level+': scene text may not be truncated');
  }
 }
});

test('a realistic 2-page book spread fills both leaves with complete authored paragraphs',()=>{
 // scrollHeight == clientHeight is the NORMAL value for text that fits.
 // The former -10px tolerance incorrectly rejected every candidate,
 // splitting a 100-word scene into fifteen essentially empty pages.
 class Element{
  constructor(tag){
   this.tagName=tag;this.className='';this.children=[];this._text='';
   this.hidden=false;this.disabled=false;this.attributes={};
  }
  set textContent(value){this._text=String(value);this.children=[];}
  get textContent(){return this._text;}
  get clientHeight(){return this.className.includes('storybook-page-text')?260:500;}
  get scrollHeight(){
   if(!this.className.includes('storybook-page-text'))return this.clientHeight;
   const textLength=this.textContent.length;
   return Math.max(this.clientHeight,Math.ceil(textLength/43)*23);
  }
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this.children=[...children];}
  remove(){}
  setAttribute(name,value){this.attributes[name]=String(value);}
  addEventListener(){}
  getBoundingClientRect(){return {width:880,height:650};}
  querySelector(selector){return selector==='small'?this.small:null;}
 }
 const ids=Object.fromEntries(
  ['story-chapter-list','story-reading','story-upgrade-banner',
   'story-next-action','story-book-unlocked'].map(id=>[id,new Element('div')])
 );
 ids['tab-story']=new Element('button');
 ids['tab-story'].small=new Element('small');
 const originalWindow=globalThis.window,originalDocument=globalThis.document;
 globalThis.window={
  matchMedia:()=>({matches:false,addEventListener(){}}),
  innerHeight:820,
  addEventListener(){}
 };
 globalThis.document={
  getElementById:id=>ids[id]||null,
  createElement:tag=>new Element(tag)
 };
 try{
  initChristmasStory({openTab(){}});
  const frame=ids['story-reading'].children[0];
  assert.ok(frame.className.includes('storybook-spread'));
  assert.equal(frame.children.length,2,'the opening scene must fill BOTH facing paper leaves');
  const getBody=paper=>paper.children.find(x=>x.className==='storybook-page-text').textContent;
  const left=getBody(frame.children[0]),right=getBody(frame.children[1]);
  assert.ok(left.split(/\s+/).length>=40,'the left leaf should contain prose, not a few words');
  assert.ok(right.split(/\s+/).length>=35,'the right leaf should contain prose, not a few words');
  assert.equal(left+'\n\n'+right,CHRISTMAS_STORY_CHAPTERS[0].pages[0][1],
   'the original story must be presented verbatim, with no deleted passages');
 }finally{
  if(originalWindow===undefined)delete globalThis.window;else globalThis.window=originalWindow;
  if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;
 }
});

test('the reading layout always measures real text height instead of truncating to 8 words',()=>{
 const source=readFileSync(new URL('../DOG/christmas-story.js',import.meta.url),'utf8');
 assert.match(source,/scrollHeight<=left\.story\.clientHeight\+1/);
 assert.match(source,/scrollHeight<=right\.story\.clientHeight\+1/);
 assert.match(source,/split\(\/\\n\\s\*\\n\/\)/);
 assert.match(source,/fitsBody\(facing\[0\],facing\[1\]\)/);
 assert.match(source,/measure\.remove\(\)/);
 assert.doesNotMatch(source,/scrollHeight<=left\.story\.clientHeight-10/);
});