/**
 * Chord Parser Module
 * 
 * Responsible for recognizing and parsing chord symbols from song text.
 * Handles complex chord types including slash chords, extended chords,
 * altered chords, and preserves chord qualities during transposition.
 */

/**
 * All 12 chromatic notes in sharp notation (index = semitone value)
 * @type {string[]}
 */
const SHARP_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * All 12 chromatic notes in flat notation (index = semitone value)
 * @type {string[]}
 */
const FLAT_NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/**
 * Map from any note name (sharp or flat) to its semitone value (0-11)
 * @type {Object<string, number>}
 */
const NOTE_TO_SEMITONE = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4,
  'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9,
  'A#': 10, 'Bb': 10, 'B': 11
};

/**
 * Valid chord root notes (A-G with optional accidental)
 * @type {RegExp}
 */
const CHORD_ROOT = /^([A-G][#b]?)/;

/**
 * Full chord symbol pattern.
 * Captures:
 *   Group 1: Root note (e.g., C, C#, Db, G)
 *   Group 2: Quality/modifier (e.g., m, maj7, 7, sus2, add9, dim, aug, 5, 9, 7b9)
 *   Group 3: Slash bass note including the slash (e.g., /E, /G#, /F#)
 * @type {RegExp}
 */
const CHORD_SYMBOL = /^([A-G][#b]?)(m(?:aj|in|7)?|maj7|m7|dim|aug|sus[24]|add\d+|\d+|7[b#]\d*|b\d|#\d)?(\/[A-G][#b]?)?$/i;

/**
 * Pattern to find chord tokens within text.
 * Matches chords at word boundaries that are separated by whitespace
 * or at line boundaries, to avoid modifying ordinary lyrics.
 * @type {RegExp}
 */
const CHORD_IN_TEXT = /(^|\s)([A-G][#b]?(?:m(?:aj|in|7)?|maj7|m7|dim|aug|sus[24]|add\d+|\d+|7[b#]\d*)(?:\/[A-G][#b]?)?)(?=\s|$)/gi;

/**
 * Common English words and short lyric fragments that should NOT be treated
 * as chords even if they match a single-letter note name.
 * @type {Set<string>}
 */
const LYRIC_FALSE_POSITIVES = new Set([
  'a', 'an', 'the', 'i', 'me', 'you', 'he', 'she', 'we', 'they',
  'to', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'from',
  'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'can', 'may', 'might', 'must', 'shall', 'o', 'oh'
]);

/**
 * Parse a single chord symbol into its components.
 * @param {string} symbol - The chord symbol string (e.g., "Am7", "G/B", "C#dim")
 * @returns {Object|null} Parsed chord with root, quality, bass, and original,
 *                        or null if the symbol is not a valid chord.
 */
export function parseChordSymbol(symbol) {
  if (typeof symbol !== 'string') return null;
  const trimmed = symbol.trim();
  if (!trimmed) return null;

  const match = trimmed.match(CHORD_SYMBOL);
  if (!match) return null;

  const root = match[1].toUpperCase();
  const quality = (match[2] || '').toLowerCase();
  const bass = match[3] ? match[3].slice(1).toUpperCase() : null;

  // Validate that root and bass (if present) are real notes
  if (!NOTE_TO_SEMITONE.hasOwnProperty(root)) return null;
  if (bass && !NOTE_TO_SEMITONE.hasOwnProperty(bass)) return null;

  return {
    root,
    quality,
    bass,
    original: trimmed
  };
}

/**
 * Check if a token looks like a chord symbol.
 * @param {string} token - The token to test
 * @returns {boolean} True if the token is a valid chord symbol
 */
export function isChord(token) {
  return parseChordSymbol(token) !== null;
}

/**
 * Build a chord symbol from its parsed components.
 * @param {Object} chord - Parsed chord object with root, quality, bass
 * @returns {string} The reconstructed chord symbol
 */
export function buildChordSymbol(chord) {
  let result = chord.root;
  if (chord.quality) result += chord.quality;
  if (chord.bass) result += '/' + chord.bass;
  return result;
}

/**
 * Transpose a single note by a number of semitones.
 * @param {string} note - Note name (e.g., "C", "F#", "Bb")
 * @param {number} semitones - Number of semitones to transpose (positive or negative)
 * @param {boolean} useFlats - If true, prefer flat notation; otherwise sharp
 * @returns {string} The transposed note name
 */
export function transposeNote(note, semitones, useFlats = false) {
  const num = NOTE_TO_SEMITONE[note];
  if (num === undefined) return note;
  const newNum = (num + semitones % 12 + 12) % 12;
  return useFlats ? FLAT_NOTES[newNum] : SHARP_NOTES[newNum];
}

/**
 * Transpose a parsed chord object by a number of semitones.
 * @param {Object} chord - Parsed chord object
 * @param {number} semitones - Number of semitones to transpose
 * @param {boolean} useFlats - Prefer flat notation
 * @returns {Object} Transposed chord object
 */
export function transposeChord(chord, semitones, useFlats = false) {
  return {
    root: transposeNote(chord.root, semitones, useFlats),
    quality: chord.quality,
    bass: chord.bass ? transposeNote(chord.bass, semitones, useFlats) : null,
    original: chord.original
  };
}

/**
 * Transpose all chords found in a text block.
 * Preserves lyrics, spacing, line breaks, and formatting.
 * Only tokens recognized as chords are modified.
 * @param {string} text - The song text with chords and lyrics
 * @param {number} semitones - Number of semitones to transpose
 * @param {boolean} useFlats - Prefer flat notation
 * @returns {string} The transposed song text
 */
export function transposeText(text, semitones, useFlats = false) {
  if (!text || typeof text !== 'string') return text;

  return text.replace(CHORD_IN_TEXT, (match, leadingWhitespace, chordToken) => {
    // Skip single-letter tokens that are likely lyrics, not chords
    if (chordToken.length === 1 && LYRIC_FALSE_POSITIVES.has(chordToken.toLowerCase())) {
      return match;
    }

    const chord = parseChordSymbol(chordToken);
    if (!chord) return match;

    const transposed = transposeChord(chord, semitones, useFlats);
    return leadingWhitespace + buildChordSymbol(transposed);
  });
}

/**
 * Extract all unique chords from a text block.
 * Useful for chord reference panels.
 * @param {string} text - The song text
 * @returns {string[]} Array of unique chord symbols found
 */
export function extractChords(text) {
  if (!text) return [];
  const chords = [];
  let match;
  const regex = new RegExp(CHORD_IN_TEXT.source, 'gi');
  while ((match = regex.exec(text)) !== null) {
    const chord = parseChordSymbol(match[2]);
    if (chord && !chords.includes(chord.original)) {
      chords.push(chord.original);
    }
  }
  return chords;
}