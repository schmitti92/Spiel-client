import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('local layout runtime parses without syntax errors',()=>{const source=read('Skyjo/skyjo_local_layout_runtime.js');assert.doesNotThrow(()=>new Function(source));});
test('local entry loads layout runtime and local editor',()=>{const html=read('Skyjo/skyjo_action_local.html');assert.match(html,/skyjo_local_layout_runtime\.js\?v=3/);assert.match(html,/skyjo_layout_editor\.js/);});
test('online entry does not load local layout runtime',()=>{const html=read('Skyjo/skyjo_action.html');assert.doesNotMatch(html,/skyjo_local_layout_runtime\.js/);});

test('local HTML has no literal escaped newlines between scripts',()=>{const html=read('Skyjo/skyjo_action_local.html');assert.equal(html.includes('</script>'+String.fromCharCode(92)+'n<script'),false);assert.equal(html.includes('</script>'+String.fromCharCode(92)+'n</body>'),false);});
