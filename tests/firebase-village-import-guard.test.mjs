import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 VILLAGE_LEGACY_CHECK_REUSE_MS,
 villageLegacyImportMarkerKey,
 isRecentVillageLegacyCheck
} from '../DOG/christmas-village-import-guard.mjs';

const source=relative=>readFileSync(new URL('../'+relative,import.meta.url),'utf8');

test('Only a successful, recent legacy migration check may be reused per account and API',()=>{
 assert.equal(VILLAGE_LEGACY_CHECK_REUSE_MS,6*60*60*1000);
 const now=100000000;
 assert.equal(isRecentVillageLegacyCheck(now-1000,now),true);
 assert.equal(isRecentVillageLegacyCheck(now-VILLAGE_LEGACY_CHECK_REUSE_MS+1,now),true);
 assert.equal(isRecentVillageLegacyCheck(now-VILLAGE_LEGACY_CHECK_REUSE_MS,now),false);
 assert.equal(isRecentVillageLegacyCheck(now+5000,now),false);
 assert.equal(isRecentVillageLegacyCheck(null,now),false);
 assert.equal(isRecentVillageLegacyCheck('garbage',now),false);
 assert.equal(isRecentVillageLegacyCheck(0,now),false);
 const a=villageLegacyImportMarkerKey('https://server-a.example','alice');
 assert.notEqual(a,villageLegacyImportMarkerKey('https://server-a.example','bob'));
 assert.notEqual(a,villageLegacyImportMarkerKey('https://server-b.example','alice'));
});

test('DOG village migration guard skips only import probes, not live village GETs',()=>{
 const event=source('DOG/christmas-event.js');
 const guard=source('DOG/christmas-village-import-guard.mjs');
 assert.match(event,/villageLegacyImportMarkerKey\(villageApi,uid\)/);
 assert.match(event,/if\(isRecentVillageLegacyCheck\(/);
 assert.match(event,/villageRequest\('village\/import','POST',\{metadataOnly:true\}\)/);
 assert.match(event,/const work=villageRequest[\s\S]*?\.then\(\(\)=>\{/);
 assert.match(event,/checkedVillageImportAt\.set\(key,checkedAt\)/);
 assert.match(event,/localStorage\.setItem\(key,String\(checkedAt\)\)/);
 assert.match(event,/\.finally\(\(\)=>\{/);
 assert.match(event,/return villageRequest\('village'\)/);
 assert.match(event,/\$\('building-wallet-refresh'\)\.addEventListener\('click',\(\)=>void reloadVillage\(\)\)/);
 assert.match(event,/villageRequest\('village\/upgrade','POST'/);
 assert.match(guard,/VILLAGE_LEGACY_CHECK_REUSE_MS=6\*60\*60\*1000/);
});
