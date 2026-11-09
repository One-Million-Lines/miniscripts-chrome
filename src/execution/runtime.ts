import type { MiniApp, MiniAppContext, ExecutionLog } from "../shared/types";
import { prepareUserCode } from "./prepare.ts";

interface Options {
  appId: string;
  appName: string;
  token: string;
  tabId: number;
  world: "USER_SCRIPT" | "MAIN";
  autoRun: boolean;
}

// Self contained: Chrome compiles this source through userScripts, never eval,
// Function constructors, inline script tags, or blob imports.
async function execute(options: Options, invoke: (ctx: MiniAppContext, console: Console) => Promise<unknown>) {
  const started = Date.now();
  const logs: ExecutionLog["consoleLogs"] = [];
  function serializable(value: unknown): unknown {
    const seen = new WeakSet();
    try {
      return JSON.parse(JSON.stringify(value, (_key, item) => {
        if (typeof item === "bigint" || typeof item === "function" || typeof item === "symbol") return String(item);
        if (item instanceof Error) return { name: item.name, message: item.message, stack: item.stack };
        if (item instanceof Element) return item.outerHTML.slice(0, 2000);
        if (item && typeof item === "object") {
          if (seen.has(item)) return "[Circular]";
          seen.add(item);
        }
        return item;
      }) ?? "null");
    } catch { return "[Unserializable value]"; }
  }
  // A local console avoids interfering with the page or concurrent scripts.
  const scriptConsole = Object.create(console) as Console;
  for (const type of ["log", "info", "warn", "error"] as const) {
    scriptConsole[type] = (...args: unknown[]) => {
      if (logs.length < 200) logs.push({ type, args: args.map(serializable), timestamp: Date.now() });
      console[type](...args);
    };
  }
  async function request(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const message = { type: "SCRIPT_REQUEST", appId: options.appId, token: options.token, ...payload };
    let response: { success?: boolean; error?: string; value?: unknown };
    if (options.world === "USER_SCRIPT") {
      response = await chrome.runtime.sendMessage(message);
    } else {
      response = await new Promise((resolve, reject) => {
        const id = crypto.randomUUID();
        const eventName = `miniscripts-response-${id}`;
        const listener = (event: Event) => {
          clearTimeout(timer);
          window.removeEventListener(eventName, listener);
          try { resolve(JSON.parse((event as CustomEvent<string>).detail)); } catch (error) { reject(error); }
        };
        const timer = setTimeout(() => {
          window.removeEventListener(eventName, listener);
          reject(new Error("MiniScripts storage bridge did not respond. Reload this page and retry."));
        }, 5000);
        window.addEventListener(eventName, listener);
        window.dispatchEvent(new CustomEvent("miniscripts-request", { detail: JSON.stringify({ id, message }) }));
      });
    }
    if (!response?.success) throw new Error(response?.error || "MiniScripts request failed");
    return response;
  }
  function notify(message: string) {
    document.getElementById("miniscripts-toast")?.remove();
    const toast = document.createElement("div");
    toast.id = "miniscripts-toast";
    toast.setAttribute("role", "status");
    toast.textContent = String(message);
    toast.style.cssText = "position:fixed;top:20px;right:20px;padding:12px 16px;border-radius:6px;color:white;background:#2563eb;font:14px/1.5 system-ui;z-index:2147483647;max-width:360px;word-break:break-word;box-shadow:0 4px 12px #0003";
    (document.body || document.documentElement).append(toast);
    setTimeout(() => toast.remove(), 4000);
  }
  const ctx: MiniAppContext = {
    tabId: options.tabId, url: location.href,
    storage: {
      get: async <T,>(key: string, defaultValue?: T) => {
        const result = await request({ operation: "get", key });
        return (result.value === undefined ? defaultValue : result.value) as T;
      },
      set: async (key, value) => { await request({ operation: "set", key, value }); },
      remove: async key => { await request({ operation: "remove", key }); },
    },
    ui: { notify, confirm: async message => window.confirm(message) },
    helpers: {
      getTabId: async () => ctx.tabId || (ctx.tabId = (await request({ operation: "context" })).tabId as number),
      waitForSelector: (selector, timeoutMs = 5000) => new Promise((resolve, reject) => {
        try {
          const existing = document.querySelector(selector);
          if (existing) { resolve(existing); return; }
          const finish = (element: Element | null) => { observer.disconnect(); clearTimeout(timer); resolve(element); };
          const observer = new MutationObserver(() => {
            const element = document.querySelector(selector);
            if (element) finish(element);
          });
          const timer = setTimeout(() => finish(null), timeoutMs);
          observer.observe(document.documentElement || document, { childList: true, subtree: true });
        } catch (error) { reject(error); }
      }),
      injectStyle: css => {
        const style = document.createElement("style");
        style.textContent = css;
        (document.head || document.documentElement).append(style);
        return style;
      },
    },
    fetch: window.fetch.bind(window), document, window,
  };
  let timer: ReturnType<typeof setTimeout> | undefined;
  let result;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Execution timeout (30s). Running work is not cancelled.")), 30000);
    });
    const value = await Promise.race([invoke(ctx, scriptConsole), timeout]);
    result = { success: true, returnValue: serializable(value), consoleLogs: logs, duration: Date.now() - started };
  } catch (error) {
    notify(`${options.appName} failed: ${String(error)}`);
    result = { success: false, error: String(error), consoleLogs: logs, duration: Date.now() - started };
  } finally { clearTimeout(timer); }
  if (options.autoRun) {
    try { await request({ operation: "log", result }); } catch (error) { console.error("MiniScripts could not save auto-run result", error); }
  }
  return result;
}

export function buildExecutorSource(app: MiniApp, token: string, tabId = 0, autoRun = false): string {
  const options: Options = { appId: app.id, appName: app.name, token, tabId, world: app.world || "USER_SCRIPT", autoRun };
  return `(${execute.toString()})(${JSON.stringify(options)}, async function(ctx, console) {\n${prepareUserCode(app.code)}\n})`;
}
