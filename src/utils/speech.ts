// Helper to manage SpeechSynthesis for Kak Bintang's cheerful voice

export interface VoiceOption {
  voice: SpeechSynthesisVoice;
  displayName: string;
  lang: string;
}

export function getIndonesianVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  const voices = window.speechSynthesis.getVoices();

  // Deduplicate voices by voiceURI or name + lang
  const seen = new Set<string>();
  const uniqueVoices: SpeechSynthesisVoice[] = [];

  for (const voice of voices) {
    const id = voice.voiceURI || `${voice.name}-${voice.lang}`;
    if (!seen.has(id)) {
      seen.add(id);
      uniqueVoices.push(voice);
    }
  }

  // Filter for Indonesian first
  const idVoices = uniqueVoices.filter(
    (v) => v.lang.toLowerCase().startsWith('id') || v.lang.toLowerCase().includes('indonesia')
  );
  if (idVoices.length > 0) return idVoices;

  // Fallback to deduplicated voices
  return uniqueVoices;
}

// Split the audio script into sentences or pacing chunks so we can highlight them in real-time
export function splitNarrationIntoSentences(text: string): string[] {
  if (!text) return [];
  // Split on punctuation (. ! ? \n) while keeping meaningful chunks
  const rawSentences = text
    .replace(/([.?!…])\s+/g, '$1|')
    .split('|')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  return rawSentences.length > 0 ? rawSentences : [text];
}

// Play pleasant web audio chime for correct answer or step completion
export function playChimeSound(type: 'success' | 'step' | 'pop') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'success') {
      // Tri-tone cheerful arpeggio: C5 - E5 - G5 - C6
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
        gain.gain.setValueAtTime(0.18, ctx.currentTime + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.12);
        osc.stop(ctx.currentTime + idx * 0.12 + 0.4);
      });
    } else if (type === 'step') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    }
  } catch (e) {
    // Audio context may be restricted by autoplay policy until user gesture
  }
}
