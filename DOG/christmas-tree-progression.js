/** DOG Lichtertal tree progression: read-only mirror of Render's
 * dogTreeLevelFromLevels. The server authorizes prizes, films and Grinch.
 * These helpers only show the currently verified village progress.
 */
import {CHRISTMAS_BUILDING_IDS,CHRISTMAS_BUILDING_MAX_LEVEL} from './christmas-building-costs.js?v=4';

export const CHRISTMAS_TREE_THRESHOLDS=Object.freeze([6,9,12,14,17,20,22,25,28,30]);
export const CHRISTMAS_TREE_BASE_POINTS=CHRISTMAS_BUILDING_IDS.length;
export const CHRISTMAS_TREE_MAX_POINTS=CHRISTMAS_BUILDING_IDS.length*CHRISTMAS_BUILDING_MAX_LEVEL;
export const CHRISTMAS_TREE_MAX_UPGRADES=CHRISTMAS_TREE_MAX_POINTS-CHRISTMAS_TREE_BASE_POINTS;

export function christmasTreeBuildingPoints(source){
 const levels=source?.levels&&typeof source.levels==='object'?source.levels:source;
 return CHRISTMAS_BUILDING_IDS.reduce((sum,id)=>{
  const n=levels?.[id];
  return sum+(Number.isInteger(n)&&n>=1&&n<=CHRISTMAS_BUILDING_MAX_LEVEL?n:1);
 },0);
}
export function christmasTreeLevelFromLevels(levels){
 const points=christmasTreeBuildingPoints(levels);
 return CHRISTMAS_TREE_THRESHOLDS.filter(threshold=>points>=threshold).length;
}
export function christmasTreeRemainingUpgrades(levels){
 const points=christmasTreeBuildingPoints(levels);
 const tree=christmasTreeLevelFromLevels(levels);
 return tree>=10?0:Math.max(0,CHRISTMAS_TREE_THRESHOLDS[tree]-points);
}
