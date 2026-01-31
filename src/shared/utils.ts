export function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function matchesPattern(url: string, pattern: string): boolean {
  if (pattern === "<all_urls>") return true;

  const regexPattern = pattern
    .replace(/\./g, "\\.")
    .replace(/\*/g, ".*")
    .replace(/\?/g, "\\?");

  try {
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(url);
  } catch {
    return false;
  }
}

export function waitForSelector(
  selector: string,
  timeoutMs: number = 5000
): Promise<Element | null> {
  return new Promise((resolve) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
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

export function injectStyle(css: string): HTMLStyleElement {
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
  return style;
}

export function createToast(message: string, type: "success" | "error" | "info" = "info") {
  const toast = document.createElement("div");
  toast.className = `miniapps-toast miniapps-toast--${type}`;
  toast.textContent = message;
  
  const style = document.createElement("style");
  style.textContent = `
    .miniapps-toast {
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 20px;
      background: #1a1a1a;
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      z-index: 2147483647;
      animation: miniapps-slide-in 0.3s ease;
    }
    .miniapps-toast--success { background: #059669; }
    .miniapps-toast--error { background: #dc2626; }
    .miniapps-toast--info { background: #2563eb; }
    @keyframes miniapps-slide-in {
      from { transform: translateX(400px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  
  if (!document.head.querySelector('style[data-miniapps-toast]')) {
    style.setAttribute('data-miniapps-toast', 'true');
    document.head.appendChild(style);
  }
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'miniapps-slide-in 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
