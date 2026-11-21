/**
 * A successful Render legacy-village check is an idempotent migration probe.
 * Reuse a recent, confirmed result per UID and API origin, never village
 * balances, levels or entitlement data. Failed checks are never cached.
 */
export const VILLAGE_LEGACY_CHECK_REUSE_MS=6*60*60*1000;
export const villageLegacyImportMarkerKey=(api,uid)=>
 'dog-village-legacy-checked-v1:'+encodeURIComponent(String(api))+':'+encodeURIComponent(String(uid));
export function isRecentVillageLegacyCheck(checkedAt,now=Date.now()){
 const stamp=Number(checkedAt),age=now-stamp;
 return Number.isSafeInteger(stamp)&&stamp>0&&Number.isFinite(age)&&
  age>=0&&age<VILLAGE_LEGACY_CHECK_REUSE_MS;
}
