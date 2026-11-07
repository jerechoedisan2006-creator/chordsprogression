/**
 * Autoscroll Module
 * 
 * Provides automatic scrolling through the song preview area
 * with adjustable speed and start/pause/stop controls.
 */

let autoscrollInterval = null;
let isPaused = false;
let scrollSpeed = 50; // milliseconds between steps
let scrollStep = 1; // pixels per step

const AUTOCOORD_ELEMENT_ID = 'transposed-song-display';

/**
 * Initialize autoscroll module with settings.
 * @param {Object} options - { speed, step }
 */
export function initAutoscroll(options = {}) {
  if (options.speed) scrollSpeed = options.speed;
  if (options.step) scrollStep = options.step;
}

/**
 * Start autoscrolling the song display.
 * @param {HTMLElement} element - The element to scroll (defaults to song display)
 * @param {Function} onStart - Optional callback when scrolling starts
 * @returns {boolean} True if started successfully
 */
export function startAutoscroll(element = null, onStart = null) {
  stopAutoscroll();
  isPaused = false;

  const target = element || document.getElementById(AUTOCOORD_ELEMENT_ID);
  if (!target) return false;

  autoscrollInterval = setInterval(() => {
    if (isPaused) return;
    target.scrollTop += scrollStep;
  }, scrollSpeed);

  if (onStart) onStart();
  return true;
}

/**
 * Pause autoscrolling.
 */
export function pauseAutoscroll() {
  isPaused = true;
}

/**
 * Resume autoscrolling after pause.
 */
export function resumeAutoscroll() {
  isPaused = false;
}

/**
 * Stop autoscrolling and reset.
 */
export function stopAutoscroll() {
  if (autoscrollInterval) {
    clearInterval(autoscrollInterval);
    autoscrollInterval = null;
  }
  isPaused = false;
}

/**
 * Check if autoscroll is currently running.
 * @returns {boolean}
 */
export function isAutoscrolling() {
  return autoscrollInterval !== null;
}

/**
 * Check if autoscroll is paused.
 * @returns {boolean}
 */
export function isPausedStatus() {
  return isPaused;
}

/**
 * Set the scrolling speed (milliseconds per step).
 * @param {number} ms - Speed in milliseconds
 */
export function setScrollSpeed(ms) {
  scrollSpeed = Math.max(10, ms);
  if (autoscrollInterval) {
    stopAutoscroll();
    startAutoscroll();
  }
}

/**
 * Set the scroll step size (pixels per step).
 * @param {number} pixels - Pixels to scroll per step
 */
export function setScrollStep(pixels) {
  scrollStep = Math.max(1, pixels);
}