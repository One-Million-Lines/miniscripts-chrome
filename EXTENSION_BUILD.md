# Building the Chrome Extension

This project contains a complete Chrome Extension with modular mini-apps architecture. Follow these steps to build and load it in Chrome.

## Prerequisites

- Node.js 16+ and npm installed
- Chrome browser (version 114+ recommended for native side panel support)

## Build Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the Extension

Since this project uses Vite, you need to build the extension with the custom configuration:

```bash
npx vite build --config vite.config.extension.ts
```

This will create a `dist` folder with all the extension files ready to load.

### 3. Load in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right corner)
3. Click "Load unpacked"
4. Select the `dist` folder from this project

The extension is now installed!

## File Structure

The build process creates the following structure in `dist/`:

```
dist/
├── manifest.json            # Extension manifest
├── background.js            # Service worker (background script)
├── contentRunner.js         # Content script for running apps
├── sidepanel.html          # Sidebar UI
├── options.html            # Options page
├── src/
│   ├── styles/extension.css # Styles
│   └── sidepanel/...       # Sidebar React app
├── assets/                 # Compiled assets
└── chunks/                 # Code chunks
```

## Adding to package.json

To make building easier, add this to your `package.json` scripts section:

```json
{
  "scripts": {
    "build:extension": "vite build --config vite.config.extension.ts"
  }
}
```

Then you can simply run:

```bash
npm run build:extension
```

## Icons

The extension currently uses placeholder icons. You can replace them by:

1. Creating three PNG icons: 16×16, 48×48, and 128×128 pixels
2. Saving them as `public/icon16.png`, `public/icon48.png`, `public/icon128.png`
3. Rebuilding the extension

Or use an icon generator like [Chrome Extension Icon Generator](https://www.iconsgenerator.com/chrome-extension).

## Development Workflow

### Sidebar/Options Development

For faster development of the sidebar and options page (with HMR):

```bash
npm run dev
```

Then navigate to `http://localhost:8080/sidepanel.html` or `/options.html`. Note: Chrome APIs won't work in this mode, but you can develop the UI/UX.

### Background/Content Script Development

Changes to `background.ts` and `contentRunner.ts` require a full rebuild:

```bash
npm run build:extension
```

Then click "Reload" on the extension card in `chrome://extensions/`.

## Testing the Extension

1. **Click the extension icon** - Opens the sidebar
2. **Try the sample apps**:
   - "Blur Overlay" - Creates a draggable blur rectangle
   - "Reader Margins" - Toggles reader-friendly layout
   - "Copy All Links" - Copies all page links to clipboard
3. **Right-click on any page** - Access "Run with ProductivityApps" menu
4. **Keyboard shortcuts**:
   - `Alt+Shift+M` - Toggle sidebar
   - `Alt+Shift+R` - Re-run last app

## Creating Your First App

1. Click the `+` button in the sidebar
2. Fill in the details:
   ```typescript
   Name: Hello World
   Description: My first mini-app
   Match Patterns: <all_urls>
   Code:
   
   export default async function run(ctx) {
     ctx.ui.notify("Hello World!");
     
     // Wait for an element
     const button = await ctx.helpers.waitForSelector('button');
     
     // Inject custom styles
     ctx.helpers.injectStyle(`
       body { background: lightblue !important; }
     `);
     
     // Persist data
     await ctx.storage.set('clickCount', 0);
     const count = await ctx.storage.get('clickCount', 0);
     
     ctx.ui.notify(`Button clicked ${count} times`);
   }
   ```

3. Click "Save"
4. Click "Run" to test it

## Troubleshooting

### Build Errors

If you see TypeScript errors, ensure `@types/chrome` is installed:

```bash
npm install --save-dev @types/chrome
```

### Extension Not Loading

- Check that you selected the `dist` folder, not the project root
- Ensure the build completed without errors
- Look for errors in `chrome://extensions/` (click "Details" → "Errors")

### APIs Not Working

- Ensure you're testing on a regular webpage (not chrome://, file://, or other restricted URLs)
- Check the extension has required permissions in manifest.json
- Look at the console in DevTools (F12) for error messages

### Side Panel Not Appearing

If you're on Chrome < 114, the side panel API isn't available. The extension will fall back to an in-page sidebar (future enhancement). Update Chrome or modify the code to use an injected sidebar.

## Permissions Explained

- `storage` - Save app settings and data
- `scripting` - Execute mini-apps in pages
- `activeTab` - Access the current tab when clicked
- `tabs` - Query tab state for auto-run
- `contextMenus` - Right-click menu integration
- `sidePanel` - Native sidebar (Chrome 114+)
- `<all_urls>` - Required to run apps on any page

## Distribution

To distribute your extension:

1. Create a zip of the `dist` folder:
   ```bash
   cd dist && zip -r ../extension.zip .
   ```

2. Upload to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)

3. Follow the submission process (requires $5 one-time developer fee)

## Security Notes

- No eval or remote code execution
- All scripts run in isolated content script world
- Strict CSP prevents XSS
- Apps timeout after 30 seconds
- Chrome storage sync (encrypted in transit)

## Advanced: Custom Build Config

The `vite.config.extension.ts` handles:
- Multiple entry points (background, content, sidepanel, options)
- Proper output structure for Chrome
- Asset bundling
- TypeScript compilation

You can customize this file to add more features or change the build output.

## Need Help?

- Check the [README.extension.md](./README.extension.md) for usage docs
- Look at the sample apps in `src/samples/`
- Review Chrome Extension docs: https://developer.chrome.com/docs/extensions/
- Check the app context API in `src/shared/types.ts`
