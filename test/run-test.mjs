// End-to-end test: loads the extension in headless Chromium and checks the
// filter, the popup, the keyboard shortcut handler, re-injection and the Dutch
// translation. Screenshots go to test/output/.
// Usage: npm test            (local test page only)
//        npm run test:youtube (also a real, dark YouTube gaming video)
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ext = path.resolve(here, '../extension');
const out = path.join(here, 'output');
const withYoutube = process.argv.includes('--youtube');
mkdirSync(out, { recursive: true });

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` (${detail})` : ''}`);
}

async function launch(lang) {
  const ctx = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless: true,
    viewport: { width: 1280, height: 800 },
    locale: lang,
    args: [
      `--disable-extensions-except=${ext}`,
      `--load-extension=${ext}`,
      `--lang=${lang}`,
      '--autoplay-policy=no-user-gesture-required',
    ],
  });
  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent('serviceworker');
  // Local test page, served as if it lives on youtube.com.
  const video = readFileSync(path.join(here, 'testvideo.webm'));
  await ctx.route('https://www.youtube.com/lumalift-test**', (route) => {
    if (route.request().url().endsWith('.webm')) {
      return route.fulfill({ status: 200, contentType: 'video/webm', body: video });
    }
    return route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: `<!doctype html><body style="margin:0;background:#000">
        <video id="v" src="/lumalift-test/video.webm" muted autoplay loop width="640" height="360"></video></body>`,
    });
  });
  const page = await ctx.newPage();
  await page.goto('https://www.youtube.com/lumalift-test');
  await page.waitForFunction(() => document.getElementById('v').readyState >= 2);
  const popup = await ctx.newPage();
  await popup.setViewportSize({ width: 320, height: 520 });
  await popup.goto(`chrome-extension://${new URL(sw.url()).host}/popup.html`);
  const tabId = await sw.evaluate(() => chrome.tabs.query({ url: '*://*.youtube.com/*' }).then((t) => t[0].id));
  return { ctx, sw, page, popup, tabId };
}

// Both translations must define the same messages.
const messages = (lang) => JSON.parse(readFileSync(path.join(ext, '_locales', lang, 'messages.json'), 'utf8'));
const enKeys = Object.keys(messages('en')).sort().join();
check('en and nl translations have the same keys', enKeys === Object.keys(messages('nl')).sort().join());

const { ctx, sw, page, popup, tabId } = await launch('en-US');
const filterOf = () => page.evaluate(() => getComputedStyle(document.getElementById('v')).filter);
const videoShot = (name) => page.locator('#v').screenshot({ path: path.join(out, name) });

check('no filter by default', (await filterOf()) === 'none', await filterOf());
await videoShot('local-before.png');

// Choosing the "Dark game" preset in the popup updates the YouTube tab live.
await popup.getByRole('button', { name: 'Dark game' }).click();
await page.waitForTimeout(300);
const darkFilter = await filterOf();
check(
  'Dark game preset applied',
  darkFilter.includes('url(') && darkFilter.includes('brightness(1.1)') && darkFilter.includes('saturate(1.15)'),
  darkFilter,
);
check('preset button active', await popup.getByRole('button', { name: 'Dark game' }).evaluate((b) => b.classList.contains('active')));
const exponent = await page.evaluate(() =>
  document.getElementById('lumalift-svg').getElementsByTagNameNS('http://www.w3.org/2000/svg', 'feFuncR')[0].getAttribute('exponent'),
);
check('gamma exponent for shadows 50', exponent === '0.571', exponent);
await videoShot('local-after.png');
await popup.setViewportSize({ width: 320, height: await popup.evaluate(() => document.body.offsetHeight) });
await popup.screenshot({ path: path.join(out, 'popup.png') });

// Brightness slider.
await popup.locator('.slider').first().locator('input').fill('150');
await page.waitForTimeout(200);
check('brightness slider 150%', (await filterOf()).includes('brightness(1.5)'), await filterOf());

// Keyboard shortcut handler (brighter) with an on-screen message.
await sw.evaluate((id) => handleCommand('brighter', { id }), tabId);
await page.waitForTimeout(300);
check('shortcut brighter → 160%', (await filterOf()).includes('brightness(1.6)'), await filterOf());
const toast = await page.locator('#lumalift-toast').textContent();
check('on-screen message', toast === 'Brightness 160%', toast);

