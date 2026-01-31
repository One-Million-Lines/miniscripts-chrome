export interface MiniApp {
  id: string;
  name: string;
  description?: string;
  version?: string;
  enabled: boolean;
  autoRun: boolean;
  matchPatterns: string[];
  runAt?: "document_idle" | "document_end" | "document_start" | "click";
  code: string;
  icon?: string;
  createdAt: number;
  updatedAt: number;
}

export interface MiniAppContext {
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

export type MessageType =
  | { type: "GET_APPS"; payload?: never }
  | { type: "GET_APPS_RESPONSE"; payload: MiniApp[] }
  | { type: "SAVE_APP"; payload: MiniApp }
  | { type: "DELETE_APP"; payload: string }
  | { type: "RUN_APP"; payload: { appId: string; tabId: number } }
  | { type: "RUN_APP_RESPONSE"; payload: { success: boolean; error?: string } }
  | { type: "TOGGLE_APP"; payload: { appId: string; enabled: boolean } }
  | { type: "IMPORT_APPS"; payload: MiniApp[] }
  | { type: "EXPORT_APPS"; payload?: never }
  | { type: "EXPORT_APPS_RESPONSE"; payload: MiniApp[] }
  | { type: "GET_LAST_APP"; payload?: never }
  | { type: "GET_LAST_APP_RESPONSE"; payload: string | null }
  | { type: "GET_STORAGE"; payload: { key: string; defaultValue?: unknown } }
  | { type: "SET_STORAGE"; payload: { key: string; value: unknown } }
  | { type: "REMOVE_STORAGE"; payload: { key: string } }
  | { type: "GET_EXECUTION_LOGS"; payload?: never }
  | { type: "GET_EXECUTION_LOGS_RESPONSE"; payload: ExecutionLog[] }
  | { type: "CLEAR_EXECUTION_LOGS"; payload?: never }
  | { type: "DELETE_EXECUTION_LOG"; payload: string };

export interface AppExecutionResult {
  success: boolean;
  error?: string;
  appId: string;
  timestamp: number;
}

export interface ExecutionLog {
  id: string;
  appId: string;
  appName: string;
  timestamp: number;
  success: boolean;
  error?: string;
  consoleLogs: Array<{
    type: 'log' | 'info' | 'warn' | 'error';
    args: unknown[];
    timestamp: number;
  }>;
  returnValue?: unknown;
  duration: number;
}
