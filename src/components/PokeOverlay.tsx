import React, { useEffect, useState } from 'react';
import { Sparkles, Heart } from 'lucide-react';
import { PokeEventData } from '../types';

interface PokeOverlayProps {
  pokeData: PokeEventData | null;
  onDismiss: () => void;
}

export const PokeOverlay: React.FC<PokeOverlayProps> = ({ pokeData, onDismiss }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (pokeData) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onDismiss();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [pokeData, onDismiss]);

  if (!visible || !pokeData) return null;

  const config = {
    kiss: {
      emoji: '💋',
      title: 'KISSES SHOWER!',
      subtitle: `${pokeData.senderName} blew you a warm, passionate kiss across the distance!`,
      bg: 'from-rose-500/20 via-pink-500/20 to-red-500/20',
    },
    hug: {
      emoji: '🤗',
      title: 'BEAR HUG INCOMING!',
      subtitle: `${pokeData.senderName} is wrapping both arms tight around you right now!`,
      bg: 'from-pink-500/20 via-amber-500/20 to-rose-500/20',
    },
    hearts: {
      emoji: '💖',
      title: 'HEART SPARKLES!',
      subtitle: `${pokeData.senderName} just sent an explosion of love to your screen!`,
      bg: 'from-rose-500/20 via-purple-500/20 to-pink-500/20',
    },
    miss_you: {
      emoji: '🥺',
      title: 'MISSING YOU DEEPLY...',
      subtitle: `${pokeData.senderName} is thinking about holding you right now.`,
      bg: 'from-purple-500/20 via-pink-500/20 to-rose-500/20',
    },
  }[pokeData.pokeType] || {
    emoji: '💖',
    title: 'LOVE PING!',
    subtitle: `${pokeData.senderName} sent you love!`,
    bg: 'from-rose-500/20 via-pink-500/20 to-rose-500/20',
  };

  return (
    <div
      onClick={onDismiss}
      className={`fixed inset-0 pointer-events-auto z-50 flex items-center justify-center p-4 bg-gradient-to-b ${config.bg} backdrop-blur-2xs animate-in fade-in duration-300`}
    >
      {/* Floating animated background elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 14 }).map((_, i) => (
          <div
            key={i}
            className="absolute text-4xl animate-bounce"
            style={{
              top: `${(i * 19) % 90}%`,
              left: `${(i * 23) % 90}%`,
              animationDuration: `${1.2 + (i % 3) * 0.4}s`,
              animationDelay: `${i * 0.1}s`,
            }}
          >
            {config.emoji}
          </div>
        ))}
      </div>

      <div className="relative bg-white/95 rounded-3xl p-8 max-w-sm w-full shadow-2xl border-2 border-rose-300 text-center flex flex-col items-center gap-3 animate-in zoom-in-90 duration-300">
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center text-4xl shadow-xl shadow-rose-200 animate-pulse">
          {config.emoji}
        </div>
        <h3 className="text-xl font-extrabold text-slate-900 tracking-tight font-serif-display">
          {config.title}
        </h3>
        <p className="text-sm text-slate-600 font-medium leading-relaxed">
          {config.subtitle}
        </p>
        <button
          onClick={onDismiss}
          className="mt-2 px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
        >
          Send Love Back 💕
        </button>
      </div>
    </div>
  );
};