// On/off shortcut.
await sw.evaluate((id) => handleCommand('toggle', { id }), tabId);
await page.waitForTimeout(200);
check('shortcut toggle → off', (await filterOf()) === 'none', await filterOf());
await sw.evaluate((id) => handleCommand('toggle', { id }), tabId);
await page.waitForTimeout(200);
check('shortcut toggle → on again', (await filterOf()) !== 'none', await filterOf());

// Re-injection (as on install with open tabs) does not duplicate elements.
await sw.evaluate((id) => chrome.scripting.executeScript({ target: { tabId: id }, files: ['common.js', 'content.js'] }), tabId);
await page.waitForTimeout(300);
const counts = await page.evaluate(() => [
  document.querySelectorAll('#lumalift-style').length,
  document.querySelectorAll('#lumalift-svg').length,
]);
check('re-injection without duplicates', counts[0] === 1 && counts[1] === 1, counts.join(','));

// Reset.
await popup.getByRole('button', { name: 'Back to normal' }).click();
await page.waitForTimeout(200);
check('back to normal', (await filterOf()) === 'none', await filterOf());

// Optional: a real, dark gaming video on YouTube (Resident Evil Village, 18:20).
if (withYoutube) {
  await ctx.addCookies([{ name: 'SOCS', value: 'CAI', domain: '.youtube.com', path: '/' }]);
  const yt = await ctx.newPage();
  const time = Number(process.env.YT_TIME || 1100);
  await yt.goto(`${process.env.YT_URL || 'https://www.youtube.com/watch?v=460OnpsVuKI'}&t=${time}s`);
  await yt.waitForFunction(
    (t) => {
      const v = document.querySelector('video.html5-main-video');
      return v && v.readyState >= 3 && v.currentTime > t + 1 && !document.querySelector('.ad-showing');
    },
    time,
    { timeout: 30000 },
  );
  await yt.evaluate(() => document.querySelector('video.html5-main-video').pause());
  // Screenshot only: hide the player controls.
  await yt.addStyleTag({
    content: '.ytp-chrome-bottom,.ytp-gradient-bottom,.ytp-chrome-top,.ytp-gradient-top,.ytp-ce-element{display:none!important}',
  });
  await yt.waitForTimeout(800);
  const player = yt.locator('video.html5-main-video');
  console.log('youtube', yt.url(), await yt.title());
  await player.screenshot({ path: path.join(out, 'youtube-before.png') });
  await popup.getByRole('button', { name: 'Dark game' }).click();
  await yt.waitForTimeout(500);
  const ytFilter = await player.evaluate((v) => getComputedStyle(v).filter);
  check('YouTube: filter on a real video', ytFilter.includes('url(') && ytFilter.includes('brightness(1.1)'), ytFilter);
  await player.screenshot({ path: path.join(out, 'youtube-after.png') });
  const ytTab = await sw.evaluate(() => chrome.tabs.query({ url: '*://*.youtube.com/watch*' }).then((t) => t[0].id));
  await sw.evaluate((id) => handleCommand('brighter', { id }), ytTab);
  await yt.waitForTimeout(300);
  check('YouTube: on-screen message', (await yt.locator('#lumalift-toast').textContent()) === 'Brightness 120%');
  await yt.screenshot({ path: path.join(out, 'youtube-message.png') });
  await popup.getByRole('button', { name: 'Back to normal' }).click();
}
await ctx.close();

// Dutch browser: popup and on-screen message are in Dutch.
const nl = await launch('nl');
await nl.popup.getByRole('button', { name: 'Donkere game' }).click();
await nl.page.waitForTimeout(300);
check('nl: popup in Dutch', (await nl.page.evaluate(() => getComputedStyle(document.getElementById('v')).filter)).includes('url('));
await nl.sw.evaluate((id) => handleCommand('brighter', { id }), nl.tabId);
await nl.page.waitForTimeout(300);
const nlToast = await nl.page.locator('#lumalift-toast').textContent();
check('nl: on-screen message in Dutch', nlToast === 'Helderheid 120%', nlToast);
await nl.popup.setViewportSize({ width: 320, height: await nl.popup.evaluate(() => document.body.offsetHeight) });
await nl.popup.screenshot({ path: path.join(out, 'popup-nl.png') });
await nl.ctx.close();

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
