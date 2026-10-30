import React from 'react';
import { Sparkles, Volume2 } from 'lucide-react';

interface KakBintangAvatarProps {
  state?: 'idle' | 'thinking' | 'speaking' | 'celebrating';
  size?: 'sm' | 'md' | 'lg' | 'hero';
  showBadge?: boolean;
  bubbleText?: string;
}

export const KakBintangAvatar: React.FC<KakBintangAvatarProps> = ({
  state = 'idle',
  size = 'md',
  showBadge = true,
  bubbleText,
}) => {
  const sizeMap = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    hero: 'w-32 h-32 md:w-36 md:h-36',
  };

  return (
    <div className="relative inline-flex flex-col items-center">
      {/* Dynamic Speech Bubble if provided */}
      {bubbleText && (
        <div className="mb-2 max-w-xs md:max-w-md bg-white border-2 border-amber-300 text-amber-950 px-3 py-1.5 rounded-2xl shadow-sm text-xs md:text-sm font-medium relative animate-bounce-subtle">
          <p>{bubbleText}</p>
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-b-2 border-r-2 border-amber-300 rotate-45"></div>
        </div>
      )}

      <div className="relative">
        {/* Glow Ring */}
        <div
          className={`absolute -inset-1 rounded-full blur-sm transition-all duration-500 ${
            state === 'thinking'
              ? 'bg-purple-300/60 animate-pulse'
              : state === 'speaking'
              ? 'bg-emerald-300/70 animate-ping opacity-30'
              : state === 'celebrating'
              ? 'bg-yellow-400/80 animate-pulse'
              : 'bg-amber-300/40'
          }`}
        />

        {/* Mascot Avatar Canvas */}
        <div
          className={`${sizeMap[size]} relative rounded-full bg-gradient-to-br from-amber-200 via-orange-100 to-amber-300 p-1 border-3 border-amber-400 shadow-md flex items-center justify-center overflow-hidden transition-transform hover:scale-105`}
        >
          {/* Custom SVG of Kak Bintang - cheerful Indonesian tutor */}
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
            {/* Background aura */}
            <circle cx="50" cy="50" r="46" fill="#FDE68A" />
            <circle cx="50" cy="50" r="42" fill="#FEF3C7" />

            {/* Hair back */}
            <path
              d="M20,55 C18,30 35,14 50,14 C65,14 82,30 80,55 C76,68 70,72 65,72 C58,72 55,60 50,60 C45,60 42,72 35,72 C30,72 24,68 20,55 Z"
              fill="#78350F"
            />

            {/* Shoulders / Yellow Teacher Vest */}
            <path
              d="M18,98 C18,78 32,70 50,70 C68,70 82,78 82,98 Z"
              fill="#3B82F6"
            />
            {/* White collar */}
            <polygon points="50,78 40,70 50,88" fill="#FFFFFF" />
            <polygon points="50,78 60,70 50,88" fill="#FFFFFF" />
            {/* Red necktie / badge */}
            <polygon points="48,82 52,82 54,95 50,98 46,95" fill="#EF4444" />

            {/* Head / Face */}
            <ellipse cx="50" cy="48" rx="26" ry="25" fill="#FED7AA" />

            {/* Blush cheeks */}
            <ellipse cx="32" cy="53" rx="5" ry="3" fill="#F87171" opacity="0.6" />
            <ellipse cx="68" cy="53" rx="5" ry="3" fill="#F87171" opacity="0.6" />

            {/* Hair bangs */}
            <path
              d="M25,38 C32,24 45,22 50,26 C55,22 68,24 75,38 C70,30 62,30 50,34 C38,30 30,30 25,38 Z"
              fill="#78350F"
            />
            {/* Cute star hairclip */}
            <path
              d="M28,26 L30,22 L34,22 L31,25 L32,29 L28,27 L25,29 L26,25 L23,22 L27,22 Z"
              fill="#FBBF24"
              stroke="#D97706"
              strokeWidth="0.8"
            />

            {/* Eyes based on state */}
            {state === 'celebrating' ? (
              // Joyful closed curved eyes (^_^)
              <>
                <path d="M33,45 Q40,38 43,45" stroke="#451A03" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <path d="M57,45 Q60,38 67,45" stroke="#451A03" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              </>
            ) : state === 'thinking' ? (
              // Looking up thoughtfully
              <>
                <ellipse cx="38" cy="42" rx="4" ry="4" fill="#451A03" />
                <circle cx="39" cy="40" r="1.5" fill="#FFFFFF" />
                <ellipse cx="62" cy="42" rx="4" ry="4" fill="#451A03" />
                <circle cx="63" cy="40" r="1.5" fill="#FFFFFF" />
                {/* Eyebrows raised */}
                <path d="M33,36 Q38,33 43,37" stroke="#78350F" strokeWidth="2" fill="none" strokeLinecap="round" />
                <path d="M57,37 Q62,33 67,36" stroke="#78350F" strokeWidth="2" fill="none" strokeLinecap="round" />
              </>
            ) : (
              // Normal friendly sparkly eyes
              <>
                <ellipse cx="38" cy="45" rx="4.5" ry="5.5" fill="#451A03" />
                <circle cx="36.5" cy="43.5" r="1.8" fill="#FFFFFF" />
                <circle cx="40" cy="47" r="1" fill="#FFFFFF" />
                <ellipse cx="62" cy="45" rx="4.5" ry="5.5" fill="#451A03" />
                <circle cx="60.5" cy="43.5" r="1.8" fill="#FFFFFF" />
                <circle cx="64" cy="47" r="1" fill="#FFFFFF" />
                {/* Soft friendly eyebrows */}
                <path d="M33,37 Q38,34 43,36" stroke="#78350F" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                <path d="M57,36 Q62,34 67,37" stroke="#78350F" strokeWidth="1.8" fill="none" strokeLinecap="round" />
              </>
            )}

            {/* Mouth based on state */}
            {state === 'speaking' ? (
              // Open cheerful talking mouth
              <path
                d="M43,56 Q50,68 57,56 Z"
                fill="#DC2626"
                stroke="#991B1B"
                strokeWidth="1.2"
                className="animate-pulse"
              />
            ) : state === 'celebrating' ? (
              // Huge happy smile showing teeth
              <path
                d="M40,54 Q50,70 60,54 Z"
                fill="#EF4444"
                stroke="#7F1D1D"
                strokeWidth="1.2"
              />
            ) : (
              // Gentle sweet smile
              <path
                d="M42,55 Q50,62 58,55"
                stroke="#78350F"
                strokeWidth="2.4"
                fill="none"
                strokeLinecap="round"
              />
            )}
          </svg>

          {/* Status corner icon */}
          {state === 'speaking' && (
            <div className="absolute bottom-0 right-0 bg-emerald-500 text-white p-1 rounded-full shadow-sm">
              <Volume2 className="w-3 h-3 md:w-4 md:h-4 animate-pulse" />
            </div>
          )}
          {state === 'thinking' && (
            <div className="absolute top-0 right-0 bg-purple-500 text-white p-1 rounded-full shadow-sm animate-spin-slow">
              <Sparkles className="w-3 h-3 md:w-4 md:h-4" />
            </div>
          )}
        </div>
      </div>

      {showBadge && (
        <div className="mt-1 flex items-center gap-1 bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold border border-amber-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
          <span>Kak Bintang</span>
        </div>
      )}
    </div>
  );
};
