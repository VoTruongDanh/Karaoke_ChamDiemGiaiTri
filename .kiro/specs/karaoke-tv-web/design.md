# Design Document: Karaoke TV Web App

## Overview

Hệ thống Karaoke TV Web App là một ứng dụng web được thiết kế đặc biệt cho Google TV và Android TV, với khả năng điều khiển từ điện thoại thông qua WebSocket real-time. Ứng dụng sử dụng YouTube làm nguồn nhạc karaoke và tích hợp Web Audio API để chấm điểm giọng hát.

### Kiến trúc tổng quan

```
┌─────────────────┐     WebSocket      ┌─────────────────┐
│   TV Browser    │◄──────────────────►│  Backend Server │
│  (Main App)     │                    │   (Node.js)     │
└─────────────────┘                    └─────────────────┘
                                              ▲
                                              │ WebSocket
                                              ▼
                                       ┌─────────────────┐
                                       │ Mobile Browser  │
                                       │  (Controller)   │
                                       └─────────────────┘
```

## Architecture

### System Components

1. **Frontend TV App** - React/Next.js app tối ưu cho TV navigation
2. **Frontend Mobile Controller** - React app responsive cho điện thoại
3. **Backend Server** - Node.js với WebSocket cho real-time sync
4. **YouTube Data API** - Tìm kiếm và lấy thông tin video karaoke

### Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **State Management**: Zustand (lightweight, simple)
- **Real-time**: Socket.io (WebSocket với fallback)
- **Backend**: Node.js, Express, Socket.io Server
- **Audio Processing**: Web Audio API, Pitchfinder library
- **Video**: YouTube IFrame API
- **Styling**: Tailwind CSS với custom TV-optimized components

## Components and Interfaces

### 1. TV Navigation System

```typescript
interface FocusableElement {
  id: string;
  row: number;
  col: number;
  onSelect: () => void;
}

interface NavigationGrid {
  elements: FocusableElement[][];
  currentFocus: { row: number; col: number };
  moveFocus(direction: 'up' | 'down' | 'left' | 'right'): void;
  selectCurrent(): void;
}
```

**TV Remote Key Mapping:**
- Arrow Keys → Navigate focus
- Enter/OK → Select focused element
- Back → Go to previous screen

### 2. Session Management

```typescript
interface Session {
  id: string;
  code: string; // 6-digit code for manual entry
  tvSocketId: string;
  mobileConnections: string[];
  queue: QueueItem[];
  currentSong: QueueItem | null;
  createdAt: Date;
}

interface SessionManager {
  createSession(): Session;
  joinSession(code: string, socketId: string): boolean;
  addToQueue(sessionId: string, song: Song): void;
  getNextSong(sessionId: string): QueueItem | null;
}
```

### 3. Song Library Interface

```typescript
interface Song {
  youtubeId: string;
  title: string;
  thumbnail: string;
  channelName: string;
  duration: number; // seconds
}

interface SearchResult {
  songs: Song[];
  nextPageToken?: string;
}

interface SongLibrary {
  search(query: string, pageToken?: string): Promise<SearchResult>;
  getPopularKaraoke(): Promise<Song[]>;
  getRecentSearches(): string[];
}
```

### 4. Queue Management

```typescript
interface QueueItem {
  id: string;
  song: Song;
  addedBy: string; // user identifier
  addedAt: Date;
  status: 'waiting' | 'playing' | 'completed';
}

interface Queue {
  items: QueueItem[];
  add(song: Song, userId: string): QueueItem;
  remove(itemId: string): boolean;
  reorder(itemId: string, newIndex: number): void;
  getNext(): QueueItem | null;
  getCurrent(): QueueItem | null;
}
```

### 5. Scoring System

