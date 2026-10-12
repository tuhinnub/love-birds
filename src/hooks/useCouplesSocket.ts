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

const STORAGE_KEY = 'lovebirds_session_v1';

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
      // Check URL query param first
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

  // Save session info to localStorage
  useEffect(() => {
    if (currentCode && currentUser) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ code: currentCode, user: currentUser })
      );
    }
  }, [currentCode, currentUser]);

  // Connect to WebSocket
  useEffect(() => {
    if (!currentCode || !currentUser) {
      return;
    }

    let isDisposed = false;

    function connect() {
      if (isDisposed) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;

      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        // Join room with pair code and user profile
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
              setRoomData(data.room);
              break;
            }

            case 'user_presence': {
              setRoomData((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  users: data.users,
                };
              });
              break;
            }

            case 'new_message': {
              const msg: ChatMessage = data.message;
              setRoomData((prev) => {
                if (!prev) return prev;
                // Guard duplicate
                if (prev.messages.some((m) => m.id === msg.id)) return prev;
                return {
                  ...prev,
                  messages: [...prev.messages, msg],
                };
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
              setRoomData((prev) => (prev ? { ...prev, canvasStrokes: [] } : prev));
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
              // If incoming poke message was broadcast
              if (message) {
                setRoomData((prev) => {
                  if (!prev) return prev;
                  if (prev.messages.some((m) => m.id === message.id)) return prev;
                  return {
                    ...prev,
                    messages: [...prev.messages, message],
                  };
                });
              }

              // Fire sensory animation and sounds
              if (senderId !== currentUser?.id) {
                if (pokeType === 'kiss') soundEffects.playKissPop();
                else soundEffects.playHeartChime();

                setActivePoke({
                  pokeType,
                  senderName,
                  senderId,
                  timestamp: Date.now(),
                });

                // Fireworks / heart confetti
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
                return {
                  ...prev,
                  photos: [photo, ...prev.photos],
                };
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
                return {
                  ...prev,
                  events: [...prev.events, eventItem],
                };
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
                return {
                  ...prev,
                  letters: [...prev.letters, letter],
                };
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
                return {
                  ...prev,
                  notes: [...prev.notes, note],
                };
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
                return {
                  ...prev,
                  coupleMeta: data.coupleMeta,
                };
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
          console.error('WebSocket parse error:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (!isDisposed) {
          reconnectTimeoutRef.current = setTimeout(connect, 2000);
        }
      };

      ws.onerror = (err) => {
        console.warn('WebSocket encountered error:', err);
        ws.close();
      };
    }

    connect();

    return () => {
      isDisposed = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [currentCode, currentUser]);

  // Senders
  const sendMessage = useCallback(
    (messageData: Omit<ChatMessage, 'id' | 'senderId' | 'senderName' | 'timestamp'>) => {
      if (!currentUser || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
      const msg: ChatMessage = {
        ...messageData,
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatar,
        timestamp: Date.now(),
      };
      socketRef.current.send(JSON.stringify({ type: 'chat_message', message: msg }));
    },
    [currentUser]
  );

  const toggleMessageReaction = useCallback(
    (messageId: string, emoji: string) => {
      if (!currentUser || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
      socketRef.current.send(
        JSON.stringify({
          type: 'message_reaction',
          messageId,
          emoji,
          userId: currentUser.id,
        })
      );
    },
    [currentUser]
  );

  const sendCanvasStroke = useCallback(
    (stroke: CanvasStroke) => {
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
      socketRef.current.send(JSON.stringify({ type: 'canvas_stroke', stroke }));
    },
    []
  );

  const clearCanvas = useCallback(() => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(JSON.stringify({ type: 'canvas_clear' }));
  }, []);

  const sendCanvasLivePointer = useCallback(
    (pointer: { x: number; y: number; isDrawing: boolean; color: string }) => {
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
      socketRef.current.send(JSON.stringify({ type: 'canvas_live_pointer', pointer }));
    },
    []
  );

  const sendPoke = useCallback(
    (pokeType: 'kiss' | 'hug' | 'hearts' | 'miss_you') => {
      if (!currentUser || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
      if (pokeType === 'kiss') soundEffects.playKissPop();
      else soundEffects.playHeartChime();

      socketRef.current.send(
        JSON.stringify({
          type: 'poke',
          pokeType,
          senderName: currentUser.name,
        })
      );
    },
    [currentUser]
  );

  const addPhoto = useCallback(
    (photoData: Omit<PhotoItem, 'id' | 'senderId' | 'senderName' | 'timestamp' | 'likes'>) => {
      if (!currentUser || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
      soundEffects.playSwoosh();
      const photo: PhotoItem = {
        ...photoData,
        id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        senderId: currentUser.id,
        senderName: currentUser.name,
        timestamp: Date.now(),
        likes: [],
      };
      socketRef.current.send(JSON.stringify({ type: 'add_photo', photo }));
    },
    [currentUser]
  );

  const togglePhotoLike = useCallback(
    (photoId: string) => {
      if (!currentUser || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
      socketRef.current.send(
        JSON.stringify({
          type: 'toggle_photo_like',
          photoId,
          userId: currentUser.id,
        })
      );
    },
    [currentUser]
  );

  const deletePhoto = useCallback(
    (photoId: string) => {
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
      socketRef.current.send(JSON.stringify({ type: 'delete_photo', photoId }));
    },
    []
  );

  const addCalendarEvent = useCallback(
    (eventData: Omit<CalendarEvent, 'id' | 'createdBy' | 'timestamp'>) => {
      if (!currentUser || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
      const event: CalendarEvent = {
        ...eventData,
        id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        createdBy: currentUser.id,
        timestamp: Date.now(),
      };
      socketRef.current.send(JSON.stringify({ type: 'add_event', event }));
    },
    [currentUser]
  );

  const deleteCalendarEvent = useCallback(
    (eventId: string) => {
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
      socketRef.current.send(JSON.stringify({ type: 'delete_event', eventId }));
    },
    []
  );

  const addLoveLetter = useCallback(
    (letterData: Omit<LoveLetter, 'id' | 'authorId' | 'authorName' | 'sealedDate' | 'isOpened'>) => {
      if (!currentUser || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
      const letter: LoveLetter = {
        ...letterData,
        id: `letter-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        authorId: currentUser.id,
        authorName: currentUser.name,
        sealedDate: new Date().toISOString().split('T')[0],
        isOpened: false,
      };
      socketRef.current.send(JSON.stringify({ type: 'add_letter', letter }));
    },
    [currentUser]
  );

  const openLoveLetter = useCallback(
    (letterId: string) => {
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
      socketRef.current.send(JSON.stringify({ type: 'open_letter', letterId }));
    },
    []
  );

  const addStickyNote = useCallback(
    (text: string, color: string) => {
      if (!currentUser || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
      const note: StickyNote = {
        id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        text,
        color,
        authorId: currentUser.id,
        authorName: currentUser.name,
        timestamp: Date.now(),
      };
      socketRef.current.send(JSON.stringify({ type: 'add_note', note }));
    },
    [currentUser]
  );

  const deleteStickyNote = useCallback(
    (noteId: string) => {
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
      socketRef.current.send(JSON.stringify({ type: 'delete_note', noteId }));
    },
    []
  );

  const updateCoupleMeta = useCallback(
    (meta: Partial<CoupleMeta>) => {
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
      socketRef.current.send(JSON.stringify({ type: 'update_meta', meta }));
    },
    []
  );

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
      socketRef.current.send(JSON.stringify({ type: 'typing', isTyping }));
    },
    []
  );

  const pairWithCode = useCallback((code: string, user: UserProfile) => {
    setCurrentCode(code.trim().toUpperCase());
    setCurrentUser(user);
  }, []);

  const disconnectPair = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setCurrentCode(null);
    setCurrentUser(null);
    setRoomData(null);
    if (socketRef.current) {
      socketRef.current.close();
    }
  }, []);

  // Compute partner user
  const partnerUser = roomData?.users.find((u) => u.id !== currentUser?.id) || null;

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
