/* SKYJO XL geometry: pure functions, no UI or server dependency. */
(function(root){'use strict';
const MODES=Object.freeze({classic:Object.freeze({rows:3,cols:4,count:12}),xl:Object.freeze({rows:3,cols:5,count:15})});
function layout(mode){return MODES[mode==='xl'?'xl':'classic']}
function lines(mode){const {rows,cols}=layout(mode),out=[];for(let r=0;r<rows;r++)out.push({axis:'row',number:r+1,indices:Array.from({length:cols},(_,c)=>r*cols+c)});for(let c=0;c<cols;c++)out.push({axis:'column',number:c+1,indices:Array.from({length:rows},(_,r)=>r*cols+c)});return out}
function completeEqualColumns(grid,mode){if(!Array.isArray(grid)||grid.length!==layout(mode).count)return [];return lines(mode).filter(l=>l.axis==='column'&&l.indices.every(i=>grid[i]&&grid[i].faceUp===true&&grid[i].type==='number'&&Number(grid[i].value)===Number(grid[l.indices[0]].value)))}
const api=Object.freeze({layout,lines,completeEqualColumns});if(typeof module!=='undefined'&&module.exports)module.exports=api;root.SkyjoLayouts=api;
})(typeof globalThis!=='undefined'?globalThis:this);
