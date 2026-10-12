import React, { useState } from 'react';
import { useCouplesSocket } from './hooks/useCouplesSocket';
import { Header } from './components/Header';
import { PairingModal } from './components/PairingModal';
import { ArtMessagingChat } from './components/ArtMessagingChat';
import { LiveCanvas } from './components/LiveCanvas';
import { PhotoAlbums } from './components/PhotoAlbums';
import { SyncedCalendar } from './components/SyncedCalendar';
import { LoveLettersAndNotes } from './components/LoveLettersAndNotes';
import { PokeOverlay } from './components/PokeOverlay';
import { Sparkles, Heart, Palette, MessageCircleHeart } from 'lucide-react';

export default function App() {
  const {
    currentCode,
    currentUser,
    partnerUser,
    roomData,
    isConnected,
    partnerLivePointer,
    partnerTyping,
    activePoke,
    setActivePoke,
    pairWithCode,
    disconnectPair,
    sendMessage,
    toggleMessageReaction,
    sendCanvasStroke,
    clearCanvas,
    sendCanvasLivePointer,
    sendPoke,
    addPhoto,
    togglePhotoLike,
    deletePhoto,
    addCalendarEvent,
    deleteCalendarEvent,
    addLoveLetter,
    openLoveLetter,
    addStickyNote,
    deleteStickyNote,
    updateCoupleMeta,
    sendTyping,
  } = useCouplesSocket();

  const [activeTab, setActiveTab] = useState<'chat' | 'canvas' | 'photos' | 'calendar' | 'letters'>('chat');

  // Handle sending a sketch created in the LiveCanvas directly to chat
  const handleSendCanvasToChat = (imageDataUrl: string, caption?: string) => {
    sendMessage({
      type: 'sketch',
      sketchDataUrl: imageDataUrl,
      text: caption || 'Sent a shared canvas sketch 🎨💕',
    });
    setActiveTab('chat');
  };

  // If not paired yet, show the zero-friction pairing modal
  if (!currentCode || !currentUser) {
    return <PairingModal onPair={pairWithCode} initialCode={currentCode} />;
  }

  return (
    <div className="min-h-screen bg-[#fffbfc] text-slate-800 flex flex-col font-sans selection:bg-rose-200 selection:text-rose-900">
      {/* App Header */}
      <Header
        currentCode={currentCode}
        currentUser={currentUser}
        partnerUser={partnerUser}
        isConnected={isConnected}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onDisconnect={disconnectPair}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-3 sm:p-6 max-w-7xl mx-auto w-full">
        {activeTab === 'chat' && (
          <ArtMessagingChat
            messages={roomData?.messages || []}
            currentUser={currentUser}
            partnerUser={partnerUser}
            partnerTyping={partnerTyping}
            onSendMessage={sendMessage}
            onToggleReaction={toggleMessageReaction}
            onSendPoke={sendPoke}
            onSendTyping={sendTyping}
          />
        )}

        {activeTab === 'canvas' && (
          <LiveCanvas
            strokes={roomData?.canvasStrokes || []}
            currentUser={currentUser}
            partnerUser={partnerUser}
            partnerPointer={partnerLivePointer}
            onSendStroke={sendCanvasStroke}
            onClearCanvas={clearCanvas}
            onSendPointer={sendCanvasLivePointer}
            onSendToChat={handleSendCanvasToChat}
          />
        )}

        {activeTab === 'photos' && (
          <PhotoAlbums
            photos={roomData?.photos || []}
            currentUser={currentUser}
            onAddPhoto={addPhoto}
            onToggleLike={togglePhotoLike}
            onDeletePhoto={deletePhoto}
          />
        )}

        {activeTab === 'calendar' && (
          <SyncedCalendar
            events={roomData?.events || []}
            coupleMeta={roomData?.coupleMeta || {}}
            currentUser={currentUser}
            partnerUser={partnerUser}
            onAddEvent={addCalendarEvent}
            onDeleteEvent={deleteCalendarEvent}
            onUpdateMeta={updateCoupleMeta}
          />
        )}

        {activeTab === 'letters' && (
          <LoveLettersAndNotes
            letters={roomData?.letters || []}
            notes={roomData?.notes || []}
            currentUser={currentUser}
            partnerUser={partnerUser}
            onAddLetter={addLoveLetter}
            onOpenLetter={openLoveLetter}
            onAddNote={addStickyNote}
            onDeleteNote={deleteStickyNote}
          />
        )}
      </main>

      {/* Sensory Poke & Heart Rain Animation Overlay */}
      <PokeOverlay pokeData={activePoke} onDismiss={() => setActivePoke(null)} />
    </div>
  );
}
