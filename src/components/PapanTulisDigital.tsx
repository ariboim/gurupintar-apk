import React, { useState } from 'react';
import { PapanTulisLangkah } from '../types';
import {
  CheckCircle2,
  Copy,
  Check,
  Eye,
  BookOpen,
  Sparkles,
  Layers,
  Star,
  ChevronDown,
  ArrowRight,
  Smile,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { playChimeSound } from '../utils/speech';

interface PapanTulisDigitalProps {
  ringkasanMateri: string;
  langkahList: PapanTulisLangkah[];
}

export const PapanTulisDigital: React.FC<PapanTulisDigitalProps> = ({
  ringkasanMateri,
  langkahList,
}) => {
  // Mode: green chalkboard or modern bright whiteboard
  const [boardTheme, setBoardTheme] = useState<'chalkboard' | 'whiteboard'>('chalkboard');
  // Revealed step count for pedagogical step-by-step guidance
  const [revealedCount, setRevealedCount] = useState<number>(1);
  const [copied, setCopied] = useState(false);
  const [lastRevealedIdx, setLastRevealedIdx] = useState<number>(0);

  const handleNextStep = () => {
    if (revealedCount < langkahList.length) {
      const nextCount = revealedCount + 1;
      setRevealedCount(nextCount);
      setLastRevealedIdx(nextCount - 1);

      if (nextCount === langkahList.length) {
        playChimeSound('success');
        confetti({
          particleCount: 75,
          spread: 70,
          origin: { y: 0.7 },
        });
      } else {
        playChimeSound('step');
      }
    }
  };

  const handleRevealAll = () => {
    setRevealedCount(langkahList.length);
    setLastRevealedIdx(langkahList.length - 1);
    playChimeSound('success');
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.7 },
    });
  };

  const handleCopyBoard = () => {
    const textContent = `📚 ${ringkasanMateri}\n\n` +
      langkahList.map(l => `${l.judul_langkah}\n${l.tampilan_layar}\n`).join('\n---\n\n');
    navigator.clipboard.writeText(textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id="papan-tulis-virtual"
      className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-amber-800/80 transition-all duration-300"
    >
      {/* Visual Call-to-action Banner */}
      <div className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-amber-950 px-4 py-2.5 text-xs md:text-sm font-black flex items-center justify-between gap-2 shadow-xs border-b-2 border-amber-500">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-ping"></span>
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-900 fill-amber-900" />
            <span>Papan Tulis Virtual: Yuk buka langkah demi langkahnya di bawah ini!</span>
          </span>
        </div>
        <span className="text-[11px] font-bold text-amber-900 hidden sm:inline bg-white/40 px-2 py-0.5 rounded-full">
          Ikuti Nalar Kak Bintang
        </span>
      </div>

      {/* Wood Frame Header / Bar */}
      <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-amber-950 text-amber-100 px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-b-2 border-amber-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-700/80 border border-amber-500/50 flex items-center justify-center text-amber-200 shadow-2xs">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs md:text-sm font-extrabold tracking-wide uppercase text-amber-200 flex items-center gap-1.5">
              <span>Papan Tulis Digital Kak Bintang</span>
              <span className="bg-amber-600/60 text-amber-100 text-[10px] px-2 py-0.5 rounded-full font-mono normal-case">
                Kurikulum Merdeka
              </span>
            </h4>
            <p className="text-[11px] text-amber-300/80 font-medium truncate max-w-[240px] md:max-w-md">
              {ringkasanMateri}
            </p>
          </div>
        </div>

        {/* Board Controls */}
        <div className="flex items-center gap-1.5 md:gap-2">
          {/* Theme switcher */}
          <div className="flex bg-amber-950/70 p-0.5 rounded-xl border border-amber-700/60 text-xs font-semibold">
            <button
              onClick={() => setBoardTheme('chalkboard')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                boardTheme === 'chalkboard'
                  ? 'bg-emerald-800 text-emerald-100 shadow-xs'
                  : 'text-amber-300/70 hover:text-amber-200'
              }`}
            >
              Papan Kapur
            </button>
            <button
              onClick={() => setBoardTheme('whiteboard')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                boardTheme === 'whiteboard'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-amber-300/70 hover:text-amber-200'
              }`}
            >
              Whiteboard
            </button>
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopyBoard}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-700/70 hover:bg-amber-600 text-amber-100 text-xs font-semibold transition-colors cursor-pointer"
            title="Salin seluruh isi papan untuk dicatat di buku PR"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Tersalin' : 'Salin PR'}</span>
          </button>
        </div>
      </div>

      {/* Main Board Surface */}
      <div
        className={`p-4 md:p-7 min-h-[380px] transition-colors duration-300 ${
          boardTheme === 'chalkboard'
            ? 'bg-[#1b3a2f] text-emerald-50'
            : 'bg-white text-slate-800'
        }`}
      >
        {/* Step Progress Bar & Reveal All Action */}
        <div className="mb-5 flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-dashed border-emerald-600/30">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1">
              {langkahList.map((_, i) => (
                <div
                  key={i}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all duration-300 ${
                    i < revealedCount
                      ? 'bg-amber-400 text-amber-950 shadow-xs scale-105'
                      : boardTheme === 'chalkboard'
                      ? 'bg-emerald-900/60 text-emerald-400/60 border border-emerald-700/50'
                      : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  {i < revealedCount ? '★' : i + 1}
                </div>
              ))}
            </div>
            <span className={`text-xs md:text-sm font-bold ${boardTheme === 'chalkboard' ? 'text-emerald-200' : 'text-slate-700'}`}>
              Langkah {Math.min(revealedCount, langkahList.length)} dari {langkahList.length}
            </span>
          </div>

          {revealedCount < langkahList.length ? (
            <button
              onClick={handleRevealAll}
              className={`text-xs font-semibold underline underline-offset-4 flex items-center gap-1 cursor-pointer transition-colors ${
                boardTheme === 'chalkboard' ? 'text-amber-300 hover:text-amber-200' : 'text-blue-600 hover:text-blue-800'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Buka Semua Sekaligus</span>
            </button>
          ) : (
            <span className="text-xs text-amber-300 font-extrabold flex items-center gap-1.5 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-300/30 animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Semua langkah tuntas dipelajari!
            </span>
          )}
        </div>

        {/* Step Cards List with Dynamic Transition Animations */}
        <div className="space-y-4">
          {langkahList.map((step, idx) => {
            const isRevealed = idx < revealedCount;
            const isFinalStep = idx === langkahList.length - 1;
            const isNewlyOpened = idx === lastRevealedIdx;

            if (!isRevealed) {
              return (
                <div
                  key={step.urutan || idx}
                  onClick={handleNextStep}
                  className={`p-4 md:p-5 rounded-2xl border-2 border-dashed flex items-center justify-between cursor-pointer transition-all duration-300 hover:scale-[1.015] active:scale-[0.99] group shadow-xs ${
                    boardTheme === 'chalkboard'
                      ? 'border-emerald-600/60 bg-emerald-900/30 text-emerald-200/80 hover:border-amber-400 hover:bg-emerald-900/50'
                      : 'border-slate-300 bg-slate-50/80 text-slate-500 hover:border-amber-400 hover:bg-amber-50/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-transform group-hover:scale-110 ${
                        boardTheme === 'chalkboard'
                          ? 'bg-emerald-800 text-emerald-200'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-extrabold text-xs md:text-sm flex items-center gap-1.5">
                        <span>{step.judul_langkah || `Langkah ${idx + 1}`}</span>
                        {isFinalStep && (
                          <span className="text-[10px] bg-yellow-400/20 text-yellow-300 border border-yellow-400/40 px-1.5 py-0.2 rounded font-bold">
                            Kunci Jawaban
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] opacity-75 mt-0.5">
                        Ketuk untuk membuka penjelasan langkah ini bersama Kak Bintang
                      </p>
                    </div>
                  </div>

                  <div
                    className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition-all group-hover:scale-105 ${
                      boardTheme === 'chalkboard'
                        ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-amber-950'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                    }`}
                  >
                    <span>Buka Langkah</span>
                    <Sparkles className="w-3.5 h-3.5 animate-twinkle" />
                  </div>
                </div>
              );
            }

            return (
              <div
                key={step.urutan || idx}
                className={`p-4 md:p-6 rounded-2xl transition-all duration-300 relative animate-step-pop ${
                  isNewlyOpened ? 'animate-chalk-glow' : ''
                } ${
                  boardTheme === 'chalkboard'
                    ? isFinalStep
                      ? 'bg-gradient-to-r from-emerald-900/95 via-teal-900/90 to-emerald-950/95 border-2 border-yellow-400 shadow-xl'
                      : 'bg-emerald-950/80 border border-emerald-700/80 shadow-md hover:border-emerald-500/80'
                    : isFinalStep
                    ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-400 shadow-lg'
                    : 'bg-slate-50 border border-slate-200 shadow-xs hover:border-blue-300'
                }`}
                style={{
                  animationDelay: `${idx * 0.08}s`,
                }}
              >
                {/* Step Header */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-md transition-transform hover:rotate-12 ${
                        isFinalStep
                          ? 'bg-yellow-400 text-yellow-950 animate-bounce-subtle'
                          : boardTheme === 'chalkboard'
                          ? 'bg-emerald-500 text-emerald-950'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <h5
                        className={`text-sm md:text-base font-black ${
                          isFinalStep
                            ? boardTheme === 'chalkboard'
                              ? 'text-yellow-300'
                              : 'text-amber-900'
                            : boardTheme === 'chalkboard'
                            ? 'text-emerald-100'
                            : 'text-slate-800'
                        }`}
                      >
                        {step.judul_langkah}
                      </h5>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isNewlyOpened && (
                      <span className="bg-amber-400 text-amber-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs animate-bounce-subtle">
                        ✨ Baru Dibuka
                      </span>
                    )}

                    {isFinalStep && (
                      <span className="bg-yellow-400/20 text-yellow-300 border border-yellow-400/60 text-[10px] md:text-xs font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400 animate-twinkle" />
                        Jawaban Akhir
                      </span>
                    )}
                  </div>
                </div>

                {/* Step Body Content - Chalkboard text with comfortable spacing */}
                <div
                  className={`pl-10 whitespace-pre-wrap text-xs md:text-sm leading-relaxed transition-opacity ${
                    boardTheme === 'chalkboard'
                      ? 'text-emerald-100/95 font-mono tracking-wide'
                      : 'text-slate-700 font-sans'
                  }`}
                >
                  {step.tampilan_layar}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pedagogical Next Step Prompt / Button */}
        {revealedCount < langkahList.length && (
          <div className="mt-6 text-center animate-step-pop">
            <button
              onClick={handleNextStep}
              className="inline-flex items-center gap-2.5 px-7 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-amber-950 font-black text-xs md:text-sm shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 active:translate-y-0 cursor-pointer"
            >
              <span>Lanjut Buka Langkah {revealedCount + 1}</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>
            <p className="text-[11px] mt-2 opacity-80 flex items-center justify-center gap-1">
              <span>💡</span>
              <span>Kak Bintang menemani kamu memahami satu per satu alur pikirnya!</span>
            </p>
          </div>
        )}
      </div>

      {/* Chalk Tray footer */}
      <div className="bg-amber-900/90 px-4 py-2.5 border-t-2 border-amber-800 flex items-center justify-between text-[11px] text-amber-200">
        <div className="flex items-center gap-2">
          {/* Simulated colorful chalk pieces */}
          <div className="w-8 h-2 rounded-full bg-white shadow-xs"></div>
          <div className="w-7 h-2 rounded-full bg-yellow-300 shadow-xs"></div>
          <div className="w-6 h-2 rounded-full bg-rose-400 shadow-xs"></div>
          <div className="w-8 h-2 rounded-full bg-sky-300 shadow-xs"></div>
          <span className="hidden sm:inline text-amber-300/80 ml-1">Papan Tulis Interaktif Siswa SD</span>
        </div>
        <span className="font-semibold text-amber-100 flex items-center gap-1">
          <span>✨</span>
          <span>Catat rapi di buku PR sekolahmu ya!</span>
        </span>
      </div>
    </div>
  );
};
