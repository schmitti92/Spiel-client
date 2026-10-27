/* Local-only entry guard. Keep synchronous execution in <head>. */
if(new URLSearchParams(location.search).get("mode")!=="local")location.replace("skyjo_action_local.html?mode=local");
