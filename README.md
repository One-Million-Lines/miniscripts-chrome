# MiniScripts - Chrome Extension

A Chrome extension that allows you to run modular miniscripts on any webpage with auto-run rules and on-demand execution.

## Development Setup

### Prerequisites
- Node.js 22.18+ (or 24+)
- Chrome 135+

### Installation
```sh
# Clone the repository
git clone <YOUR_GIT_URL>
cd miniscripts

# Install dependencies
npm install
```

### Development Workflow

For **live reloading** during development:

```sh
# Start development mode with file watching
npm run dev:watch
```

**Development Steps:**
1. **Start the watch mode** - `npm run dev:watch`
2. **Make changes** to your React/TypeScript code
3. **Auto-rebuild** happens automatically when files change
4. **Reload extension** in Chrome:
   - Go to `chrome://extensions/`
   - Find "MiniScripts"
   - Click the 🔄 refresh icon
5. **Test your changes** in the browser

**Alternative commands:**
```sh
# One-time build > needed to refresh chrome extension if you load it again
npm run build

# Development build (with source maps)
npm run build:dev

# Start dev server (for debugging)
npm run dev
```

### Loading the Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `dist` folder in your project
5. Open MiniScripts **Details** and enable **Allow User Scripts** (Chrome 138+). On Chrome 135–137, enable Developer mode instead.
6. Reload the extension and the website after changing that setting.
7. To update existing samples, open MiniScripts → Settings → Reload sample scripts. This replaces built-in samples while keeping custom scripts.

### Features

- **Side Panel**: Access mini-apps from any webpage
- **Auto-run Rules**: Apps can run automatically based on URL patterns
- **On-demand Execution**: Run apps manually when needed
- **Import/Export**: Backup and restore your app configurations
- **Keyboard Shortcuts**:
  - `Alt+Shift+M`: Toggle sidebar
  - `Alt+Shift+R`: Re-run last app

## Technologies Used

- **Vite** - Build tool and dev server
- **TypeScript** - Type-safe JavaScript
- **React** - UI framework
- **shadcn/ui** - Modern component library
- **Tailwind CSS** - Utility-first CSS framework
- **Chrome Extension Manifest V3** - Modern extension API

## Project Structure

```
src/
├── background.ts          # Service worker
├── contentRunner.ts       # Content script injection
├── sidepanel/            # Side panel UI
│   ├── App.tsx          # Main sidepanel component
│   ├── components/      # Reusable components
│   └── main.tsx         # Entry point
├── options/             # Options page
├── shared/              # Shared utilities and types
└── styles/              # Styles (now using Tailwind)
```

## Contributing

Feel free to extend this project! The codebase is built with modern React patterns and TypeScript for maintainability.
## Script execution

MiniScripts uses Chrome's `userScripts` API to inject JavaScript source directly. It never compiles user code inside the service worker. Extension pages keep a strict Manifest V3 CSP.

- **Isolated world** (default): scripts share the page DOM and run independently of its script CSP. They cannot access page JavaScript globals or patch the page's prototypes.
- **Page world**: scripts share page globals and prototypes, like console snippets. Use it for the LinkedIn Image Paste sample. Chrome injects the source directly; page CSP still applies to subsequent `eval`, dynamic script loading, and resources.
- Both worlds use extension-backed, per-script `ctx.storage`. Page-world scripts communicate through a bridge limited to the running script's storage and execution logs.
- Code accepts a default function export, a `run` / `app` function, or a plain console-style snippet, including `await`. Use JavaScript; TypeScript annotations and module imports are not supported.
- Native auto-run registration honors document start/end/idle. `Click` is manual only. Changes apply to subsequent page loads. For auto-run, `ctx.tabId` starts at 0 so a background round-trip cannot delay document-start code; use `await ctx.helpers.getTabId()` to resolve it when needed.
- A 30-second deadline reports stalled async work. It cannot interrupt synchronous loops or cancel work already running.

Chrome blocks extensions on browser settings, other extensions, the Chrome Web Store, and some protected viewers. Local files require **Allow access to file URLs**. CORS, network restrictions, and user-gesture requirements still apply; no extension can promise the privileges of DevTools on every page.

## Verification

```sh
npm test                 # Parser/runtime regression tests
npm run typecheck        # Extension entry points and their dependencies
npm run lint:execution   # Execution code, samples, and editor/settings changes
npm run test:browser      # Builds, then tests in an isolated Chrome profile
```

The browser suite uses the installed Google Chrome on macOS. Elsewhere, install Playwright Chromium (`npx playwright install chromium`) or set `MINISCRIPTS_CHROME` to a Chromium-based browser executable. It uses Chrome's extension testing API and toggles user-script access only in a disposable profile. The suite serves a local page with script/style CSP restrictions and Trusted Types, and uses a simulated LinkedIn page without contacting LinkedIn or publishing anything.

`npm run lint` and `tsc -p tsconfig.app.json` also scan unused UI scaffold components; those currently have unrelated lint/type incompatibilities with upgraded UI dependencies. The focused commands above cover the shipped extension entry points.
