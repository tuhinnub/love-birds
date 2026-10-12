import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Palette,
  Eraser,
  Undo2,
  Trash2,
  Send,
  Download,
  Sparkles,
  Heart,
  Smile,
  Brush,
  Sun,
  Moon,
  Lightbulb,
} from 'lucide-react';
import { CanvasStroke, UserProfile } from '../types';

interface LiveCanvasProps {
  strokes: CanvasStroke[];
  currentUser: UserProfile;
  partnerUser: UserProfile | null;
  partnerPointer: {
    x: number;
    y: number;
    isDrawing: boolean;
    color: string;
    senderId: string;
  } | null;
  onSendStroke: (stroke: CanvasStroke) => void;
  onClearCanvas: () => void;
  onSendPointer: (pointer: { x: number; y: number; isDrawing: boolean; color: string }) => void;
  onSendToChat: (imageDataUrl: string, caption?: string) => void;
}

const PALETTES = [
  '#f43f5e', // Rose Red
  '#ec4899', // Pink
  '#a855f7', // Purple
  '#6366f1', // Indigo
  '#0ea5e9', // Sky Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber / Gold
  '#ea580c', // Coral Orange
  '#1f2937', // Deep Charcoal
  '#ffffff', // Pure White
];

const PROMPTS = [
  'Draw what you are wearing right now! 👗👕',
  'Sketch our dream reunion kiss at the airport ✈️💋',
  'Draw the breakfast you wish we were having together 🥞☕',
  'Doodle a cute love bird couple cuddling in a nest 🕊️',
  'Write a three-word secret message for me to decode 🤫',
  'Draw my face from memory (no peeking at photos!) 😂❤️',
  'Sketch the destination of our next vacation 🏝️🗼',
];

