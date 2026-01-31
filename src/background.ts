/// <reference types="chrome" />
import { MiniApp, MessageType, ExecutionLog } from "./shared/types";
import { matchesPattern } from "./shared/utils";
import { TOAST_DURATION_MS } from "./shared/constants";
import {
  getAllApps,
  saveApp,
  deleteApp,
  getApp,
  setLastRunApp,
  getLastRunApp,
  importApps,
  exportApps,
  addExecutionLog,
  getExecutionLogs,
  clearExecutionLogs,
  deleteExecutionLog,
} from "./shared/storage";
import { sampleApps } from "./samples/index";

// Helper function to check if URL is restricted
function isRestrictedUrl(url: string): boolean {
  const restrictedProtocols = [
    'chrome://',
    'chrome-extension://',
    'edge://',
    'about:',
    'data:',
    'file://',
    'view-source:'
  ];
  return restrictedProtocols.some(protocol => url.startsWith(protocol));
}

// Initialize with sample apps on first install
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    await importApps(sampleApps);
  }

  // Create context menu
  chrome.contextMenus.create({
    id: "miniapps-run",
    title: "Run with Mini-Apps",
    contexts: ["page"],
  });

  const apps = await getAllApps();
  apps.forEach((app) => {
    if (app.enabled) {
      chrome.contextMenus.create({
        id: `miniapp-${app.id}`,
        parentId: "miniapps-run",
        title: app.name,
        contexts: ["page"],
      });
    }
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId.toString().startsWith("miniapp-") && tab?.id) {
    const appId = info.menuItemId.toString().replace("miniapp-", "");
    await runApp(appId, tab.id);
  }
});

// Handle keyboard commands
chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  if (command === "toggle-sidebar") {
    chrome.sidePanel.open({ windowId: tab.windowId });
  } else if (command === "run-last-app") {
    const lastAppId = await getLastRunApp();
    if (lastAppId) {
      await runApp(lastAppId, tab.id);
    }
  }
});

// Handle toolbar icon click
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.windowId) {
    chrome.sidePanel.open({ windowId: tab.windowId });
  }
});

// Auto-run apps on tab updates
const executedApps = new Map<number, Set<string>>();

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "loading") {
    executedApps.delete(tabId);
  }

  if (changeInfo.status === "complete" && tab.url) {
    // Skip restricted URLs (chrome://, edge://, etc.)
    if (isRestrictedUrl(tab.url)) {
      return;
    }

    const apps = await getAllApps();
    const autoRunApps = apps.filter(
      (app) =>
        app.enabled &&
        app.autoRun &&
        app.matchPatterns.some((pattern) => matchesPattern(tab.url!, pattern))
    );

    const executed = executedApps.get(tabId) || new Set();

    for (const app of autoRunApps) {
      if (!executed.has(app.id)) {
        await runApp(app.id, tabId, app.runAt || "document_idle");
        executed.add(app.id);
      }
    }

    executedApps.set(tabId, executed);
  }
});

// Clean up on tab close
chrome.tabs.onRemoved.addListener((tabId) => {
  executedApps.delete(tabId);
});

// Message handling
chrome.runtime.onMessage.addListener((message: MessageType, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse);
  return true; // Keep channel open for async response
});

