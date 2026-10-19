#!/usr/bin/env python3
"""Real Chromium browser smoke test. Requires playwright + installed Chromium."""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright
import functools, json, sys
ROOT=Path(__file__).resolve().parent.parent
class Handler(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
result={'test':'V19 browser smoke','browser_launched':False,'navigation_success':False,'app_rendered':False,'page_errors':[],'console_errors':[],'note':'No real multiplayer or external services tested'}
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        result['browser_launched']=True
        page=browser.new_page(viewport={'width':1280,'height':800})
        page.on('pageerror',lambda e:result['page_errors'].append(str(e)))
        page.on('console',lambda m:result['console_errors'].append(m.text) if m.type=='error' else None)
        page.goto(f'http://127.0.0.1:{server.server_port}/Skyjo/skyjo_action.html',wait_until='load',timeout=20000)
        result['navigation_success']=True
        page.wait_for_timeout(5000)
        result['app_rendered']=bool(page.locator('#app').inner_text().strip()) and not page.get_by_text('SKYJO konnte nicht vollständig geladen werden').count()
        result['page_title']=page.title()
        result['app_excerpt']=page.locator('#app').inner_text()[:400]
        browser.close()
except Exception as e:result['error']=str(e)
finally:server.shutdown()
print(json.dumps(result,ensure_ascii=False,indent=2))
sys.exit(0 if result['navigation_success'] and result['app_rendered'] and not result['page_errors'] else 1)
