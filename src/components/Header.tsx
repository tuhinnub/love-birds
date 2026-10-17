import React, { useState } from 'react';
import {
  MessageCircleHeart,
  Palette,
  Images,
  Calendar,
  Mail,
  Copy,
  Check,
  Volume2,
  VolumeX,
  LogOut,
  Heart,
  Users,
} from 'lucide-react';
import { UserProfile } from '../types';
import { soundEffects } from '../utils/audio';

interface HeaderProps {
  currentCode: string;
  currentUser: UserProfile;
  partnerUser: UserProfile | null;
  isConnected: boolean;
  activeTab: 'chat' | 'canvas' | 'photos' | 'calendar' | 'letters';
  setActiveTab: (tab: 'chat' | 'canvas' | 'photos' | 'calendar' | 'letters') => void;
  onDisconnect: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentCode,
  currentUser,
  partnerUser,
  isConnected,
  activeTab,
  setActiveTab,
  onDisconnect,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCodeOnly, setCopiedCodeOnly] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [muted, setMuted] = useState(soundEffects.getMuted());

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentCode);
    setCopiedCodeOnly(true);
    setTimeout(() => setCopiedCodeOnly(false), 2000);
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}?nest=${currentCode}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const toggleMute = () => {
    const next = !muted;
    soundEffects.setMuted(next);
    setMuted(next);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-rose-100 shadow-2xs">
      {/* Top Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center text-white shadow-md shadow-rose-200">
            <span className="text-xl">🕊️</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-extrabold text-slate-800 tracking-tight font-serif-display">
                Love Birds
              </h1>
              <span className="text-xs text-rose-500 animate-pulse">💕</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <span className="text-sm">{currentUser.avatar || '🕊️'}</span>
                <span className="font-semibold text-slate-700">{currentUser.name}</span>
              </span>
              <span>&</span>
              <span className="flex items-center gap-1">
                <span className="text-sm">{partnerUser?.avatar || '🕊️'}</span>
                <span className="font-semibold text-slate-700">
                  {partnerUser?.name || 'Partner Waiting'}
                </span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    partnerUser?.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                  }`}
                  title={partnerUser?.isOnline ? 'Partner Online' : 'Partner Offline'}
                />
              </span>
            </div>
          </div>
        </div>

        {/* Nest Code & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Pair Code Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-200/80 rounded-xl text-xs font-mono font-bold text-rose-800">
            <span className="text-slate-400 font-sans font-medium text-[11px] hidden sm:inline">Nest:</span>
            <span>{currentCode}</span>
            <button
              onClick={handleCopyLink}
              title="Copy Shareable Link"
              className="p-1 hover:bg-rose-100 rounded-md transition-colors cursor-pointer text-rose-600 flex items-center gap-1 text-[11px] font-sans"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">{copiedLink ? 'Copied Link!' : 'Copy Link'}</span>
            </button>
          </div>

          {/* Share & Connect Button */}
          <button
            onClick={() => setShowShareModal(true)}
            title="Share Nest Code with Partner"
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer"
          >
            <span>💌 Invite Partner</span>
          </button>

          {/* Mute button */}
          <button
            onClick={toggleMute}
            title={muted ? 'Unmute sounds' : 'Mute sounds'}
            className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
          >
            {muted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-rose-500" />}
          </button>

          {/* Disconnect button */}
          <button
            onClick={onDisconnect}
            title="Switch Nest / Disconnect"
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Partner waiting notice banner if partner not joined yet */}
      {!partnerUser && (
        <div className="bg-gradient-to-r from-rose-50 via-pink-50 to-amber-50 px-4 py-2 border-t border-rose-100 text-xs text-rose-900 flex items-center justify-between flex-wrap gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="animate-pulse text-base">💌</span>
            <span>
              Your partner hasn't entered this nest yet! Share Nest Code <strong className="font-mono bg-white px-2 py-0.5 rounded-md border border-rose-200 text-rose-700">{currentCode}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCode}
              className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              {copiedCodeOnly ? '✅ Code Copied!' : '📋 Copy Code'}
            </button>
            <button
              onClick={handleCopyLink}
              className="px-2.5 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              {copiedLink ? '✅ Link Copied!' : '🔗 Copy Direct Link'}
            </button>
          </div>
        </div>
      )}

      {/* Share Modal Dialog */}
      {showShareModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowShareModal(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-rose-100 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-1">
              <span className="text-3xl block">🕊️💕</span>
              <h3 className="text-lg font-bold text-slate-800 font-serif-display">
                Pair with Your Partner
              </h3>
              <p className="text-xs text-slate-500">
                Send your partner this code or link so you can message and draw together!
              </p>
            </div>

            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 text-center space-y-2">
              <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">
                Your Couple Nest Code
              </span>
              <div className="text-2xl font-mono font-extrabold text-slate-800 tracking-wider">
                {currentCode}
              </div>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 bg-white text-rose-600 font-bold text-xs rounded-xl border border-rose-200 shadow-2xs hover:bg-rose-100 transition-colors cursor-pointer"
                >
                  {copiedCodeOnly ? '✅ Copied Code!' : '📋 Copy Code'}
                </button>
                <button
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 bg-rose-500 text-white font-bold text-xs rounded-xl shadow-2xs hover:bg-rose-600 transition-colors cursor-pointer"
                >
                  {copiedLink ? '✅ Copied Link!' : '🔗 Copy Direct Link'}
                </button>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-700">How your partner connects:</p>
              <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-slate-500">
                <li>Partner opens Love Birds on their phone or computer</li>
                <li>Partner enters code <span className="font-mono font-bold text-rose-600">{currentCode}</span> (or taps your active nest)</li>
                <li>Both devices connect in real-time instantly!</li>
              </ol>
            </div>

            <button
              onClick={() => setShowShareModal(false)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Done / Close
            </button>
          </div>
        </div>
      )}

      {/* Primary Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-none border-t border-rose-50 py-1.5">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'chat'
              ? 'bg-rose-500 text-white shadow-xs'
              : 'text-slate-600 hover:bg-rose-50 hover:text-rose-600'
          }`}
        >
          <MessageCircleHeart className="w-4 h-4" />
          <span>Art & Chat</span>
        </button>

        <button
          onClick={() => setActiveTab('canvas')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'canvas'
              ? 'bg-rose-500 text-white shadow-xs'
              : 'text-slate-600 hover:bg-rose-50 hover:text-rose-600'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Live Canvas 🎨</span>
        </button>

        <button
          onClick={() => setActiveTab('photos')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'photos'
              ? 'bg-rose-500 text-white shadow-xs'
              : 'text-slate-600 hover:bg-rose-50 hover:text-rose-600'
          }`}
        >
          <Images className="w-4 h-4" />
          <span>Scrapbook & Photos</span>
        </button>

        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'calendar'
              ? 'bg-rose-500 text-white shadow-xs'
              : 'text-slate-600 hover:bg-rose-50 hover:text-rose-600'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Synced Calendar & Clocks</span>
        </button>

        <button
          onClick={() => setActiveTab('letters')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'letters'
              ? 'bg-rose-500 text-white shadow-xs'
              : 'text-slate-600 hover:bg-rose-50 hover:text-rose-600'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Love Letters & Fridge</span>
        </button>
      </div>
    </header>
  );
};
