/* Route only explicitly local sessions to the dedicated offline entrypoint. */
(()=>{'use strict';
 const url=new URL(location.href);
 if(url.searchParams.get('mode')!=='local')return;
 const destination=new URL('skyjo_action_local.html',url);
 destination.search=url.search;
 destination.hash=url.hash;
 location.replace(destination.href);
})();
