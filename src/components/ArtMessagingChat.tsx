import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Image as ImageIcon,
  PenTool,
  Smile,
  Heart,
  Sparkles,
  Maximize2,
  X,
  Volume2,
} from 'lucide-react';
import { ChatMessage, UserProfile } from '../types';
import { soundEffects } from '../utils/audio';

interface ArtMessagingChatProps {
  messages: ChatMessage[];
  currentUser: UserProfile;
  partnerUser: UserProfile | null;
  partnerTyping: string | null;
  onSendMessage: (msg: Omit<ChatMessage, 'id' | 'senderId' | 'senderName' | 'timestamp'>) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onSendPoke: (pokeType: 'kiss' | 'hug' | 'hearts' | 'miss_you') => void;
  onSendTyping: (isTyping: boolean) => void;
}

const EMOJI_STICKERS = [
  '🕊️', '💖', '💋', '🥰', '🥺', '💍', '💌', '✈️',
  '☕', '✨', '🌹', '🥞', '🧸', '🍕', '🌙', '🌊',
];

const REACTION_EMOJIS = ['❤️', '💋', '🥰', '🥺', '🔥', '✨'];

export const ArtMessagingChat: React.FC<ArtMessagingChatProps> = ({
  messages,
  currentUser,
  partnerUser,
  partnerTyping,
  onSendMessage,
  onToggleReaction,
  onSendPoke,
  onSendTyping,
}) => {
  const [text, setText] = useState('');
  const [showDoodlePad, setShowDoodlePad] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<{ url: string; caption?: string } | null>(null);

  // Quick Doodle pad state
  const quickCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isQuickDrawing, setIsQuickDrawing] = useState(false);
  const [quickColor, setQuickColor] = useState('#f43f5e');
  const [quickBrushSize, setQuickBrushSize] = useState(3);
  const [hasDrawnSomething, setHasDrawnSomething] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-scroll to bottom
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, partnerTyping]);

  // Handle typing notification
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    onSendTyping(e.target.value.trim().length > 0);
  };

  const handleSendText = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    onSendMessage({
      type: 'text',
      text: trimmed,
    });
    setText('');
    onSendTyping(false);
  };

  // Quick Doodle Drawing Handlers
  const startQuickDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = quickCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.save();
    ctx.strokeStyle = quickColor;
    ctx.lineWidth = quickBrushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);

    setIsQuickDrawing(true);
    setHasDrawnSomething(true);
  };

  const moveQuickDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isQuickDrawing) return;
    e.preventDefault();
    const canvas = quickCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopQuickDraw = () => {
    if (!isQuickDrawing) return;
    setIsQuickDrawing(false);
  };

  const clearQuickCanvas = () => {
    const canvas = quickCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawnSomething(false);
  };

  const sendQuickDoodle = () => {
    const canvas = quickCanvasRef.current;
    if (!canvas || !hasDrawnSomething) return;

    // Create an opaque background copy
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCtx.fillStyle = '#fffafb';
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      tempCtx.drawImage(canvas, 0, 0);
      const dataUrl = tempCanvas.toDataURL('image/png');

      onSendMessage({
        type: 'sketch',
        sketchDataUrl: dataUrl,
        text: 'Quick love sketch ✨',
      });

      clearQuickCanvas();
      setShowDoodlePad(false);
    }
  };

  // Photo upload from file picker
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        onSendMessage({
          type: 'photo',
          photoUrl: result,
          text: `Shared a photo memory 📸`,
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const formatTime = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-210px)] min-h-[500px] max-w-4xl mx-auto w-full bg-white/90 backdrop-blur-md rounded-3xl border border-rose-100 shadow-xl overflow-hidden">
      {/* Top Bar with partner info & quick poke darts */}
      <div className="px-5 py-3 border-b border-rose-100/80 bg-gradient-to-r from-rose-50/70 via-pink-50/50 to-white flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="text-2xl">{partnerUser?.avatar || '🕊️'}</span>
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                partnerUser?.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
              }`}
            />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <span>{partnerUser?.name || 'Partner Waiting'}</span>
              {partnerUser?.isOnline ? (
                <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  online now 💕
                </span>
              ) : (
                <span className="text-[11px] font-medium text-slate-400">
                  {partnerUser ? 'offline' : 'share code to connect'}
                </span>
              )}
            </h2>
            <p className="text-[11px] text-slate-500">
              {partnerUser?.city ? `📍 ${partnerUser.city}` : 'Lovora Art & Heart Stream'}
            </p>
          </div>
        </div>

        {/* Quick Poke Darts */}
        <div className="flex items-center gap-1 bg-white/80 border border-rose-100 px-2 py-1 rounded-2xl shadow-2xs">
          <span className="text-[11px] font-semibold text-rose-500 mr-1 hidden sm:inline">Send Love:</span>
          <button
            onClick={() => onSendPoke('kiss')}
            title="Send Kiss"
            className="p-1.5 hover:bg-rose-50 rounded-xl text-sm transition-transform active:scale-125 cursor-pointer"
          >
            💋
          </button>
          <button
            onClick={() => onSendPoke('hug')}
            title="Send Warm Hug"
            className="p-1.5 hover:bg-pink-50 rounded-xl text-sm transition-transform active:scale-125 cursor-pointer"
          >
            🤗
          </button>
          <button
            onClick={() => onSendPoke('hearts')}
            title="Send Heart Shower"
            className="p-1.5 hover:bg-rose-50 rounded-xl text-sm transition-transform active:scale-125 cursor-pointer"
          >
            💖
          </button>
          <button
            onClick={() => onSendPoke('miss_you')}
            title="Miss You Whisper"
            className="p-1.5 hover:bg-purple-50 rounded-xl text-sm transition-transform active:scale-125 cursor-pointer"
          >
            🥺
          </button>
        </div>
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gradient-to-b from-rose-50/20 via-white to-pink-50/20">
        {messages.length === 0 && (
          <div className="text-center py-12 text-slate-400 space-y-2">
            <span className="text-4xl block">🕊️💌</span>
            <p className="text-sm font-medium text-slate-600">Your private love nest is waiting!</p>
            <p className="text-xs">Send a sweet note, draw a doodle, or blow a kiss across the miles.</p>
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.senderId === currentUser.id;
          const isSystem = msg.senderId === 'system';

          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center my-3">
                <div className="px-4 py-2 rounded-2xl bg-rose-50 border border-rose-100/90 text-xs text-rose-700 max-w-md text-center shadow-2xs font-medium">
                  {msg.text}
                </div>
              </div>
            );
          }

          if (msg.type === 'poke') {
            const pokeIcons = {
              kiss: '💋 Blew a passionate kiss across the distance!',
              hug: '🤗 Sent the warmest, tightest bear hug!',
              hearts: '💖 Showered your screen with love & sparkles!',
              miss_you: '🥺 Whispered: "I miss you so much right now..."',
            };
            return (
              <div key={msg.id} className="flex justify-center my-2">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-rose-100 via-pink-100 to-amber-100 border border-rose-200 text-xs font-semibold text-rose-900 shadow-2xs animate-in zoom-in-95">
                  <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                  <span>
                    {isMe ? 'You' : msg.senderName} {pokeIcons[msg.pokeType || 'kiss']}
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">{formatTime(msg.timestamp)}</span>
                </div>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-end gap-2 max-w-[85%] sm:max-w-[70%]">
                {!isMe && (
                  <span className="text-xl mb-1 flex-shrink-0" title={msg.senderName}>
                    {msg.senderAvatar || partnerUser?.avatar || '🕊️'}
                  </span>
                )}

                <div
                  className={`rounded-3xl p-3.5 shadow-xs transition-all relative ${
                    isMe
                      ? 'bg-gradient-to-br from-rose-500 to-pink-500 text-white rounded-br-xs'
                      : 'bg-white text-slate-800 border border-rose-100 rounded-bl-xs'
                  }`}
                >
                  {/* Sender name for partner */}
                  {!isMe && (
                    <p className="text-[11px] font-bold text-rose-500 mb-1">{msg.senderName}</p>
                  )}

                  {/* Sketch / Doodle View */}
                  {msg.type === 'sketch' && msg.sketchDataUrl && (
                    <div className="mb-2 rounded-2xl overflow-hidden border border-black/10 bg-white relative group/img cursor-pointer"
                      onClick={() => setPreviewMedia({ url: msg.sketchDataUrl!, caption: msg.text })}
                    >
                      <img
                        src={msg.sketchDataUrl}
                        alt="Doodle"
                        className="w-full max-h-64 object-contain rounded-2xl bg-white"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                        <Maximize2 className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  )}

                  {/* Photo View */}
                  {msg.type === 'photo' && msg.photoUrl && (
                    <div
                      className="mb-2 rounded-2xl overflow-hidden border border-black/10 relative group/photo cursor-pointer"
                      onClick={() => setPreviewMedia({ url: msg.photoUrl!, caption: msg.text })}
                    >
                      <img
                        src={msg.photoUrl}
                        alt="Shared Photo"
                        className="w-full max-h-72 object-cover rounded-2xl"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center">
                        <Maximize2 className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  )}

                  {/* Text Message */}
                  {msg.text && (
                    <p className={`text-sm leading-relaxed break-words whitespace-pre-wrap ${
                      msg.type === 'sketch' ? 'font-medium italic text-xs' : ''
                    }`}>
                      {msg.text}
                    </p>
                  )}

                  {/* Timestamp */}
                  <div
                    className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${
                      isMe ? 'text-rose-100' : 'text-slate-400'
                    }`}
                  >
                    <span>{formatTime(msg.timestamp)}</span>
                  </div>
                </div>
              </div>

              {/* Reaction Badges & Reaction Picker Trigger */}
              <div className="flex items-center gap-1 mt-1 px-1">
                {/* Existing reactions list */}
                {msg.reactions &&
                  Object.entries(msg.reactions).map(([emoji, userIds]) => {
                    const hasMyReaction = userIds.includes(currentUser.id);
                    return (
                      <button
                        key={emoji}
                        onClick={() => onToggleReaction(msg.id, emoji)}
                        className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 transition-transform cursor-pointer ${
                          hasMyReaction
                            ? 'bg-rose-100 border-rose-300 text-rose-800 scale-105'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{emoji}</span>
                        <span className="font-bold text-[10px]">{userIds.length}</span>
                      </button>
                    );
                  })}

                {/* Quick reaction trigger hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-white/90 border border-rose-100 rounded-full px-1.5 py-0.5 shadow-xs">
                  {REACTION_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => onToggleReaction(msg.id, emoji)}
                      className="hover:scale-125 transition-transform text-xs p-0.5 cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {/* Partner Typing Indicator */}
        {partnerTyping && (
          <div className="flex items-center gap-2 text-xs text-rose-500 italic bg-rose-50/80 px-3 py-1.5 rounded-full w-fit animate-pulse">
            <span>{partnerUser?.avatar || '🕊️'}</span>
            <span>{partnerTyping} is writing a love note...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Embedded Collapsible Quick Doodle Pad (Lovora style!) */}
      {showDoodlePad && (
        <div className="p-4 bg-rose-50/90 border-t border-rose-200/70 animate-in slide-in-from-bottom-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="p-1 bg-rose-500 text-white rounded-lg">
                <PenTool className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs font-bold text-slate-800">Quick Heart & Art Scribble</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearQuickCanvas}
                className="text-xs text-slate-500 hover:text-red-500 cursor-pointer"
              >
                Clear
              </button>
              <button
                onClick={() => setShowDoodlePad(false)}
                className="p-1 hover:bg-rose-200/50 rounded-lg text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="relative rounded-2xl overflow-hidden border border-rose-200 bg-[#fffafb] shadow-inner mb-2">
            <canvas
              ref={quickCanvasRef}
              width={600}
              height={180}
              onMouseDown={startQuickDraw}
              onMouseMove={moveQuickDraw}
              onMouseUp={stopQuickDraw}
              onMouseLeave={stopQuickDraw}
              onTouchStart={startQuickDraw}
              onTouchMove={moveQuickDraw}
              onTouchEnd={stopQuickDraw}
              className="w-full h-36 touch-none cursor-crosshair block"
            />
            {!hasDrawnSomething && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-xs text-rose-300 font-medium">
                Draw a quick heart, cute doodle, or handwritten kiss note here ✨
              </div>
            )}
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2">
            {/* Color swatches */}
            <div className="flex items-center gap-1.5">
              {['#f43f5e', '#ec4899', '#a855f7', '#3b82f6', '#10b981', '#1f2937'].map((c) => (
                <button
                  key={c}
                  onClick={() => setQuickColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-5 h-5 rounded-full border border-black/10 cursor-pointer ${
                    quickColor === c ? 'ring-2 ring-offset-1 ring-rose-500 scale-110' : ''
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDoodlePad(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-rose-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={sendQuickDoodle}
                disabled={!hasDrawnSomething}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Send Doodle 💕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stickers Tray */}
      {showStickers && (
        <div className="p-3 bg-white border-t border-rose-100 grid grid-cols-8 gap-2 animate-in slide-in-from-bottom-2">
          {EMOJI_STICKERS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                onSendMessage({ type: 'text', text: emoji });
                setShowStickers(false);
              }}
              className="text-2xl p-2 hover:bg-rose-50 rounded-2xl transition-transform hover:scale-125 cursor-pointer text-center"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Input Bar */}
      <form
        onSubmit={handleSendText}
        className="p-3 bg-white border-t border-rose-100/90 flex items-center gap-2"
      >
        {/* Toggle quick doodle pad */}
        <button
          type="button"
          onClick={() => {
            setShowDoodlePad((prev) => !prev);
            setShowStickers(false);
          }}
          title="Quick Doodle"
          className={`p-2.5 rounded-2xl transition-all cursor-pointer ${
            showDoodlePad
              ? 'bg-rose-500 text-white shadow-xs'
              : 'text-rose-600 hover:bg-rose-50'
          }`}
        >
          <PenTool className="w-5 h-5" />
        </button>

        {/* Upload photo */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Send Photo"
          className="p-2.5 rounded-2xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
        >
          <ImageIcon className="w-5 h-5" />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handlePhotoUpload}
          className="hidden"
        />

        {/* Emoji / Stickers button */}
        <button
          type="button"
          onClick={() => setShowStickers((prev) => !prev)}
          title="Stickers"
          className={`p-2.5 rounded-2xl transition-colors cursor-pointer ${
            showStickers ? 'bg-pink-100 text-pink-600' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <Smile className="w-5 h-5" />
        </button>

        {/* Text Input */}
        <input
          type="text"
          value={text}
          onChange={handleTextChange}
          placeholder="Whisper something sweet across the miles..."
          className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition-all text-slate-800"
        />

        {/* Send Button */}
        <button
          type="submit"
          disabled={!text.trim()}
          className="p-2.5 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-95"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>

      {/* Fullscreen Lightbox Modal for Sketches & Photos */}
      {previewMedia && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in"
          onClick={() => setPreviewMedia(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setPreviewMedia(null)}
              className="absolute -top-10 right-0 p-2 text-white hover:text-rose-400 cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={previewMedia.url}
              alt="Preview"
              className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl object-contain bg-white"
            />
            {previewMedia.caption && (
              <p className="mt-3 text-white text-sm font-medium bg-black/50 px-4 py-1.5 rounded-full">
                {previewMedia.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