async function handleMessage(
  message: MessageType,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void
) {
  console.log("🔄 Background received message:", message.type, message);
  try {
    switch (message.type) {
      case "GET_APPS": {
        const apps = await getAllApps();
        console.log("📦 Background returning apps:", apps.length);
        sendResponse({ type: "GET_APPS_RESPONSE", payload: apps });
        break;
      }

      case "SAVE_APP": {
        await saveApp(message.payload);
        sendResponse({ success: true });
        
        // Update context menu
        chrome.contextMenus.remove(`miniapp-${message.payload.id}`, () => {
          if (message.payload.enabled) {
            chrome.contextMenus.create({
              id: `miniapp-${message.payload.id}`,
              parentId: "miniapps-run",
              title: message.payload.name,
              contexts: ["page"],
            });
          }
        });
        break;
      }

      case "DELETE_APP": {
        await deleteApp(message.payload);
        chrome.contextMenus.remove(`miniapp-${message.payload}`);
        sendResponse({ success: true });
        break;
      }

      case "RUN_APP": {
        console.log ("background run app clicked", message.payload.appId, message.payload.tabId);
        const result = await runApp(message.payload.appId, message.payload.tabId);
        sendResponse({ type: "RUN_APP_RESPONSE", payload: result });
        break;
      }

      case "TOGGLE_APP": {
        const app = await getApp(message.payload.appId);
        if (app) {
          app.enabled = message.payload.enabled;
          app.updatedAt = Date.now();
          await saveApp(app);
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: "App not found" });
        }
        break;
      }

      case "IMPORT_APPS": {
        await importApps(message.payload);
        sendResponse({ success: true });
        break;
      }

      case "EXPORT_APPS": {
        const apps = await exportApps();
        sendResponse({ type: "EXPORT_APPS_RESPONSE", payload: apps });
        break;
      }

      case "GET_LAST_APP": {
        const lastApp = await getLastRunApp();
        sendResponse({ type: "GET_LAST_APP_RESPONSE", payload: lastApp });
        break;
      }

      case "GET_STORAGE": {
        const result = await chrome.storage.local.get([message.payload.key]);
        const value = result[message.payload.key] ?? message.payload.defaultValue;
        sendResponse({ value });
        break;
      }

      case "SET_STORAGE": {
        await chrome.storage.local.set({ [message.payload.key]: message.payload.value });
        sendResponse({ success: true });
        break;
      }

      case "REMOVE_STORAGE": {
        await chrome.storage.local.remove([message.payload.key]);
        sendResponse({ success: true });
        break;
      }

      case "GET_EXECUTION_LOGS": {
        const logs = await getExecutionLogs();
        sendResponse({ type: "GET_EXECUTION_LOGS_RESPONSE", payload: logs });
        break;
      }

      case "CLEAR_EXECUTION_LOGS": {
        await clearExecutionLogs();
        sendResponse({ success: true });
        break;
      }

      case "DELETE_EXECUTION_LOG": {
        await deleteExecutionLog(message.payload);
        sendResponse({ success: true });
        break;
      }
    }
  } catch (error) {
    console.error("Error handling message:", error);
    sendResponse({ success: false, error: String(error) });
  }
}

async function runApp(
  appId: string,
  tabId: number,
  timing?: "document_idle" | "document_end" | "document_start" | "click"
): Promise<{ success: boolean; error?: string }> {
  try {
    const app = await getApp(appId);
    if (!app) {
      return { success: false, error: "App not found" };
    }

    if (!app.enabled) {
      return { success: false, error: "App is disabled" };
    }

    // Check if the tab URL is restricted
    const tab = await chrome.tabs.get(tabId);
    if (tab.url && isRestrictedUrl(tab.url)) {
      // we can also show a notification to the user here
      return { success: false, error: "Cannot run apps on restricted pages (chrome://, edge://, etc.)" };
    }

    console.log("🚀 Executing app directly via scripting API:", app.name);

    // Execute the app code directly using chrome.scripting.executeScript
    // This bypasses all CSP restrictions
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: executeAppInPage,
      args: [app.code, appId, app as unknown as Record<string, unknown>, TOAST_DURATION_MS],
      world: 'MAIN' // Execute in the main world to access page APIs
    });

    await setLastRunApp(appId);

    // Save execution log
    const executionResult = results && results[0] && results[0].result;
    const log: ExecutionLog = {
      id: `${appId}_${Date.now()}`,
      appId,
      appName: app.name,
      timestamp: Date.now(),
      success: executionResult?.success ?? true,
      error: executionResult?.error,
      consoleLogs: (executionResult?.consoleLogs ?? []) as Array<{type: 'log' | 'info' | 'warn' | 'error'; args: unknown[]; timestamp: number}>,
      returnValue: executionResult?.returnValue,
      duration: executionResult?.duration ?? 0,
    };
    await addExecutionLog(log);

    if (results && results[0] && results[0].result) {
      return results[0].result;
    } else {
      return { success: true };
    }
  } catch (error) {
    console.error("Error running app:", error);
    return { success: false, error: String(error) };
  }
}

