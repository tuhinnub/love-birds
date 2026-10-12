import React, { useState } from 'react';
import {
  Mail,
  StickyNote as NoteIcon,
  Plus,
  Trash2,
  Sparkles,
  Lock,
  MailOpen,
  X,
  Heart,
  Feather,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { LoveLetter, StickyNote, UserProfile } from '../types';
import { soundEffects } from '../utils/audio';

interface LoveLettersAndNotesProps {
  letters: LoveLetter[];
  notes: StickyNote[];
  currentUser: UserProfile;
  partnerUser: UserProfile | null;
  onAddLetter: (letter: Omit<LoveLetter, 'id' | 'authorId' | 'authorName' | 'sealedDate' | 'isOpened'>) => void;
  onOpenLetter: (letterId: string) => void;
  onAddNote: (text: string, color: string) => void;
  onDeleteNote: (noteId: string) => void;
}

const NOTE_COLORS = [
  '#FEF08A', // Pastel Yellow
  '#FBCFE8', // Pastel Pink
  '#BAE6FD', // Pastel Sky
  '#BBF7D0', // Pastel Mint
  '#DDD6FE', // Pastel Lavender
];

export const LoveLettersAndNotes: React.FC<LoveLettersAndNotesProps> = ({
  letters,
  notes,
  currentUser,
  partnerUser,
  onAddLetter,
  onOpenLetter,
  onAddNote,
  onDeleteNote,
}) => {
  const [activeTab, setActiveTab] = useState<'letters' | 'notes'>('letters');
  const [showAddLetterModal, setShowAddLetterModal] = useState(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [readingLetter, setReadingLetter] = useState<LoveLetter | null>(null);

  // Letter form
  const [letterTitle, setLetterTitle] = useState('');
  const [openWhen, setOpenWhen] = useState('');
  const [letterContent, setLetterContent] = useState('');

  // Note form
  const [noteText, setNoteText] = useState('');
  const [noteColor, setNoteColor] = useState('#FEF08A');

  const handleOpenLetterClick = (letter: LoveLetter) => {
    if (!letter.isOpened) {
      onOpenLetter(letter.id);
      soundEffects.playHeartChime();
      try {
        confetti({
          particleCount: 60,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#f43f5e', '#fb7185', '#ec4899'],
        });
      } catch {}
    }
    setReadingLetter(letter);
  };

  const handleSaveLetter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!letterTitle.trim() || !letterContent.trim()) return;

    onAddLetter({
      title: letterTitle.trim(),
      openWhen: openWhen.trim() || 'Open whenever you need extra love 💕',
      content: letterContent.trim(),
    });

    setLetterTitle('');
    setOpenWhen('');
    setLetterContent('');
    setShowAddLetterModal(false);
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    onAddNote(noteText.trim(), noteColor);
    setNoteText('');
    setShowAddNoteModal(false);
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
      {/* Navigation & Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white/90 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-rose-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex p-1 bg-rose-50 rounded-2xl border border-rose-100">
            <button
              onClick={() => setActiveTab('letters')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'letters'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-rose-600'
              }`}
            >
              <Mail className="w-4 h-4" />
              Open When Letters ({letters.length})
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'notes'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-rose-600'
              }`}
            >
              <NoteIcon className="w-4 h-4" />
              Sticky Notes Board ({notes.length})
            </button>
          </div>
        </div>

        {activeTab === 'letters' ? (
          <button
            onClick={() => setShowAddLetterModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer"
          >
            <Feather className="w-4 h-4" />
            Seal a New Letter
          </button>
        ) : (
          <button
            onClick={() => setShowAddNoteModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Stick a Note
          </button>
        )}
      </div>

      {/* Letters Tab View */}
      {activeTab === 'letters' && (
        <div>
          {letters.length === 0 ? (
            <div className="bg-white/80 rounded-3xl p-12 text-center border border-dashed border-rose-200">
              <Mail className="w-12 h-12 text-rose-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700">No sealed letters yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Write a sweet "Open When..." letter for your partner to unlock during lonely or special moments!
              </p>
              <button
                onClick={() => setShowAddLetterModal(true)}
                className="mt-4 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Write First Letter 💌
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {letters.map((letter) => {
                const isOpened = letter.isOpened;
                return (
                  <div
                    key={letter.id}
                    onClick={() => handleOpenLetterClick(letter)}
                    className={`relative rounded-3xl p-6 transition-all duration-300 cursor-pointer shadow-md hover:shadow-xl border flex flex-col justify-between group ${
                      isOpened
                        ? 'bg-amber-50/70 border-amber-200/80 hover:-translate-y-1'
                        : 'bg-gradient-to-br from-rose-50 to-pink-50 border-rose-200 hover:-translate-y-1 hover:border-rose-300'
                    }`}
                  >
                    <div>
                      {/* Top status indicator */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-bold text-slate-400">
                          {letter.sealedDate}
                        </span>
                        {isOpened ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                            <MailOpen className="w-3 h-3" /> Opened
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full animate-pulse">
                            <Lock className="w-3 h-3" /> Sealed
                          </span>
                        )}
                      </div>

                      {/* Open When prompt banner */}
                      <div className="p-3 bg-white/80 rounded-2xl border border-rose-100 shadow-2xs mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block mb-0.5">
                          Open When:
                        </span>
                        <h4 className="text-sm font-bold text-slate-800 line-clamp-2">
                          {letter.openWhen}
                        </h4>
                      </div>

                      <h3 className="text-base font-bold text-slate-800 mb-1">{letter.title}</h3>
                      <p className="text-xs text-slate-500">
                        {isOpened ? (
                          <span className="line-clamp-2 italic">"{letter.content}"</span>
                        ) : (
                          'Sealed with wax and true love. Click to break the seal and read.'
                        )}
                      </p>
                    </div>

                    {/* Wax seal emblem */}
                    <div className="mt-4 pt-3 border-t border-rose-100 flex items-center justify-between">
                      <span className="text-xs text-slate-400">By {letter.authorName}</span>
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-transform group-hover:scale-110 ${
                          isOpened
                            ? 'bg-amber-600 text-white'
                            : 'bg-rose-600 text-white'
                        }`}
                      >
                        <Heart className="w-4 h-4 fill-white" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Sticky Notes Tab View (Virtual Fridge Corkboard) */}
      {activeTab === 'notes' && (
        <div className="bg-amber-50/40 p-6 sm:p-8 rounded-3xl border-2 border-dashed border-amber-200/80 min-h-[480px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-amber-900 flex items-center gap-2">
              <span>📌</span> Our Magnetic Love Fridge
            </h3>
            <span className="text-xs text-amber-700/80">Leave quick handwritten notes for your partner!</span>
          </div>

          {notes.length === 0 ? (
            <div className="text-center py-16 text-amber-700">
              <p className="text-sm font-semibold">Your fridge is empty!</p>
              <p className="text-xs mt-1">Leave a sweet magnet note to surprise them.</p>
              <button
                onClick={() => setShowAddNoteModal(true)}
                className="mt-3 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                Post First Sticky Note 📝
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {notes.map((note, idx) => {
                const tilts = ['-rotate-2', 'rotate-1', '-rotate-1', 'rotate-2', '-rotate-3', 'rotate-3'];
                const tiltClass = tilts[idx % tilts.length];

                return (
                  <div
                    key={note.id}
                    style={{ backgroundColor: note.color }}
                    className={`p-5 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105 flex flex-col justify-between min-h-[170px] border border-black/5 relative group ${tiltClass}`}
                  >
                    {/* Pushpin at top */}
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-rose-500 shadow-md border-2 border-white flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-rose-900 rounded-full" />
                    </div>

                    <p className="font-handwriting text-2xl text-slate-800 leading-snug pt-2 whitespace-pre-wrap">
                      {note.text}
                    </p>

                    <div className="flex items-center justify-between pt-3 border-t border-black/5 text-[11px] text-slate-600">
                      <span className="font-medium">~ {note.authorName}</span>
                      <button
                        onClick={() => onDeleteNote(note.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-600 transition-opacity cursor-pointer"
                        title="Remove note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Read Letter Modal */}
      {readingLetter && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in"
          onClick={() => setReadingLetter(null)}
        >
          <div
            className="bg-[#fffef8] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-amber-200 relative flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setReadingLetter(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-800 rounded-xl hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <span className="text-[11px] font-bold text-rose-500 uppercase tracking-wider block">
                {readingLetter.openWhen}
              </span>
              <h2 className="text-2xl font-serif-display font-bold text-slate-900 mt-1">
                {readingLetter.title}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Sealed on {readingLetter.sealedDate} by {readingLetter.authorName}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#faf6ea] border border-amber-100 shadow-inner max-h-80 overflow-y-auto">
              <p className="font-handwriting text-2xl text-slate-800 leading-relaxed whitespace-pre-wrap">
                {readingLetter.content}
              </p>
            </div>

            <div className="mt-5 flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400 italic">With all my love across the miles</span>
              <button
                onClick={() => setReadingLetter(null)}
                className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Close Letter 💕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Seal New Letter Modal */}
      {showAddLetterModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-rose-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Feather className="w-5 h-5 text-rose-500" />
                Seal an "Open When" Letter
              </h3>
              <button
                onClick={() => setShowAddLetterModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLetter} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700">Open When... (Prompt)</label>
                <input
                  type="text"
                  placeholder="e.g. Open when distance feels too hard, or when you can't sleep"
                  value={openWhen}
                  onChange={(e) => setOpenWhen(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Letter Title</label>
                <input
                  type="text"
                  placeholder="e.g. A warm hug in words"
                  value={letterTitle}
                  onChange={(e) => setLetterTitle(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Your Letter</label>
                <textarea
                  rows={5}
                  placeholder="Pour your heart out here. Your partner won't be able to open it until they choose to break the seal..."
                  value={letterContent}
                  onChange={(e) => setLetterContent(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddLetterModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!letterTitle.trim() || !letterContent.trim()}
                  className="px-5 py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md disabled:opacity-50 cursor-pointer"
                >
                  Seal with Wax 💕
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stick a Note Modal */}
      {showAddNoteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-rose-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span>📌</span>
                Post Sticky Note to Fridge
              </h3>
              <button
                onClick={() => setShowAddNoteModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700">Note Color</label>
                <div className="flex items-center gap-2 mt-1.5">
                  {NOTE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNoteColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-7 h-7 rounded-xl border border-black/10 transition-transform cursor-pointer ${
                        noteColor === c ? 'ring-2 ring-offset-2 ring-slate-800 scale-110' : ''
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Message</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Good morning my angel! Remember to eat lunch today 🥰"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddNoteModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!noteText.trim()}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md disabled:opacity-50 cursor-pointer"
                >
                  Stick on Board ✨
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
