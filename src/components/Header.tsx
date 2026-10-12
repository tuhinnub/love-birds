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
  ExternalLink,
  Heart,
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
  const [copied, setCopied] = useState(false);
  const [muted, setMuted] = useState(soundEffects.getMuted());

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}?nest=${currentCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleMute = () => {
    const next = !muted;
    soundEffects.setMuted(next);
    setMuted(next);
  };

  const openPartnerWindow = () => {
    // Open partner view in second window or tab for demo testing
    const partnerUrl = `${window.location.origin}?nest=${currentCode}`;
    window.open(partnerUrl, '_blank');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-rose-100 shadow-2xs">
      {/* Top Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
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
                  {partnerUser?.name || 'Partner'}
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
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-200/80 rounded-xl text-xs font-mono font-bold text-rose-800">
            <span className="text-slate-400 font-sans font-medium text-[11px]">Nest:</span>
            <span>{currentCode}</span>
            <button
              onClick={handleCopyCode}
              title="Copy Nest Code"
              className="p-1 hover:bg-rose-100 rounded-md transition-colors cursor-pointer text-rose-600"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Test in 2nd tab */}
          <button
            onClick={openPartnerWindow}
            title="Open partner view in new window to test real-time collaboration"
            className="hidden md:flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-rose-600 bg-rose-50/80 hover:bg-rose-100 rounded-xl border border-rose-200 transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>2nd Tab Demo</span>
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
