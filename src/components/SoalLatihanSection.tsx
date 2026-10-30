import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Target, Send, Sparkles, Star, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { PracticeEvaluation } from '../types';
import { playChimeSound } from '../utils/speech';

interface SoalLatihanSectionProps {
  soalLatihan: string;
  ringkasanMateri: string;
}

export const SoalLatihanSection: React.FC<SoalLatihanSectionProps> = ({
  soalLatihan,
  ringkasanMateri,
}) => {
  const [jawabanSiswa, setJawabanSiswa] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [evaluation, setEvaluation] = useState<PracticeEvaluation | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!soalLatihan) return null;

  const handleSubmitPractice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jawabanSiswa.trim() || isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/check-practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          soal: soalLatihan,
          jawabanSiswa: jawabanSiswa.trim(),
          ringkasanMateri,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memeriksa jawaban');
      }

      setEvaluation(data.data);

      if (data.data.isCorrect) {
        playChimeSound('success');
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.7 },
        });
      } else {
        playChimeSound('step');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat memeriksa jawaban.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setJawabanSiswa('');
    setEvaluation(null);
  };

  return (
    <div className="bg-white rounded-3xl p-5 md:p-6 border-2 border-indigo-100 shadow-sm">
      <div className="flex items-center gap-3 pb-3 mb-4 border-b border-indigo-50">
        <div className="w-10 h-10 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-xs">
          <Target className="w-5 h-5" />
        </div>
        <div>
          <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
            Tantangan Uji Mandiri
          </span>
          <h4 className="text-base font-extrabold text-slate-800">
            Coba Kerjakan Soal Serupa
          </h4>
        </div>
      </div>

      {/* Soal Box */}
      <div className="bg-indigo-50/60 rounded-2xl p-4 border border-indigo-100/80 mb-4">
        <p className="text-xs font-bold text-indigo-900 mb-1 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          Soal Latihan dari Kak Bintang:
        </p>
        <p className="text-sm md:text-base font-semibold text-slate-800 leading-relaxed">
          {soalLatihan}
        </p>
      </div>

      {/* Evaluation Result if already submitted */}
      {evaluation ? (
        <div
          className={`p-5 rounded-2xl border-2 mb-4 animate-fade-in ${
            evaluation.isCorrect
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : 'bg-amber-50 border-amber-300 text-amber-950'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">
                {evaluation.isCorrect ? '🎉' : '💪'}
              </span>
              <h5 className="font-extrabold text-base md:text-lg">
                {evaluation.headline}
              </h5>
            </div>
            {/* Stars */}
            <div className="flex items-center gap-1 bg-white/80 px-2 py-1 rounded-full border border-amber-200">
              {[...Array(3)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < evaluation.stars
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-slate-300'
                  }`}
                />
              ))}
            </div>
          </div>

          <p className="text-xs md:text-sm leading-relaxed mb-3 font-medium">
            {evaluation.feedback}
          </p>

          {evaluation.jawabanBenar && (
            <div className="bg-white/90 p-3 rounded-xl border border-slate-200/80 text-xs text-slate-700 mb-3">
              <span className="font-bold text-slate-900 block mb-0.5">
                Kunci Jawaban & Cara:
              </span>
              {evaluation.jawabanBenar}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
            <p className="text-xs font-bold italic text-slate-700">
              "{evaluation.pesanPenyemangat}"
            </p>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Coba Lagi</span>
            </button>
          </div>
        </div>
      ) : (
        /* Answer Input Form */
        <form onSubmit={handleSubmitPractice} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Tuliskan Jawaban & Caramu di sini:
            </label>
            <textarea
              rows={2}
              value={jawabanSiswa}
              onChange={(e) => setJawabanSiswa(e.target.value)}
              placeholder="Contoh: Jawaban saya adalah 12, karena 4 x 3 = 12..."
              className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-indigo-100 focus:border-indigo-500 focus:outline-none text-xs md:text-sm font-medium transition-all"
            />
          </div>

          {errorMessage && (
            <div className="flex items-center gap-1.5 text-xs text-rose-600 font-semibold bg-rose-50 p-2.5 rounded-xl border border-rose-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading || !jawabanSiswa.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs md:text-sm shadow-md shadow-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Memeriksa Jawaban...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Periksa Jawaban Bersama Kak Bintang</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
