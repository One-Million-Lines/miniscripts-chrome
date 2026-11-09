import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'node:http';

const csp = "default-src 'none'; script-src 'none'; style-src 'none'; require-trusted-types-for 'script'; trusted-types 'none'";
const html = '<!doctype html><html><head><title>MiniScripts CSP test</title></head><body><h1>Test page</h1><a href="https://example.com/a">A</a><a href="https://example.com/a">Duplicate</a><a href="/relative">Relative</a><a href="mailto:test@example.com">Email</a><div role="dialog"><div contenteditable="true" aria-label="Post text"></div><button type="button" aria-label="Add a photo">Photo</button><input type="file" accept="image/*"></div></body></html>';
const server = createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Security-Policy': csp, 'Permissions-Policy': 'clipboard-write=()' });
  res.end(html);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const address = `http://127.0.0.1:${server.address().port}`;
const profile = await mkdtemp(join(tmpdir(), 'miniscripts-test-'));
let context;
let checks = 0;
function pass(name) { checks++; console.log(`PASS ${name}`); }
async function poll(check, description) {
  const deadline = Date.now() + 15000;
  while (!await check()) {
    if (Date.now() > deadline) throw new Error(`Timed out: ${description}`);
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}
try {
  context = await chromium.launchPersistentContext(profile, {
    ...(process.env.MINISCRIPTS_CHROME ? { executablePath: process.env.MINISCRIPTS_CHROME } : process.platform === 'darwin' ? { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } : {}),
    headless: true, args: ['--enable-unsafe-extension-debugging'], ignoreDefaultArgs: ['--disable-extensions'],
  });
  const browserCDP = await context.browser().newBrowserCDPSession();
  const { id } = await browserCDP.send('Extensions.loadUnpacked', { path: resolve('dist') });
  let extension = await context.newPage();
  await extension.goto(`chrome-extension://${id}/options.html`);
  const send = message => extension.evaluate(message => chrome.runtime.sendMessage(message), message);
  const page = await context.newPage();
  await page.goto(address);
  const tabId = await extension.evaluate(async address => (await chrome.tabs.query({})).find(tab => tab.url === address + '/').id, address);
  let apps = (await send({ type: 'GET_APPS' })).payload;
  assert.equal(apps.length, 4);
  let response = await send({ type: 'RUN_APP', payload: { appId: apps[0].id, tabId } });
  assert.equal(response.payload.success, false);
  assert.match(response.payload.error, /Allow User Scripts/);
  pass('clear setup error when user scripts are disabled');
  const details = await context.newPage();
  await details.goto(`chrome://extensions/?id=${id}`);
  await details.locator('#devMode').click();
  await details.locator('#allow-user-scripts').locator('cr-toggle').click();
  const reloaded = context.waitForEvent('serviceworker', worker => worker.url().startsWith(`chrome-extension://${id}/`));
  await details.getByRole('button', { name: 'Reload', exact: true }).click();
  await reloaded;
  extension = await context.newPage();
  await extension.goto(`chrome-extension://${id}/options.html`);
  await extension.waitForFunction(() => !!chrome.runtime?.id);
  await details.close();
  const run = async app => {
    assert.equal((await send({ type: 'SAVE_APP', payload: app })).success, true);
    return (await send({ type: 'RUN_APP', payload: { appId: app.id, tabId } })).payload;
  };
  const base = { id: 'regression', name: 'Regression', enabled: true, autoRun: false, matchPatterns: ['<all_urls>'], createdAt: 0, updatedAt: Date.now() };
  let result = await run({ ...base, code: `await ctx.storage.set('value', {answer: 42}); console.log('value', 2n); document.body.dataset.executed = 'yes'; return {stored: await ctx.storage.get('value'), value: eval('20 + 22'), tabId: ctx.tabId};` });
  assert.equal(result.success, true, JSON.stringify(result));
  assert.deepEqual(result.returnValue, { stored: { answer: 42 }, value: 42, tabId });
  assert.equal(await page.locator('body').getAttribute('data-executed'), 'yes');
  pass('isolated execution and extension storage under strict CSP and Trusted Types');
  await page.evaluate(() => { window.pageValue = 123; window.originalConsoleLog = console.log; });
  result = await run({ ...base, world: 'MAIN', code: `console.log({key: 'value'}); await ctx.storage.set('page', 7); return {page: window.pageValue, stored: await ctx.storage.get('value'), own: await ctx.storage.get('page')};` });
  assert.equal(result.success, true, JSON.stringify(result));
  assert.deepEqual(result.returnValue, { page: 123, stored: { answer: 42 }, own: 7 });
  assert.equal(await page.evaluate(() => window.originalConsoleLog === console.log), true);
  pass('page-world globals, storage bridge, and console capture under strict CSP');
  result = await run({ ...base, code: 'export default function() { throw new Error("expected runtime error"); }' });
  assert.equal(result.success, false); assert.match(result.error, /expected runtime error/);
  result = await run({ ...base, code: 'export default function( {' });
  assert.equal(result.success, false); assert.match(result.error, /SyntaxError/);
  const logs = (await send({ type: 'GET_EXECUTION_LOGS' })).payload;
  assert.ok(logs.some(log => log.error?.includes('expected runtime error')));
  assert.ok(logs.some(log => log.error?.includes('SyntaxError')));
  pass('runtime and syntax failures are returned and logged');
  const sample = name => apps.find(app => app.name === name);
  const runSample = app => send({ type: 'RUN_APP', payload: { appId: app.id, tabId } }).then(response => response.payload);
  result = await runSample(sample('Reader Margins'));
  assert.equal(result.success, true, JSON.stringify(result));
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).maxWidth), '720px');
  await runSample(sample('Reader Margins'));
  assert.equal(await page.locator('#miniapp-reader-margins').count(), 0);
  assert.notEqual(await page.evaluate(() => getComputedStyle(document.body).maxWidth), '720px');
  pass('Reader Margins toggles styles despite style-src none');
  result = await runSample(sample('Blur Overlay'));
  assert.equal(result.success, true, JSON.stringify(result));
  await runSample(sample('Blur Overlay'));
  assert.equal(await page.locator('#miniapp-blur-overlay').count(), 1);
  const rect = await page.locator('#miniapp-blur-overlay').boundingBox();
  await page.mouse.move(rect.x + 40, rect.y + 40); await page.mouse.down();
  await page.mouse.move(rect.x + 100, rect.y + 80); await page.mouse.up();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#miniapp-blur-overlay').count(), 0);
  await runSample(sample('Blur Overlay'));
  const newRect = await page.locator('#miniapp-blur-overlay').boundingBox();
  assert.equal(newRect.x, rect.x + 60);
  await page.getByRole('button', { name: 'Remove blur overlay' }).click();
  pass('Blur Overlay reruns, drags, saves position, and closes');
  result = await runSample(sample('Copy All Links'));
  assert.equal(result.success, true, JSON.stringify(result));
  assert.equal(result.returnValue.length, 2);
  await page.locator('#miniapp-copy-links').waitFor();
  assert.match(await page.locator('#miniscripts-toast').innerText(), /ready/);
  pass('Copy All Links deduplicates and offers selectable links when clipboard is blocked');
  // Fake LinkedIn DOM at the correct origin. No live LinkedIn requests or uploads.
  await page.route('https://www.linkedin.com/miniscripts-test', route => route.fulfill({ contentType: 'text/html', headers: { 'Content-Security-Policy': csp }, body: html }));
  await page.goto('https://www.linkedin.com/miniscripts-test');
  await page.evaluate(() => {
    window.originalClick = HTMLElement.prototype.click;
    document.querySelector('button').addEventListener('click', () => document.querySelector('input').click());
  });
  result = await runSample(sample('LinkedIn Image Paste'));
  assert.equal(result.success, true, JSON.stringify(result));
  assert.equal(await page.evaluate(() => typeof window.LinkedInImagePaste?.disable), 'function');
  await page.evaluate(() => {
    const editor = document.querySelector('[contenteditable]');
    const transfer = new DataTransfer();
    transfer.items.add(new File(['test image'], 'test.png', { type: 'image/png' }));
    editor.dispatchEvent(new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true, cancelable: true }));
  });
  assert.equal(await page.locator('input').evaluate(input => input.files[0]?.name), 'test.png');
  await runSample(sample('LinkedIn Image Paste'));
  await page.evaluate(() => window.LinkedInImagePaste.disable());
  assert.equal(await page.evaluate(() => HTMLElement.prototype.click === window.originalClick), true);
  pass('LinkedIn sample hands image to scoped uploader and restores patched APIs');
  const custom = { ...base, id: 'keep-me', code: 'return 1;' };
  await send({ type: 'SAVE_APP', payload: custom });
  await send({ type: 'LOAD_SAMPLES' });
  assert.ok((await send({ type: 'GET_APPS' })).payload.some(app => app.id === 'keep-me'));
  pass('refreshing samples preserves custom scripts');
  const autoApps = [];
  for (const world of ['USER_SCRIPT', 'MAIN']) {
    for (const runAt of ['document_start', 'document_end', 'document_idle']) {
      const id = `auto-${world}-${runAt}`;
      const auto = { ...base, id, name: id, world, autoRun: true, runAt, matchPatterns: [address + '/*'], code: `
        const readyState = document.readyState;
        document.documentElement.setAttribute('data-${id.toLowerCase().replaceAll('_', '-')}', readyState);
        await ctx.storage.set('ready', readyState);
        return {readyState, tabId: await ctx.helpers.getTabId()};` };
      autoApps.push(auto);
      await send({ type: 'SAVE_APP', payload: auto });
    }
  }
  // A bad registration should not prevent the six valid scripts from running.
  await send({ type: 'SAVE_APP', payload: { ...base, id: 'bad-pattern', autoRun: true, matchPatterns: ['not-a-match-pattern'], code: 'return true;' } });
  await send({ type: 'SAVE_APP', payload: { ...base, id: 'manual-only', autoRun: true, runAt: 'click', code: 'document.body.dataset.shouldNotRun = "true";' } });
  await poll(() => extension.evaluate(async () => (await chrome.userScripts.getScripts()).filter(script => script.id.startsWith('miniscripts-auto-')).length === 6), 'auto-run registrations');
  await page.goto(address);
  await poll(() => extension.evaluate(async () => {
    const data = await chrome.storage.local.get('miniscripts_execution_logs');
    return data.miniscripts_execution_logs.filter(log => log.appId.startsWith('auto-')).length >= 6;
  }), 'six auto-run logs');
  const autoLogs = (await send({ type: 'GET_EXECUTION_LOGS' })).payload.filter(log => log.appId.startsWith('auto-'));
  assert.equal(autoLogs.length, 6);
  assert.ok(autoLogs.every(log => log.success && log.returnValue.tabId === tabId), JSON.stringify(autoLogs));
  for (const log of autoLogs.filter(log => log.appId.endsWith('document_start'))) assert.equal(log.returnValue.readyState, 'loading');
  for (const log of autoLogs.filter(log => log.appId.endsWith('document_end'))) assert.equal(log.returnValue.readyState, 'interactive');
  assert.equal(await page.locator('body').getAttribute('data-should-not-run'), null);
  pass('native auto-run timing in both worlds, six concurrent logs, and manual-only rules');
  const cdp = await context.newCDPSession(page);
  await cdp.send('ServiceWorker.enable');
  await cdp.send('ServiceWorker.stopAllWorkers');
  await page.reload();
  await poll(() => extension.evaluate(async () => {
    const data = await chrome.storage.local.get('miniscripts_execution_logs');
    return data.miniscripts_execution_logs.filter(log => log.appId.startsWith('auto-')).length >= 12;
  }), 'auto-run after suspension');
  pass('auto-run and storage survive service-worker suspension');
  for (const auto of autoApps) await send({ type: 'TOGGLE_APP', payload: { appId: auto.id, enabled: false } });
  await poll(() => extension.evaluate(async () => !(await chrome.userScripts.getScripts()).some(script => script.id.startsWith('miniscripts-auto-'))), 'disabled registrations removed');
  pass('disabling scripts removes native auto-run registrations');
  console.log(`${checks} browser checks passed`);
} finally {
  if (context) await context.close();
  await new Promise(resolve => server.close(resolve));
  await rm(profile, { recursive: true, force: true });
}
