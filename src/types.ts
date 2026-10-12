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

export interface PokeEventData {
  pokeType: 'kiss' | 'hug' | 'hearts' | 'miss_you';
  senderName: string;
  senderId: string;
  timestamp: number;
}
