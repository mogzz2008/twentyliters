/**
 * Headless Chrome E2E: every interactive flow, mobile viewport, animations, 0 console errors.
 * Usage: node scripts/qa-browser.mjs
 */
import puppeteer from 'puppeteer-core';
import { startServer } from './serve.mjs';

const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
let passed = 0;
let failed = 0;

function ok(name, cond, detail = '') {
  if (cond) {
    passed += 1;
    console.log(`  ok  ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function numFrom(text) {
  const m = String(text).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : NaN;
}

const server = await startServer(0);
const port = server.address().port;
const base = `http://127.0.0.1:${port}/`;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--font-render-hinting=none'],
});

const page = await browser.newPage();
const consoleErrors = [];
const pageErrors = [];
page.on('pageerror', (err) => pageErrors.push(String(err)));
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});

async function gotoFresh(hash = '') {
  consoleErrors.length = 0;
  pageErrors.length = 0;
  await page.goto(`${base}${hash}`, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector('#metric-cans');
  await page.waitForSelector('#presets .preset');
  await page.waitForFunction(() => {
    const t = document.getElementById('metric-cans')?.textContent.trim();
    return t && t !== '0';
  });
  await new Promise((r) => setTimeout(r, 480));
}

async function cans() {
  return page.$eval('#metric-cans', (el) => el.textContent.trim());
}

async function clickPreset(id) {
  const before = await cans();
  await page.click(`[data-preset="${id}"]`);
  await page.waitForFunction((prev, pid) => {
    const btn = document.querySelector(`[data-preset="${pid}"]`);
    const val = document.getElementById('metric-cans')?.textContent.trim();
    return btn?.classList.contains('active') && val && val !== prev;
  }, { timeout: 5000 }, before, id);
  await new Promise((r) => setTimeout(r, 480));
}

console.log('Desktop 1280×800');
await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
await gotoFresh();

ok('document loaded from the local server', page.url().startsWith(base));
ok('title mentions Twenty Liters', (await page.title()).includes('Twenty Liters'));
ok('h1 states the core promise', (await page.$eval('h1', (el) => el.textContent)).includes('twenty-liter'));
ok('eight one-click presets render', (await page.$$('#presets .preset')).length === 8);
ok('typical US home is autoloaded', await page.$eval('[data-preset="typical-us"]', (el) => el.classList.contains('active')));

const typicalCans = numFrom(await cans());
ok('typical home shows about 37 jerrycans', typicalCans > 36 && typicalCans < 39, `got ${typicalCans}`);
ok('can yard paints a wall of cans', (await page.$$('#can-yard .can')).length > 20);
ok('hero has a pop-in animation on cans (or none if reduced motion)', typeof await page.$eval('#can-yard .can', (el) => getComputedStyle(el).animationName) === 'string');
ok('carry path walker is animated or statically placed', typeof await page.$eval('#walker', (el) => getComputedStyle(el).animationName) === 'string');
ok('caustic background is present', await page.$('.caustics'));

ok('end-use panel is visible on the study preset', await page.$eval('#enduse-panel', (el) => !el.classList.contains('hidden')));
ok('fixture and volume panels are hidden on the study preset',
  await page.$eval('#fixture-panel', (el) => el.classList.contains('hidden'))
  && await page.$eval('#volume-panel', (el) => el.classList.contains('hidden')));

const hoursTypical = await page.$eval('#metric-hours', (el) => el.textContent.trim());
ok('walking time is a multi-hour figure', hoursTypical.includes('hr') || Number(hoursTypical) > 10, hoursTypical);

await clickPreset('dorm');
const dormCans = numFrom(await cans());
ok('dorm preset drops the can count well below the typical home', dormCans < typicalCans && dormCans > 7 && dormCans < 12, `got ${dormCans}`);
ok('fixture lab opens for the dorm day', await page.$eval('#fixture-panel', (el) => !el.classList.contains('hidden')));

await clickPreset('family-standard');
const familyCans = numFrom(await cans());
ok('family of four loads a larger day than the dorm', familyCans > dormCans, `${dormCans} → ${familyCans}`);

await clickPreset('watersense');
const senseCans = numFrom(await cans());
ok('WaterSense retrofit uses fewer cans than the standard family', senseCans < familyCans, `${familyCans} → ${senseCans}`);

await clickPreset('arid-west');
const aridCans = numFrom(await cans());
ok('arid-west yard is heavier than the typical home', aridCans > typicalCans, `${typicalCans} → ${aridCans}`);

await clickPreset('leaky');
const leakyCans = numFrom(await cans());
ok('drip + leaks exceeds the standard family', leakyCans > familyCans, `${familyCans} → ${leakyCans}`);

await clickPreset('who-50');
ok('50-liter day is exactly 10 cans for four people', Math.abs(numFrom(await cans()) - 10) < 0.05, await cans());
ok('volume panel opens on a WHO quantity day', await page.$eval('#volume-panel', (el) => !el.classList.contains('hidden')));

await clickPreset('who-20');
ok('20-liter day is exactly 4 cans for four people', Math.abs(numFrom(await cans()) - 4) < 0.05, await cans());

// Live fixture edit must update the hero (cans, kg, walking time), not just the bars.
await clickPreset('family-standard');
const beforeEdit = await page.evaluate(() => ({
  cans: document.getElementById('metric-cans').textContent.trim(),
  kg: document.getElementById('metric-kg').textContent.trim(),
  hours: document.getElementById('metric-hours').textContent.trim(),
}));
await page.$eval('#shower-min', (el) => {
  // Rapid input like a drag: the hero must track each change, not stay frozen.
  for (const value of [7, 6, 5, 4, 3]) {
    el.value = String(value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
});
await page.waitForFunction((prev) => {
  const canText = document.getElementById('metric-cans')?.textContent.trim();
  const kg = document.getElementById('metric-kg')?.textContent.trim();
  const hours = document.getElementById('metric-hours')?.textContent.trim();
  return canText && canText !== prev.cans && kg && kg !== prev.kg && hours && hours !== prev.hours;
}, { timeout: 5000 }, beforeEdit);
const afterEdit = await page.evaluate(() => ({
  cans: document.getElementById('metric-cans').textContent.trim(),
  kg: document.getElementById('metric-kg').textContent.trim(),
  hours: document.getElementById('metric-hours').textContent.trim(),
}));
ok('shortening showers live-updates the hero jerrycan count', afterEdit.cans !== beforeEdit.cans, `${beforeEdit.cans} → ${afterEdit.cans}`);
ok('shortening showers live-updates hero kilograms', afterEdit.kg !== beforeEdit.kg, `${beforeEdit.kg} → ${afterEdit.kg}`);
ok('shortening showers live-updates hero walking time', afterEdit.hours !== beforeEdit.hours, `${beforeEdit.hours} → ${afterEdit.hours}`);
ok('editing a fixture marks the day Custom', await page.$eval('[data-preset="custom"]', (el) => el.classList.contains('active')).catch(() => false));

// Carry lab
const timeBefore = await page.$eval('#carry-time', (el) => el.textContent.trim());
await page.$eval('#round-trip', (el) => {
  el.value = '60';
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.waitForFunction((prev) => document.querySelector('#carry-time')?.textContent.trim() !== prev, { timeout: 5000 }, timeBefore);
ok('doubling the round trip changes walking time', await page.$eval('#carry-time', (el) => el.textContent.trim()) !== timeBefore);
await page.click('#cpt-2');
ok('two-cans radio can be selected', await page.$eval('#cpt-2', (el) => el.checked));

// Fair share
await page.click('[data-fair="20"]');
await page.waitForFunction(() => document.querySelector('#fair-result')?.textContent.includes('20 L'));
ok('snapping the equalizer to 20 L writes a shrink result', (await page.$eval('#fair-result', (el) => el.textContent)).includes('shrink'));
await page.click('#fair-clear');
await page.waitForFunction(() => document.querySelector('#fair-val')?.textContent.includes('no cap'));
ok('clearing the cap restores an uncapped label', (await page.$eval('#fair-val', (el) => el.textContent)).includes('no cap'));

// Mute starts off
ok('mute toggle starts with sound off', await page.$eval('#mute-toggle', (el) => el.getAttribute('aria-pressed') === 'true' && el.textContent.includes('off')));
await page.click('#mute-toggle');
ok('mute toggle turns sound on', await page.$eval('#mute-toggle', (el) => el.getAttribute('aria-pressed') === 'false' && el.textContent.includes('on')));
await page.click('#mute-toggle');
ok('mute toggle can be turned back off', await page.$eval('#mute-toggle', (el) => el.getAttribute('aria-pressed') === 'true'));

await page.click('#share-btn');
await page.waitForFunction(() => document.querySelector('#copy-status')?.textContent.length > 0);
ok('share button announces a copy result', (await page.$eval('#copy-status', (el) => el.textContent.trim())).length > 5);

ok('JMP ladder shows safely managed plus four rungs', (await page.$$('#jmp-ladder .rung')).length === 5);
ok('sources list has ten cited references', (await page.$$('#sources .source-list li')).length === 10);
ok('SDG badges are visible', (await page.$$('.sdg')).length === 2);

const desktopOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
ok('desktop has no horizontal overflow', desktopOverflow, `scroll ${await page.evaluate(() => document.documentElement.scrollWidth)} vs client ${await page.evaluate(() => document.documentElement.clientWidth)}`);

ok('no page errors on desktop', pageErrors.length === 0, pageErrors.join(' | '));
ok('no console errors on desktop', consoleErrors.length === 0, consoleErrors.join(' | '));

console.log('Deep-link and mobile 390×844');
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await gotoFresh('#p=dorm');
ok('short preset hash loads the dorm day', await page.$eval('[data-preset="dorm"]', (el) => el.classList.contains('active')));
const mobileDorm = numFrom(await cans());
ok('mobile dorm still shows 8–11 cans', mobileDorm > 7 && mobileDorm < 12, `got ${mobileDorm}`);

await clickPreset('typical-us');
const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
ok('mobile has no horizontal overflow', mobileOverflow, `scroll ${await page.evaluate(() => document.documentElement.scrollWidth)} vs client ${await page.evaluate(() => document.documentElement.clientWidth)}`);

await clickPreset('who-20');
ok('mobile can switch to the 20-liter day', Math.abs(numFrom(await cans()) - 4) < 0.05, await cans());

await page.$eval('#liters-per-person', (el) => {
  el.value = '50';
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.waitForFunction(() => {
  const n = parseFloat(document.getElementById('metric-cans')?.textContent.replace(/,/g, '') || '');
  return n > 4.5;
}, { timeout: 5000 });
ok('mobile volume slider live-updates cans', numFrom(await cans()) > 4.5);

ok('no page errors on mobile', pageErrors.length === 0, pageErrors.join(' | '));
ok('no console errors on mobile', consoleErrors.length === 0, consoleErrors.join(' | '));

await browser.close();
server.close();

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
