/**
 * UI Module
 * 
 * Handles all DOM rendering, interface interactions, and visual updates.
 * Manages song preview, transpose controls, notifications, and modal dialogs.
 */

import {
  transposeSong,
  transposeByOffset,
  getAvailableKeys,
  getOffsetLabel,
  getSemitoneOffset,
  detectKey
} from './transposer.js';

import {
  saveSong,
  getSongs,
  deleteSong,
  getSongById,
  searchSongs,
  getPreferences,
  savePreferences
} from './storage.js';

import {
  extractChords,
  isChord,
  parseChordSymbol
} from './chord-parser.js';

import {
  startAutoscroll,
  pauseAutoscroll,
  stopAutoscroll,
  isAutoscrolling,
  isPausedStatus,
  setScrollSpeed,
  initAutoscroll
} from './autoscroll.js';

// ============================================
// DOM Element References
// ============================================
const elements = {};

function cacheElements() {
  const ids = [
    'nav-toggle', 'nav-menu', 'theme-toggle', 'theme-icon', 'notation-toggle',
    'song-title', 'song-artist', 'original-key', 'song-input',
    'target-key', 'transpose-up', 'transpose-down', 'reset-key',
    'transpose-btn', 'semitone-offset', 'current-key-display',
    'transposed-song-display', 'paste-btn', 'clear-btn', 'sample-btn',
    'view-toggle', 'copy-transposed', 'download-txt', 'print-song',
    'copy-chords-only', 'save-song-btn', 'view-songs-btn',
    'song-library', 'song-list', 'song-search', 'empty-state',
    'toast', 'toast-message', 'delete-modal', 'delete-confirm',
    'delete-cancel', 'autoscroll-start', 'autoscroll-pause',
    'autoscroll-stop', 'scroll-speed', 'speed-value',
    'chord-panel', 'show-chord-diagrams'
  ];
  ids.forEach(id => {
    elements[id] = document.getElementById(id);
  });
}

// ============================================
// Application State
// ============================================
let state = {
  originalText: '',
  transposedText: '',
  originalKey: 'C',
  targetKey: 'C',
  useFlats: false,
  viewMode: 'both',
  isDarkMode: true,
  songToDeleteId: null
};

// ============================================
// Initialization
// ============================================

export function initUI() {
  cacheElements();
  loadPreferences();
  setupTheme();
  setupEventListeners();
  renderKeySelectors();
  renderQuickTransposeButtons();
  loadSampleSong();
  updateTransposeDisplay();
  renderSongLibrary();
}

/**
 * Load user preferences from storage.
 */
function loadPreferences() {
  const prefs = getPreferences();
  state.useFlats = prefs.useFlats || false;
  state.isDarkMode = prefs.theme !== 'light';
  if (prefs.fontSize) {
    document.documentElement.style.setProperty('--font-size', prefs.fontSize);
  }
  // Set initial notation toggle text
  const btn = elements.notationToggle;
  if (btn) btn.textContent = state.useFlats ? 'Flat' : 'Sharp';
}

/**
 * Setup theme (dark/light mode) based on preference.
 */
function setupTheme() {
  if (state.isDarkMode) {
    document.documentElement.classList.add('dark');
    elements.themeIcon.textContent = '🌙';
  } else {
    document.documentElement.classList.remove('dark');
    elements.themeIcon.textContent = '☀️';
  }
}

/**
 * Setup all event listeners for UI controls.
 */
