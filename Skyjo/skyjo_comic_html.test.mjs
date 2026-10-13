import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('.', import.meta.url);
const read = name => readFileSync(new URL(name, root), 'utf8');
const beta = read('skyjo_action_comic_beta.html');
const live = read('skyjo_comic_live_board.html');
const preview = read('skyjo_comic_preview.html');
const classic = read('skyjo_action.html');
let checks = 0;
function check(condition, label) { assert.ok(condition,label); checks++; }
check(beta.includes('window.Game={'), 'Beta includes original Game API');
check(beta.includes('skyjo-comic-snapshot'), 'Beta publishes live snapshots');
check(beta.includes('skyjo_comic_live_board.html'), 'Beta loads live board');
check(beta.includes('mountComicGame'), 'Beta connects mounted live view');
check(beta.includes('refreshComicPanels'), 'Beta refreshes live status panels');
check(beta.includes('Klassisches Brett'), 'Classic board fallback exists');
check(live.includes('id="enemies"') && live.includes('id="self"'), 'Live board has seat mounts');
check(live.includes('id="stage"') && live.includes('scale()'), 'Landscape stage scales');
check(!live.includes('exampleBoards') && !live.includes('demoAction('), 'No fake game state or demo actions');
check(!live.includes('DEMO – keine Verbindung'), 'No demo status on live board');
check(preview.includes('exampleBoards'), 'Design preview remains separate');
check(!classic.includes('skyjo_comic_live_board.html'), 'Classic engine remains separate from comic board');
console.log('PASS: '+checks+' SKYJO Comic HTML integration checks');
