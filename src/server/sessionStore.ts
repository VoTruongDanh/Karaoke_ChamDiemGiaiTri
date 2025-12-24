/**
 * Session Store - Server-side session management
 * Requirements: 4.1, 4.2, 7.1, 7.4 - Session creation, joining, multi-connection support, and session summary
 */

import { Session, CompletedSongRecord } from '../types/session';
import { QueueItem } from '../types/queue';
import { Song } from '../types/song';
import { ScoreData } from '../types/score';

/**
 * Generate a random 4-digit session code
 */
function generateSessionCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  // Simple ID generation without external dependency
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
}

/**
 * SessionStore manages all active karaoke sessions
 */
export class SessionStore {
  /** Map of session ID to session */
  private sessions: Map<string, Session> = new Map();
  
  /** Map of socket ID to session ID */
  private socketToSession: Map<string, string> = new Map();
  
  /** Map of session code to session ID for quick lookup */
  private codeToSession: Map<string, string> = new Map();
  
  /** Map of session ID to primary scorer socket ID (only one mobile can score) */
  private primaryScorer: Map<string, string> = new Map();

  /**
   * Create a new karaoke session
   * @param tvSocketId - The socket ID of the TV client
   * @returns The created session
   */
  createSession(tvSocketId: string): Session {
    // Generate unique code (ensure no collision)
    let code = generateSessionCode();
    while (this.codeToSession.has(code)) {
      code = generateSessionCode();
    }

    const session: Session = {
      id: generateId(),
      code,
      tvSocketId,
      mobileConnections: [],
      queue: [],
      currentSong: null,
      createdAt: new Date(),
      completedSongs: [],
    };

    this.sessions.set(session.id, session);
    this.socketToSession.set(tvSocketId, session.id);
    this.codeToSession.set(code, session.id);

    return session;
  }

  /**
   * Join an existing session by code
   * @param code - The 4-digit session code
   * @param socketId - The socket ID of the joining mobile client
   * @returns The session if joined successfully, null otherwise
   */
  joinSession(code: string, socketId: string): Session | null {
    const sessionId = this.codeToSession.get(code);
    if (!sessionId) {
      return null;
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    // Add mobile connection if not already connected
    if (!session.mobileConnections.includes(socketId)) {
      session.mobileConnections.push(socketId);
    }
    
    this.socketToSession.set(socketId, sessionId);
    return session;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): Session | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Get session by socket ID
   */
  getSessionBySocket(socketId: string): Session | null {
    const sessionId = this.socketToSession.get(socketId);
    if (!sessionId) return null;
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Get session by code
   */
  getSessionByCode(code: string): Session | null {
    const sessionId = this.codeToSession.get(code);
    if (!sessionId) return null;
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Add a song to a session's queue
   * @param sessionId - The session ID
   * @param song - The song to add
   * @param addedBy - User identifier who added the song
   * @returns The created queue item
   */
  addToQueue(sessionId: string, song: Song, addedBy: string): QueueItem | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const queueItem: QueueItem = {
      id: generateId(),
      song,
      addedBy,
      addedAt: new Date(),
      status: 'waiting',
    };

    session.queue.push(queueItem);
    return queueItem;
  }

  /**
   * Remove a song from a session's queue
   * @param sessionId - The session ID
   * @param itemId - The queue item ID to remove
   * @returns True if removed successfully
   */
  removeFromQueue(sessionId: string, itemId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const index = session.queue.findIndex(item => item.id === itemId);
    if (index === -1) return false;

    session.queue.splice(index, 1);
    return true;
  }

  /**
   * Update the queue for a session
   * @param sessionId - The session ID
   * @param queue - The new queue state
   */
  updateQueue(sessionId: string, queue: QueueItem[]): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.queue = queue;
    return true;
  }

  /**
   * Set the current playing song
   * @param sessionId - The session ID
   * @param song - The queue item now playing
   */
  setCurrentSong(sessionId: string, song: QueueItem | null): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.currentSong = song;
    return true;
  }

  /**
   * Get the next song from a session's queue
   * @param sessionId - The session ID
   * @returns The next queue item or null
   */
  getNextSong(sessionId: string): QueueItem | null {
    const session = this.sessions.get(sessionId);
    if (!session || session.queue.length === 0) return null;

    // Find first waiting song
    return session.queue.find(item => item.status === 'waiting') || null;
  }

  /**
   * Record a completed song with its score
   * Requirements: 7.4 - Track completed songs and scores for session summary
   * @param sessionId - The session ID
   * @param queueItem - The completed queue item
   * @param score - The score achieved (optional)
   */
  recordCompletedSong(sessionId: string, queueItem: QueueItem, score: ScoreData | null): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const completedRecord: CompletedSongRecord = {
      queueItem,
      score,
      completedAt: new Date(),
    };

