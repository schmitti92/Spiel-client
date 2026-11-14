/**
 * DOG collection extension point.
 *
 * When adding a future event, append plain metadata to DOG_EXTRA_ITEMS below;
 * add a new left-hand category through DOG_EXTRA_CATEGORIES if required.
 * The gallery, counts, filters and locked details are built automatically.
 *
 * Event rewards MUST remain 'planned' until a separate authenticated,
 * server-validated inventory grants ownership to the current account.
 * Never turn a paid/event reward into a client-side "available" item.
 *
 * Example, NOT active:
 * {category:'frames',id:'winter-2027-ice-frame',name:'Eisrahmen',
 *  icon:'❄️',image:'./assets/events/winter-2027/ice-frame.webp',
 *  description:'Winterevent 2027',artTone:'cyan',status:'planned'}
 */
export const DOG_EXTRA_CATEGORIES=Object.freeze([]);
export const DOG_EXTRA_ITEMS=Object.freeze([]);

const validId=id=>typeof id==='string'&&/^[a-z][a-z0-9_-]{1,79}$/.test(id);
const validArt=image=>image==null||(typeof image==='string'&&
 /^\.\/assets\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.(?:png|jpe?g|webp|svg)$/i.test(image));
const immutableItem=item=>Object.freeze({...item});

/** Pure builder, exported to test extension growth without modifying shipped items. */
export function buildDogCollection(base,extraCategories=DOG_EXTRA_CATEGORIES,extraItems=DOG_EXTRA_ITEMS){
 const categories=new Map();
 for(const category of base){
  if(!validId(category.id)||categories.has(category.id))throw Error('DOG_COLLECTION_DUPLICATE_CATEGORY');
  categories.set(category.id,{...category,items:[...category.items]});
 }
 for(const category of extraCategories){
  if(!validId(category.id)||categories.has(category.id)||typeof category.title!=='string'||!category.title.trim()){
   throw Error('DOG_COLLECTION_INVALID_CATEGORY');
  }
  categories.set(category.id,{...category,items:[]});
 }
 for(const item of extraItems){
  const category=categories.get(item.category);
  if(!category||!validId(item.id)||typeof item.name!=='string'||!item.name.trim()
    ||item.status!=='planned'||!validArt(item.image)||category.items.some(x=>x.id===item.id)){
    throw Error('DOG_COLLECTION_INVALID_EXTENSION_ITEM');
  }
  const {category:unused,...details}=item;
  category.items.push(immutableItem({...details,kind:'event',status:'planned'}));
 }
 return Object.freeze([...categories.values()].map(category=>Object.freeze({
  ...category,items:Object.freeze(category.items.map(immutableItem))
 })));
}
