# Productivity Apps - Chrome Extension

A Chrome extension that allows you to run modular mini-apps on any webpage with auto-run rules and on-demand execution.

## Development Setup

### Prerequisites
- Node.js 18+
- Chrome browser

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
   - Find "Productivity Apps"
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
5. The extension should now be loaded and active

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