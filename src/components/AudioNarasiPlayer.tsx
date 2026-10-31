import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, Sparkles, Gauge, Loader2, ArrowDown } from 'lucide-react';
import { splitNarrationIntoSentences, getIndonesianVoices } from '../utils/speech';
import { safeFetchJson } from '../utils/studentSync';

interface AudioNarasiPlayerProps {
  narasiText: string;
  onSpeakingChange?: (isSpeaking: boolean) => void;
  onNarrationEnd?: () => void;
  autoPlay?: boolean;
}

export const AudioNarasiPlayer: React.FC<AudioNarasiPlayerProps> = ({
  narasiText,
  onSpeakingChange,
  onNarrationEnd,
  autoPlay = true,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [currentSentenceIdx, setCurrentSentenceIdx] = useState(0);
  const [rate, setRate] = useState(0.95);
  const [cachedAudioUrl, setCachedAudioUrl] = useState<string | null>(null);

  const sentences = splitNarrationIntoSentences(narasiText);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isPlayingRef = useRef(false);
  const timerRef = useRef<any>(null);

  // 1. Studio Audio Playback (Gemini 3.8 Flash Lite TTS)
  const playStudioAudio = async () => {
    try {
      setIsLoadingAudio(true);
      let audioUrl = cachedAudioUrl;

      if (!audioUrl) {
        const res = await safeFetchJson<any>('/api/generate-tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: narasiText }),
        });

        if (res.isHtmlFallback || !res.ok || !res.data?.audioBase64) {
          throw new Error(res.data?.error || 'Gagal memuat suara studio');
        }

        audioUrl = `data:audio/wav;base64,${res.data.audioBase64}`;
        setCachedAudioUrl(audioUrl);
      }

      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      const audio = audioRef.current;
      audio.src = audioUrl;
      audio.playbackRate = rate;

      audio.onplay = () => {
        setIsPlaying(true);
        isPlayingRef.current = true;
        setIsLoadingAudio(false);
        onSpeakingChange?.(true);

        // Advance sentences based on audio progress
        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          if (!audio.paused && !audio.ended) {
            const currentRatio = audio.currentTime / (audio.duration || 1);
            const nextIdx = Math.min(
              sentences.length - 1,
              Math.floor(currentRatio * sentences.length)
            );
            setCurrentSentenceIdx(nextIdx);
          }
        }, 280);
      };

      audio.onended = () => {
        setIsPlaying(false);
        isPlayingRef.current = false;
        clearInterval(timerRef.current);
        onSpeakingChange?.(false);
        setCurrentSentenceIdx(0);
        onNarrationEnd?.();
      };

      audio.onerror = (e) => {
        console.warn('Audio playback error, falling back to Web Speech:', e);
        setIsLoadingAudio(false);
        playDeviceSpeech(0);
      };

      await audio.play();
    } catch (err) {
      console.warn('Studio TTS autoplay error, falling back to Device Web Speech:', err);
      setIsLoadingAudio(false);
      playDeviceSpeech(0);
    }
  };

  // 2. Device Web Speech API fallback
  const playDeviceSpeech = (index: number) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (index >= sentences.length) {
      setIsPlaying(false);
      isPlayingRef.current = false;
      onSpeakingChange?.(false);
      setCurrentSentenceIdx(0);
      onNarrationEnd?.();
      return;
    }

    try {
      window.speechSynthesis.resume();
      window.speechSynthesis.cancel();
    } catch (e) {
      // Ignore
    }

    const sentenceToSpeak = sentences[index];
    const utterance = new SpeechSynthesisUtterance(sentenceToSpeak);
    utteranceRef.current = utterance;

    const voices = getIndonesianVoices();
    if (voices.length > 0) {
      utterance.voice = voices[0];
      utterance.lang = voices[0].lang || 'id-ID';
    } else {
      utterance.lang = 'id-ID';
    }

    utterance.rate = rate;
    utterance.pitch = 1.1;

    utterance.onstart = () => {
      setCurrentSentenceIdx(index);
      setIsPlaying(true);
      isPlayingRef.current = true;
      onSpeakingChange?.(true);
    };

    utterance.onend = () => {
      if (isPlayingRef.current && index + 1 < sentences.length) {
        setTimeout(() => {
          if (isPlayingRef.current) {
            playDeviceSpeech(index + 1);
          }
        }, 220);
      } else {
        setIsPlaying(false);
        isPlayingRef.current = false;
        onSpeakingChange?.(false);
        if (index + 1 >= sentences.length) {
          setCurrentSentenceIdx(0);
          onNarrationEnd?.();
        }
      }
    };

    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      setIsPlaying(false);
      isPlayingRef.current = false;
      onSpeakingChange?.(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    clearInterval(timerRef.current);
    setIsPlaying(false);
    isPlayingRef.current = false;
    onSpeakingChange?.(false);
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    clearInterval(timerRef.current);
    setIsPlaying(false);
    isPlayingRef.current = false;
    setCurrentSentenceIdx(0);
    onSpeakingChange?.(false);
  };

  const jumpToSentence = (idx: number) => {
    stopAudio();
    setCurrentSentenceIdx(idx);
    isPlayingRef.current = true;
    playDeviceSpeech(idx);
  };

  // Autoplay immediately on mount or when narration text arrives!
  useEffect(() => {
    stopAudio();
    setCachedAudioUrl(null);
    setCurrentSentenceIdx(0);

    if (narasiText && autoPlay) {
      const timer = setTimeout(() => {
        playStudioAudio();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [narasiText]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-3xl p-5 md:p-6 shadow-sm">
      {/* Header Player */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-amber-200/80">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-sm">
            <Volume2 className={`w-5 h-5 ${isPlaying ? 'animate-bounce' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-bold text-amber-950 text-base md:text-lg">
                Suara Ramah Kak Bintang
              </h3>
              {isLoadingAudio ? (
                <span className="bg-amber-200 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Memuat Suara...
                </span>
              ) : isPlaying ? (
                <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                  Narasi Otomatis Berputar
                </span>
              ) : (
                <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  Selesai
                </span>
              )}
            </div>
            <p className="text-xs text-amber-800/80 mt-0.5">
              Kak Bintang menjelaskan langsung tanpa perlu menekan tombol putar
            </p>
          </div>
        </div>

        {/* Secondary Controls (Jeda / Ulangi / Kecepatan) */}
        <div className="flex items-center gap-2">
          {/* Speed Preset */}
          <div className="flex items-center bg-white/80 border border-amber-200 rounded-xl px-2 py-1 text-xs font-semibold text-amber-900 shadow-2xs">
            <Gauge className="w-3.5 h-3.5 mr-1 text-amber-600" />
            <select
              value={rate}
              onChange={(e) => {
                const newRate = parseFloat(e.target.value);
                setRate(newRate);
                if (audioRef.current) {
                  audioRef.current.playbackRate = newRate;
                }
              }}
              className="bg-transparent outline-none cursor-pointer text-xs"
              title="Kecepatan Bicara"
            >
              <option value="0.85">0.8x Santai</option>
              <option value="0.95">1.0x Normal</option>
              <option value="1.15">1.2x Cepat</option>
            </select>
          </div>

          {isPlaying ? (
            <button
              onClick={pauseAudio}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold text-xs transition-colors cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5 fill-amber-950" />
              <span>Jeda</span>
            </button>
          ) : (
            <button
              onClick={() => playStudioAudio()}
              disabled={isLoadingAudio}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Putar Ulang</span>
            </button>
          )}

          <button
            onClick={stopAudio}
            title="Ulangi dari awal"
            className="p-1.5 rounded-xl bg-white/80 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Realtime Karaoke / Sentence Tracker */}
      <div className="mt-3 bg-white/90 rounded-2xl p-4 border border-amber-100 shadow-inner">
        <div className="flex items-center justify-between text-xs font-semibold text-amber-800 mb-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Naskah Narasi Suara Kak Bintang</span>
          </div>
          <span className="text-[11px] text-amber-600 bg-amber-100/70 px-2 py-0.5 rounded-full font-mono">
            Kalimat {currentSentenceIdx + 1} dari {sentences.length}
          </span>
        </div>

        {/* Scrollable Sentence Bubbles */}
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {sentences.map((sentence, idx) => {
            const isCurrent = idx === currentSentenceIdx;
            const isPast = idx < currentSentenceIdx;
            const isLastSentence = idx === sentences.length - 1;

            return (
              <div
                key={idx}
                onClick={() => jumpToSentence(idx)}
                className={`p-2.5 rounded-xl text-xs md:text-sm cursor-pointer transition-all duration-200 flex items-start gap-2.5 ${
                  isCurrent && isPlaying
                    ? 'bg-amber-100 text-amber-950 font-bold border-l-4 border-amber-500 shadow-xs'
                    : isCurrent
                    ? 'bg-amber-50 text-amber-900 font-semibold'
                    : isPast
                    ? 'bg-amber-50/40 text-amber-900/60 hover:bg-amber-50'
                    : isLastSentence
                    ? 'text-amber-900/90 font-medium bg-amber-50/20'
                    : 'text-slate-600 hover:bg-amber-50/60'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5 ${
                    isCurrent && isPlaying
                      ? 'bg-amber-500 text-white animate-pulse'
                      : 'bg-amber-200 text-amber-800'
                  }`}
                >
                  {idx + 1}
                </div>
                <p className="leading-relaxed flex-1">
                  {sentence}
                  {isLastSentence && (
                    <span className="ml-1 inline-flex items-center text-[11px] text-amber-700 font-black underline decoration-amber-400">
                      <ArrowDown className="w-3 h-3 inline animate-bounce" /> Papan Tulis
                    </span>
                  )}
                </p>
                {isCurrent && isPlaying && (
                  <div className="flex items-center gap-0.5 self-center">
                    <span className="w-1 h-3 bg-amber-500 rounded-full animate-bounce"></span>
                    <span className="w-1 h-4 bg-amber-600 rounded-full animate-bounce [animation-delay:0.15s]"></span>
                    <span className="w-1 h-2 bg-amber-500 rounded-full animate-bounce [animation-delay:0.3s]"></span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
