import { useEffect, useRef, useState, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  RoomData,
  UserProfile,
  ChatMessage,
  CanvasStroke,
  PhotoItem,
  CalendarEvent,
  LoveLetter,
  StickyNote,
  CoupleMeta,
  PokeEventData,
} from '../types';
import { soundEffects } from '../utils/audio';

const STORAGE_KEY = 'lovebirds_session_v2';

export function useCouplesSocket() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.user || null;
      }
    } catch {}
    return null;
  });

  const [currentCode, setCurrentCode] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const codeFromUrl = params.get('nest') || params.get('code');
      if (codeFromUrl) return codeFromUrl.trim().toUpperCase();

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.code || null;
      }
    } catch {}
    return null;
  });

  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [partnerLivePointer, setPartnerLivePointer] = useState<{
    x: number;
    y: number;
    isDrawing: boolean;
    color: string;
    senderId: string;
  } | null>(null);
  const [partnerTyping, setPartnerTyping] = useState<string | null>(null);
  const [activePoke, setActivePoke] = useState<PokeEventData | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const knownMessageIds = useRef<Set<string>>(new Set());
  const knownPhotoIds = useRef<Set<string>>(new Set());
  const knownLetterIds = useRef<Set<string>>(new Set());

  // Save session info to localStorage and ensure URL has ?nest=CODE
  useEffect(() => {
    if (currentCode && currentUser) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ code: currentCode, user: currentUser })
      );

      // Keep URL synced with nest code without refreshing
      const params = new URLSearchParams(window.location.search);
      if (params.get('nest') !== currentCode) {
        params.set('nest', currentCode);
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [currentCode, currentUser]);

  // Merge full room payload cleanly
  const mergeRoomData = useCallback(
    (newRoom: RoomData, isInitial = false) => {
      setRoomData((prev) => {
        // Check for new incoming chat messages to play sound
        if (prev && !isInitial) {
          const newMsgs = newRoom.messages.filter(
            (m) => !knownMessageIds.current.has(m.id)
          );
          newMsgs.forEach((m) => {
            if (m.senderId !== currentUser?.id && m.senderId !== 'system') {
              soundEffects.playMessagePop();
            }
          });

          // Check for new incoming photos
          const newPhotos = newRoom.photos.filter(
            (p) => !knownPhotoIds.current.has(p.id)
          );
          if (newPhotos.length > 0 && newPhotos[0].senderId !== currentUser?.id) {
            soundEffects.playHeartChime();
          }
        }

        // Update known IDs
        newRoom.messages.forEach((m) => knownMessageIds.current.add(m.id));
        newRoom.photos.forEach((p) => knownPhotoIds.current.add(p.id));
        newRoom.letters.forEach((l) => knownLetterIds.current.add(l.id));

        return newRoom;
      });
    },
    [currentUser?.id]
  );

  // Initial HTTP Fetch & Background Fast Polling (Dual-Sync)
  useEffect(() => {
    if (!currentCode || !currentUser) return;

    let isDisposed = false;

    // Fast sync fetcher
    async function syncViaHttp(isInit = false) {
      try {
        const res = await fetch(
          `/api/room/${encodeURIComponent(currentCode!)}/sync?userId=${encodeURIComponent(
            currentUser!.id
          )}&userName=${encodeURIComponent(currentUser!.name)}`
        );
        if (res.ok) {
          const data: RoomData = await res.json();
          if (!isDisposed) {
            mergeRoomData(data, isInit);
            setIsConnected(true);
          }
        }
      } catch (err) {
        // Polling retry
      }
    }

    // Immediate initial sync
    syncViaHttp(true);

    // Register user profile via HTTP
    fetch(`/api/room/${encodeURIComponent(currentCode)}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: currentUser }),
    }).catch(() => {});

    // Polling interval every 1.5 seconds for instant multi-phone synchronization
    const pollInterval = setInterval(() => {
      syncViaHttp(false);
    }, 1500);

    // Re-sync immediately on window focus / mobile wake
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncViaHttp(false);
      }
    };
    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    return () => {
      isDisposed = true;
      clearInterval(pollInterval);
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [currentCode, currentUser, mergeRoomData]);

  // WebSocket Connection (Push layer)
  useEffect(() => {
    if (!currentCode || !currentUser) return;

    let isDisposed = false;

    function connectWs() {
      if (isDisposed) return;
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;

        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
          ws.send(
            JSON.stringify({
              type: 'join',
              code: currentCode,
              user: currentUser,
            })
          );
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            switch (data.type) {
              case 'init': {
                mergeRoomData(data.room, true);
                break;
              }

              case 'user_presence': {
                setRoomData((prev) => {
                  if (!prev) return prev;
                  return { ...prev, users: data.users };
                });
                break;
              }

              case 'new_message': {
                const msg: ChatMessage = data.message;
                setRoomData((prev) => {
                  if (!prev) return prev;
                  if (prev.messages.some((m) => m.id === msg.id)) return prev;
                  return { ...prev, messages: [...prev.messages, msg] };
                });
                if (msg.senderId !== currentUser?.id) {
                  soundEffects.playMessagePop();
                }
                break;
              }

              case 'message_updated': {
                const updated: ChatMessage = data.message;
                setRoomData((prev) => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    messages: prev.messages.map((m) =>
                      m.id === updated.id ? updated : m
                    ),
                  };
                });
                break;
              }

              case 'canvas_stroke': {
                const stroke: CanvasStroke = data.stroke;
                setRoomData((prev) => {
                  if (!prev) return prev;
                  if (prev.canvasStrokes.some((s) => s.id === stroke.id)) return prev;
                  return {
                    ...prev,
                    canvasStrokes: [...prev.canvasStrokes, stroke],
                  };
                });
                break;
              }

              case 'canvas_cleared': {
                setRoomData((prev) =>
                  prev ? { ...prev, canvasStrokes: [] } : prev
                );
                break;
              }

              case 'canvas_live_pointer': {
                if (data.senderId !== currentUser?.id) {
                  setPartnerLivePointer(data.pointer);
                }
                break;
              }

              case 'poke_received': {
                const { pokeType, senderName, senderId, message } = data;
                if (message) {
                  setRoomData((prev) => {
                    if (!prev) return prev;
                    if (prev.messages.some((m) => m.id === message.id)) return prev;
                    return { ...prev, messages: [...prev.messages, message] };
                  });
                }

                if (senderId !== currentUser?.id) {
                  if (pokeType === 'kiss') soundEffects.playKissPop();
                  else soundEffects.playHeartChime();

                  setActivePoke({
                    pokeType,
                    senderName,
                    senderId,
                    timestamp: Date.now(),
                  });

                  try {
                    confetti({
                      particleCount: 50,
                      spread: 80,
                      origin: { y: 0.6 },
                      colors: ['#f43f5e', '#ec4899', '#fb7185', '#fda4af', '#fecdd3'],
                    });
                  } catch {}
                }
                break;
              }

              case 'photo_added': {
                const photo: PhotoItem = data.photo;
                setRoomData((prev) => {
                  if (!prev) return prev;
                  if (prev.photos.some((p) => p.id === photo.id)) return prev;
                  return { ...prev, photos: [photo, ...prev.photos] };
                });
                if (photo.senderId !== currentUser?.id) {
                  soundEffects.playHeartChime();
                }
                break;
              }

              case 'photo_updated': {
                const photo: PhotoItem = data.photo;
                setRoomData((prev) => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    photos: prev.photos.map((p) => (p.id === photo.id ? photo : p)),
                  };
                });
                break;
              }

              case 'photo_deleted': {
                setRoomData((prev) => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    photos: prev.photos.filter((p) => p.id !== data.photoId),
                  };
                });
                break;
              }

              case 'event_added': {
                const eventItem: CalendarEvent = data.event;
                setRoomData((prev) => {
                  if (!prev) return prev;
                  if (prev.events.some((e) => e.id === eventItem.id)) return prev;
                  return { ...prev, events: [...prev.events, eventItem] };
                });
                break;
              }

              case 'event_deleted': {
                setRoomData((prev) => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    events: prev.events.filter((e) => e.id !== data.eventId),
                  };
                });
                break;
              }

              case 'letter_added': {
                const letter: LoveLetter = data.letter;
                setRoomData((prev) => {
                  if (!prev) return prev;
                  if (prev.letters.some((l) => l.id === letter.id)) return prev;
                  return { ...prev, letters: [...prev.letters, letter] };
                });
                if (letter.authorId !== currentUser?.id) {
                  soundEffects.playHeartChime();
                }
                break;
              }

              case 'letter_opened': {
                const letter: LoveLetter = data.letter;
                setRoomData((prev) => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    letters: prev.letters.map((l) => (l.id === letter.id ? letter : l)),
                  };
                });
                break;
              }

              case 'note_added': {
                const note: StickyNote = data.note;
                setRoomData((prev) => {
                  if (!prev) return prev;
                  if (prev.notes.some((n) => n.id === note.id)) return prev;
                  return { ...prev, notes: [...prev.notes, note] };
                });
                break;
              }

              case 'note_deleted': {
                setRoomData((prev) => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    notes: prev.notes.filter((n) => n.id !== data.noteId),
                  };
                });
                break;
              }

              case 'meta_updated': {
                setRoomData((prev) => {
                  if (!prev) return prev;
                  return { ...prev, coupleMeta: data.coupleMeta };
                });
                break;
              }

              case 'typing': {
                if (data.isTyping) {
                  setPartnerTyping(data.senderName);
                  if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
                  typingTimerRef.current = setTimeout(() => {
                    setPartnerTyping(null);
                  }, 3000);
                } else {
                  setPartnerTyping(null);
                }
                break;
              }
            }
          } catch (err) {
            console.error('WS parse error:', err);
          }
        };

        ws.onclose = () => {
          if (!isDisposed) {
            reconnectTimeoutRef.current = setTimeout(connectWs, 2000);
          }
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch (err) {
        // Fallback
      }
    }

    connectWs();

    return () => {
      isDisposed = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [currentCode, currentUser, mergeRoomData]);

  // Robust Dispatchers (Optimistic UI + WS Broadcast + Guaranteed HTTP POST)
  const sendMessage = useCallback(
    (messageData: Omit<ChatMessage, 'id' | 'senderId' | 'senderName' | 'timestamp'>) => {
      if (!currentUser || !currentCode) return;
      const msg: ChatMessage = {
        ...messageData,
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatar,
        timestamp: Date.now(),
      };

      // 1. Optimistic local update
      setRoomData((prev) => {
        if (!prev) return prev;
        if (prev.messages.some((m) => m.id === msg.id)) return prev;
        return { ...prev, messages: [...prev.messages, msg] };
      });
      soundEffects.playMessagePop();

      // 2. Try WebSocket
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'chat_message', message: msg }));
      }

      // 3. Guaranteed HTTP POST
      fetch(`/api/room/${encodeURIComponent(currentCode)}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      }).catch((err) => console.error('HTTP msg fail:', err));
    },
    [currentUser, currentCode]
  );

  const toggleMessageReaction = useCallback(
    (messageId: string, emoji: string) => {
      if (!currentUser || !currentCode) return;

      // Optimistic
      setRoomData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.map((m) => {
            if (m.id !== messageId) return m;
            const rx = { ...(m.reactions || {}) };
            const list = rx[emoji] || [];
            if (list.includes(currentUser.id)) {
              rx[emoji] = list.filter((id) => id !== currentUser.id);
              if (rx[emoji].length === 0) delete rx[emoji];
            } else {
              rx[emoji] = [...list, currentUser.id];
            }
            return { ...m, reactions: rx };
          }),
        };
      });

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'message_reaction',
            messageId,
            emoji,
            userId: currentUser.id,
          })
        );
      }

      fetch(`/api/room/${encodeURIComponent(currentCode)}/reaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, emoji, userId: currentUser.id }),
      }).catch(() => {});
    },
    [currentUser, currentCode]
  );

  const sendCanvasStroke = useCallback(
    (stroke: CanvasStroke) => {
      if (!currentCode) return;

      // Optimistic
      setRoomData((prev) => {
        if (!prev) return prev;
        if (prev.canvasStrokes.some((s) => s.id === stroke.id)) return prev;
        return { ...prev, canvasStrokes: [...prev.canvasStrokes, stroke] };
      });

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'canvas_stroke', stroke }));
      }

      fetch(`/api/room/${encodeURIComponent(currentCode)}/stroke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stroke }),
      }).catch(() => {});
    },
    [currentCode]
  );

  const clearCanvas = useCallback(() => {
    if (!currentCode) return;

    setRoomData((prev) => (prev ? { ...prev, canvasStrokes: [] } : prev));

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'canvas_clear' }));
    }

    fetch(`/api/room/${encodeURIComponent(currentCode)}/clear-canvas`, {
      method: 'POST',
    }).catch(() => {});
  }, [currentCode]);

  const sendCanvasLivePointer = useCallback(
    (pointer: { x: number; y: number; isDrawing: boolean; color: string }) => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'canvas_live_pointer', pointer }));
      }
    },
    []
  );

  const sendPoke = useCallback(
    (pokeType: 'kiss' | 'hug' | 'hearts' | 'miss_you') => {
      if (!currentUser || !currentCode) return;
      if (pokeType === 'kiss') soundEffects.playKissPop();
      else soundEffects.playHeartChime();

      const pokeMsg: ChatMessage = {
        id: `poke-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        senderId: currentUser.id,
        senderName: currentUser.name,
        type: 'poke',
        pokeType,
        timestamp: Date.now(),
      };

      setRoomData((prev) => {
        if (!prev) return prev;
        return { ...prev, messages: [...prev.messages, pokeMsg] };
      });

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'poke',
            pokeType,
            senderName: currentUser.name,
          })
        );
      }

      fetch(`/api/room/${encodeURIComponent(currentCode)}/poke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pokeType,
          senderName: currentUser.name,
          senderId: currentUser.id,
        }),
      }).catch(() => {});
    },
    [currentUser, currentCode]
  );

  const addPhoto = useCallback(
    (photoData: Omit<PhotoItem, 'id' | 'senderId' | 'senderName' | 'timestamp' | 'likes'>) => {
      if (!currentUser || !currentCode) return;
      soundEffects.playSwoosh();
      const photo: PhotoItem = {
        ...photoData,
        id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        senderId: currentUser.id,
        senderName: currentUser.name,
        timestamp: Date.now(),
        likes: [],
      };

      setRoomData((prev) => {
        if (!prev) return prev;
        return { ...prev, photos: [photo, ...prev.photos] };
      });

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'add_photo', photo }));
      }

      fetch(`/api/room/${encodeURIComponent(currentCode)}/photo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo }),
      }).catch(() => {});
    },
    [currentUser, currentCode]
  );

  const togglePhotoLike = useCallback(
    (photoId: string) => {
      if (!currentUser || !currentCode) return;

      setRoomData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          photos: prev.photos.map((p) => {
            if (p.id !== photoId) return p;
            const likes = p.likes.includes(currentUser.id)
              ? p.likes.filter((id) => id !== currentUser.id)
              : [...p.likes, currentUser.id];
            return { ...p, likes };
          }),
        };
      });

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'toggle_photo_like',
            photoId,
            userId: currentUser.id,
          })
        );
      }

      fetch(`/api/room/${encodeURIComponent(currentCode)}/photo-like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId, userId: currentUser.id }),
      }).catch(() => {});
    },
    [currentUser, currentCode]
  );

  const deletePhoto = useCallback(
    (photoId: string) => {
      if (!currentCode) return;

      setRoomData((prev) => {
        if (!prev) return prev;
        return { ...prev, photos: prev.photos.filter((p) => p.id !== photoId) };
      });

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'delete_photo', photoId }));
      }

      fetch(`/api/room/${encodeURIComponent(currentCode)}/photo-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId }),
      }).catch(() => {});
    },
    [currentCode]
  );

  const addCalendarEvent = useCallback(
    (eventData: Omit<CalendarEvent, 'id' | 'createdBy' | 'timestamp'>) => {
      if (!currentUser || !currentCode) return;
      const event: CalendarEvent = {
        ...eventData,
        id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        createdBy: currentUser.id,
        timestamp: Date.now(),
      };

      setRoomData((prev) => {
        if (!prev) return prev;
        return { ...prev, events: [...prev.events, event] };
      });

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'add_event', event }));
      }

      fetch(`/api/room/${encodeURIComponent(currentCode)}/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event }),
      }).catch(() => {});
    },
    [currentUser, currentCode]
  );

  const deleteCalendarEvent = useCallback(
    (eventId: string) => {
      if (!currentCode) return;

      setRoomData((prev) => {
        if (!prev) return prev;
        return { ...prev, events: prev.events.filter((e) => e.id !== eventId) };
      });

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'delete_event', eventId }));
      }

      fetch(`/api/room/${encodeURIComponent(currentCode)}/event-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      }).catch(() => {});
    },
    [currentCode]
  );

  const addLoveLetter = useCallback(
    (letterData: Omit<LoveLetter, 'id' | 'authorId' | 'authorName' | 'sealedDate' | 'isOpened'>) => {
      if (!currentUser || !currentCode) return;
      const letter: LoveLetter = {
        ...letterData,
        id: `letter-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        authorId: currentUser.id,
        authorName: currentUser.name,
        sealedDate: new Date().toISOString().split('T')[0],
        isOpened: false,
      };

      setRoomData((prev) => {
        if (!prev) return prev;
        return { ...prev, letters: [...prev.letters, letter] };
      });

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'add_letter', letter }));
      }

      fetch(`/api/room/${encodeURIComponent(currentCode)}/letter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ letter }),
      }).catch(() => {});
    },
    [currentUser, currentCode]
  );

  const openLoveLetter = useCallback(
    (letterId: string) => {
      if (!currentCode) return;

      setRoomData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          letters: prev.letters.map((l) =>
            l.id === letterId ? { ...l, isOpened: true, openedAt: new Date().toISOString() } : l
          ),
        };
      });

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'open_letter', letterId }));
      }

      fetch(`/api/room/${encodeURIComponent(currentCode)}/letter-open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ letterId }),
      }).catch(() => {});
    },
    [currentCode]
  );

  const addStickyNote = useCallback(
    (text: string, color: string) => {
      if (!currentUser || !currentCode) return;
      const note: StickyNote = {
        id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        text,
        color,
        authorId: currentUser.id,
        authorName: currentUser.name,
        timestamp: Date.now(),
      };

      setRoomData((prev) => {
        if (!prev) return prev;
        return { ...prev, notes: [...prev.notes, note] };
      });

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'add_note', note }));
      }

      fetch(`/api/room/${encodeURIComponent(currentCode)}/note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      }).catch(() => {});
    },
    [currentUser, currentCode]
  );

  const deleteStickyNote = useCallback(
    (noteId: string) => {
      if (!currentCode) return;

      setRoomData((prev) => {
        if (!prev) return prev;
        return { ...prev, notes: prev.notes.filter((n) => n.id !== noteId) };
      });

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'delete_note', noteId }));
      }

      fetch(`/api/room/${encodeURIComponent(currentCode)}/note-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId }),
      }).catch(() => {});
    },
    [currentCode]
  );

  const updateCoupleMeta = useCallback(
    (meta: Partial<CoupleMeta>) => {
      if (!currentCode) return;

      setRoomData((prev) => {
        if (!prev) return prev;
        return { ...prev, coupleMeta: { ...prev.coupleMeta, ...meta } };
      });

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'update_meta', meta }));
      }

      fetch(`/api/room/${encodeURIComponent(currentCode)}/meta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meta }),
      }).catch(() => {});
    },
    [currentCode]
  );

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'typing', isTyping }));
      }
    },
    []
  );

  const pairWithCode = useCallback(async (code: string, user: UserProfile) => {
    const trimmed = code.trim().toUpperCase();
    try {
      const res = await fetch(`/api/room/${encodeURIComponent(trimmed)}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user }),
      });
      if (res.ok) {
        const data = await res.json();
        const finalCode = data.code || data.room?.code || trimmed;
        setCurrentCode(finalCode);
        setCurrentUser(user);
        if (data.room) {
          mergeRoomData(data.room, true);
        }
        return finalCode;
      }
    } catch {}
    setCurrentCode(trimmed);
    setCurrentUser(user);
    return trimmed;
  }, [mergeRoomData]);

  const disconnectPair = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setCurrentCode(null);
    setCurrentUser(null);
    setRoomData(null);
    if (socketRef.current) {
      socketRef.current.close();
    }
    // Remove ?nest from URL
    const url = new URL(window.location.href);
    url.searchParams.delete('nest');
    url.searchParams.delete('code');
    window.history.replaceState({}, '', url.pathname);
  }, []);

  // Compute partner user (prefer user with different name or id, sorted by active/online status)
  const partnerUser =
    roomData?.users.find(
      (u) =>
        u.id !== currentUser?.id &&
        u.name.trim().toLowerCase() !== currentUser?.name.trim().toLowerCase()
    ) ||
    roomData?.users.find((u) => u.id !== currentUser?.id) ||
    null;

  return {
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
  };
}
