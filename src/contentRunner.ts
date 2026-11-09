/// <reference types="chrome" />
// MAIN-world scripts cannot use extension APIs. This isolated bridge forwards
// only token-scoped script requests; the background validates every operation.
// Keep this file import-free so it also works as a manifest content script.
(() => {
  const state = globalThis as typeof globalThis & { __miniscriptsBridgeCleanup?: () => void };
  // Chrome can leave an invalidated content-script listener in an existing tab
  // after an extension reload. Replace it when injecting a fresh bridge.
  state.__miniscriptsBridgeCleanup?.();
  const runtime = chrome.runtime;
  const listener = async (event: Event) => {
    if (!runtime?.id) {
      window.removeEventListener("miniscripts-request", listener);
      return;
    }
    let request;
    try {
      const detail = (event as CustomEvent).detail;
      if (typeof detail !== "string" || detail.length > 1_000_000) return;
      request = JSON.parse(detail);
      if (typeof request.id !== "string" || !/^[\w-]{1,100}$/.test(request.id) || request.message?.type !== "SCRIPT_REQUEST") return;
    } catch { return; }
    let response;
    try { response = await runtime.sendMessage(request.message); }
    catch (error) {
      if (String(error).includes("Extension context invalidated")) {
        window.removeEventListener("miniscripts-request", listener);
        return;
      }
      response = { success: false, error: String(error) };
    }
    window.dispatchEvent(new CustomEvent(`miniscripts-response-${request.id}`, { detail: JSON.stringify(response) }));
  };
  window.addEventListener("miniscripts-request", listener);
  state.__miniscriptsBridgeCleanup = () => window.removeEventListener("miniscripts-request", listener);
})();
