import React, { useState, useEffect } from 'react';
import {
  Heart,
  Copy,
  Check,
  Sparkles,
  Link2,
  Users,
  ArrowRight,
  ShieldCheck,
  Flame,
  Radio,
} from 'lucide-react';
import { UserProfile } from '../types';

interface PairingModalProps {
  onPair: (code: string, user: UserProfile) => void;
  initialCode?: string | null;
}

interface ActiveNest {
  code: string;
  partnerName: string;
  partnerAvatar: string;
  usersCount: number;
}

const BIRD_AVATARS = ['🕊️', '🦢', '🦜', '🦩', '🐧', '🦉', '🐣', '🐥'];

function sanitizeNestCode(raw: string): string {
  if (!raw) return '';
  let str = raw.trim();

  // If query string or URL parameter like ?nest=BIRD-1234 or &code=BIRD-1234
  if (str.includes('nest=') || str.includes('code=')) {
    const match = str.match(/[?&](?:nest|code)=([A-Za-z0-9_-]+)/i);
    if (match) return match[1].trim().toUpperCase();
  }

  // If full URL e.g. https://.../nest/BIRD-1234
  if (str.startsWith('http://') || str.startsWith('https://')) {
    try {
      const u = new URL(str);
      const nestParam = u.searchParams.get('nest') || u.searchParams.get('code');
      if (nestParam) return nestParam.trim().toUpperCase();
      const parts = u.pathname.split('/').filter(Boolean);
      if (parts.length > 0) {
        const last = parts[parts.length - 1];
        if (/^[A-Za-z0-9_-]+$/.test(last)) return last.trim().toUpperCase();
      }
    } catch {}
  }

  // If "Nest: BIRD-1234" or "Code: BIRD-1234"
  const prefixMatch = str.match(/(?:nest|code)[:\s]+([A-Za-z0-9_-]+)/i);
  if (prefixMatch) return prefixMatch[1].trim().toUpperCase();

  // Replace spaces with hyphens if like "DOVE 6264"
  if (/^[A-Za-z]+\s+\d+$/.test(str)) {
    str = str.replace(/\s+/, '-');
  }

  return str.toUpperCase();
}

