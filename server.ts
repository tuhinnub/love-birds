import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

const DATA_DIR = path.resolve(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'couples_data.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  city?: string;
  timezone?: string;
  isOnline?: boolean;
  lastSeen?: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  type: 'text' | 'sketch' | 'photo' | 'poke' | 'love_letter';
  text?: string;
  sketchDataUrl?: string;
  photoUrl?: string;
  pokeType?: 'kiss' | 'hug' | 'hearts' | 'miss_you';
  timestamp: number;
  reactions?: Record<string, string[]>;
}

export interface CanvasStroke {
  id: string;
  color: string;
  size: number;
  mode: 'brush' | 'eraser' | 'neon' | 'highlighter';
  points: { x: number; y: number }[];
  authorId: string;
}

export interface PhotoItem {
  id: string;
  senderId: string;
  senderName: string;
  url: string;
  caption: string;
  albumName: string;
  location?: string;
  date: string;
  timestamp: number;
  likes: string[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  category: 'visit' | 'date' | 'anniversary' | 'call' | 'flight' | 'other';
  notes?: string;
  createdBy: string;
  timestamp: number;
}

export interface LoveLetter {
  id: string;
  title: string;
  openWhen: string;
  content: string;
  authorId: string;
  authorName: string;
  sealedDate: string;
  isOpened: boolean;
  openedAt?: string;
}

export interface StickyNote {
  id: string;
  text: string;
  color: string;
  authorId: string;
  authorName: string;
  timestamp: number;
}

export interface CoupleMeta {
  anniversaryDate?: string;
  nextMeetupDate?: string;
  nextMeetupTitle?: string;
  user1Location?: string;
  user2Location?: string;
  user1Timezone?: string;
  user2Timezone?: string;
}

export interface RoomData {
  code: string;
  createdAt: number;
  users: UserProfile[];
  messages: ChatMessage[];
  canvasStrokes: CanvasStroke[];
  photos: PhotoItem[];
  events: CalendarEvent[];
  letters: LoveLetter[];
  notes: StickyNote[];
  coupleMeta: CoupleMeta;
}

// In-memory rooms cache
const rooms = new Map<string, RoomData>();

// Load initial data from disk
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed: Record<string, RoomData> = JSON.parse(raw);
      for (const [code, room] of Object.entries(parsed)) {
        rooms.set(code.toUpperCase(), room);
      }
    }
  } catch (err) {
    console.error('Error loading data file:', err);
  }
}

// Persist data to disk
let saveTimeout: NodeJS.Timeout | null = null;
function scheduleSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      const obj: Record<string, RoomData> = {};
      rooms.forEach((val, key) => {
        // limit message history to 200 items and canvas strokes to 300 to avoid bloat
        obj[key] = {
          ...val,
          messages: val.messages.slice(-200),
          canvasStrokes: val.canvasStrokes.slice(-300),
        };
      });
      fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving data:', err);
    }
  }, 1000);
}

loadData();

