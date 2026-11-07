/**
 * ChordShift - Main Application Module
 * 
 * Application initialization and top-level event handling.
 * Coordinates all modules: transposer, chord-parser, storage, autoscroll, and UI.
 */

import { initUI, showToast, loadSampleSong } from './ui.js';

// Application version
const APP_VERSION = '1.0.0';

/**
 * Initialize the ChordShift application.
 * Called when the DOM is fully loaded.
 */
function initApp() {
  console.log(`ChordShift v${APP_VERSION} initializing...`);

  try {
    initUI();
    console.log('ChordShift initialized successfully');
  } catch (error) {
    console.error('ChordShift initialization failed:', error);
    showToast('Application failed to initialize', 'error');
  }
}

// Global function for HTML onclick sample load
window.loadSampleViaHTML = function() {
  loadSampleSong();

  // Scroll to transposer
  const transposer = document.getElementById('transposer');
  if (transposer) transposer.scrollIntoView({ behavior: 'smooth' });
};

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Export for potential module use
export { APP_VERSION };