export const LiveCanvas: React.FC<LiveCanvasProps> = ({
  strokes,
  currentUser,
  partnerUser,
  partnerPointer,
  onSendStroke,
  onClearCanvas,
  onSendPointer,
  onSendToChat,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedColor, setSelectedColor] = useState('#f43f5e');
  const [brushSize, setBrushSize] = useState(4);
  const [brushMode, setBrushMode] = useState<'brush' | 'neon' | 'highlighter' | 'eraser' | 'stamp_heart' | 'stamp_kiss'>('brush');
  const [bgStyle, setBgStyle] = useState<'paper' | 'dark' | 'parchment' | 'rose'>('paper');
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
  const [promptIdx, setPromptIdx] = useState(0);
  const [chatCaption, setChatCaption] = useState('');
  const [showSendModal, setShowSendModal] = useState(false);

  // Throttle live pointer emissions
  const lastPointerEmit = useRef(0);

  // Redraw canvas whenever strokes or background change
  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill background
    ctx.save();
    if (bgStyle === 'dark') {
      ctx.fillStyle = '#111827';
    } else if (bgStyle === 'parchment') {
      ctx.fillStyle = '#fef3c7';
    } else if (bgStyle === 'rose') {
      ctx.fillStyle = '#fff1f2';
    } else {
      ctx.fillStyle = '#fafafa';
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw subtle grid/dots
    ctx.fillStyle = bgStyle === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
    const spacing = 24;
    for (let x = spacing; x < canvas.width; x += spacing) {
      for (let y = spacing; y < canvas.height; y += spacing) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // Render all saved strokes
    strokes.forEach((stroke) => {
      renderStroke(ctx, stroke);
    });

    // Render current in-progress stroke if drawing
    if (currentPoints.length > 0) {
      renderStroke(ctx, {
        id: 'in-progress',
        color: brushMode === 'eraser' ? '#ffffff' : selectedColor,
        size: brushSize,
        mode: brushMode === 'eraser' ? 'eraser' : (brushMode === 'highlighter' ? 'highlighter' : (brushMode === 'neon' ? 'neon' : 'brush')),
        points: currentPoints,
        authorId: currentUser.id,
      });
    }
  }, [strokes, currentPoints, bgStyle, selectedColor, brushSize, brushMode, currentUser.id]);

  useEffect(() => {
    redrawAll();
  }, [redrawAll]);

  // Adjust canvas resolution to parent width
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      const width = Math.floor(rect.width);
      const height = Math.max(520, Math.min(680, window.innerHeight - 260));

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        redrawAll();
      }
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [redrawAll]);

  function renderStroke(ctx: CanvasRenderingContext2D, stroke: CanvasStroke) {
    if (!stroke.points || stroke.points.length === 0) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (stroke.mode === 'eraser') {
      ctx.strokeStyle = bgStyle === 'dark' ? '#111827' : (bgStyle === 'parchment' ? '#fef3c7' : (bgStyle === 'rose' ? '#fff1f2' : '#fafafa'));
      ctx.lineWidth = stroke.size * 2.5;
    } else if (stroke.mode === 'neon') {
      ctx.strokeStyle = stroke.color;
      ctx.shadowColor = stroke.color;
      ctx.shadowBlur = 12;
      ctx.lineWidth = stroke.size;
    } else if (stroke.mode === 'highlighter') {
      ctx.strokeStyle = stroke.color;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = stroke.size * 2.5;
    } else {
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
    }

    if (stroke.points.length === 1) {
      ctx.beginPath();
      ctx.arc(stroke.points[0].x, stroke.points[0].y, stroke.size / 2, 0, Math.PI * 2);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        const pt = stroke.points[i];
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  // Stamp helper
  const placeStamp = (x: number, y: number, stampType: 'heart' | 'kiss') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.font = `${brushSize * 8}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const stampChar = stampType === 'heart' ? '💖' : '💋';
    ctx.fillText(stampChar, x, y);
    ctx.restore();

    // Store as single point stroke or export to image
    const stampStroke: CanvasStroke = {
      id: `stamp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      color: selectedColor,
      size: brushSize,
      mode: 'brush',
      points: [{ x, y }],
      authorId: currentUser.id,
    };
    onSendStroke(stampStroke);
  };

  // Pointer coordinate calculation relative to canvas
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: Math.max(0, Math.min(canvas.width, clientX - rect.left)),
      y: Math.max(0, Math.min(canvas.height, clientY - rect.top)),
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const coords = getCoordinates(e);

    if (brushMode === 'stamp_heart') {
      placeStamp(coords.x, coords.y, 'heart');
      return;
    }
    if (brushMode === 'stamp_kiss') {
      placeStamp(coords.x, coords.y, 'kiss');
      return;
    }

    setIsDrawing(true);
    setCurrentPoints([coords]);

    onSendPointer({
      x: coords.x,
      y: coords.y,
      isDrawing: true,
      color: selectedColor,
    });
  };

  const drawMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const coords = getCoordinates(e);

    // Throttle live pointer emission to partner
    const now = Date.now();
    if (now - lastPointerEmit.current > 40) {
      lastPointerEmit.current = now;
      onSendPointer({
        x: coords.x,
        y: coords.y,
        isDrawing,
        color: selectedColor,
      });
    }

    if (!isDrawing) return;
    setCurrentPoints((prev) => [...prev, coords]);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentPoints.length > 0) {
      const newStroke: CanvasStroke = {
        id: `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        color: brushMode === 'eraser' ? '#ffffff' : selectedColor,
        size: brushSize,
        mode: brushMode === 'eraser' ? 'eraser' : (brushMode === 'highlighter' ? 'highlighter' : (brushMode === 'neon' ? 'neon' : 'brush')),
        points: currentPoints,
        authorId: currentUser.id,
      };
      onSendStroke(newStroke);
    }

    setCurrentPoints([]);
    onSendPointer({
      x: 0,
      y: 0,
      isDrawing: false,
      color: selectedColor,
    });
  };

  // Export current canvas to image data url
  const exportCanvasImage = (): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.toDataURL('image/png');
  };

  const handleDownload = () => {
    const dataUrl = exportCanvasImage();
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `lovebirds-sketch-${Date.now()}.png`;
    a.click();
  };

  const handleSendToChatConfirm = () => {
    const dataUrl = exportCanvasImage();
    if (!dataUrl) return;
    onSendToChat(dataUrl, chatCaption);
    setChatCaption('');
    setShowSendModal(false);
  };

  return (
    <div className="flex flex-col gap-3 max-w-5xl mx-auto w-full">
      {/* Top Banner & Prompt Inspiration */}
      <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-50 via-pink-50 to-amber-50 rounded-2xl border border-rose-100/80 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-rose-500 text-white rounded-lg shadow-xs">
            <Lightbulb className="w-4 h-4" />
          </span>
          <p className="text-xs sm:text-sm font-medium text-slate-800">
            <span className="font-semibold text-rose-600">Couple Prompt: </span>
            {PROMPTS[promptIdx]}
          </p>
        </div>
        <button
          onClick={() => setPromptIdx((p) => (p + 1) % PROMPTS.length)}
          className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2.5 py-1 rounded-lg hover:bg-rose-100/60 transition-colors cursor-pointer"
        >
          Next Prompt →
        </button>
      </div>

      {/* Main Canvas Drawing Area */}
      <div className="relative w-full rounded-3xl overflow-hidden shadow-lg border border-rose-200/60 bg-white">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={drawMove}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={drawMove}
          onTouchEnd={stopDrawing}
          className="touch-none cursor-crosshair block w-full"
        />

        {/* Live Partner Drawing Indicator */}
        {partnerPointer && partnerPointer.x > 0 && partnerPointer.y > 0 && (
          <div
            className="absolute pointer-events-none transition-all duration-75 flex items-center gap-1.5 z-20 -translate-x-2 -translate-y-5"
            style={{
              left: `${partnerPointer.x}px`,
              top: `${partnerPointer.y}px`,
            }}
          >
            <div
              className="w-4 h-4 rounded-full border-2 border-white shadow-md flex items-center justify-center animate-pulse"
              style={{ backgroundColor: partnerPointer.color || '#f43f5e' }}
            >
              <div className="w-1.5 h-1.5 bg-white rounded-full" />
            </div>
            <div className="px-2 py-0.5 rounded-full bg-slate-900/80 text-white text-[11px] font-medium backdrop-blur-xs flex items-center gap-1 shadow-md">
              <span>{partnerUser?.avatar || '🕊️'}</span>
              <span>{partnerUser?.name || 'Partner'}</span>
              {partnerPointer.isDrawing && <span className="text-rose-300">drawing...</span>}
            </div>
          </div>
        )}

        {/* In-canvas quick background style switch */}
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/85 backdrop-blur-md px-2 py-1 rounded-xl shadow-xs border border-rose-100">
          <button
            onClick={() => setBgStyle('paper')}
            title="Clean Paper"
            className={`w-6 h-6 rounded-lg border text-xs flex items-center justify-center transition-all ${
              bgStyle === 'paper' ? 'border-rose-500 scale-105 bg-white font-bold' : 'border-slate-200 bg-white text-slate-500'
            }`}
          >
            <Sun className="w-3.5 h-3.5 text-slate-600" />
          </button>
          <button
            onClick={() => setBgStyle('parchment')}
            title="Vintage Parchment"
            className={`w-6 h-6 rounded-lg border text-xs flex items-center justify-center transition-all ${
              bgStyle === 'parchment' ? 'border-rose-500 scale-105 bg-amber-100' : 'border-slate-200 bg-amber-50 text-amber-800'
            }`}
          >
            📜
          </button>
          <button
            onClick={() => setBgStyle('rose')}
            title="Rose Petal Paper"
            className={`w-6 h-6 rounded-lg border text-xs flex items-center justify-center transition-all ${
              bgStyle === 'rose' ? 'border-rose-500 scale-105 bg-rose-100' : 'border-slate-200 bg-rose-50 text-rose-800'
            }`}
          >
            🌸
          </button>
          <button
            onClick={() => setBgStyle('dark')}
            title="Night Sky"
            className={`w-6 h-6 rounded-lg border text-xs flex items-center justify-center transition-all ${
              bgStyle === 'dark' ? 'border-rose-500 scale-105 bg-slate-800' : 'border-slate-200 bg-slate-700 text-slate-200'
            }`}
          >
            <Moon className="w-3.5 h-3.5 text-amber-200" />
          </button>
        </div>
      </div>

      {/* Floating Interactive Toolbar */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-md border border-rose-100 flex flex-wrap items-center justify-between gap-3">
        {/* Tools */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setBrushMode('brush')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              brushMode === 'brush'
                ? 'bg-rose-500 text-white shadow-xs scale-105'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
            }`}
          >
            <Brush className="w-3.5 h-3.5" />
            Pen
          </button>

          <button
            onClick={() => setBrushMode('neon')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              brushMode === 'neon'
                ? 'bg-purple-600 text-white shadow-xs scale-105'
                : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Neon Glow
          </button>

          <button
            onClick={() => setBrushMode('highlighter')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              brushMode === 'highlighter'
                ? 'bg-amber-500 text-white shadow-xs scale-105'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            Highlight
          </button>

          <button
            onClick={() => setBrushMode('stamp_heart')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              brushMode === 'stamp_heart'
                ? 'bg-pink-600 text-white shadow-xs scale-105'
                : 'bg-pink-50 text-pink-800 hover:bg-pink-100'
            }`}
          >
            <Heart className="w-3.5 h-3.5 fill-current" />
            Stamp Heart
          </button>

          <button
            onClick={() => setBrushMode('stamp_kiss')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              brushMode === 'stamp_kiss'
                ? 'bg-rose-600 text-white shadow-xs scale-105'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
            }`}
          >
            <span>💋</span>
            Kiss Stamp
          </button>

          <button
            onClick={() => setBrushMode('eraser')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              brushMode === 'eraser'
                ? 'bg-slate-700 text-white shadow-xs scale-105'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Eraser className="w-3.5 h-3.5" />
            Eraser
          </button>
        </div>

        {/* Thickness slider */}
        <div className="flex items-center gap-2 px-2 py-1 bg-slate-50 rounded-xl border border-slate-200/60">
          <span className="text-[11px] font-medium text-slate-500">Size:</span>
          <input
            type="range"
            min="2"
            max="28"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-20 accent-rose-500 cursor-pointer"
          />
          <span className="text-xs font-bold text-slate-700 w-4 text-center">{brushSize}</span>
        </div>

        {/* Palette colors */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {PALETTES.map((color) => (
            <button
              key={color}
              onClick={() => {
                setSelectedColor(color);
                if (brushMode === 'eraser') setBrushMode('brush');
              }}
              style={{ backgroundColor: color }}
              className={`w-6 h-6 rounded-full border border-black/10 transition-transform cursor-pointer ${
                selectedColor === color && brushMode !== 'eraser'
                  ? 'ring-2 ring-offset-2 ring-rose-500 scale-110 shadow-xs'
                  : 'hover:scale-105'
              }`}
            />
          ))}
          <input
            type="color"
            value={selectedColor}
            onChange={(e) => {
              setSelectedColor(e.target.value);
              if (brushMode === 'eraser') setBrushMode('brush');
            }}
            title="Custom Color"
            className="w-6 h-6 rounded-full cursor-pointer border-0 bg-transparent"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={onClearCanvas}
            title="Clear canvas"
            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleDownload}
            title="Download PNG"
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowSendModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            Send to Our Chat
          </button>
        </div>
      </div>

      {/* Modal to send sketch to chat with optional caption */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-rose-100 flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-rose-100 text-rose-600 rounded-2xl">
                <Send className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Send Sketch to Chat</h3>
                <p className="text-xs text-slate-500">Your doodle will appear in both of your chat feeds!</p>
              </div>
            </div>

            <div className="border border-rose-100 rounded-2xl overflow-hidden max-h-48 flex items-center justify-center bg-slate-50">
              <img
                src={exportCanvasImage() || ''}
                alt="Sketch Preview"
                className="max-h-48 object-contain"
              />
            </div>

            <input
              type="text"
              placeholder="Add a romantic note or caption... (optional)"
              value={chatCaption}
              onChange={(e) => setChatCaption(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-rose-400"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSendModal(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSendToChatConfirm}
                className="px-5 py-2 text-sm font-bold bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl hover:shadow-md transition-all cursor-pointer"
              >
                Send Doodle 💕
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