```typescript
interface ScoreData {
  pitchAccuracy: number; // 0-100
  timing: number; // 0-100
  totalScore: number; // 0-100
}

interface RealTimeFeedback {
  currentPitch: number;
  targetPitch: number;
  accuracy: 'perfect' | 'good' | 'ok' | 'miss';
}

interface ScoringSystem {
  startScoring(): void;
  stopScoring(): ScoreData;
  getRealTimeFeedback(): RealTimeFeedback;
  onFeedbackUpdate: (feedback: RealTimeFeedback) => void;
}
```

### 6. WebSocket Events

```typescript
// TV → Server
interface TVEvents {
  'session:create': () => void;
  'queue:update': (queue: QueueItem[]) => void;
  'song:started': (song: QueueItem) => void;
  'song:ended': (songId: string, score?: ScoreData) => void;
}

// Mobile → Server
interface MobileEvents {
  'session:join': (code: string) => void;
  'queue:add': (song: Song) => void;
  'queue:remove': (itemId: string) => void;
}

// Server → All Clients
interface ServerEvents {
  'session:joined': (session: Session) => void;
  'queue:updated': (queue: QueueItem[]) => void;
  'song:playing': (song: QueueItem) => void;
  'mobile:connected': (userId: string) => void;
}
```

## Data Models

### Session State (Server-side)

```typescript
interface SessionState {
  sessions: Map<string, Session>;
  socketToSession: Map<string, string>; // socketId → sessionId
}
```

### TV App State (Client-side)

```typescript
interface TVAppState {
  // Session
  session: Session | null;
  isConnected: boolean;
  
  // Navigation
  currentScreen: 'home' | 'search' | 'queue' | 'playing';
  focusedElement: string | null;
  
  // Queue
  queue: QueueItem[];
  currentSong: QueueItem | null;
  
  // Scoring
  isScoring: boolean;
  currentScore: ScoreData | null;
  realTimeFeedback: RealTimeFeedback | null;
  
  // Search
  searchQuery: string;
  searchResults: Song[];
  isSearching: boolean;
}
```

### Mobile Controller State

```typescript
interface MobileState {
  // Connection
  sessionCode: string;
  isConnected: boolean;
  
  // Search
  searchQuery: string;
  searchResults: Song[];
  
  // Queue view
  queue: QueueItem[];
  currentSong: QueueItem | null;
}
```

## UI Component Structure

### TV App Screens

```
TVApp
├── HomeScreen
│   ├── SessionInfo (QR Code + Code)
│   ├── QuickActions (Search, Queue, Popular)
│   └── NowPlaying (if song playing)
├── SearchScreen
│   ├── SearchInput (on-screen keyboard)
│   ├── SearchResults (grid of songs)
│   └── RecentSearches
├── QueueScreen
│   ├── CurrentSong
│   ├── QueueList
│   └── QueueActions
└── PlayingScreen
    ├── YouTubePlayer
    ├── LyricsOverlay
    ├── ScoreDisplay
    └── SongInfo
```

### Mobile Controller Screens

