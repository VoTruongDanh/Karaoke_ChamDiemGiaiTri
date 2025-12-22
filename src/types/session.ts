import { QueueItem } from './queue';
import { ScoreData } from './score';

/**
 * Record of a completed song with its score
 * Requirements: 7.4 - Track completed songs and scores for session summary
 */
export interface CompletedSongRecord {
  /** The queue item that was completed */
  queueItem: QueueItem;
  /** Score achieved (if scoring was enabled) */
  score: ScoreData | null;
  /** Timestamp when the song was completed */
  completedAt: Date;
}

/**
 * Session summary displayed at the end of a karaoke session
 * Requirements: 7.4 - Display summary of songs sung and scores
 */
export interface SessionSummary {
  /** Total number of songs sung */
  totalSongs: number;
  /** List of completed songs with scores */
  completedSongs: CompletedSongRecord[];
  /** Session duration in milliseconds */
  duration: number;
  /** Average score across all scored songs */
  averageScore: number | null;
  /** Highest score achieved */
  highestScore: CompletedSongRecord | null;
}

/**
 * Session representing a karaoke session between TV and mobile devices
 * Requirements: 4.1, 4.2, 7.1, 7.4
 */
export interface Session {
  /** Unique session identifier */
  id: string;
  /** 6-digit code for manual entry from mobile */
  code: string;
  /** Socket ID of the TV client */
  tvSocketId: string;
  /** Socket IDs of connected mobile controllers */
  mobileConnections: string[];
  /** Current song queue */
  queue: QueueItem[];
  /** Currently playing song */
  currentSong: QueueItem | null;
  /** Session creation timestamp */
  createdAt: Date;
  /** Completed songs with scores for session summary */
  completedSongs?: CompletedSongRecord[];
}

/**
 * Session manager interface for server-side session handling
 */
export interface SessionManager {
  /**
   * Create a new karaoke session
   * @returns The created session
   */
  createSession(): Session;
  
  /**
   * Join an existing session by code
   * @param code - The 6-digit session code
   * @param socketId - The socket ID of the joining client
   * @returns True if joined successfully
   */
  joinSession(code: string, socketId: string): boolean;
  
  /**
   * Add a song to a session's queue
   * @param sessionId - The session ID
   * @param song - The song to add
   */
  addToQueue(sessionId: string, song: import('./song').Song): void;
  
  /**
   * Get the next song from a session's queue
   * @param sessionId - The session ID
   * @returns The next queue item or null
   */
  getNextSong(sessionId: string): QueueItem | null;
}

/**
 * Session state for server-side storage
 */
export interface SessionState {
  /** Map of session ID to session */
  sessions: Map<string, Session>;
  /** Map of socket ID to session ID */
  socketToSession: Map<string, string>;
}
