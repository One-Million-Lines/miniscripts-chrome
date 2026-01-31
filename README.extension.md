# Mini-Apps Chrome Extension

A Manifest V3 Chrome Extension that lets you run modular "mini-apps" (user scripts) on any webpage. Scripts can run on demand or automatically based on URL patterns.

## Features

- **Sidebar Interface**: Clean, searchable list of available mini-apps
- **Run on Demand**: Execute any app instantly on the current tab
- **Auto-Run**: Set apps to run automatically on pages matching URL patterns
- **Click-Triggered Apps**: Mark apps that should only run when you press the Run button
- **Sample Apps Included**:
  - **Blur Overlay**: Draggable, resizable blur rectangle (press ESC to remove)
  - **Reader Margins**: Toggle reader-friendly typography and layout
  - **Copy All Links**: Extract and copy all HTTP(S) links to clipboard
- **Import/Export**: Backup and share your app collection as JSON
- **Context Menu**: Right-click to run apps
- **Keyboard Shortcuts**:
  - `Alt+Shift+M`: Toggle sidebar
  - `Alt+Shift+R`: Re-run last app
- **Chrome Sync**: Settings sync across your devices

## Installation

### From Source

1. **Clone or Download** this repository
2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Build the Extension**:
   ```bash
   npm run build:extension
   ```

4. **Load in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `dist` folder from this project

## Usage

### Opening the Sidebar

- Click the extension icon in the toolbar
- Or press `Alt+Shift+M`
- Or right-click on any page and select "Run with Mini-Apps"

### Running an App

1. Open the sidebar
2. Find the app you want to run
3. Click the "Run" button
4. Or use the context menu (right-click → "Run with Mini-Apps" → select app)

### Creating a New App

1. Click the `+` button in the sidebar
2. Fill in the app details:
   - **Name**: Display name for your app
   - **Description**: What the app does
   - **Match Patterns**: URLs where auto-run should trigger (e.g., `*://*.github.com/*`, `<all_urls>`)
   - **Auto-run**: Enable to run automatically on matching pages
   - **Code**: Your JavaScript module

3. **Code Requirements**:
   ```typescript
   export default async function run(ctx) {
     // ctx.ui.notify() - Show toast notification
     // ctx.storage.get/set/remove() - Persist app-specific data
     // ctx.helpers.waitForSelector() - Wait for element
     // ctx.helpers.injectStyle() - Inject CSS
     // ctx.document, ctx.window, ctx.fetch - Standard APIs
     
     ctx.ui.notify("Hello from my app!");
   }
   ```

### Auto-Run

Enable "Auto-run" and specify match patterns:
- `<all_urls>` - Runs on all pages
- `*://*.example.com/*` - Runs on all example.com pages
- `https://github.com/*` - Runs only on GitHub HTTPS pages

Use the **Run At** selector to control when the app fires:
- `Document Start`, `Document End`, or `Document Idle` follow the usual page lifecycle
- `Click` keeps the app manual only—it executes as soon as you press Run (no page click required)

### Import/Export

**Export**:
- Click "Export" in the sidebar or options page
- Downloads a JSON file with all your apps

**Import**:
- Click "Import"
- Select a JSON file (replaces all existing apps)

## App API Reference

Each mini-app receives a `ctx` context object:

```typescript
interface MiniAppContext {
  tabId: number;              // Current tab ID
  url: string;                // Current page URL
  
  storage: {
    get<T>(key: string, defaultValue?: T): Promise<T>;
    set<T>(key: string, value: T): Promise<void>;
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
```

## Security

- **No eval**: Scripts loaded as ES6 modules via Blob URLs
- **Strict CSP**: Extension pages use strict Content Security Policy
- **No remote code**: All code stored locally
- **Isolated execution**: Apps run in content script isolated world
- **30s timeout**: Prevents infinite loops

## Permissions

- `storage`: Save settings and app data
- `scripting`: Inject and execute apps
- `activeTab`: Access current tab content
- `tabs`: Query tab state
- `contextMenus`: Right-click menu integration
- `sidePanel`: Native sidebar (Chrome 114+)
- `host_permissions`: Execute on all URLs (required for auto-run)

## Troubleshooting

### Side Panel Not Available

If your Chrome version doesn't support `chrome.sidePanel` (< v114), the extension will fall back to an in-page sidebar. Update Chrome to use the native side panel.

### App Not Running

- Check that the app is **enabled** (toggle in sidebar)
- Verify match patterns include the current URL
- Check the browser console for errors (F12)
- Ensure code exports `export default async function run(ctx)`

### Clipboard Access Denied

Some pages block clipboard access. The "Copy All Links" app includes a fallback that creates a selectable textarea.

## Development

### Project Structure

```
/src
  /background.ts          # Service worker
  /contentRunner.ts       # In-page script executor
  /sidepanel              # Sidebar UI (React)
  /options                # Options page (React)
  /shared                 # Shared utilities, types, storage
  /samples                # Sample mini-apps
  /styles                 # CSS
```

### Building

```bash
npm run build:extension   # Production build
npm run dev               # Development with HMR (sidebar/options only)
```

### Adding Your Own Sample Apps

Edit `src/samples/index.ts` to include your preloaded apps.

## License

MIT

## Credits

Built with TypeScript, React, Vite, and Chrome Extension Manifest V3.