```
MobileApp
├── ConnectScreen
│   ├── QRScanner
│   └── CodeInput
├── ControllerScreen
│   ├── SearchBar
│   ├── SearchResults
│   ├── QueuePreview
│   └── NowPlaying
└── QueueScreen
    ├── FullQueueList
    └── QueueActions
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Queue Add Preserves Order and Increases Length

*For any* queue with N items and any valid song, adding the song to the queue should result in a queue with N+1 items where the new song is at the last position and all previous items maintain their relative order.

**Validates: Requirements 3.1**

### Property 2: Queue Remove Maintains Remaining Order

*For any* queue with N items (N > 0) and any valid item ID in the queue, removing that item should result in a queue with N-1 items where all remaining items maintain their relative order.

**Validates: Requirements 3.4**

### Property 3: Queue Reorder Preserves All Items

*For any* queue and any valid reorder operation (moving item from index A to index B), the resulting queue should contain exactly the same items as before, with only their positions changed.

**Validates: Requirements 3.5**

### Property 4: Grid Navigation with Arrow Keys

*For any* navigation grid with focusable elements and any starting focus position, pressing an arrow key (Up, Down, Left, Right) should move focus to the adjacent element in that direction if one exists, or maintain current focus if at boundary. Only these 4 arrow keys plus Enter should trigger navigation actions.

**Validates: Requirements 1.2, 1.4**

### Property 5: Search Results Prioritize Karaoke Videos

*For any* search query returning results, videos with "karaoke" in their title or description should appear before videos without "karaoke" in the sorted results.

**Validates: Requirements 2.2**

### Property 6: Search Results Display Required Fields

*For any* Song object in search results, the rendered display should include the song's thumbnail URL, title, channel name, and duration.

**Validates: Requirements 2.3**

### Property 7: Search Cache Round-Trip

*For any* search query, searching the same query twice should return equivalent results, with the second query using cached data.

**Validates: Requirements 2.5**

### Property 8: Mobile-TV Queue Synchronization

*For any* session with connected TV and mobile clients, when a song is added from mobile, the TV's queue state should reflect the addition within the sync cycle.

**Validates: Requirements 4.4, 4.5**

### Property 9: Score Range Invariant

*For any* completed song with scoring enabled, the final score should be a number between 0 and 100 inclusive.

**Validates: Requirements 5.3**

### Property 10: Session Multi-Connection Support

*For any* active session, connecting additional mobile controllers should succeed and the session should track all connected clients.

**Validates: Requirements 7.1**

### Property 11: Queue Item User Attribution

*For any* queue item added to a session, the item should have a non-empty addedBy field identifying which user added it.

**Validates: Requirements 7.3**

### Property 12: Auto-Play Next Song on End

*For any* session with a non-empty queue where the current song ends, the next song in queue should automatically become the current playing song.

**Validates: Requirements 3.3**

### Property 13: Session Join with Valid Code

*For any* valid session code, a mobile client attempting to join with that code should successfully connect to the corresponding session.

**Validates: Requirements 4.2**

### Property 14: TV Font Size Minimum

*For any* text element in the TV interface, the font size should be at least 24px to ensure readability from TV viewing distance.

**Validates: Requirements 6.4**

## Error Handling

### Network Errors

| Error | Handling |
|-------|----------|
| WebSocket disconnect | Auto-reconnect with exponential backoff (1s, 2s, 4s, max 30s) |
| YouTube API failure | Show error toast, allow retry, use cached results if available |
| YouTube video load failure | Display error message, auto-skip to next song after 5 seconds |
| Session not found | Show "Session expired" message, prompt to create new session |

### User Input Errors

| Error | Handling |
|-------|----------|
| Empty search query | Disable search button, show hint text |
| Invalid session code | Show "Invalid code" message, allow retry |
| Microphone denied | Show permission message, continue without scoring |

### State Recovery

- Queue state persisted in server memory per session
- On TV reconnect, restore queue from server
- On mobile reconnect, sync current state from server

## Testing Strategy

### Unit Tests

Unit tests sẽ tập trung vào:
- Queue operations (add, remove, reorder)
- Navigation grid logic
- Search result filtering and sorting
- Score calculation
- Session management

### Property-Based Tests

Sử dụng **fast-check** library cho TypeScript để implement property-based testing.

Mỗi property test sẽ:
- Chạy tối thiểu 100 iterations
- Được annotate với property number từ design document
- Tag format: **Feature: karaoke-tv-web, Property {number}: {property_text}**

**Property Tests to Implement:**
1. Queue add/remove/reorder operations (Properties 1, 2, 3)
2. Navigation grid movement (Property 4)
3. Search result ordering (Property 5)
4. Score range validation (Property 9)
5. Session multi-connection (Property 10)
6. Queue item attribution (Property 11)

### Integration Tests

- WebSocket connection và message flow
- YouTube API integration
- Mobile-TV synchronization
- End-to-end queue management

### E2E Tests

- Full karaoke session flow
- Multi-device connection scenario
- Error recovery scenarios