// Helper to get or create room
function getOrCreateRoom(rawCode: string): RoomData {
  const code = rawCode.trim().toUpperCase();
  if (!rooms.has(code)) {
    const newRoom: RoomData = {
      code,
      createdAt: Date.now(),
      users: [],
      messages: [
        {
          id: 'welcome-1',
          senderId: 'system',
          senderName: 'Love Birds 🕊️',
          type: 'text',
          text: `Welcome to your private sanctuary! 💕 Share this code "${code}" with your partner to connect. You can draw sketches, send voice kisses, share photos, and count down the days until your next reunion!`,
          timestamp: Date.now(),
        },
      ],
      canvasStrokes: [],
      photos: [
        {
          id: 'sample-p1',
          senderId: 'system',
          senderName: 'Love Birds',
          url: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=800&q=80',
          caption: 'Counting down the sunsets until we hold hands again 🌅',
          albumName: 'Our Memories',
          location: 'Sunset Beach',
          date: new Date().toISOString().split('T')[0],
          timestamp: Date.now() - 86400000 * 2,
          likes: [],
        },
        {
          id: 'sample-p2',
          senderId: 'system',
          senderName: 'Love Birds',
          url: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=800&q=80',
          caption: 'Our cozy coffee date over video call ☕❤️',
          albumName: 'Daily Love',
          location: 'Virtual Date',
          date: new Date().toISOString().split('T')[0],
          timestamp: Date.now() - 86400000,
          likes: [],
        },
      ],
      events: [
        {
          id: 'sample-ev1',
          title: '✈️ Airport Reunion Hug!',
          date: new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0],
          time: '14:30',
          category: 'visit',
          notes: 'Terminal 3 arrivals! Bringing your favorite chocolate 🍫',
          createdBy: 'system',
          timestamp: Date.now(),
        },
        {
          id: 'sample-ev2',
          title: '🥂 Weekend Candlelight FaceTime Date',
          date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
          time: '20:00',
          category: 'date',
          notes: 'We both cook pasta and dress up nicely 🍝✨',
          createdBy: 'system',
          timestamp: Date.now(),
        },
      ],
      letters: [
        {
          id: 'sample-let1',
          title: 'A Little Whisper',
          openWhen: 'Open when distance feels too hard 🌧️',
          content: 'Hey my love,\n\nI know miles feel heavy today, but remember that every sunrise brings us one day closer. No amount of distance can diminish how deeply you are loved. Close your eyes, take a deep breath, and feel my arms around you.\n\nForever yours 💕',
          authorId: 'system',
          authorName: 'Your Love',
          sealedDate: new Date().toISOString().split('T')[0],
          isOpened: false,
        },
      ],
      notes: [
        {
          id: 'sample-n1',
          text: 'Drink water and remember I adore you! 💧🥰',
          color: '#FEF08A',
          authorId: 'system',
          authorName: 'Sweetheart',
          timestamp: Date.now(),
        },
      ],
      coupleMeta: {
        nextMeetupDate: new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0],
        nextMeetupTitle: 'Airport Reunion Hug! ✈️',
        anniversaryDate: new Date(Date.now() - 86400000 * 365).toISOString().split('T')[0],
        user1Location: 'New York, USA',
        user1Timezone: 'America/New_York',
        user2Location: 'Paris, France',
        user2Timezone: 'Europe/Paris',
      },
    };
    rooms.set(code, newRoom);
    scheduleSave();
  }
  return rooms.get(code)!;
}

const app = express();

// CORS setup for mobile browsers and external partner phones
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API endpoints
app.post('/api/room/create', (req, res) => {
  const prefixes = ['BIRD', 'DOVE', 'HEART', 'LOVE', 'SWEET', 'HONEY'];
  const randPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const randNum = Math.floor(1000 + Math.random() * 9000);
  const code = `${randPrefix}-${randNum}`;
  const room = getOrCreateRoom(code);
  res.json({ code, room });
});

app.get('/api/room/:code', (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const room = getOrCreateRoom(code);
  res.json(room);
});

// Dual-sync polling endpoint
app.get('/api/room/:code/sync', (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const userId = req.query.userId as string | undefined;
  const room = getOrCreateRoom(code);

  if (userId) {
    const user = room.users.find((u) => u.id === userId);
    if (user) {
      user.isOnline = true;
      user.lastSeen = Date.now();
    }
  }

  res.json(room);
});

// REST endpoint: Join / Update Profile
app.post('/api/room/:code/join', (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const user: UserProfile = req.body.user;
  if (!user || !user.id) return res.status(400).json({ error: 'Missing user' });

  const room = getOrCreateRoom(code);
  const existingIdx = room.users.findIndex((u) => u.id === user.id);
  const updatedUser: UserProfile = { ...user, isOnline: true, lastSeen: Date.now() };

  if (existingIdx >= 0) {
    room.users[existingIdx] = { ...room.users[existingIdx], ...updatedUser };
  } else {
    room.users.push(updatedUser);
  }

  scheduleSave();
  broadcastToAllInRoom(code, {
    type: 'user_presence',
    user: updatedUser,
    users: room.users,
  });

  res.json({ success: true, room });
});

