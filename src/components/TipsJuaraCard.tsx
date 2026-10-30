import React from 'react';
import { Award, Lightbulb, Star } from 'lucide-react';

interface TipsJuaraCardProps {
  tips: string;
}

export const TipsJuaraCard: React.FC<TipsJuaraCardProps> = ({ tips }) => {
  if (!tips) return null;

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 via-amber-400 to-yellow-300 rounded-3xl p-5 md:p-6 shadow-md border-2 border-amber-300 text-amber-950">
      {/* Background Decorative Stars */}
      <div className="absolute top-2 right-3 opacity-15 pointer-events-none">
        <Star className="w-24 h-24 fill-white" />
      </div>

      <div className="relative z-10 flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-white/90 text-amber-600 flex items-center justify-center flex-shrink-0 shadow-sm border border-amber-200">
          <Award className="w-6 h-6 stroke-[2.5]" />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-amber-900 text-amber-100 text-[10px] md:text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">
              Tips Juara Kak Bintang
            </span>
            <span className="text-xs font-bold text-amber-900/80 flex items-center gap-1">
              <Lightbulb className="w-3.5 h-3.5 text-amber-900" />
              Trik Ingat Mudah
            </span>
          </div>

          <p className="text-sm md:text-base font-bold leading-relaxed text-amber-950 drop-shadow-xs">
            {tips}
          </p>
          <p className="text-[11px] font-semibold text-amber-900/75 mt-1.5">
            ✨ Ingat tips ini saat ulangan harian atau ujian di sekolah ya!
          </p>
        </div>
      </div>
    </div>
  );
};