function setupEventListeners() {
  elements.themeToggle.addEventListener('click', toggleTheme);
  elements.notationToggle.addEventListener('click', toggleNotation);
  elements.pasteBtn.addEventListener('click', pasteFromClipboard);
  elements.clearBtn.addEventListener('click', clearSong);
  elements.sampleBtn.addEventListener('click', loadSampleSong);

  // Mobile nav toggle
  const navToggle = document.getElementById('nav-toggle');
  const navMenu = document.getElementById('nav-menu');
  const navThemeToggle = document.getElementById('nav-theme-toggle');
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      navMenu.classList.toggle('hidden');
    });
  }
  if (navThemeToggle) {
    navThemeToggle.addEventListener('click', () => {
      toggleTheme();
      navMenu.classList.add('hidden');
    });
  }
  elements.transposeUp.addEventListener('click', () => transposeBySemitone(1));
  elements.transposeDown.addEventListener('click', () => transposeBySemitone(-1));
  elements.resetKey.addEventListener('click', resetToOriginal);
  elements.transposeBtn.addEventListener('click', performTranspose);
  elements.targetKey.addEventListener('change', () => {
    state.targetKey = elements.targetKey.value;
    updateTransposeDisplay();
    performTranspose();
  });
  elements.originalKey.addEventListener('change', () => {
    state.originalKey = elements.originalKey.value;
    updateTransposeDisplay();
    performTranspose();
  });
  elements.songInput.addEventListener('input', () => {
    state.originalText = elements.songInput.value;
    performTranspose();
  });
  elements.viewToggle.addEventListener('change', (e) => {
    state.viewMode = e.target.value;
    renderTransposedSong();
  });
  elements.copyTransposed.addEventListener('click', copyTransposedSong);
  elements.downloadTxt.addEventListener('click', downloadSongTXT);
  elements.printSong.addEventListener('click', printSong);
  elements.copyChordsOnly.addEventListener('click', copyChordsOnly);
  elements.saveSongBtn.addEventListener('click', handleSaveSong);
  elements.viewSongsBtn.addEventListener('click', toggleSongLibrary);
  elements.songSearch.addEventListener('input', (e) => {
    renderSongLibrary(e.target.value);
  });
  elements.autoscrollStart.addEventListener('click', () => {
    startAutoscroll(elements.transposedSongDisplay);
    updateAutoscrollButtons();
  });
  elements.autoscrollPause.addEventListener('click', () => {
    pauseAutoscroll();
    updateAutoscrollButtons();
  });
  elements.autoscrollStop.addEventListener('click', () => {
    stopAutoscroll();
    updateAutoscrollButtons();
  });
  elements.scrollSpeed.addEventListener('input', (e) => {
    const val = e.target.value;
    elements.speedValue.textContent = val + ' ms';
    setScrollSpeed(parseInt(val));
  });
  elements.showChordDiagrams.addEventListener('change', (e) => {
    elements.chordPanel.style.display = e.target.checked ? 'block' : 'none';
    savePreferences({ showChordDiagrams: e.target.checked });
  });
  elements.deleteConfirm.addEventListener('click', confirmDeleteSong);
  elements.deleteCancel.addEventListener('click', closeDeleteModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDeleteModal();
    if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); performTranspose(); }
    if (e.ctrlKey && e.key === 's') { e.preventDefault(); handleSaveSong(); }
  });
}
// ============================================
// Theme
// ============================================

function toggleTheme() {
  state.isDarkMode = !state.isDarkMode;
  if (state.isDarkMode) {
    document.documentElement.classList.add('dark');
    elements.themeIcon.textContent = '🌙';
  } else {
    document.documentElement.classList.remove('dark');
    elements.themeIcon.textContent = '☀️';
  }
  savePreferences({ theme: state.isDarkMode ? 'dark' : 'light' });
  renderQuickTransposeButtons();
}

function toggleNotation() {
  state.useFlats = !state.useFlats;
  const btn = elements.notationToggle;
  btn.textContent = state.useFlats ? 'Flat' : 'Sharp';
  savePreferences({ useFlats: state.useFlats });
  renderKeySelectors();
  renderQuickTransposeButtons();
  performTranspose();
}

// ============================================
// Song Loading
// ============================================

