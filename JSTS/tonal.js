/**
 * A module for tonal-music related functionality.
 *
 * Note to self: don't focus on writing a library, write music first.
 * Arpeggios, melody, harmony, all that jazz.
 *
 * For now, this is not a bad place to move some basic helper functions.
 *
 * XXX::: I remembered about the node tonal library. May be of some use, not sure how much.
 *
 * As far as SuperCollider goes, I may start writing synths with a new convention
 * such that I have a more TS friendly way of using them.
 * That said, unless I go as far as e.g. generating code (which may not be hard...)
 * I won't benefit from completion etc here.
 */
import { Tonal } from '@tonaljs/modules'; //if this causes compile error, run "npm update"
Tonal.transpose('A4', '5P');
export function ratioMidi(r) { return 12 * Math.log2(r); }
export function midiRatio(transposition) { return Math.pow(2, transposition / 12); }
export function midiFreq(pitch) { return 440 * Math.pow(2, (pitch - 69) / 12); }
export function freqMidi(freq) { return 69 + (12 * Math.log2(freq / 440)); }
export const mtof = midiFreq, ftom = freqMidi, midicps = midiFreq, cpsmidi = freqMidi;
export function dbAmp(db) { return Math.pow(10, db / 20); }
export function ampDb(amp) { return 20 * Math.log10(amp); }
//# sourceMappingURL=tonal.js.map