// REST endpoint: Post Chat Message
app.post('/api/room/:code/message', (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const message: ChatMessage = req.body.message;
  if (!message || !message.id) return res.status(400).json({ error: 'Invalid message' });

  const room = getOrCreateRoom(code);
  if (!room.messages.some((m) => m.id === message.id)) {
    room.messages.push(message);
    scheduleSave();
  }

  broadcastToAllInRoom(code, { type: 'new_message', message });
  res.json({ success: true, message });
});

// REST endpoint: Reaction
app.post('/api/room/:code/reaction', (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const { messageId, emoji, userId } = req.body;
  const room = getOrCreateRoom(code);
  const target = room.messages.find((m) => m.id === messageId);

  if (target) {
    target.reactions = target.reactions || {};
    const list = target.reactions[emoji] || [];
    if (list.includes(userId)) {
      target.reactions[emoji] = list.filter((id) => id !== userId);
      if (target.reactions[emoji].length === 0) {
        delete target.reactions[emoji];
      }
    } else {
      target.reactions[emoji] = [...list, userId];
    }
    scheduleSave();
    broadcastToAllInRoom(code, { type: 'message_updated', message: target });
  }

  res.json({ success: true, target });
});

// REST endpoint: Canvas stroke
app.post('/api/room/:code/stroke', (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const stroke: CanvasStroke = req.body.stroke;
  if (!stroke) return res.status(400).json({ error: 'Invalid stroke' });

  const room = getOrCreateRoom(code);
  room.canvasStrokes.push(stroke);
  if (room.canvasStrokes.length > 500) {
    room.canvasStrokes = room.canvasStrokes.slice(-300);
  }
  scheduleSave();

  broadcastToAllInRoom(code, { type: 'canvas_stroke', stroke });
  res.json({ success: true });
});

// REST endpoint: Clear canvas
app.post('/api/room/:code/clear-canvas', (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const room = getOrCreateRoom(code);
  room.canvasStrokes = [];
  scheduleSave();

  broadcastToAllInRoom(code, { type: 'canvas_cleared' });
  res.json({ success: true });
});