const SAMPLE_SONGS = [
  {
    title: 'Amazing Grace',
    artist: 'Traditional',
    key: 'G',
    content: `G C G Amazing grace, how sweet the sound

G D That saved a wretch like me

G C G I once was lost, but now am found

G D G Was blind, but now I see`
  },
  {
    title: 'How Great Is Our God',
    artist: 'Chris Tomlin',
    key: 'G',
    content: `G The splendor of the King, clothed in majesty

Em7 Let all the earth rejoice, all the earth rejoice

C He wraps Himself in light, and darkness tries to hide

D And trembles at His voice

G Em7 C D How great is our God, sing with me

G Em7 C D How great is our God, all will see

G Em7 C D How great, how great is our God`
  },
  {
    title: '10,000 Reasons (Bless the Lord)',
    artist: 'Matt Redman',
    key: 'C',
    content: `C The sun comes up, it's a new day dawning

F It's time to sing Your song again

C Whatever may pass, and whatever lies before me

F Let me be singing when the evening comes

C F C G Bless the Lord, O my soul, O my soul

C F C G Worship His holy name

C F C G Sing like never before, O my soul

C F C G I'll worship Your holy name`
  },
  {
    title: 'Shout to the Lord',
    artist: 'Darlene Zschech',
    key: 'C',
    content: `C My Jesus, my Savior

Dm7 Lord, there is none like You

F All of my days, I want to praise

C G The wonders of Your mighty love

C My comfort, my shelter

Dm7 Tower of refuge and strength

F Let every breath, all that I am

C G C Never cease to worship You`
  },
  {
    title: 'Holy Holy Holy',
    artist: 'Traditional',
    key: 'F',
    content: `F Holy, holy, holy! Lord God Almighty

Bb Early in the morning our song shall rise to Thee

F C7 Holy, holy, holy, merciful and mighty

F God in three persons, blessed Trinity`
  },
  {
    title: 'In Christ Alone',
    artist: 'Keith Getty & Stuart Townend',
    key: 'C',
    content: `C In Christ alone, my hope is found

F He is my light, my strength, my song

C G This cornerstone, this solid ground

C Firm through the fiercest drought and storm

C What heights of love, what depths of peace

F When fears are stilled, when strivings cease

C G C My comforter, my all in all`
  }
];

let currentSampleIndex = 0;

function loadSampleSong() {
  const sample = SAMPLE_SONGS[currentSampleIndex];

  elements.songTitle.value = sample.title;
  elements.songArtist.value = sample.artist;
  elements.originalKey.value = sample.key;
  state.originalKey = sample.key;
  state.originalText = sample.content;
  elements.songInput.value = sample.content;
  state.targetKey = sample.key;
  elements.targetKey.value = sample.key;
  updateTransposeDisplay();
  performTranspose();
  showToast(`Sample loaded: ${sample.title}`);

  currentSampleIndex = (currentSampleIndex + 1) % SAMPLE_SONGS.length;
}

export { loadSampleSong };

function pasteFromClipboard() {
  navigator.clipboard.readText().then(text => {
    if (text) {
      elements.songInput.value = text;
      state.originalText = text;
      elements.songInput.dispatchEvent(new Event('input'));
      showToast('Song pasted from clipboard');
    }
  }).catch(err => {
    showToast('Failed to read clipboard', 'error');
  });
}

function clearSong() {
  if (confirm('Clear all song content?')) {
    elements.songInput.value = '';
    elements.songTitle.value = '';
    elements.songArtist.value = '';
    state.originalText = '';
    performTranspose();
    showToast('Song cleared');
  }
}
// ============================================
// Transposition
// ============================================

function performTranspose() {
  const text = elements.songInput.value;
  state.originalText = text;
  const originalKey = elements.originalKey.value;
  const targetKey = elements.targetKey.value;
  state.originalKey = originalKey;
  state.targetKey = targetKey;
  const result = transposeSong(text, originalKey, targetKey, state.useFlats);
  state.transposedText = result.transposedText;
  updateTransposeDisplay();
  renderTransposedSong();
  updateChordPanel(text);
  renderQuickTransposeButtons();
}

