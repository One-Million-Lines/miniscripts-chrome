/// <reference types="chrome" />
import { MiniApp, ExecutionLog } from "./types";

const STORAGE_KEYS = {
  APPS: "miniapps_apps",
  LAST_RUN: "miniapps_last_run",
  SETTINGS: "miniapps_settings",
  EXECUTION_LOGS: "miniapps_execution_logs",
};

export async function getAllApps(): Promise<MiniApp[]> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.APPS);
  return result[STORAGE_KEYS.APPS] || [];
}

export async function saveApp(app: MiniApp): Promise<void> {
  const apps = await getAllApps();
  const index = apps.findIndex((a) => a.id === app.id);
  
  if (index >= 0) {
    apps[index] = app;
  } else {
    apps.push(app);
  }
  // this saves locally
  await chrome.storage.local.set({ [STORAGE_KEYS.APPS]: apps });
}

export async function deleteApp(appId: string): Promise<void> {
  const apps = await getAllApps();
  const filtered = apps.filter((a) => a.id !== appId);
  await chrome.storage.local.set({ [STORAGE_KEYS.APPS]: filtered });
}

export async function getApp(appId: string): Promise<MiniApp | null> {
  const apps = await getAllApps();
  return apps.find((a) => a.id === appId) || null;
}

export async function setLastRunApp(appId: string): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.LAST_RUN]: appId });
}

export async function getLastRunApp(): Promise<string | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.LAST_RUN);
  return result[STORAGE_KEYS.LAST_RUN] || null;
}

export async function getAppStorage<T = any>(
  appId: string,
  key: string,
  defaultValue?: T
): Promise<T> {
  const storageKey = `app_${appId}_${key}`;
  const result = await chrome.storage.local.get(storageKey);
  return result[storageKey] !== undefined ? result[storageKey] : defaultValue;
}

export async function setAppStorage<T = any>(
  appId: string,
  key: string,
  value: T
): Promise<void> {
  const storageKey = `app_${appId}_${key}`;
  await chrome.storage.local.set({ [storageKey]: value });
}

export async function removeAppStorage(appId: string, key: string): Promise<void> {
  const storageKey = `app_${appId}_${key}`;
  await chrome.storage.local.remove(storageKey);
}

export async function importApps(apps: MiniApp[]): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.APPS]: apps });
}

export async function exportApps(): Promise<MiniApp[]> {
  return getAllApps();
}

// Execution logs management (max 100 entries)
const MAX_LOGS = 100;

export async function addExecutionLog(log: ExecutionLog): Promise<void> {
  const logs = await getExecutionLogs();
  logs.unshift(log); // Add to beginning
  
  // Keep only last 100
  const trimmedLogs = logs.slice(0, MAX_LOGS);
  await chrome.storage.local.set({ [STORAGE_KEYS.EXECUTION_LOGS]: trimmedLogs });
}

export async function getExecutionLogs(): Promise<ExecutionLog[]> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.EXECUTION_LOGS);
  return result[STORAGE_KEYS.EXECUTION_LOGS] || [];
}

export async function clearExecutionLogs(): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.EXECUTION_LOGS]: [] });
}

export async function deleteExecutionLog(logId: string): Promise<void> {
  const logs = await getExecutionLogs();
  const filtered = logs.filter((log) => log.id !== logId);
  await chrome.storage.local.set({ [STORAGE_KEYS.EXECUTION_LOGS]: filtered });
}
