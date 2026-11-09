# MiniScripts Chrome Extension

A Manifest V3 Chrome Extension that lets you run modular "miniscripts" (user scripts) on any webpage. Scripts can run on demand or automatically based on URL patterns.

## Features

- **Sidebar Interface**: Clean, searchable list of available miniscripts
- **Run on Demand**: Execute any app instantly on the current tab
- **Auto-Run**: Set apps to run automatically on pages matching URL patterns
- **Click-Triggered Apps**: Mark apps that should only run when you press the Run button
- **Sample Apps Included**:
  - **Blur Overlay**: Draggable, resizable blur rectangle (press ESC to remove)
  - **Reader Margins**: Toggle reader-friendly typography and layout
  - **Copy All Links**: Extract and copy all HTTP(S) links to clipboard
  - **LinkedIn Image Paste**: Hand pasted images to the local post/comment uploader
- **Import/Export**: Backup and share your app collection as JSON
- **Context Menu**: Right-click to run apps
- **Keyboard Shortcuts**:
  - `Alt+Shift+M`: Toggle sidebar
  - `Alt+Shift+R`: Re-run last app
- **Local Storage**: Scripts and per-script data persist in extension storage

## Installation

### From Source

1. **Clone or Download** this repository
2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Build the Extension**:
   ```bash
   npm run build
   ```

4. **Load in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `dist` folder from this project
   - Open MiniScripts Details and enable **Allow User Scripts** (Chrome 138+); Chrome 135–137 uses Developer mode
   - Reload the extension and the website after changing script access

## Usage

### Opening the Sidebar

- Click the extension icon in the toolbar
- Or press `Alt+Shift+M`
- Or right-click on any page and select "Run with MiniScripts"

### Running an App

1. Open the sidebar
2. Find the app you want to run
3. Click the "Run" button
4. Or use the context menu (right-click → "Run with MiniScripts" → select app)

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
  tabId: number;              // Tab ID for manual runs; 0 at auto-run startup
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
    getTabId(): Promise<number>; // Resolve current tab ID (including auto-run)
    waitForSelector(selector: string, timeoutMs?: number): Promise<Element | null>;
    injectStyle(css: string): HTMLStyleElement;
  };
  
  fetch: typeof fetch;
  document: Document;
  window: Window;
}
```

## Execution and security

- Chrome's `userScripts` API accepts user code as source; the extension does not use eval, Function constructors, inline script tags, or Blob modules to execute it.
- The default `USER_SCRIPT` world is exempt from page CSP and shares the DOM, but not page JavaScript globals. Its own CSP allows user scripts to evaluate strings.
- Select **Page** world to access page globals/prototypes, as required by LinkedIn Image Paste. Source injection works with strict CSP; subsequent eval and remote resource loading remain subject to page restrictions.
- Both worlds use per-script extension storage. The page bridge supports only scoped storage and auto-run result messages, never script management.
- The 30-second deadline reports unfinished async work; it does not interrupt infinite loops or cancel pending work.
- Chrome internal pages, the Chrome Web Store, other extensions, and protected viewers remain restricted. Local files need **Allow access to file URLs**. Network APIs retain browser CORS restrictions.

Code may be a default function export, a `run`/`app` function, or a console-style JavaScript snippet with `await`. TypeScript annotations and module imports are not supported.

## Permissions

- `storage`: Save settings and app data
- `scripting`: Install the isolated page-world storage bridge
- `userScripts`: Inject user-provided code and register auto-run rules
- `activeTab`: Access current tab content
- `tabs`: Query tab state
- `contextMenus`: Right-click menu integration
- `sidePanel`: Native sidebar (Chrome 135+)
- `host_permissions`: Execute on all URLs (required for auto-run)

## Troubleshooting

### Side Panel Not Available

MiniScripts requires Chrome 135 or newer, with native side-panel and user-script support.

### App Not Running

- Check that the app is **enabled** (toggle in sidebar)
- Verify match patterns include the current URL
- Check the browser console for errors (F12)
- Enable Allow User Scripts in extension details, then reload the extension and page
- Use the execution history to inspect syntax and runtime errors
- Update bundled samples through Settings → Reload sample scripts (custom scripts are kept)

### Clipboard Access Denied

Some pages block clipboard access. The "Copy All Links" app includes a fallback that creates a selectable textarea.

## Development

### Project Structure

```
/src
  /background.ts          # Service worker
  /contentRunner.ts       # Scoped storage bridge for page-world scripts
  /execution              # JavaScript preparation, source generation, userScripts API
  /sidepanel              # Sidebar UI (React)
  /options                # Options page (React)
  /shared                 # Shared utilities, types, storage
  /samples                # Sample miniscripts
  /styles                 # CSS
```

### Building

```bash
npm run build   # Production build
npm run dev               # Development with HMR (sidebar/options only)
```

### Adding Your Own Sample Apps

Edit `src/samples/index.ts` to include your preloaded apps.

## License

MIT

## Credits

Built with TypeScript, React, Vite, and Chrome Extension Manifest V3.
