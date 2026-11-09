/// <reference types="chrome" />
import { MessageType } from "./shared/types";
import {
  getAllApps,
  saveApp,
  deleteApp,
  getApp,
  getLastRunApp,
  importApps,
  exportApps,
  getExecutionLogs,
  clearExecutionLogs,
  deleteExecutionLog,
} from "./shared/storage";
import { sampleApps } from "./samples/index";

import { runApp, syncAutoRun, handleScriptRequest } from "./execution/service";

// Initialize with sample apps on first install
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    await importApps(sampleApps);
  }

  await refreshContextMenus();
  await syncAutoRun().catch(error => console.info(String(error)));
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

// Reconcile native auto-run registrations on startup, updates, and app edits.
void syncAutoRun().catch(error => console.info(String(error)));
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.miniscripts_apps) {
    void syncAutoRun().catch(error => console.info(String(error)));
    void refreshContextMenus();
  }
});
chrome.runtime.onUserScriptMessage.addListener((message, sender, sendResponse) => {
  handleScriptRequest(message, sender).then(sendResponse, error => sendResponse({ success: false, error: String(error) }));
  return true;
});

let menuQueue = Promise.resolve();
function refreshContextMenus() {
  menuQueue = menuQueue.catch(() => {}).then(async () => {
    await chrome.contextMenus.removeAll();
    chrome.contextMenus.create({ id: "miniscripts-run", title: "Run with MiniScripts", contexts: ["page"] });
    for (const app of (await getAllApps()).filter(app => app.enabled)) {
      chrome.contextMenus.create({ id: `miniapp-${app.id}`, parentId: "miniscripts-run", title: app.name, contexts: ["page"] });
    }
  });
  return menuQueue;
}

// Message handling
chrome.runtime.onMessage.addListener((message: MessageType, sender, sendResponse) => {
  if ((message as { type: string }).type === "SCRIPT_REQUEST") {
    handleScriptRequest(message as unknown as Record<string, unknown>, sender).then(sendResponse, error => sendResponse({ success: false, error: String(error) }));
  } else if (sender.id === chrome.runtime.id && sender.url?.startsWith(chrome.runtime.getURL(""))) {
    void handleMessage(message, sender, sendResponse);
  } else {
    sendResponse({ success: false, error: "Extension management messages are only available to extension pages" });
  }
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
        
        break;
      }

      case "DELETE_APP": {
        await deleteApp(message.payload);
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

      case "LOAD_SAMPLES": {
        const apps = await getAllApps();
        const merged = [...apps];
        for (const sample of sampleApps) {
          const index = merged.findIndex(app => app.id === sample.id || app.name === sample.name);
          if (index >= 0) merged[index] = { ...sample, id: merged[index].id, createdAt: merged[index].createdAt };
          else merged.push(sample);
        }
        await importApps(merged);
        sendResponse({ success: true });
        break;
      }
    }
  } catch (error) {
    console.error("Error handling message:", error);
    sendResponse({ success: false, error: String(error) });
  }
}