// This function will be executed in the page context
async function executeAppInPage(
  code: string,
  appId: string,
  appData: Record<string, unknown>,
  toastDurationMs: number
): Promise<{ success: boolean; error?: string; consoleLogs?: Array<{type: string; args: unknown[]; timestamp: number}>; returnValue?: unknown; duration?: number }> {
  const startTime = Date.now();
  const consoleLogs: Array<{type: 'log' | 'info' | 'warn' | 'error'; args: unknown[]; timestamp: number}> = [];
  
  // Capture console methods
  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
  };
  
  // Override console methods to capture logs
  console.log = (...args: unknown[]) => {
    consoleLogs.push({ type: 'log', args, timestamp: Date.now() });
    originalConsole.log(...args);
  };
  console.info = (...args: unknown[]) => {
    consoleLogs.push({ type: 'info', args, timestamp: Date.now() });
    originalConsole.info(...args);
  };
  console.warn = (...args: unknown[]) => {
    consoleLogs.push({ type: 'warn', args, timestamp: Date.now() });
    originalConsole.warn(...args);
  };
  console.error = (...args: unknown[]) => {
    consoleLogs.push({ type: 'error', args, timestamp: Date.now() });
    originalConsole.error(...args);
  };
  
  try {
    // Utility functions for the app context
    function createToast(message: string, type: "info" | "success" | "error" = "info") {
      const existingToast = document.getElementById("miniapp-toast");
      if (existingToast) {
        existingToast.remove();
      }

      const toast = document.createElement("div");
      toast.id = "miniapp-toast";
      toast.textContent = message;
      
      const baseStyles = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 16px;
        border-radius: 6px;
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 14px;
        z-index: 10000;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      `;
      
      const typeStyles = {
        info: "background-color: #3b82f6;",
        success: "background-color: #10b981;", 
        error: "background-color: #ef4444;"
      };
      
      toast.style.cssText = baseStyles + typeStyles[type];
      document.body.appendChild(toast);
      
      setTimeout(() => toast.remove(), toastDurationMs);
    }

    async function waitForSelector(selector: string, timeoutMs: number = 5000): Promise<Element | null> {
      return new Promise((resolve) => {
        const existing = document.querySelector(selector);
        if (existing) {
          resolve(existing);
          return;
        }

        const observer = new MutationObserver(() => {
          const element = document.querySelector(selector);
          if (element) {
            observer.disconnect();
            resolve(element);
          }
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true,
        });

        setTimeout(() => {
          observer.disconnect();
          resolve(null);
        }, timeoutMs);
      });
    }

    function injectStyle(css: string): HTMLStyleElement {
      const style = document.createElement("style");
      style.textContent = css;
      document.head.appendChild(style);
      return style;
    }

    // Create the context for the app
    const ctx = {
      tabId: 0,
      url: document.location.href,
      storage: {
        get: async (key: string, defaultValue?: unknown) => {
          // Simple localStorage fallback for now
          const stored = localStorage.getItem(`miniapp_${appId}_${key}`);
          return stored ? JSON.parse(stored) : defaultValue;
        },
        set: async (key: string, value: unknown) => {
          localStorage.setItem(`miniapp_${appId}_${key}`, JSON.stringify(value));
        },
        remove: async (key: string) => {
          localStorage.removeItem(`miniapp_${appId}_${key}`);
        },
      },
      ui: {
        notify: (message: string) => createToast(message, "info"),
        confirm: async (message: string) => window.confirm(message),
      },
      helpers: {
        waitForSelector,
        injectStyle,
      },
      fetch: window.fetch.bind(window),
      document: document,
      window: window,
    };

    // Execute the app code - handle both ES6 and regular function syntax
    // Transform ES6 export syntax to standard module format
    let transformedCode = code;
    
    // Handle "export default async function name(ctx)" pattern
    const exportDefaultAsyncMatch = transformedCode.match(/export\s+default\s+async\s+function\s+(\w+)\s*\(/);
    if (exportDefaultAsyncMatch) {
      // Code is already in the correct format for blob modules
    }
    
    // Handle "export default function name(ctx)" pattern
    const exportDefaultMatch = transformedCode.match(/export\s+default\s+function\s+(\w+)\s*\(/);
    if (exportDefaultMatch) {
      // Code is already in the correct format for blob modules
    }
    
    // Handle legacy function pattern - convert to export default
    const legacyFunctionMatch = transformedCode.match(/^(?!.*export).*function\s+run\s*\(/m);
    if (legacyFunctionMatch && !transformedCode.includes('export')) {
      // Convert legacy function to export default
      transformedCode = transformedCode.replace(/function\s+run\s*\(/, 'export default async function run(');
    }
    
    // If no export pattern is found, wrap the entire code
    if (!transformedCode.includes('export default')) {
      transformedCode = `
        export default async function app(ctx) {
          ${transformedCode}
        }
      `;
    }
    
    // Create a blob URL for the module
    const blob = new Blob([transformedCode], { type: 'application/javascript' });
    const moduleUrl = URL.createObjectURL(blob);
    
    try {
      // Import the module dynamically
      const module = await import(moduleUrl);
      
      if (!module.default || typeof module.default !== 'function') {
        throw new Error("App must export a default function");
      }
      
      const appFunction = module.default;
      
      // Execute with timeout
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Execution timeout (30s)")), 30000)
      );

      const returnValue = await Promise.race([appFunction(ctx), timeoutPromise]);
      const duration = Date.now() - startTime;

      // Restore console methods
      console.log = originalConsole.log;
      console.info = originalConsole.info;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;

      createToast(`"${appData.name}": executed successfully!`, "success");
      return { success: true, consoleLogs, returnValue, duration };
      
    } finally {
      // Clean up the blob URL
      URL.revokeObjectURL(moduleUrl);
      
      // Restore console methods in case of error
      console.log = originalConsole.log;
      console.info = originalConsole.info;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
    }
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Restore console methods
    console.log = originalConsole.log;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    
    console.error(`Error executing app ${appId}:`, error);
    
    // Try to show error toast if possible
    try {
      const existingToast = document.getElementById("miniapp-toast");
      if (existingToast) existingToast.remove();

      const toast = document.createElement("div");
      toast.id = "miniapp-toast";
      toast.textContent = `✗ ${appId} failed: ${error}`;
      toast.style.cssText = `
        position: fixed; top: 20px; right: 20px; padding: 12px 16px;
        border-radius: 6px; color: white; background-color: #ef4444;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 14px; z-index: 10000; max-width: 300px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      `;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), toastDurationMs);
    } catch (toastError) {
      // Ignore toast errors
    }
    
    return { success: false, error: String(error), consoleLogs, duration };
  }
}

