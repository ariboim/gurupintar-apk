// Soft, gentle ambient background music generator using Web Audio API
// Synthesizes a calming, pleasant music-box / kalimba melody for elementary school students while waiting for analysis.

let audioCtx: AudioContext | null = null;
let isPlaying = false;
let isMuted = false;
let timerId: number | null = null;
let masterGain: GainNode | null = null;

// Calming pentatonic melody notes (frequencies in Hz)
// C4, D4, E4, G4, A4, C5, D5, E5, G5
const SCALE = [
  261.63, // C4
  293.66, // D4
  329.63, // E4
  392.0,  // G4
  440.0,  // A4
  523.25, // C5
  587.33, // D5
  659.25, // E5
  783.99, // G5
];

// Gentle chord progression roots for warmth
const BASS_NOTES = [
  130.81, // C3
  174.61, // F3
  196.0,  // G3
  146.83, // D3
];

// Soothing note pattern (indices into SCALE)
const MELODY_SEQUENCE = [
  { note: 2, duration: 0.35 }, // E4
  { note: 4, duration: 0.35 }, // A4
  { note: 5, duration: 0.45 }, // C5
  { note: 7, duration: 0.55 }, // E5
  { note: 6, duration: 0.35 }, // D5
  { note: 5, duration: 0.35 }, // C5
  { note: 3, duration: 0.45 }, // G4
  { note: 2, duration: 0.65 }, // E4
  { note: 0, duration: 0.35 }, // C4
  { note: 3, duration: 0.35 }, // G4
  { note: 4, duration: 0.45 }, // A4
  { note: 7, duration: 0.70 }, // E5
];

function getOrCreateContext(): AudioContext | null {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioCtx();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch (err) {
    console.warn('Web Audio API not supported or blocked:', err);
    return null;
  }
}

// Play a single soft bell/music-box chime
function playSoftTone(ctx: AudioContext, destination: AudioNode, freq: number, startTime: number, duration: number, isBass = false) {
  try {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const noteGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    // Warm, rounded timbre
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isBass ? 350 : 950, startTime);

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, startTime);

    // Add gentle overtone for music-box sparkle
    osc2.type = isBass ? 'triangle' : 'sine';
    osc2.frequency.setValueAtTime(isBass ? freq : freq * 2, startTime);

    // Amplitude envelope: instant soft attack, gentle decay
    const peakVolume = isBass ? 0.08 : 0.12;
    noteGain.gain.setValueAtTime(0.0001, startTime);
    noteGain.gain.linearRampToValueAtTime(peakVolume, startTime + 0.04);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(noteGain);
    noteGain.connect(destination);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + duration);
    osc2.stop(startTime + duration);
  } catch {
    // Ignore audio glitches
  }
}

export function startSoftAnalysisBgm() {
  if (isPlaying) return;
  const ctx = getOrCreateContext();
  if (!ctx) return;

  isPlaying = true;

  try {
    masterGain = ctx.createGain();
    // Gentle master volume (around 0.12 - soothing and soft)
    masterGain.gain.setValueAtTime(0.001, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(isMuted ? 0 : 0.13, ctx.currentTime + 0.4);
    masterGain.connect(ctx.destination);

    let step = 0;
    let chordStep = 0;

    const playNextNote = () => {
      if (!isPlaying || !audioCtx || !masterGain) return;

      const item = MELODY_SEQUENCE[step % MELODY_SEQUENCE.length];
      const freq = SCALE[item.note] || 440;
      const now = audioCtx.currentTime;

      // Play soft melody note
      playSoftTone(audioCtx, masterGain, freq, now, item.duration * 1.8);

      // Add gentle warm bass note every 4 melody steps
      if (step % 4 === 0) {
        const bassFreq = BASS_NOTES[chordStep % BASS_NOTES.length];
        playSoftTone(audioCtx, masterGain, bassFreq, now, 1.8, true);
        chordStep++;
      }

      step++;
      const nextDelay = item.duration * 1000;
      timerId = window.setTimeout(playNextNote, nextDelay);
    };

    playNextNote();
  } catch (err) {
    console.warn('Could not start soft BGM:', err);
    isPlaying = false;
  }
}

export function stopSoftAnalysisBgm() {
  isPlaying = false;
  if (timerId !== null) {
    clearTimeout(timerId);
    timerId = null;
  }

  if (masterGain && audioCtx && audioCtx.state === 'running') {
    try {
      // Smooth fade-out in 400ms
      const now = audioCtx.currentTime;
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.setValueAtTime(masterGain.gain.value, now);
      masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.35);

      setTimeout(() => {
        try {
          masterGain?.disconnect();
          masterGain = null;
        } catch {
          // Ignore cleanup
        }
      }, 400);
    } catch {
      masterGain = null;
    }
  } else {
    masterGain = null;
  }
}

export function isBgmActive(): boolean {
  return isPlaying;
}

export function setBgmMuted(muted: boolean) {
  isMuted = muted;
  if (masterGain && audioCtx && isPlaying) {
    const now = audioCtx.currentTime;
    masterGain.gain.linearRampToValueAtTime(muted ? 0 : 0.13, now + 0.1);
  }
}
