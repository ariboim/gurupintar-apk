import React from 'react';
import { SoalHistoryItem } from '../types';
import { X, BookOpen, Clock, ChevronRight, Sparkles, Trash2 } from 'lucide-react';

interface RiwayatBelajarModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: SoalHistoryItem[];
  onSelectHistoryItem: (item: SoalHistoryItem) => void;
  onClearHistory: () => void;
}

export const RiwayatBelajarModal: React.FC<RiwayatBelajarModalProps> = ({
  isOpen,
  onClose,
  history,
  onSelectHistoryItem,
  onClearHistory,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl border-2 border-amber-200 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white p-4 md:p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base md:text-lg">
                Riwayat Pembahasan PR
              </h3>
              <p className="text-xs text-amber-100">
                Buka kembali materi yang pernah dibedah tanpa menguras token
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

        {/* Content list */}
        <div className="p-4 md:p-5 overflow-y-auto space-y-3 flex-1">
          {history.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <Sparkles className="w-8 h-8 mx-auto text-amber-300" />
              <p className="font-bold text-sm text-slate-600">
                Belum ada riwayat soal PR
              </p>
              <p className="text-xs max-w-xs mx-auto">
                Setelah Kak Bintang membahas PR pertamamu, riwayat penjelasannya akan tersimpan di sini.
              </p>
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onSelectHistoryItem(item);
                  onClose();
                }}
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-amber-50/70 border border-slate-200 hover:border-amber-300 transition-all cursor-pointer flex items-center justify-between gap-3 group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                      {item.mataPelajaran}
                    </span>
                    <span className="text-[10px] font-medium text-slate-500">
                      {item.fase}
                    </span>
                    {item.driveUrl && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        Google Drive
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-xs md:text-sm text-slate-800 truncate group-hover:text-amber-900">
                    {item.result.ringkasan_materi}
                  </h4>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    {new Date(item.timestamp).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                <div className="flex items-center text-amber-600 group-hover:translate-x-1 transition-transform">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {history.length > 0 && (
          <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Total {history.length} soal tersimpan
            </span>
            <button
              onClick={onClearHistory}
              className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Semua Riwayat</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
