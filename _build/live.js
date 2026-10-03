/* ============================================================================
   live.js — does the deployed game actually run?

   _build/play.js plays a full game from disk, which is the strongest check of
   the game logic but says nothing about the deployment: it runs from file://,
   where there is no server, no service worker, and no TLS.

   Those are exactly the things that break in ways a 200 does not catch. A page
   can return 200 with the right byte count and still be broken over HTTPS —
   mixed content, a service worker that fails to register, a manifest that will
   not parse. This loads the real URL and checks the game boots.

     1. the page loads with no console errors and no failed requests
     2. the canvas is there and has been sized by the script
     3. the service worker registers  (https only — impossible from file://)
     4. the manifest parses and its icons resolve
     5. the first act is on screen, so the player can actually start

   Usage:  node _build/live.js [url]
   ========================================================================== */
'use strict';

const { chromium } = require('playwright-core');

const URL = process.argv[2] || 'https://createworld.trilumi.xyz/';

const CHROME =
  'C:/Users/oscar/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';

let fails = 0;
function ok(label, detail) {
  console.log(`  ok    ${label}${detail ? '   ' + detail : ''}`);
}
function bad(label, detail) {
  console.log(`  FAIL  ${label}${detail ? '   ' + detail : ''}`);
  fails++;
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME });
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await ctx.newPage();

  const errors = [];
  const failedRequests = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) =>
    failedRequests.push(`${r.url()} ${r.failure()?.errorText || ''}`));

  console.log(`\nlive check  ${URL}`);
  console.log('='.repeat(74));

  const resp = await page.goto(URL, { waitUntil: 'load', timeout: 60000 });

  if (resp && resp.status() === 200) ok('page loads', `200  ${URL}`);
  else bad('page loads', `status ${resp && resp.status()}`);

  // ---- 2 · the canvas exists and the script sized it
  const cv = await page.evaluate(() => {
    const c = document.getElementById('cv');
    return c ? { w: c.width, h: c.height } : null;
  });
  if (cv && cv.w > 0 && cv.h > 0) ok('canvas is sized by the script', `${cv.w}x${cv.h}`);
  else bad('canvas is sized by the script', JSON.stringify(cv));

  // ---- 3 · service worker registers. This is the check file:// cannot make.
  const sw = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return { supported: false };
    try {
      const reg = await navigator.serviceWorker.ready;
      return { supported: true, scope: reg.scope, active: !!reg.active };
    } catch (e) {
      return { supported: true, error: String(e) };
    }
  });
  if (sw.active) ok('service worker registers', sw.scope);
  else bad('service worker registers', JSON.stringify(sw));

  // ---- 4 · the manifest parses and its icons resolve
  const man = await page.evaluate(async () => {
    const link = document.querySelector('link[rel="manifest"]');
    if (!link) return { found: false };
    try {
      const r = await fetch(link.href);
      const j = await r.json();
      return { found: true, status: r.status, name: j.name, icons: (j.icons || []).length };
    } catch (e) {
      return { found: true, error: String(e) };
    }
  });
  if (man.status === 200 && man.icons > 0) ok('manifest parses', `${man.icons} icon(s)  ${man.name}`);
  else bad('manifest parses', JSON.stringify(man));

  // ---- 5 · the player can actually start.
  // The first screen is the intro overlay plus the act button, NOT the panel —
  // #panelbox stays empty until the naming stage, and #panel is present from
  // boot with opacity:0 / pointer-events:none. Asserting on panel text here
  // reported a failure on a page that was working perfectly. So: check the
  // intro is rendered, then press the button and require the game to move.
  const boot = await page.evaluate(() => {
    const ov = document.getElementById('overlay');
    const act = document.getElementById('actrow');
    return {
      stage: typeof G !== 'undefined' ? G.stage : null,
      intro: ov ? ov.innerText.replace(/\s+/g, ' ').trim() : '',
      buttons: act ? act.querySelectorAll('button').length : 0,
    };
  });
  if (boot.intro.length > 20 && boot.buttons > 0) {
    ok('intro screen renders', `${boot.buttons} act button(s)  "${boot.intro.slice(0, 46)}…"`);
  } else {
    bad('intro screen renders', JSON.stringify(boot).slice(0, 120));
  }

  // Press it and require the game to advance. This is the check that proves the
  // deployed file is a working game and not just a page that returns 200.
  await page.locator('#actrow button').first().click();
  await page.waitForTimeout(900);
  const started = await page.evaluate(() => ({
    stage: G.stage,
    palette: document.getElementById('palette').children.length,
    say: document.getElementById('say').innerText.trim(),
  }));
  if (started.stage > 0 && started.palette > 0) {
    ok('game starts on click', `stage ${started.stage}, ${started.palette} brushes, say="${started.say.slice(0, 40)}"`);
  } else {
    bad('game starts on click', JSON.stringify(started));
  }

  // ---- 1 · console and network
  if (errors.length === 0) ok('no console errors');
  else bad('no console errors', errors.slice(0, 3).join(' | '));

  if (failedRequests.length === 0) ok('no failed requests');
  else bad('no failed requests', failedRequests.slice(0, 3).join(' | '));

  await browser.close();

  console.log('='.repeat(74));
  console.log(fails === 0 ? 'live check passed\n' : `${fails} check(s) failed\n`);
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => { console.error('harness error:', e); process.exit(1); });
