import React, { useState } from 'react';
import {
  Heart,
  Copy,
  Check,
  Sparkles,
  Link2,
  Users,
  Compass,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { UserProfile } from '../types';

interface PairingModalProps {
  onPair: (code: string, user: UserProfile) => void;
  initialCode?: string | null;
}

const BIRD_AVATARS = ['🕊️', '🦢', '🦜', '🦩', '🐧', '🦉', '🐣', '🐥'];

export const PairingModal: React.FC<PairingModalProps> = ({ onPair, initialCode }) => {
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [pairCode, setPairCode] = useState(initialCode || '');
  const [userName, setUserName] = useState('');
  const [avatar, setAvatar] = useState('🕊️');
  const [city, setCity] = useState('');
  const [copied, setCopied] = useState(false);

  // Generate a random pair code on mount if in create mode
  const [generatedCode, setGeneratedCode] = useState(() => {
    if (initialCode) return initialCode;
    const prefixes = ['BIRD', 'DOVE', 'HEART', 'LOVE', 'SWEET'];
    const randPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randNum = Math.floor(1000 + Math.random() * 9000);
    return `${randPrefix}-${randNum}`;
  });

  const handleCopyLink = () => {
    const code = mode === 'create' ? generatedCode : pairCode;
    const url = `${window.location.origin}?nest=${code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = userName.trim() || (mode === 'create' ? 'Love Bird 1' : 'Love Bird 2');
    const finalCode = mode === 'create' ? generatedCode : pairCode.trim().toUpperCase();

    if (!finalCode) return;

    // Detect browser timezone
    let detectedTz = 'UTC';
    try {
      detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {}

    const user: UserProfile = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name: finalName,
      avatar,
      city: city.trim() || undefined,
      timezone: detectedTz,
    };

    onPair(finalCode, user);
  };

  const handleDemoMode = () => {
    const demoCode = 'LOVE-BIRDS-DEMO';
    const user: UserProfile = {
      id: 'usr-maya-demo',
      name: 'Maya',
      avatar: '🕊️',
      city: 'New York, USA',
      timezone: 'America/New_York',
    };
    onPair(demoCode, user);
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-rose-900/60 via-pink-900/40 to-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-rose-100 flex flex-col gap-5 my-8 animate-in fade-in zoom-in-95">
        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-200 mb-1">
            <span className="text-3xl">🕊️</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight font-serif-display">
            Love Birds
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
            A private sanctuary for couples in long-distance love.
            <span className="block text-rose-500 font-semibold mt-0.5">
              No passwords or signup required — just one unique nest code.
            </span>
          </p>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 p-1 bg-rose-50/80 rounded-2xl border border-rose-100">
          <button
            type="button"
            onClick={() => setMode('create')}
            className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              mode === 'create'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-rose-600'
            }`}
          >
            Create New Nest 🕊️
          </button>
          <button
            type="button"
            onClick={() => setMode('join')}
            className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              mode === 'join'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-rose-600'
            }`}
          >
            Join Partner's Nest 🔗
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Pair Code Section */}
          {mode === 'create' ? (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-50 via-pink-50 to-amber-50 border border-rose-200/80 space-y-2">
              <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">
                Your Unique Couple Nest Code
              </span>
              <div className="flex items-center justify-between gap-2 bg-white px-3.5 py-2.5 rounded-xl border border-rose-200 font-mono font-bold text-lg text-slate-800 shadow-2xs">
                <span>{generatedCode}</span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-sans font-bold bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied Link!' : 'Share Link'}
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Send this code or link to your partner so they can join your nest!
              </p>
            </div>
          ) : (
            <div>
              <label className="text-xs font-semibold text-slate-700">Enter Partner's Nest Code</label>
              <input
                type="text"
                required
                placeholder="e.g. BIRD-4829"
                value={pairCode}
                onChange={(e) => setPairCode(e.target.value.toUpperCase())}
                className="w-full mt-1 px-4 py-2.5 font-mono text-base uppercase rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-400 font-bold"
              />
            </div>
          )}

          {/* Nickname */}
          <div>
            <label className="text-xs font-semibold text-slate-700">Your Nickname / Pet Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Maya, Honey, My Love..."
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full mt-1 px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-400"
            />
          </div>

          {/* Avatar bird selection */}
          <div>
            <label className="text-xs font-semibold text-slate-700">Choose Your Love Bird Avatar</label>
            <div className="grid grid-cols-8 gap-1.5 mt-1.5">
              {BIRD_AVATARS.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setAvatar(b)}
                  className={`text-2xl p-2 rounded-xl transition-all cursor-pointer ${
                    avatar === b
                      ? 'bg-rose-100 ring-2 ring-rose-500 scale-110 shadow-xs'
                      : 'hover:bg-slate-100'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* City / Location for time sync */}
          <div>
            <label className="text-xs font-semibold text-slate-700">
              Your City / Location (for dual clock sync)
            </label>
            <input
              type="text"
              placeholder="e.g. New York, London, Tokyo, Paris..."
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full mt-1 px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-400"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 hover:to-pink-600 text-white font-bold text-sm rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <span>Enter Our Nest</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Mode Button for Instant Evaluation */}
        <div className="pt-2 border-t border-slate-100 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={handleDemoMode}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1.5 cursor-pointer py-1"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Quick Start with Demo Couple ("Maya & Alex")</span>
          </button>
          <p className="text-[11px] text-slate-400 text-center">
            Tip: Open this app in two side-by-side tabs to watch real-time sketches & messages sync live!
          </p>
        </div>
      </div>
    </div>
  );
};
