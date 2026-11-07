/**
 * Transposer Module
 * 
 * Provides high-level transposition logic for songs.
 * Calculates semitone intervals between keys and coordinates
 * the chord parser to transpose song text.
 */

import {
  transposeText,
  parseChordSymbol,
  extractChords,
  SHARP_NOTES,
  FLAT_NOTES,
  NOTE_TO_SEMITONE
} from './chord-parser.js';

/**
 * All supported musical keys in sharp notation
 * @type {string[]}
 */
export const KEYS_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * All supported musical keys in flat notation
 * @type {string[]}
 */
export const KEYS_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/**
 * Get all available keys based on notation preference
 * @param {boolean} useFlats - If true, return flat key names
 * @returns {string[]} Array of key names
 */
export function getAvailableKeys(useFlats = false) {
  return useFlats ? KEYS_FLAT : KEYS_SHARP;
}

/**
 * Calculate the number of semitones between two keys.
 * Positive means target is higher than original.
 * @param {string} originalKey - The original key (e.g., "C", "G", "Bb")
 * @param {string} targetKey - The target key (e.g., "D", "F", "Eb")
 * @returns {number} Semitone difference (target - original)
 */
export function getSemitoneOffset(originalKey, targetKey) {
  const origNum = NOTE_TO_SEMITONE[originalKey];
  const targetNum = NOTE_TO_SEMITONE[targetKey];
  if (origNum === undefined || targetNum === undefined) return 0;
  return (targetNum - origNum + 12) % 12;
}

/**
 * Get the display label for a semitone offset.
 * @param {number} semitones - The semitone offset (0-11)
 * @returns {string} Human-readable label like "+2 semitones" or "Original"
 */
export function getOffsetLabel(semitones) {
  if (semitones === 0) return 'Original';
  return semitones > 0 ? `+${semitones} semitones` : `-${Math.abs(semitones)} semitones`;
}

/**
 * Transpose a song from its original key to a target key.
 * @param {string} text - The song text with chords and lyrics
 * @param {string} originalKey - The original key of the song
 * @param {string} targetKey - The target key to transpose to
 * @param {boolean} useFlats - Prefer flat notation for output
 * @returns {Object} { transposedText, semitones, offsetLabel }
 */
export function transposeSong(text, originalKey, targetKey, useFlats = false) {
  const semitones = getSemitoneOffset(originalKey, targetKey);
  const transposedText = transposeText(text, semitones, useFlats);
  return {
    transposedText,
    semitones,
    offsetLabel: getOffsetLabel(semitones)
  };
}

/**
 * Transpose by a relative semitone offset from the current key.
 * @param {string} text - The song text
 * @param {string} currentKey - The current key
 * @param {number} semitoneOffset - Relative semitones to shift
 * @param {boolean} useFlats - Prefer flat notation
 * @returns {Object} { transposedText, newKey, semitones, offsetLabel }
 */
export function transposeByOffset(text, currentKey, semitoneOffset, useFlats = false) {
  const currentNum = NOTE_TO_SEMITONE[currentKey];
  if (currentNum === undefined) {
    return { transposedText: text, newKey: currentKey, semitones: 0, offsetLabel: 'Original' };
  }

  const newNum = (currentNum + semitoneOffset % 12 + 12) % 12;
  const newKey = useFlats ? FLAT_NOTES[newNum] : SHARP_NOTES[newNum];
  const result = transposeSong(text, currentKey, newKey, useFlats);
  return {
    ...result,
    newKey
  };
}

/**
 * Get the enharmonic equivalent of a key (e.g., C# <-> Db)
 * @param {string} key - The key name
 * @returns {string} The enharmonic equivalent, or the same key if none exists
 */
export function getEnharmonic(key) {
  const enharmonicMap = {
    'C#': 'Db', 'Db': 'C#',
    'D#': 'Eb', 'Eb': 'D#',
    'F#': 'Gb', 'Gb': 'F#',
    'G#': 'Ab', 'Ab': 'G#',
    'A#': 'Bb', 'Bb': 'A#'
  };
  return enharmonicMap[key] || key;
}

/**
 * Detect the likely key from a set of chords (basic music theory utility)
 * @param {string[]} chords - Array of chord symbols
 * @returns {string|null} The detected key or null if undetermined
 */
export function detectKey(chords) {
  if (!chords || chords.length === 0) return null;

  // Collect all root notes
  const rootCounts = {};
  chords.forEach(c => {
    const parsed = parseChordSymbol(c);
    if (parsed) {
      rootCounts[parsed.root] = (rootCounts[parsed.root] || 0) + 1;
    }
  });

  const roots = Object.keys(rootCounts);
  if (roots.length === 0) return null;

  // The most frequent root is a candidate for the key
  let maxRoot = roots[0];
  let maxCount = rootCounts[maxRoot];
  roots.forEach(r => {
    if (rootCounts[r] > maxCount) {
      maxRoot = r;
      maxCount = rootCounts[r];
    }
  });

  return maxRoot;
}