function transposeBySemitone(semitones) {
  const text = elements.songInput.value;
  const currentKey = state.targetKey;
  const result = transposeByOffset(text, currentKey, semitones, state.useFlats);
  elements.targetKey.value = result.newKey;
  state.targetKey = result.newKey;
  state.transposedText = result.transposedText;
  updateTransposeDisplay();
  renderTransposedSong();
  showToast(result.offsetLabel);
  renderQuickTransposeButtons();
}

function resetToOriginal() {
  elements.targetKey.value = state.originalKey;
  state.targetKey = state.originalKey;
  performTranspose();
  showToast('Reset to original key');
  renderQuickTransposeButtons();
}

function updateTransposeDisplay() {
  const offset = getSemitoneOffset(state.originalKey, state.targetKey);
  elements.semitoneOffset.textContent = getOffsetLabel(offset);
  elements.currentKeyDisplay.textContent = state.targetKey;
}

function renderTransposedSong() {
  const container = elements.transposedSongDisplay;
  if (!container) return;
  const text = state.transposedText || '';
  if (state.viewMode === 'lyrics-only') {
    const lyricsOnly = stripChords(text);
    container.innerHTML = formatSongLines(lyricsOnly, false);
  } else if (state.viewMode === 'chords-only') {
    const chordsOnly = extractChordsOnly(text);
    container.innerHTML = formatSongLines(chordsOnly, true);
  } else {
    container.innerHTML = formatSongLines(text, true);
  }
}

