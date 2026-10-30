import React from 'react';
import { X, Heart, Sparkles, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

interface ParentGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ParentGuideModal: React.FC<ParentGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border-2 border-amber-200 flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base md:text-lg">
                Panduan Orang Tua & Pendamping
              </h3>
              <p className="text-xs text-teal-100 font-medium">
                Kiat mendampingi anak SD belajar dengan Kurikulum Merdeka
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs md:text-sm text-slate-700 flex-1 leading-relaxed">
          <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4">
            <h4 className="font-bold text-teal-950 flex items-center gap-1.5 mb-1.5">
              <Sparkles className="w-4 h-4 text-teal-600" />
              Filosofi "Nalar Dulu, Jawaban Kemudian"
            </h4>
            <p className="text-xs text-teal-900/80">
              Kak Bintang sengaja tidak langsung menyebutkan jawaban di baris pertama. Ini bertujuan melatih nalar kritis anak (Fase Fondasi & Literasi-Numerasi) agar anak mengerti alur pikirnya, bukan sekadar menyalin jawaban.
            </p>
          </div>

          <div className="space-y-2.5">
            <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider text-emerald-700">
              Tips Praktis Mendampingi PR:
            </h4>

            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900">Dengarkan Audio Narasi Bersama Anak:</span>
                <p className="text-xs text-slate-600">
                  Putar audio penjelasan Kak Bintang dengan intonasi ramah agar anak merasa memiliki teman belajar yang sabar.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900">Gunakan Papan Tulis Bertahap:</span>
                <p className="text-xs text-slate-600">
                  Buka Langkah 1 terlebih dahulu. Tanyakan ke anak: "Menurut Adik, apa yang diketahui di soal ini?". Baru lanjutkan ke Langkah 2.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900">Ajak Anak Mencoba Soal Latihan Serupa:</span>
                <p className="text-xs text-slate-600">
                  Setelah paham, berikan apresiasi saat anak berhasil menyelesaikan soal uji mandiri di bagian bawah.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 rounded-2xl p-3.5 border border-amber-200 text-amber-950 text-xs">
            <p className="font-bold mb-1 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              Sistem Kuota Virtual (Mayar):
            </p>
            <p className="leading-relaxed text-amber-900/80">
              Akun awal mendapatkan 5 token gratis. Setiap analisis lengkap memakai 1 token. Pembahasan yang sudah selesai tersimpan selamanya di menu "Riwayat Belajar" tanpa biaya tambahan.
            </p>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs cursor-pointer"
          >
            Mengerti & Siap Mendampingi
          </button>
        </div>
      </div>
    </div>
  );
};