// REST endpoint: Poke / Kiss / Hug
app.post('/api/room/:code/poke', (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const { pokeType, senderName, senderId } = req.body;
  const room = getOrCreateRoom(code);

  const pokeMsg: ChatMessage = {
    id: `poke-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    senderId,
    senderName,
    type: 'poke',
    pokeType: pokeType || 'kiss',
    timestamp: Date.now(),
  };
  room.messages.push(pokeMsg);
  scheduleSave();

  broadcastToAllInRoom(code, {
    type: 'poke_received',
    pokeType,
    senderName,
    senderId,
    message: pokeMsg,
  });

  res.json({ success: true, message: pokeMsg });
});

// REST endpoint: Add Photo
app.post('/api/room/:code/photo', (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const photo: PhotoItem = req.body.photo;
  if (!photo) return res.status(400).json({ error: 'Missing photo' });

  const room = getOrCreateRoom(code);
  room.photos.unshift(photo);
  scheduleSave();

  broadcastToAllInRoom(code, { type: 'photo_added', photo });
  res.json({ success: true, photo });
});

// REST endpoint: Photo Like
app.post('/api/room/:code/photo-like', (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const { photoId, userId } = req.body;
  const room = getOrCreateRoom(code);
  const photo = room.photos.find((p) => p.id === photoId);

  if (photo) {
    if (photo.likes.includes(userId)) {
      photo.likes = photo.likes.filter((id) => id !== userId);
    } else {
      photo.likes.push(userId);
    }
    scheduleSave();
    broadcastToAllInRoom(code, { type: 'photo_updated', photo });
  }

  res.json({ success: true, photo });
});

// REST endpoint: Photo Delete
app.post('/api/room/:code/photo-delete', (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const { photoId } = req.body;
  const room = getOrCreateRoom(code);
  room.photos = room.photos.filter((p) => p.id !== photoId);
  scheduleSave();

  broadcastToAllInRoom(code, { type: 'photo_deleted', photoId });
  res.json({ success: true });
});

// REST endpoint: Add Calendar Event
app.post('/api/room/:code/event', (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const event: CalendarEvent = req.body.event;
  if (!event) return res.status(400).json({ error: 'Missing event' });

  const room = getOrCreateRoom(code);
  room.events.push(event);
  scheduleSave();

  broadcastToAllInRoom(code, { type: 'event_added', event });
  res.json({ success: true, event });
});

// REST endpoint: Delete Calendar Event
app.post('/api/room/:code/event-delete', (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const { eventId } = req.body;
  const room = getOrCreateRoom(code);
  room.events = room.events.filter((e) => e.id !== eventId);
  scheduleSave();

  broadcastToAllInRoom(code, { type: 'event_deleted', eventId });
  res.json({ success: true });
});

// REST endpoint: Add Love Letter
app.post('/api/room/:code/letter', (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const letter: LoveLetter = req.body.letter;
  if (!letter) return res.status(400).json({ error: 'Missing letter' });

  const room = getOrCreateRoom(code);
  room.letters.push(letter);
  scheduleSave();

  broadcastToAllInRoom(code, { type: 'letter_added', letter });
  res.json({ success: true, letter });
});

// REST endpoint: Open Love Letter
app.post('/api/room/:code/letter-open', (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const { letterId } = req.body;
  const room = getOrCreateRoom(code);
  const letter = room.letters.find((l) => l.id === letterId);

  if (letter && !letter.isOpened) {
    letter.isOpened = true;
    letter.openedAt = new Date().toISOString();
    scheduleSave();
    broadcastToAllInRoom(code, { type: 'letter_opened', letter });
  }

  res.json({ success: true, letter });
});

// REST endpoint: Add Note
app.post('/api/room/:code/note', (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const note: StickyNote = req.body.note;
  if (!note) return res.status(400).json({ error: 'Missing note' });

  const room = getOrCreateRoom(code);
  room.notes.push(note);
  scheduleSave();

  broadcastToAllInRoom(code, { type: 'note_added', note });
  res.json({ success: true, note });
});

// REST endpoint: Delete Note
app.post('/api/room/:code/note-delete', (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const { noteId } = req.body;
  const room = getOrCreateRoom(code);
  room.notes = room.notes.filter((n) => n.id !== noteId);
  scheduleSave();

  broadcastToAllInRoom(code, { type: 'note_deleted', noteId });
  res.json({ success: true });
});

// REST endpoint: Update Couple Meta (Countdown, Timezones)
app.post('/api/room/:code/meta', (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const meta: Partial<CoupleMeta> = req.body.meta;
  const room = getOrCreateRoom(code);
  room.coupleMeta = { ...room.coupleMeta, ...meta };
  scheduleSave();

  broadcastToAllInRoom(code, { type: 'meta_updated', coupleMeta: room.coupleMeta });
  res.json({ success: true, coupleMeta: room.coupleMeta });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

interface SocketMeta {
  code: string;
  userId: string;
  userName: string;
}

const socketMeta = new WeakMap<WebSocket, SocketMeta>();
const roomSockets = new Map<string, Set<WebSocket>>();

function broadcastToRoom(code: string, payload: any, senderWs?: WebSocket) {
  const sockets = roomSockets.get(code.toUpperCase());
  if (!sockets) return;
  const messageStr = JSON.stringify(payload);
  sockets.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      if (!senderWs || client !== senderWs) {
        client.send(messageStr);
      }
    }
  });
}

function broadcastToAllInRoom(code: string, payload: any) {
  const sockets = roomSockets.get(code.toUpperCase());
  if (!sockets) return;
  const messageStr = JSON.stringify(payload);
  sockets.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

wss.on('connection', (ws: WebSocket) => {
  ws.on('message', (dataStr) => {
    try {
      const msg = JSON.parse(dataStr.toString());
      const type = msg.type;

      if (type === 'join') {
        const rawCode = msg.code || '';
        const code = rawCode.trim().toUpperCase();
        const user: UserProfile = msg.user;
        if (!code || !user) return;

        socketMeta.set(ws, { code, userId: user.id, userName: user.name });

        if (!roomSockets.has(code)) {
          roomSockets.set(code, new Set());
        }
        roomSockets.get(code)!.add(ws);

        const room = getOrCreateRoom(code);

        // Update or add user
        const existingIdx = room.users.findIndex((u) => u.id === user.id);
        const updatedUser: UserProfile = {
          ...user,
          isOnline: true,
          lastSeen: Date.now(),
        };

        if (existingIdx >= 0) {
          room.users[existingIdx] = { ...room.users[existingIdx], ...updatedUser };
        } else {
          // Keep only up to 2 partners in a couple room, or allow reconnect
          room.users.push(updatedUser);
        }

        scheduleSave();

        // Send full init state to joining user
        ws.send(JSON.stringify({ type: 'init', room }));

        // Notify other user in room
        broadcastToRoom(
          code,
          {
            type: 'user_presence',
            user: updatedUser,
            users: room.users,
          },
          ws
        );
        return;
      }

      const meta = socketMeta.get(ws);
      if (!meta) return;
      const code = meta.code;
      const room = getOrCreateRoom(code);

      switch (type) {
        case 'chat_message': {
          const chatMsg: ChatMessage = msg.message;
          if (!chatMsg) return;
          // Guard duplicate
          if (!room.messages.some((m) => m.id === chatMsg.id)) {
            room.messages.push(chatMsg);
            scheduleSave();
          }
          broadcastToAllInRoom(code, { type: 'new_message', message: chatMsg });
          break;
        }

        case 'message_reaction': {
          const { messageId, emoji, userId } = msg;
          const target = room.messages.find((m) => m.id === messageId);
          if (target) {
            target.reactions = target.reactions || {};
            const list = target.reactions[emoji] || [];
            if (list.includes(userId)) {
              target.reactions[emoji] = list.filter((id) => id !== userId);
              if (target.reactions[emoji].length === 0) {
                delete target.reactions[emoji];
              }
            } else {
              target.reactions[emoji] = [...list, userId];
            }
            scheduleSave();
            broadcastToAllInRoom(code, {
              type: 'message_updated',
              message: target,
            });
          }
          break;
        }

        case 'canvas_stroke': {
          const stroke: CanvasStroke = msg.stroke;
          if (stroke) {
            room.canvasStrokes.push(stroke);
            if (room.canvasStrokes.length > 500) {
              room.canvasStrokes = room.canvasStrokes.slice(-300);
            }
            scheduleSave();
            broadcastToRoom(code, { type: 'canvas_stroke', stroke }, ws);
          }
          break;
        }

        case 'canvas_clear': {
          room.canvasStrokes = [];
          scheduleSave();
          broadcastToAllInRoom(code, { type: 'canvas_cleared' });
          break;
        }

        case 'canvas_live_pointer': {
          // Throttled live drawing cursor sent to partner
          broadcastToRoom(code, { type: 'canvas_live_pointer', pointer: msg.pointer, senderId: meta.userId }, ws);
          break;
        }

        case 'poke': {
          const pokeType = msg.pokeType || 'kiss';
          const senderName = msg.senderName || meta.userName;
          const pokeMsg: ChatMessage = {
            id: `poke-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            senderId: meta.userId,
            senderName,
            type: 'poke',
            pokeType,
            timestamp: Date.now(),
          };
          room.messages.push(pokeMsg);
          scheduleSave();
          broadcastToAllInRoom(code, {
            type: 'poke_received',
            pokeType,
            senderName,
            senderId: meta.userId,
            message: pokeMsg,
          });
          break;
        }

        case 'add_photo': {
          const photo: PhotoItem = msg.photo;
          if (photo) {
            room.photos.unshift(photo);
            scheduleSave();
            broadcastToAllInRoom(code, { type: 'photo_added', photo });
          }
          break;
        }

        case 'toggle_photo_like': {
          const { photoId, userId } = msg;
          const photo = room.photos.find((p) => p.id === photoId);
          if (photo) {
            if (photo.likes.includes(userId)) {
              photo.likes = photo.likes.filter((id) => id !== userId);
            } else {
              photo.likes.push(userId);
            }
            scheduleSave();
            broadcastToAllInRoom(code, { type: 'photo_updated', photo });
          }
          break;
        }

        case 'delete_photo': {
          const { photoId } = msg;
          room.photos = room.photos.filter((p) => p.id !== photoId);
          scheduleSave();
          broadcastToAllInRoom(code, { type: 'photo_deleted', photoId });
          break;
        }

        case 'add_event': {
          const event: CalendarEvent = msg.event;
          if (event) {
            room.events.push(event);
            scheduleSave();
            broadcastToAllInRoom(code, { type: 'event_added', event });
          }
          break;
        }

        case 'delete_event': {
          const { eventId } = msg;
          room.events = room.events.filter((e) => e.id !== eventId);
          scheduleSave();
          broadcastToAllInRoom(code, { type: 'event_deleted', eventId });
          break;
        }

        case 'add_letter': {
          const letter: LoveLetter = msg.letter;
          if (letter) {
            room.letters.push(letter);
            scheduleSave();
            broadcastToAllInRoom(code, { type: 'letter_added', letter });
          }
          break;
        }

        case 'open_letter': {
          const { letterId } = msg;
          const letter = room.letters.find((l) => l.id === letterId);
          if (letter && !letter.isOpened) {
            letter.isOpened = true;
            letter.openedAt = new Date().toISOString();
            scheduleSave();
            broadcastToAllInRoom(code, { type: 'letter_opened', letter });
          }
          break;
        }

        case 'add_note': {
          const note: StickyNote = msg.note;
          if (note) {
            room.notes.push(note);
            scheduleSave();
            broadcastToAllInRoom(code, { type: 'note_added', note });
          }
          break;
        }

        case 'delete_note': {
          const { noteId } = msg;
          room.notes = room.notes.filter((n) => n.id !== noteId);
          scheduleSave();
          broadcastToAllInRoom(code, { type: 'note_deleted', noteId });
          break;
        }

        case 'update_meta': {
          const metaUpdate: Partial<CoupleMeta> = msg.meta;
          room.coupleMeta = { ...room.coupleMeta, ...metaUpdate };
          scheduleSave();
          broadcastToAllInRoom(code, { type: 'meta_updated', coupleMeta: room.coupleMeta });
          break;
        }

        case 'typing': {
          broadcastToRoom(code, { type: 'typing', isTyping: msg.isTyping, senderId: meta.userId, senderName: meta.userName }, ws);
          break;
        }
      }
    } catch (err) {
      console.error('WS message error:', err);
    }
  });

  ws.on('close', () => {
    const meta = socketMeta.get(ws);
    if (!meta) return;
    const { code, userId } = meta;
    const sockets = roomSockets.get(code);
    if (sockets) {
      sockets.delete(ws);
      if (sockets.size === 0) {
        roomSockets.delete(code);
      }
    }

    const room = rooms.get(code);
    if (room) {
      const user = room.users.find((u) => u.id === userId);
      if (user) {
        user.isOnline = false;
        user.lastSeen = Date.now();
        scheduleSave();
        broadcastToRoom(code, {
          type: 'user_presence',
          user,
          users: room.users,
        });
      }
    }
  });
});

// Start dev or static prod
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🕊️ Love Birds server listening on port ${PORT}`);
  });
}

startServer();
