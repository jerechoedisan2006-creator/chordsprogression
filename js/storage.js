/**
 * Storage Module
 * 
 * Handles LocalStorage persistence for saved songs and user preferences.
 * Provides a reliable API with error handling for quota limits and
 * private browsing mode restrictions.
 */

const STORAGE_KEYS = {
  SONGS: 'chordshift_songs',
  PREFERENCES: 'chordshift_preferences'
};

/**
 * Default user preferences
 * @type {Object}
 */
const DEFAULT_PREFERENCES = {
  useFlats: false,
  theme: 'dark',
  fontSize: 'medium',
  autoscrollSpeed: 50,
  showChordDiagrams: true
};

/**
 * Check if LocalStorage is available and writable.
 * @returns {boolean} True if LocalStorage is usable
 */
function isStorageAvailable() {
  try {
    const testKey = '__chordshift_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Safely parse JSON from LocalStorage with fallback.
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if parsing fails
 * @returns {*} The stored value or default
 */
function getStored(key, defaultValue) {
  if (!isStorageAvailable()) return defaultValue;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return defaultValue;
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`ChordShift: Failed to read storage key "${key}"`, e);
    return defaultValue;
  }
}

/**
 * Safely write JSON to LocalStorage.
 * @param {string} key - Storage key
 * @param {*} value - Value to store
 * @returns {boolean} True if write succeeded
 */
function setStored(key, value) {
  if (!isStorageAvailable()) return false;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn(`ChordShift: Failed to write storage key "${key}"`, e);
    return false;
  }
}

/**
 * Get all saved songs from LocalStorage.
 * @returns {Array} Array of song objects
 */
export function getSongs() {
  return getStored(STORAGE_KEYS.SONGS, []);
}

/**
 * Save a song to LocalStorage.
 * If a song with the same title exists, it will be updated.
 * @param {Object} song - Song object with title, artist, key, content, targetKey
 * @returns {boolean} True if saved successfully
 */
export function saveSong(song) {
  const songs = getSongs();
  const now = new Date().toISOString();
  const songToSave = {
    id: Date.now().toString(),
    title: song.title || 'Untitled',
    artist: song.artist || '',
    originalKey: song.originalKey || 'C',
    content: song.content || '',
    targetKey: song.targetKey || 'C',
    createdAt: song.createdAt || now,
    updatedAt: now
  };

  const existingIndex = songs.findIndex(s => s.title.toLowerCase() === songToSave.title.toLowerCase() && s.artist === songToSave.artist);
  if (existingIndex >= 0) {
    songs[existingIndex] = { ...songs[existingIndex], ...songToSave };
  } else {
    songs.push(songToSave);
  }

  return setStored(STORAGE_KEYS.SONGS, songs);
}

/**
 * Delete a song from LocalStorage by its ID.
 * @param {string} id - The song ID
 * @returns {boolean} True if deleted successfully
 */
export function deleteSong(id) {
  const songs = getSongs();
  const filtered = songs.filter(s => s.id !== id);
  if (filtered.length === songs.length) return false;
  return setStored(STORAGE_KEYS.SONGS, filtered);
}

/**
 * Get a single song by ID.
 * @param {string} id - The song ID
 * @returns {Object|null} The song object or null if not found
 */
export function getSongById(id) {
  const songs = getSongs();
  return songs.find(s => s.id === id) || null;
}

/**
 * Search songs by title or artist.
 * @param {string} query - Search query
 * @returns {Array} Matching songs
 */
export function searchSongs(query) {
  if (!query) return getSongs();
  const q = query.toLowerCase();
  return getSongs().filter(s =>
    s.title.toLowerCase().includes(q) ||
    s.artist.toLowerCase().includes(q)
  );
}

/**
 * Get user preferences from LocalStorage.
 * @returns {Object} The preferences object
 */
export function getPreferences() {
  return getStored(STORAGE_KEYS.PREFERENCES, { ...DEFAULT_PREFERENCES });
}

/**
 * Save user preferences to LocalStorage.
 * @param {Object} prefs - Partial preferences to merge and save
 * @returns {boolean} True if saved successfully
 */
export function savePreferences(prefs) {
  const current = getPreferences();
  const updated = { ...current, ...prefs };
  return setStored(STORAGE_KEYS.PREFERENCES, updated);
}

/**
 * Clear all saved songs.
 * @returns {boolean} True if cleared
 */
export function clearAllSongs() {
  return setStored(STORAGE_KEYS.SONGS, []);
}