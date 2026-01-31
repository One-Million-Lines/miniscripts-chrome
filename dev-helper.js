#!/usr/bin/env node

/**
 * Chrome Extension Development Helper
 *
 * This script helps with the development workflow for Chrome extensions.
 * It provides clear instructions for live reloading during development.
 */

const { exec } = require('child_process');
const path = require('path');

console.log('🚀 Chrome Extension Development Mode');
console.log('=====================================');
console.log('');
console.log('📝 Development Workflow:');
console.log('1. Make changes to your code');
console.log('2. The extension will rebuild automatically');
console.log('3. Reload the extension in Chrome:');
console.log('   - Go to chrome://extensions/');
console.log('   - Find "Productivity Apps" in the list');
console.log('   - Click the refresh icon 🔄');
console.log('4. Test your changes!');
console.log('');
console.log('💡 Pro Tips:');
console.log('• Keep chrome://extensions/ open in a tab for quick reloading');
console.log('• Use Ctrl+C to stop the dev server');
console.log('• Check the terminal for any build errors');
console.log('');
console.log('🔧 Starting watch mode...');
console.log('');

// Start the watch build
const buildProcess = exec('npm run dev:watch', {
  cwd: path.dirname(__filename),
  stdio: 'inherit'
});

buildProcess.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Build completed successfully');
  } else {
    console.log('❌ Build failed');
  }
});

buildProcess.on('error', (error) => {
  console.error('❌ Error starting build process:', error);
});