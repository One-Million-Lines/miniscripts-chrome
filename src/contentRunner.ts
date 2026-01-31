/// <reference types="chrome" />
import { TOAST_DURATION_MS } from "./shared/constants";

// Type definitions (copied to avoid imports)
interface MiniAppContext {
  tabId: number;
  url: string;
  storage: {
    get<T = unknown>(key: string, defaultValue?: T): Promise<T>;
    set<T = unknown>(key: string, value: T): Promise<void>;
    remove(key: string): Promise<void>;
  };
  ui: {
    notify(message: string): void;
    confirm(message: string): Promise<boolean>;
  };
  helpers: {
    waitForSelector(selector: string, timeoutMs?: number): Promise<Element | null>;
    injectStyle(css: string): HTMLStyleElement;
  };
  fetch: typeof fetch;
  document: Document;
  window: Window;
}

// Extend window interface for dynamic properties
interface ExtendedWindow extends Window {
  [key: string]: unknown;
}

// Self-contained content runner with minimal imports
// Track executed apps to prevent duplicates
const executedApps = new Set<string>();

// Utility functions (copied to avoid imports)
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
  
  setTimeout(() => toast.remove(), TOAST_DURATION_MS);
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

// Storage functions (simplified for content script)
async function getAppStorage<T>(appId: string, key: string, defaultValue?: T): Promise<T> {
  return new Promise((resolve) => {
    const storageKey = `miniapp_${appId}_${key}`;
    chrome.runtime.sendMessage(
      { type: "GET_STORAGE", payload: { key: storageKey, defaultValue } },
      (response) => resolve(response?.value ?? defaultValue)
    );
  });
}

async function setAppStorage<T>(appId: string, key: string, value: T): Promise<void> {
  return new Promise((resolve) => {
    const storageKey = `miniapp_${appId}_${key}`;
    chrome.runtime.sendMessage(
      { type: "SET_STORAGE", payload: { key: storageKey, value } },
      () => resolve()
    );
  });
}

async function removeAppStorage(appId: string, key: string): Promise<void> {
  return new Promise((resolve) => {
    const storageKey = `miniapp_${appId}_${key}`;
    chrome.runtime.sendMessage(
      { type: "REMOVE_STORAGE", payload: { key: storageKey } },
      () => resolve()
    );
  });
}

// Listen for execution requests from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("🎯 ContentRunner received message:", message.type, message);
  
  if (message.type === "PING") {
    sendResponse({ success: true });
    return true;
  }
  
  if (message.type === "EXECUTE_APP") {
    executeApp(message.payload.appId, message.payload.code, message.payload.timing)
      .then((result) => {
        console.log("✅ ContentRunner execution result:", result);
        sendResponse(result);
      })
      .catch((error) => {
        console.error("❌ ContentRunner execution error:", error);
        sendResponse({ success: false, error: String(error) });
      });
    return true;
  }
});

async function executeApp(
  appId: string,
  code: string,
  timing: string
): Promise<{ success: boolean; error?: string }> {
  const executionKey = `${appId}_${document.location.href}`;

  if (executedApps.has(executionKey)) {
    return { success: true }; // Already executed
  }

  return runAppNow(appId, code, executionKey);
}

// Clean up on navigation
window.addEventListener("beforeunload", () => {
  executedApps.clear();
});

async function runAppNow(
  appId: string,
  code: string,
  executionKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const context: MiniAppContext = {
      tabId: 0, // Will be set by background
      url: document.location.href,
      storage: {
        get: async <T,>(key: string, defaultValue?: T) =>
          await getAppStorage<T>(appId, key, defaultValue),
        set: async <T,>(key: string, value: T) => await setAppStorage(appId, key, value),
        remove: async (key: string) => await removeAppStorage(appId, key),
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

    // Create a unique execution ID to avoid conflicts
    const executionId = `miniapp_exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create a promise that will be resolved when the script executes
    const executionPromise = new Promise<void>((resolve, reject) => {
      const extWindow = window as unknown as ExtendedWindow;
      
      // Set up global handlers for the execution
      extWindow[`${executionId}_resolve`] = resolve;
      extWindow[`${executionId}_reject`] = reject;
      extWindow[`${executionId}_context`] = context;
      
      // Cleanup function
      const cleanup = () => {
        delete extWindow[`${executionId}_resolve`];
        delete extWindow[`${executionId}_reject`];
        delete extWindow[`${executionId}_context`];
      };
      
      // Set timeout
      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error("Execution timeout (30s)"));
      }, 30000);
      
      // Override resolve and reject to include cleanup
      const originalResolve = resolve;
      const originalReject = reject;
      extWindow[`${executionId}_resolve`] = (result?: unknown) => {
        clearTimeout(timeoutId);
        cleanup();
        originalResolve(result as void);
      };
      extWindow[`${executionId}_reject`] = (error?: unknown) => {
        clearTimeout(timeoutId);
        cleanup();
        originalReject(error);
      };
    });

    // Create the script content that will execute in the page context
    const scriptContent = `
      (async function() {
        try {
          const ctx = window["${executionId}_context"];
          const resolve = window["${executionId}_resolve"];
          const reject = window["${executionId}_reject"];
          
          // Wrap the user code to handle different export patterns
          let appFunction;
          
          // Create a module-like environment
          const exports = {};
          let run;
          
          // Execute the user code in this context
          ${code}
          
          // Determine which function to use
          if (exports.default && typeof exports.default === 'function') {
            appFunction = exports.default;
          } else if (typeof run === 'function') {
            appFunction = run;
          } else {
            throw new Error("App must export a default function or define a 'run' function");
          }
          
          // Execute the app function
          await appFunction(ctx);
          resolve();
          
        } catch (error) {
          window["${executionId}_reject"](error);
        }
      })();
    `;

    // Inject and execute the script
    const script = document.createElement('script');
    script.textContent = scriptContent;
    script.type = 'text/javascript';
    
    // Add to head temporarily
    document.head.appendChild(script);
    
    // Wait for execution to complete
    await executionPromise;
    
    // Clean up the script element
    document.head.removeChild(script);

    executedApps.add(executionKey);
    createToast(`✓ App executed successfully`, "success");

    return { success: true };
  } catch (error) {
    console.error(`Error executing app ${appId}:`, error);
    createToast(`✗ App failed: ${error}`, "error");
    return { success: false, error: String(error) };
  }
}