export const PairingModal: React.FC<PairingModalProps> = ({ onPair, initialCode }) => {
  const [mode, setMode] = useState<'join' | 'create'>(initialCode ? 'join' : 'join');
  const [pairCode, setPairCode] = useState(initialCode ? sanitizeNestCode(initialCode) : '');
  const [userName, setUserName] = useState('');
  const [avatar, setAvatar] = useState('🕊️');
  const [city, setCity] = useState('');
  const [copied, setCopied] = useState(false);
  const [partnerFound, setPartnerFound] = useState<string | null>(null);
  const [activeNests, setActiveNests] = useState<ActiveNest[]>([]);

  // Random code generated for create mode
  const [generatedCode, setGeneratedCode] = useState(() => {
    const prefixes = ['BIRD', 'DOVE', 'HEART', 'LOVE', 'SWEET'];
    const randPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randNum = Math.floor(1000 + Math.random() * 9000);
    return `${randPrefix}-${randNum}`;
  });

  // Fetch active nests to allow 1-click joining
  useEffect(() => {
    let isDisposed = false;
    fetch('/api/rooms/active')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isDisposed && data?.nests && Array.isArray(data.nests)) {
          setActiveNests(data.nests);
          // If no initial code and there's exactly 1 active nest waiting, default to it
          if (!initialCode && data.nests.length > 0) {
            const first = data.nests[0];
            if (!pairCode) {
              setPairCode(first.code);
              setPartnerFound(first.partnerName);
            }
          }
        }
      })
      .catch(() => {});

    return () => {
      isDisposed = true;
    };
  }, [initialCode]);

  // Pre-register generated code on server when in create mode so partner can connect immediately
  useEffect(() => {
    if (mode === 'create' && generatedCode) {
      fetch(`/api/room/${encodeURIComponent(generatedCode)}/sync`).catch(() => {});
    }
  }, [mode, generatedCode]);

  // Check if room exists and has partner info
  useEffect(() => {
    const targetCode = sanitizeNestCode(mode === 'join' ? pairCode : generatedCode);
    if (!targetCode) {
      setPartnerFound(null);
      return;
    }

    let isDisposed = false;
    const timer = setTimeout(() => {
      fetch(`/api/room/check?code=${encodeURIComponent(targetCode)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!isDisposed && data?.exists) {
            setPartnerFound(data.partnerName || 'Your Love');
          } else if (!isDisposed) {
            setPartnerFound(null);
          }
        })
        .catch(() => {});
    }, 200);

    return () => {
      isDisposed = true;
      clearTimeout(timer);
    };
  }, [pairCode, generatedCode, mode]);

  const handleCopyLink = () => {
    const code = mode === 'create' ? generatedCode : pairCode;
    const clean = sanitizeNestCode(code);
    const url = `${window.location.origin}?nest=${clean}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSelectActiveNest = (code: string, partnerName: string) => {
    setMode('join');
    setPairCode(code);
    setPartnerFound(partnerName);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = mode === 'create' ? generatedCode : pairCode;
    const finalCode = sanitizeNestCode(raw);
    if (!finalCode) return;

    const finalName = userName.trim() || (mode === 'create' ? 'Love Bird 1' : 'Sweetheart');

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
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-rose-100 flex flex-col gap-4 my-8 animate-in fade-in zoom-in-95">
        {/* Brand Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-200 mb-1">
            <span className="text-3xl">🕊️</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight font-serif-display">
            Love Birds
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
            A private real-time sanctuary for long-distance love.
            <span className="block text-rose-500 font-semibold mt-0.5">
              No passwords required — just one unique nest code to pair!
            </span>
          </p>
        </div>

        {/* Invited banner if initialCode is present */}
        {initialCode && (
          <div className="p-3 bg-pink-50 border border-pink-200 rounded-2xl text-xs text-pink-800 flex items-center gap-2">
            <span className="text-lg">💌</span>
            <div className="flex-1">
              <span className="font-bold">Joining Partner's Nest: </span>
              <span className="font-mono font-bold text-pink-900">{sanitizeNestCode(initialCode)}</span>
              {partnerFound && (
                <span className="block text-[11px] text-pink-600 font-semibold">
                  Waiting for you: {partnerFound} 💕
                </span>
              )}
            </div>
          </div>
        )}

        {/* 1-Click Available Nests (Solves code typo / discovery) */}
        {activeNests.length > 0 && !initialCode && (
          <div className="p-3 bg-gradient-to-r from-rose-50 via-pink-50 to-amber-50 rounded-2xl border border-rose-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-rose-700 flex items-center gap-1.5 uppercase tracking-wider">
                <Radio className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                Active Nests Waiting for Partner:
              </span>
              <span className="text-[10px] text-rose-500 font-medium">1-Click Join</span>
            </div>
            <div className="space-y-1.5">
              {activeNests.slice(0, 3).map((n) => (
                <button
                  key={n.code}
                  type="button"
                  onClick={() => handleSelectActiveNest(n.code, n.partnerName)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                    pairCode === n.code
                      ? 'bg-rose-500 text-white border-rose-600 shadow-xs'
                      : 'bg-white hover:bg-rose-100/70 border-rose-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{n.partnerAvatar || '🕊️'}</span>
                    <div>
                      <span className="font-mono font-bold text-xs">{n.code}</span>
                      <span className={`block text-[10px] ${pairCode === n.code ? 'text-rose-100' : 'text-slate-500'}`}>
                        {n.partnerName} is waiting
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${
                      pairCode === n.code ? 'bg-white/20 text-white' : 'bg-rose-50 text-rose-600'
                    }`}
                  >
                    Connect Now ➔
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab switch */}
        <div className="grid grid-cols-2 p-1 bg-rose-50/80 rounded-2xl border border-rose-100">
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
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
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
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied Link!' : 'Copy Link'}
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Share this code or link with your partner. When they enter it, your rooms connect instantly!
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Enter Partner's Nest Code</label>
              <input
                type="text"
                required
                placeholder="e.g. DOVE-6264, 6264, or paste link"
                value={pairCode}
                onChange={(e) => setPairCode(sanitizeNestCode(e.target.value))}
                className="w-full px-4 py-2.5 font-mono text-base uppercase rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-400 font-bold tracking-wider"
              />
              {partnerFound ? (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800 animate-in fade-in">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">💕</span>
                    <span>
                      Nest Active! <strong>{partnerFound}</strong> is waiting for you!
                    </span>
                  </div>
                  <Check className="w-4 h-4 text-emerald-600" />
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">
                  Enter the code your partner gave you (or just the 4 numbers, or paste the link).
                </p>
              )}
            </div>
          )}

          {/* Nickname */}
          <div>
            <label className="text-xs font-semibold text-slate-700">Your Nickname / Pet Name (optional)</label>
            <input
              type="text"
              placeholder="e.g. Maya, Honey, My Love, Alex..."
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full mt-1 px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-400"
            />
          </div>

          {/* Avatar bird selection */}
          <div>
            <label className="text-xs font-semibold text-slate-700">Choose Your Love Bird Avatar</label>
            <div className="grid grid-cols-8 gap-1.5 mt-1">
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
              Your City / Location (optional, for dual clock sync)
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
            className="w-full py-3 bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 hover:to-pink-600 text-white font-bold text-sm rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 active:scale-98"
          >
            <span>Enter Our Nest 💕</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Mode Button for Instant Testing */}
        <div className="pt-2 border-t border-slate-100 flex flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={handleDemoMode}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1.5 cursor-pointer py-1"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Instant Demo Couple ("Maya & Alex")</span>
          </button>
          <p className="text-[11px] text-slate-400 text-center">
            Tip: Open in two tabs or browser windows with the same nest code to see live real-time sync!
          </p>
        </div>
      </div>
    </div>
  );
};