async function ensureContentRunnerLoaded(tabId: number) {
  try {
    console.log("💉 Injecting content runner into tab:", tabId);
    
    // First check if content runner is already loaded
    const testResult = await chrome.tabs.sendMessage(tabId, { type: "PING" }).catch(() => null);
    if (testResult) {
      console.log("✅ Content runner already loaded");
      return;
    }

    // Inject the content runner script
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: false },
      files: ["contentRunner.js"]
    });
    
    console.log("✅ Content runner injected successfully");
  } catch (error) {
    console.error("❌ Failed to inject content runner:", error);
    throw error;
  }
}

async function sendMessageWithRetry(
  tabId: number,
  message: {
    type: string;
    payload: {
      appId: string;
      code: string;
      timing: string;
    };
  },
  attempts = 3
) {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await chrome.tabs.sendMessage(tabId, message);
    } catch (error) {
      lastError = error;
      if (!isNoReceiverError(error) || attempt === attempts - 1) {
        throw error;
      }
      await delay(50 * (attempt + 1));
    }
  }

  throw lastError;
}

function isNoReceiverError(error: unknown): boolean {
  if (typeof error === "string") {
    return error.includes("Receiving end does not exist");
  }
  if (error instanceof Error) {
    return error.message.includes("Receiving end does not exist");
  }
  return false;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
