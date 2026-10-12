import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Trash2,
  Heart,
  Plane,
  Wine,
  PhoneCall,
  Sparkles,
  PartyPopper,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CalendarEvent, CoupleMeta, UserProfile } from '../types';

interface SyncedCalendarProps {
  events: CalendarEvent[];
  coupleMeta: CoupleMeta;
  currentUser: UserProfile;
  partnerUser: UserProfile | null;
  onAddEvent: (event: Omit<CalendarEvent, 'id' | 'createdBy' | 'timestamp'>) => void;
  onDeleteEvent: (eventId: string) => void;
  onUpdateMeta: (meta: Partial<CoupleMeta>) => void;
}

export const SyncedCalendar: React.FC<SyncedCalendarProps> = ({
  events,
  coupleMeta,
  currentUser,
  partnerUser,
  onAddEvent,
  onDeleteEvent,
  onUpdateMeta,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditMeetupModal, setShowEditMeetupModal] = useState(false);

  // New Event form
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('20:00');
  const [category, setCategory] = useState<CalendarEvent['category']>('date');
  const [notes, setNotes] = useState('');

  // Meetup edit form
  const [newMeetupDate, setNewMeetupDate] = useState(
    coupleMeta.nextMeetupDate || new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0]
  );
  const [newMeetupTitle, setNewMeetupTitle] = useState(coupleMeta.nextMeetupTitle || 'Airport Hug & Reunion! ✈️');

  // Real-time ticking clocks for both timezones
  const [nowTime, setNowTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNowTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate countdown to next meetup
  const targetDate = coupleMeta.nextMeetupDate ? new Date(coupleMeta.nextMeetupDate) : null;
  const timeDiff = targetDate ? targetDate.getTime() - nowTime.getTime() : 0;
  const daysLeft = Math.max(0, Math.floor(timeDiff / (1000 * 60 * 60 * 24)));
  const hoursLeft = Math.max(0, Math.floor((timeDiff / (1000 * 60 * 60)) % 24));
  const minutesLeft = Math.max(0, Math.floor((timeDiff / (1000 * 60)) % 60));
  const secondsLeft = Math.max(0, Math.floor((timeDiff / 1000) % 60));

  const fireConfetti = () => {
    try {
      confetti({
        particleCount: 75,
        spread: 90,
        origin: { y: 0.5 },
        colors: ['#f43f5e', '#fb7185', '#ec4899', '#f59e0b', '#8b5cf6'],
      });
    } catch {}
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    onAddEvent({
      title: title.trim(),
      date,
      time: time || undefined,
      category,
      notes: notes.trim() || undefined,
    });

    setTitle('');
    setNotes('');
    setShowAddModal(false);
  };

  const handleSaveMeetup = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateMeta({
      nextMeetupDate: newMeetupDate,
      nextMeetupTitle: newMeetupTitle.trim(),
    });
    setShowEditMeetupModal(false);
  };

  // Calendar month rendering
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const sortedEvents = [...events].sort(
    (a, b) => new Date(`${a.date}T${a.time || '00:00'}`).getTime() - new Date(`${b.date}T${b.time || '00:00'}`).getTime()
  );

  const getCategoryBadge = (cat: CalendarEvent['category']) => {
    switch (cat) {
      case 'visit':
        return { label: 'Reunion', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: '✈️' };
      case 'date':
        return { label: 'Date Night', bg: 'bg-rose-100 text-rose-800 border-rose-200', icon: '🥂' };
      case 'anniversary':
        return { label: 'Anniversary', bg: 'bg-purple-100 text-purple-800 border-purple-200', icon: '🎉' };
      case 'call':
        return { label: 'FaceTime Call', bg: 'bg-blue-100 text-blue-800 border-blue-200', icon: '📞' };
      case 'flight':
        return { label: 'Flight', bg: 'bg-amber-100 text-amber-800 border-amber-200', icon: '🎫' };
      default:
        return { label: 'Special', bg: 'bg-slate-100 text-slate-800 border-slate-200', icon: '💌' };
    }
  };

  // Timezone formatter helper
  const formatTimezone = (tz?: string) => {
    try {
      if (!tz) return nowTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      return new Intl.DateTimeFormat([], {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).format(nowTime);
    } catch {
      return nowTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
      {/* Hero Next Reunion Countdown Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Plane className="w-64 h-64" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left space-y-1">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold">
              <Plane className="w-3.5 h-3.5 animate-pulse" />
              <span>Next Reunion Countdown</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {coupleMeta.nextMeetupTitle || 'Until We Hug Again! ✈️'}
            </h2>
            <p className="text-xs sm:text-sm text-rose-100">
              {coupleMeta.nextMeetupDate
                ? `Reunion Date: ${new Date(coupleMeta.nextMeetupDate).toLocaleDateString(undefined, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}`
                : 'Set your next flight or reunion date below'}
            </p>
          </div>

          {/* Countdown Clock Display */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex flex-col items-center bg-black/20 backdrop-blur-md rounded-2xl px-3 sm:px-4 py-2 min-w-[64px] border border-white/10 shadow-inner">
              <span className="text-2xl sm:text-3xl font-extrabold">{daysLeft}</span>
              <span className="text-[10px] uppercase font-bold text-rose-200">Days</span>
            </div>
            <span className="text-2xl font-bold text-rose-200">:</span>
            <div className="flex flex-col items-center bg-black/20 backdrop-blur-md rounded-2xl px-3 sm:px-4 py-2 min-w-[64px] border border-white/10 shadow-inner">
              <span className="text-2xl sm:text-3xl font-extrabold">{hoursLeft}</span>
              <span className="text-[10px] uppercase font-bold text-rose-200">Hours</span>
            </div>
            <span className="text-2xl font-bold text-rose-200">:</span>
            <div className="flex flex-col items-center bg-black/20 backdrop-blur-md rounded-2xl px-3 sm:px-4 py-2 min-w-[64px] border border-white/10 shadow-inner">
              <span className="text-2xl sm:text-3xl font-extrabold">{minutesLeft}</span>
              <span className="text-[10px] uppercase font-bold text-rose-200">Mins</span>
            </div>
            <span className="text-2xl font-bold text-rose-200 hidden sm:inline">:</span>
            <div className="hidden sm:flex flex-col items-center bg-black/20 backdrop-blur-md rounded-2xl px-3 sm:px-4 py-2 min-w-[64px] border border-white/10 shadow-inner">
              <span className="text-2xl sm:text-3xl font-extrabold">{secondsLeft}</span>
              <span className="text-[10px] uppercase font-bold text-rose-200">Secs</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={fireConfetti}
              title="Celebrate!"
              className="p-3 bg-white/20 hover:bg-white/30 rounded-2xl backdrop-blur-md transition-transform active:scale-110 cursor-pointer"
            >
              <PartyPopper className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={() => setShowEditMeetupModal(true)}
              className="px-4 py-2.5 bg-white text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-2xl shadow-sm transition-all cursor-pointer whitespace-nowrap"
            >
              Edit Reunion Date
            </button>
          </div>
        </div>
      </div>

      {/* Dual Timezone Clock Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Your Time */}
        <div className="bg-white/90 backdrop-blur-md rounded-3xl p-5 border border-rose-100 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-2xl border border-rose-100">
              {currentUser.avatar || '🕊️'}
            </div>
            <div>
              <span className="text-[11px] font-bold text-rose-500 uppercase tracking-wider">Your Local Time</span>
              <h4 className="text-base font-bold text-slate-800">{currentUser.name}</h4>
              <p className="text-xs text-slate-400">{coupleMeta.user1Location || currentUser.city || 'My Location'}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-extrabold text-slate-800 font-mono">
              {formatTimezone(coupleMeta.user1Timezone || currentUser.timezone)}
            </span>
            <p className="text-[11px] text-emerald-600 font-semibold flex items-center justify-end gap-1">
              <Clock className="w-3 h-3" /> Live
            </p>
          </div>
        </div>

        {/* Partner Time */}
        <div className="bg-white/90 backdrop-blur-md rounded-3xl p-5 border border-rose-100 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-pink-50 flex items-center justify-center text-2xl border border-pink-100">
              {partnerUser?.avatar || '🕊️'}
            </div>
            <div>
              <span className="text-[11px] font-bold text-pink-500 uppercase tracking-wider">Partner's Time</span>
              <h4 className="text-base font-bold text-slate-800">{partnerUser?.name || 'Partner Waiting'}</h4>
              <p className="text-xs text-slate-400">{coupleMeta.user2Location || partnerUser?.city || 'Partner Location'}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-extrabold text-slate-800 font-mono">
              {formatTimezone(coupleMeta.user2Timezone || partnerUser?.timezone)}
            </span>
            <p className="text-[11px] text-pink-600 font-semibold flex items-center justify-end gap-1">
              <Heart className="w-3 h-3 fill-pink-500" /> Connected
            </p>
          </div>
        </div>
      </div>

      {/* Main Calendar & Events Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Calendar (2 cols on lg) */}
        <div className="lg:col-span-2 bg-white/90 backdrop-blur-md rounded-3xl p-6 border border-rose-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                {monthNames[month]} {year}
              </h3>
              <p className="text-xs text-slate-500">Shared milestones & romantic date dates</p>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={prevMonth}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days of week */}
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <span key={d} className="text-xs font-semibold text-slate-400 py-1">
                {d}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5 flex-1">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[60px] p-1 rounded-xl bg-slate-50/40" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const dayEvents = events.filter((e) => e.date === dateStr);
              const isToday =
                new Date().getDate() === dayNum &&
                new Date().getMonth() === month &&
                new Date().getFullYear() === year;

              return (
                <div
                  key={`day-${dayNum}`}
                  className={`min-h-[64px] p-1.5 rounded-2xl border transition-all flex flex-col justify-between ${
                    isToday
                      ? 'border-rose-400 bg-rose-50/40 font-bold'
                      : 'border-slate-100 bg-white hover:border-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs w-5 h-5 flex items-center justify-center rounded-full ${
                        isToday ? 'bg-rose-500 text-white' : 'text-slate-700'
                      }`}
                    >
                      {dayNum}
                    </span>
                  </div>

                  <div className="space-y-0.5 mt-1 overflow-hidden">
                    {dayEvents.slice(0, 2).map((ev) => (
                      <div
                        key={ev.id}
                        className="text-[10px] font-medium px-1 py-0.5 rounded-md truncate bg-rose-100/80 text-rose-800"
                        title={ev.title}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="text-[9px] text-slate-400">+{dayEvents.length - 2} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Events List & Add Trigger */}
        <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 border border-rose-100 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-rose-500" />
              <span>Upcoming Dates</span>
            </h3>
            <button
              onClick={() => setShowAddModal(true)}
              className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors cursor-pointer"
              title="Add Date"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[460px] flex-1 pr-1">
            {sortedEvents.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <PartyPopper className="w-8 h-8 mx-auto mb-2 text-rose-300" />
                <p className="text-xs">No upcoming dates scheduled yet.</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-2 text-xs text-rose-500 font-bold hover:underline cursor-pointer"
                >
                  Schedule a date night! 🥂
                </button>
              </div>
            ) : (
              sortedEvents.map((ev) => {
                const badge = getCategoryBadge(ev.category);
                return (
                  <div
                    key={ev.id}
                    className="p-3.5 rounded-2xl border border-slate-100 bg-white/70 hover:border-rose-200 transition-all shadow-2xs group flex flex-col gap-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.bg}`}>
                          {badge.icon} {badge.label}
                        </span>
                        {ev.time && (
                          <span className="text-[11px] text-slate-400 font-medium">
                            🕒 {ev.time}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => onDeleteEvent(ev.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h4 className="text-sm font-bold text-slate-800">{ev.title}</h4>

                    {ev.notes && (
                      <p className="text-xs text-slate-500 italic bg-rose-50/40 p-2 rounded-xl">
                        "{ev.notes}"
                      </p>
                    )}

                    <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-50">
                      <span>📅 {ev.date}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-rose-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-rose-500" />
                Schedule a Date or Milestone
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700">Event Title</label>
                <input
                  type="text"
                  placeholder="e.g. Pasta Night FaceTime or Flight Booking"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full mt-1 px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Time</label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full mt-1 px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Category</label>
                <div className="grid grid-cols-3 gap-2 mt-1.5">
                  {(['date', 'visit', 'anniversary', 'call', 'flight', 'other'] as const).map((cat) => {
                    const badge = getCategoryBadge(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`p-2 text-xs rounded-xl border font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                          category === cat
                            ? 'bg-rose-500 text-white border-rose-500 shadow-xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span>{badge.icon}</span>
                        <span>{badge.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Notes / Little Reminders</label>
                <textarea
                  rows={2}
                  placeholder="Dress code, favorite snack to prepare, or flight info..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!title.trim()}
                  className="px-5 py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md disabled:opacity-50 cursor-pointer"
                >
                  Add to Calendar ✨
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Reunion Meetup Modal */}
      {showEditMeetupModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-rose-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Plane className="w-5 h-5 text-rose-500" />
                Update Reunion Countdown
              </h3>
              <button
                onClick={() => setShowEditMeetupModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMeetup} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700">Countdown Banner Title</label>
                <input
                  type="text"
                  placeholder="e.g. Airport Reunion Hug! ✈️"
                  value={newMeetupTitle}
                  onChange={(e) => setNewMeetupTitle(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Reunion Date</label>
                <input
                  type="date"
                  value={newMeetupDate}
                  onChange={(e) => setNewMeetupDate(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditMeetupModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md cursor-pointer"
                >
                  Save Countdown 💕
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
