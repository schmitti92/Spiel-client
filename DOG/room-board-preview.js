/* Read-only DOG room preview. Uses the same approved/custom coordinates and
 * device appearance as the actual game, without creating game or room state. */
import {currentBoardLayout,START_INDICES} from './board-layout.js?v=11';
import {BOARD_STYLES,loadAppearance,validAssetPath} from './appearance-registry.js?v=22';

const NS='http://www.w3.org/2000/svg';
const COLORS=['#ff5e56','#4eaafb','#4bd887','#ffd056'];
const S=(name,attrs={})=>{
 const element=document.createElementNS(NS,name);
 for(const [key,value] of Object.entries(attrs))element.setAttribute(key,String(value));
 return element;
};
function pawn(group,point,color){
 const g=S('g',{transform:'translate('+point.x+' '+point.y+')'});
 g.append(
  S('ellipse',{cx:0,cy:10,rx:16,ry:6,fill:'#0008'}),
  S('ellipse',{cx:0,cy:9,rx:14,ry:5,fill:color,stroke:'#071327','stroke-width':2}),
  S('path',{d:'M-10 5 Q-7 -5 -5 -9 Q0 -13 5 -9 Q7 -5 10 5Z',fill:color,stroke:'#071327','stroke-width':2}),
  S('circle',{cx:0,cy:-12,r:7.5,fill:color,stroke:'#071327','stroke-width':2}),
  S('ellipse',{cx:-3,cy:-15,rx:2,ry:3,fill:'#fff8'})
 );
 group.append(g);
}
export function renderDogRoomBoard(target){
 if(!target)return;
 const layout=currentBoardLayout();
 const appearance=loadAppearance();
 const theme=BOARD_STYLES[appearance.board]||BOARD_STYLES.studio;
 const svg=S('svg',{viewBox:'0 0 760 760','aria-hidden':'true',focusable:'false'});
 const woodColors=Array.isArray(theme.wood)?theme.wood:['#5f422c','#cca471','#6e4930'];
 const defs=S('defs');
 const wood=S('linearGradient',{id:'dog-room-wood',x1:'0',x2:'1',y1:'0',y2:'1'});
 for(const [offset,color] of [['0%',woodColors[1]||'#efd0a0'],['50%',woodColors[3]||woodColors[1]||'#c18a51'],['100%',woodColors[0]||'#88572d']]){
  wood.append(S('stop',{offset,'stop-color':color}));
 }
 defs.append(wood);
 const clip=S('clipPath',{id:'dog-room-board-clip'});
 clip.append(S('rect',{x:21,y:21,width:718,height:718,rx:35}));defs.append(clip);
 const center=S('radialGradient',{id:'dog-room-center'});
 center.append(S('stop',{offset:'0%','stop-color':'#183e65'}),S('stop',{offset:'100%','stop-color':'#061627'}));defs.append(center);
 svg.append(defs);
 svg.append(
  S('rect',{x:9,y:9,width:742,height:742,rx:45,fill:'#42240d',stroke:'#e7bc74','stroke-width':7}),
  S('rect',{x:21,y:21,width:718,height:718,rx:35,fill:'url(#dog-room-wood)',stroke:'#f1d8ae','stroke-width':3})
 );
 // Display the same user-selected board artwork behind the approved field
 // coordinates. Visual customization never changes any playable positions.
 const artwork=validAssetPath(theme.image)?theme.image:validAssetPath(theme.fallbackImage)?theme.fallbackImage:null;
 if(artwork)svg.append(S('image',{
  href:new URL(artwork,import.meta.url).href,
  x:21,y:21,width:718,height:718,opacity:'.88',
  preserveAspectRatio:'xMidYMid slice','clip-path':'url(#dog-room-board-clip)'
 }));
 svg.append(S('rect',{x:40,y:40,width:680,height:680,rx:24,fill:'none',stroke:'#fff2d0','stroke-width':2,opacity:'.58'}));
 const trackPath=layout.track.map((p,i)=>(i?'L':'M')+p.x+' '+p.y).join(' ')+' Z';
 svg.append(S('path',{d:trackPath,fill:'none',stroke:'#775334','stroke-width':15,opacity:'.30','stroke-linejoin':'round'}));
 svg.append(S('path',{d:trackPath,fill:'none',stroke:'#fff0d1','stroke-width':2,opacity:'.5'}));
 for(let i=0;i<layout.track.length;i++){
  const p=layout.track[i];
  const owner=START_INDICES.indexOf(i);
  const fill=owner!==-1?COLORS[owner]:'#f9f7ee';
  svg.append(S('circle',{cx:p.x,cy:p.y,r:owner!==-1?17.2:17,fill,stroke:'#2f3540','stroke-width':1.4}));
  if(owner!==-1)svg.append(S('circle',{cx:p.x,cy:p.y,r:7,fill:'#fff8'}));
 }
 for(let owner=0;owner<4;owner++){
  for(const p of layout.goals[owner]){
   svg.append(S('circle',{cx:p.x,cy:p.y,r:17.0,fill:COLORS[owner],stroke:'#20303d','stroke-width':1.7}));
   svg.append(S('circle',{cx:p.x,cy:p.y,r:6.5,fill:'#ffffff3d'}));
  }
  const homes=layout.homes[owner];
  for(const p of homes)svg.append(S('circle',{cx:p.x,cy:p.y,r:17.1,fill:COLORS[owner],opacity:'.76',stroke:'#fbead0','stroke-width':1.5}));
  for(const p of homes)pawn(svg,p,COLORS[owner]);
 }
 svg.append(S('circle',{cx:380,cy:380,r:58,fill:'url(#dog-room-center)',stroke:'#f8d78b','stroke-width':7}));
 const title=S('text',{x:380,y:391,'text-anchor':'middle','font-family':'Georgia,serif','font-size':34,'font-weight':900,fill:'#ffdf92'});title.textContent='DOG';svg.append(title);
 const label=document.getElementById('dog-room-board-name');
 if(label)label.textContent='– '+theme.label;
 target.setAttribute('aria-label','DOG-Spielbrettvorschau: '+theme.label);
 target.replaceChildren(svg);
}