function stripChords(text) {
  return text.replace(/[A-G][#b]?(?:m|maj|min|dim|aug|sus|add)?\d*(?:b#\d*)?(?:\/[A-G][#b]?)?/g, '').replace(/\s+/g, ' ').trim();
}

function extractChordsOnly(text) {
  return text.split('\n').map(line => {
    const chords = [];
    let match;
    const regex = /[A-G][#b]?(?:m|maj|min|dim|aug|sus|add)?\d*(?:b#\d*)?(?:\/[A-G][#b]?)?/g;
    while ((match = regex.exec(line)) !== null) {
      chords.push(match[0]);
    }
    return chords.length > 0 ? chords.join(' ') : '';
  }).join('\n');
}

function formatSongLines(text, highlightChords) {
  const lines = text.split('\n');
  return lines.map(line => {
    if (line.trim() === '') return '<div class="song-line empty-line"></div>';
    if (highlightChords) {
      // Escape the line, then re-wrap chords in highlight spans
      const escaped = escapeHtml(line);
      const highlighted = escaped.replace(/([A-G][#b]?(?:m|maj|min|dim|aug|sus|add)?\d*(?:b#\d*)?(?:\/[A-G][#b]?)?)/g, '<span class="chord-highlight">$1</span>');
      return `<div class="song-line">${highlighted}</div>`;
    }
    return `<div class="song-line">${escapeHtml(line)}</div>`;
  }).join('');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
// ============================================
// Chord Reference Panel
// ============================================

function updateChordPanel(text) {
  const panel = elements.chordPanel;
  if (!panel || !elements.showChordDiagrams.checked) return;
  const chords = extractChords(text);
  if (chords.length === 0) {
    panel.innerHTML = '<p class="text-gray-500 text-sm">No chords detected</p>';
    return;
  }
  let html = '<h3 class="text-xs font-bold text-purple-400 mb-2 uppercase tracking-wider">Chord Reference</h3>';
  html += '<div class="grid grid-cols-2 sm:grid-cols-3 gap-2">';
  chords.slice(0, 12).forEach(chord => {
    html += `<div class="chord-card bg-gray-800/50 p-2 rounded-lg border border-gray-700 text-center">
      <div class="text-sm font-mono font-bold text-purple-300">${escapeHtml(chord)}</div>
      <div class="text-xs text-gray-400 mt-1">Click for diagram</div>
    </div>`;
  });
  html += '</div>';
  panel.innerHTML = html;
}

// ============================================
// Copy / Export
// ============================================

function copyTransposedSong() {
  const text = state.transposedText || elements.transposedSongDisplay.textContent;
  navigator.clipboard.writeText(text).then(() => {
    showToast('Transposed song copied to clipboard');
  }).catch(() => {
    showToast('Failed to copy', 'error');
  });
}

function copyChordsOnly() {
  const chords = extractChords(state.transposedText || '');
  if (chords.length === 0) {
    showToast('No chords found', 'error');
    return;
  }
  navigator.clipboard.writeText(chords.join(' ')).then(() => {
    showToast('Chords copied to clipboard');
  }).catch(() => {
    showToast('Failed to copy', 'error');
  });
}

function downloadSongTXT() {
  const title = elements.songTitle.value || 'song';
  const content = state.transposedText || '';
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/\s+/g, '_')}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Song downloaded as TXT');
}

function printSong() {
  const printContent = state.transposedText || '';
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html><head><title>Print - ${elements.songTitle.value}</title>
    <style>body{font-family:monospace;white-space:pre;line-height:1.6;padding:2rem;} .chord{color:#8b5cf6;font-weight:bold;}</style>
    </head><body>${escapeHtml(printContent)}</body></html>
  `);
  printWindow.document.close();
  printWindow.print();
}
// ============================================
// Save / Library
// ============================================

function handleSaveSong() {
  const title = elements.songTitle.value.trim();
  if (!title) {
    showToast('Please enter a song title', 'error');
    return;
  }
  const song = {
    title: title,
    artist: elements.songArtist.value.trim(),
    originalKey: state.originalKey,
    content: state.originalText,
    targetKey: state.targetKey
  };
  if (saveSong(song)) {
    showToast('Song saved successfully');
    renderSongLibrary();
  } else {
    showToast('Failed to save song', 'error');
  }
}

function toggleSongLibrary() {
  const library = elements.songLibrary;
  if (library.style.display === 'none' || !library.style.display) {
    library.style.display = 'block';
    renderSongLibrary();
  } else {
    library.style.display = 'none';
  }
}

function renderSongLibrary(query = '') {
  const list = elements.songList;
  const empty = elements.emptyState;
  if (!list) return;
  const songs = searchSongs(query);
  list.innerHTML = '';
  if (songs.length === 0) {
    if (empty) empty.style.display = 'block';
    list.style.display = 'none';
    return;
  }
  if (empty) empty.style.display = 'none';
  list.style.display = 'block';
  songs.forEach(song => {
    const div = document.createElement('div');
    div.className = 'song-item bg-gray-800/50 p-3 rounded-lg border border-gray-700 mb-2 flex justify-between items-center cursor-pointer group';
    div.innerHTML = `
      <div>
        <div class="font-semibold text-white">${escapeHtml(song.title)}</div>
        <div class="text-sm text-gray-400">${escapeHtml(song.artist || 'Unknown')} • Key: ${song.originalKey}</div>
      </div>
      <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button class="load-song bg-purple-600 hover:bg-purple-500 text-white px-2 py-1 rounded text-xs" data-id="${song.id}">Load</button>
        <button class="delete-song bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded text-xs" data-id="${song.id}">Delete</button>
      </div>
    `;
    div.querySelector('.load-song').addEventListener('click', (e) => { e.stopPropagation(); loadSongFromLibrary(song.id); });
    div.querySelector('.delete-song').addEventListener('click', (e) => { e.stopPropagation(); openDeleteModal(song.id); });
    div.addEventListener('click', () => loadSongFromLibrary(song.id));
    list.appendChild(div);
  });
}

function loadSongFromLibrary(id) {
  const song = getSongById(id);
  if (!song) return;
  elements.songTitle.value = song.title;
  elements.songArtist.value = song.artist;
  elements.originalKey.value = song.originalKey;
  state.originalKey = song.originalKey;
  state.originalText = song.content;
  elements.songInput.value = song.content;
  elements.targetKey.value = song.targetKey;
  state.targetKey = song.targetKey;
  updateTransposeDisplay();
  performTranspose();
  toggleSongLibrary();
  showToast(`Loaded: ${song.title}`);
}

function openDeleteModal(id) {
  state.songToDeleteId = id;
  elements.deleteModal.classList.remove('hidden');
}

function closeDeleteModal() {
  elements.deleteModal.classList.add('hidden');
  state.songToDeleteId = null;
}

function confirmDeleteSong() {
  if (!state.songToDeleteId) return;
  if (deleteSong(state.songToDeleteId)) {
    showToast('Song deleted');
    renderSongLibrary();
  } else {
    showToast('Failed to delete song', 'error');
  }
  closeDeleteModal();
}
// ============================================
// Autoscroll UI
// ============================================

function updateAutoscrollButtons() {
  const running = isAutoscrolling();
  const paused = isPausedStatus();
  elements.autoscrollStart.disabled = running;
  elements.autoscrollPause.disabled = !running;
  elements.autoscrollPause.textContent = paused ? 'Resume' : 'Pause';
  elements.autoscrollStop.disabled = !running;
}

initAutoscroll({ speed: 50, step: 1 });

// ============================================
// Toast Notifications
// ============================================

let toastTimeout = null;

export function showToast(message, type = 'success') {
  const toast = elements.toast;
  const toastMsg = elements.toastMessage;
  if (!toast || !toastMsg) return;
  toastMsg.textContent = message;
  toast.className = `fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg text-white font-medium z-50 transform translate-y-0 transition-transform duration-300 ${
    type === 'error' ? 'bg-red-500' : 'bg-purple-600'
  }`;
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.add('translate-y-full');
  }, 3000);
}
// ============================================
// Key Selectors & Quick Transpose
// ============================================

export function renderKeySelectors() {
  const keys = getAvailableKeys(state.useFlats);
  const originalSelect = elements.originalKey;
  const targetSelect = elements.targetKey;
  
  if (!originalSelect || !targetSelect) return;

  originalSelect.innerHTML = '';
  targetSelect.innerHTML = '';

  keys.forEach(key => {
    const opt1 = document.createElement('option');
    opt1.value = key;
    opt1.textContent = key;
    if (key === state.originalKey) opt1.selected = true;
    originalSelect.appendChild(opt1);

    const opt2 = document.createElement('option');
    opt2.value = key;
    opt2.textContent = key;
    if (key === state.targetKey) opt2.selected = true;
    targetSelect.appendChild(opt2);
  });
}

export function renderQuickTransposeButtons() {
  const container = document.getElementById('quick-transpose');
  if (!container) return;
  container.innerHTML = '';

  const offsets = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];
  offsets.forEach(offset => {
    const btn = document.createElement('button');
    btn.className = `px-3 py-1.5 rounded text-xs font-medium transition-all ${
      offset === 0
        ? 'bg-purple-600 text-white'
        : 'bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white border border-slate-600'
    }`;
    btn.textContent = offset === 0 ? 'Original' : (offset > 0 ? `+${offset}` : offset);
    btn.onclick = () => transposeBySemitone(offset);
    container.appendChild(btn);
  });
}

// Update transposeBySemitone to also update quick buttons UI
const _transposeBySemitone = transposeBySemitone;
export function transposeBySemitone(semitones) {
  _transposeBySemitone(semitones);
  renderQuickTransposeButtons();
}

const _performTranspose = performTranspose;
export function performTranspose() {
  _performTranspose();
  renderQuickTransposeButtons();
}

const _resetToOriginal = resetToOriginal;
export function resetToOriginal() {
  _resetToOriginal();
  renderQuickTransposeButtons();
}

const _toggleTheme = toggleTheme;
export function toggleTheme() {
  _toggleTheme();
  renderQuickTransposeButtons();
}