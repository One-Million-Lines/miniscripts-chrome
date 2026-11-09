import type { MiniApp, ExecutionLog } from "../shared/types";
import { getAllApps, getApp, getAppStorage, setAppStorage, removeAppStorage, setLastRunApp, addExecutionLog } from "../shared/storage";
import { buildExecutorSource } from "./runtime";

const SETUP_ERROR = 'MiniScripts requires Chrome 135+ and user-script access. Open chrome://extensions → MiniScripts → Details → enable “Allow User Scripts” (Chrome 138+). On Chrome 135–137, enable Developer mode. Then reload the extension and page.';
let tokensPromise: Promise<Record<string, string>> | undefined;
async function tokenFor(appId: string) {
  tokensPromise ??= chrome.storage.session.get("scriptTokens").then(data => (data.scriptTokens as Record<string, string>) || {});
  const tokens = await tokensPromise;
  if (!tokens[appId]) {
    tokens[appId] = crypto.randomUUID();
    await chrome.storage.session.set({ scriptTokens: tokens });
  }
  return tokens[appId];
}

export function isRestrictedUrl(url: string) {
  try {
    const parsed = new URL(url);
    return !["http:", "https:", "file:"].includes(parsed.protocol) ||
      parsed.hostname === "chromewebstore.google.com" ||
      (parsed.hostname === "chrome.google.com" && parsed.pathname.startsWith("/webstore"));
  } catch { return true; }
}

async function userScripts() {
  try {
    if (!chrome.userScripts || typeof chrome.userScripts.execute !== "function") throw new Error();
    await chrome.userScripts.getScripts();
    // Only the user-script world permits dynamic evaluation. Extension pages and
    // the service worker retain their strict MV3 CSP.
    await chrome.userScripts.configureWorld({ messaging: true, csp: "script-src 'self' 'unsafe-eval'; object-src 'self'" });
    return chrome.userScripts;
  } catch { throw new Error(SETUP_ERROR); }
}

async function saveResult(app: MiniApp, result: Partial<ExecutionLog> & { success: boolean }) {
  await addExecutionLog({
    id: crypto.randomUUID(), appId: app.id, appName: app.name, timestamp: Date.now(),
    success: result.success, error: result.error, consoleLogs: result.consoleLogs || [],
    returnValue: result.returnValue, duration: result.duration || 0,
  });
}

// Called only by the dedicated user-script message event, or our isolated MAIN
// bridge. Never forward these requests to the extension's management handlers.
export async function handleScriptRequest(message: Record<string, unknown>, sender: chrome.runtime.MessageSender) {
  if (sender.id !== chrome.runtime.id || !sender.tab?.id || sender.frameId !== 0 ||
      typeof message.appId !== "string" || typeof message.token !== "string") throw new Error("Invalid script sender");
  const app = await getApp(message.appId);
  if (!app?.enabled || message.token !== await tokenFor(app.id)) throw new Error("Script access denied");
  if (message.operation === "context") return { success: true, tabId: sender.tab.id };
  if (message.operation === "log") {
    if (!app.autoRun || !message.result || typeof message.result !== "object") throw new Error("Invalid execution result");
    await saveResult(app, message.result as Partial<ExecutionLog> & { success: boolean });
    return { success: true };
  }
  if (typeof message.key !== "string" || message.key.length > 1000) throw new Error("Invalid storage key");
  switch (message.operation) {
    case "get": return { success: true, value: await getAppStorage(app.id, message.key) };
    case "set": await setAppStorage(app.id, message.key, message.value); break;
    case "remove": await removeAppStorage(app.id, message.key); break;
    default: throw new Error("Unsupported script operation");
  }
  return { success: true };
}

export async function runApp(appId: string, tabId: number): Promise<{ success: boolean; error?: string }> {
  let app: MiniApp | null = null;
  const started = Date.now();
  try {
    app = await getApp(appId);
    if (!app) throw new Error("App not found");
    if (!app.enabled) throw new Error("App is disabled");
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url || isRestrictedUrl(tab.url)) throw new Error("Chrome blocks extensions on this page. Use a normal website tab (not a browser settings page, extension page, or Chrome Web Store).");
    if (tab.url.startsWith("file:") && !await chrome.extension.isAllowedFileSchemeAccess()) throw new Error('Enable “Allow access to file URLs” in MiniScripts extension details to run on local files.');
    const api = await userScripts();
    if (app.world === "MAIN") {
      // Also handles tabs that were open before the extension was installed.
      await chrome.scripting.executeScript({ target: { tabId }, files: ["contentRunner.js"] });
    }
    const results = await api.execute<{ success: boolean; error?: string } & Partial<ExecutionLog>>({
      target: { tabId }, world: app.world || "USER_SCRIPT",
      js: [{ code: buildExecutorSource(app, await tokenFor(app.id), tabId) }],
    });
    const injection = results.find(result => result.frameId === 0);
    if (!injection || injection.error) throw new Error(injection?.error || "Script returned no execution result. The page may have navigated.");
    if (!injection.result || typeof injection.result.success !== "boolean") throw new Error("Invalid script execution result");
    await setLastRunApp(appId);
    await saveResult(app, injection.result);
    return injection.result;
  } catch (error) {
    const result = { success: false, error: String(error), duration: Date.now() - started };
    if (app) await saveResult(app, result);
    return result;
  }
}

// Native registration provides actual document_start / document_end / idle
// timing, survives service-worker suspension, and naturally runs once/document.
let syncQueue = Promise.resolve();
export function syncAutoRun() {
  syncQueue = syncQueue.catch(() => {}).then(async () => {
    const api = await userScripts();
    const apps = await getAllApps();
    const registrations: chrome.userScripts.RegisteredUserScript[] = [];
    for (const app of apps.filter(app => app.enabled && app.autoRun && app.runAt !== "click")) {
      try {
        registrations.push({
          id: `miniscripts-${app.id}`, matches: app.matchPatterns,
          runAt: app.runAt === "document_start" || app.runAt === "document_end" ? app.runAt : "document_idle", world: app.world || "USER_SCRIPT",
          js: [{ code: buildExecutorSource(app, await tokenFor(app.id), 0, true) }],
        });
      } catch (error) { await saveResult(app, { success: false, error: String(error) }); }
    }
    const registered = await api.getScripts();
    const expected = new Set(registrations.map(script => script.id));
    const removed = registered.filter(script => script.id.startsWith("miniscripts-") && !expected.has(script.id)).map(script => script.id);
    if (removed.length) await api.unregister({ ids: removed });
    const signature = (script: chrome.userScripts.RegisteredUserScript) => JSON.stringify({
      js: script.js, matches: script.matches, runAt: script.runAt || "document_idle", world: script.world || "USER_SCRIPT",
    });
    // Keep unchanged registrations in place: unregistering everything creates a
    // gap on navigation, especially when a suspended worker wakes to save logs.
    for (const script of registrations) {
      const existing = registered.find(current => current.id === script.id);
      if (existing && signature(existing) === signature(script)) continue;
      try {
        if (existing) await api.update([script]);
        else await api.register([script]);
      } catch (error) {
        // A previously valid script must not keep auto-running stale code when
        // the edited source or match patterns are invalid.
        if (existing) await api.unregister({ ids: [script.id] });
        const app = apps.find(app => `miniscripts-${app.id}` === script.id)!;
        await saveResult(app, { success: false, error: `Auto-run registration failed: ${String(error)}` });
      }
    }
  });
  return syncQueue;
}