    if (!session.completedSongs) {
      session.completedSongs = [];
    }
    session.completedSongs.push(completedRecord);
    return true;
  }

  /**
   * Get session summary
   * Requirements: 7.4 - Display summary of songs sung and scores
   * @param sessionId - The session ID
   */
  getSessionSummary(sessionId: string): { 
    totalSongs: number; 
    completedSongs: CompletedSongRecord[]; 
    duration: number;
    averageScore: number | null;
    highestScore: CompletedSongRecord | null;
  } | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const completedSongs = session.completedSongs || [];
    const scoredSongs = completedSongs.filter(s => s.score !== null);
    
    let averageScore: number | null = null;
    let highestScore: CompletedSongRecord | null = null;

    if (scoredSongs.length > 0) {
      const totalScore = scoredSongs.reduce((sum, s) => sum + (s.score?.totalScore || 0), 0);
      averageScore = Math.round(totalScore / scoredSongs.length);
      
      highestScore = scoredSongs.reduce((highest, current) => {
        if (!highest || (current.score?.totalScore || 0) > (highest.score?.totalScore || 0)) {
          return current;
        }
        return highest;
      }, null as CompletedSongRecord | null);
    }

    return {
      totalSongs: completedSongs.length,
      completedSongs,
      duration: Date.now() - session.createdAt.getTime(),
      averageScore,
      highestScore,
    };
  }

  /**
   * Handle socket disconnection
   * @param socketId - The disconnected socket ID
   * @returns Object with session and whether it was TV or mobile
   */
  handleDisconnect(socketId: string): { session: Session | null; isTv: boolean; userId: string | null } {
    const sessionId = this.socketToSession.get(socketId);
    if (!sessionId) {
      return { session: null, isTv: false, userId: null };
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      this.socketToSession.delete(socketId);
      return { session: null, isTv: false, userId: null };
    }

    // Check if it's the TV disconnecting
    if (session.tvSocketId === socketId) {
      // TV disconnected - clean up entire session
      this.cleanupSession(session);
      return { session, isTv: true, userId: null };
    }

    // Mobile disconnected
    const mobileIndex = session.mobileConnections.indexOf(socketId);
    if (mobileIndex !== -1) {
      session.mobileConnections.splice(mobileIndex, 1);
    }
    this.socketToSession.delete(socketId);
    
    // Clear primary scorer if this mobile was the scorer
    if (this.primaryScorer.get(sessionId) === socketId) {
      this.primaryScorer.delete(sessionId);
      console.log(`Primary scorer disconnected for session ${sessionId}`);
    }

    return { session, isTv: false, userId: socketId };
  }

  /**
   * Clean up a session and all its references
   */
  private cleanupSession(session: Session): void {
    // Remove all socket mappings
    this.socketToSession.delete(session.tvSocketId);
    session.mobileConnections.forEach(socketId => {
      this.socketToSession.delete(socketId);
    });

    // Remove session and primary scorer
    this.codeToSession.delete(session.code);
    this.primaryScorer.delete(session.id);
    this.sessions.delete(session.id);
  }

  /**
   * Get the number of active sessions
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Get all socket IDs for a session (TV + mobiles)
   */
  getSessionSockets(sessionId: string): string[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    return [session.tvSocketId, ...session.mobileConnections];
  }
  
  /**
   * Set primary scorer for a session (first mobile to send score)
   * @param sessionId - The session ID
   * @param socketId - The mobile socket ID
   * @returns True if set successfully (first scorer), false if already set
   */
  setPrimaryScorer(sessionId: string, socketId: string): boolean {
    // If no primary scorer yet, set this one
    if (!this.primaryScorer.has(sessionId)) {
      this.primaryScorer.set(sessionId, socketId);
      console.log(`Primary scorer set for session ${sessionId}: ${socketId}`);
      return true;
    }
    // Already has a primary scorer
    return this.primaryScorer.get(sessionId) === socketId;
  }
  
  /**
   * Check if a socket is the primary scorer for a session
   */
  isPrimaryScorer(sessionId: string, socketId: string): boolean {
    const primary = this.primaryScorer.get(sessionId);
    // If no primary set yet, allow (will be set on first score)
    if (!primary) return true;
    return primary === socketId;
  }
  
  /**
   * Get primary scorer for a session
   */
  getPrimaryScorer(sessionId: string): string | null {
    return this.primaryScorer.get(sessionId) || null;
  }
  
  /**
   * Clear primary scorer (when song ends or scorer disconnects)
   */
  clearPrimaryScorer(sessionId: string): void {
    this.primaryScorer.delete(sessionId);
    console.log(`Primary scorer cleared for session ${sessionId}`);
  }
