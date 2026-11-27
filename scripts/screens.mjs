/**
 * Capture desktop + mobile screenshots into docs/screenshots/.
 * Usage: node scripts/screens.mjs [baseUrl]
 */
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { startServer } from './serve.mjs';

const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const outDir = join(dirname(fileURLToPath(import.meta.url)), '../docs/screenshots');
await mkdir(outDir, { recursive: true });

const given = process.argv[2];
let server;
const base = given || await (async () => {
  server = await startServer(0);
  return `http://127.0.0.1:${server.address().port}/`;
})();

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--font-render-hinting=none'],
});
const page = await browser.newPage();

async function shot(name, { width, height, dpr = 1, hash = '', wait = 600, click = null, scroll = null }) {
  await page.setViewport({ width, height, deviceScaleFactor: dpr });
  await page.goto(`${base}${hash}`, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector('#metric-cans');
  await page.evaluate(() => window.scrollTo(0, 0));
  if (click) {
    await page.click(click);
    await new Promise((r) => setTimeout(r, 500));
  }
  if (scroll) {
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) el.scrollIntoView({ block: 'start' });
    }, scroll);
  } else {
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  await new Promise((r) => setTimeout(r, wait));
  const file = join(outDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log('wrote', file);
}

await shot('01-desktop-typical', { width: 1280, height: 1000, dpr: 1, hash: '#p=typical-us', wait: 900 });
await shot('02-desktop-family-lab', { width: 1280, height: 1020, dpr: 1, hash: '#p=family-standard', scroll: '#lab', wait: 700 });
await shot('03-desktop-carry-fair', { width: 1280, height: 900, dpr: 1, hash: '#p=arid-west', click: '[data-fair="50"]', scroll: '#fair', wait: 800 });
await shot('04-desktop-world', { width: 1280, height: 1100, dpr: 1, hash: '#p=typical-us', scroll: '#world', wait: 700 });
await shot('05-mobile-dorm', { width: 390, height: 844, dpr: 2, hash: '#p=dorm', wait: 800 });
await shot('06-mobile-twenty', { width: 390, height: 844, dpr: 2, hash: '#p=who-20', wait: 800 });

await browser.close();
if (server) server.close();
