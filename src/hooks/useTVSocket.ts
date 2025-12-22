/**
 * TV Socket.io Client Hook
 * Requirements: 4.4, 7.2 - Real-time queue sync and connection events
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@/types/websocket';
import type { Session } from '@/types/session';
import type { QueueItem } from '@/types/queue';
import type { ScoreData, RealTimeFeedback } from '@/types/score';
import { useQueueStore } from '@/stores/queueStore';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * Connection state for the TV socket
 */
export interface TVSocketState {
  /** Whether the socket is connected */
  isConnected: boolean;
  /** Current session info */
  session: Session | null;
  /** Connection error message */
  error: string | null;
  /** Whether we're attempting to reconnect */
  isReconnecting: boolean;
  /** Current score from mobile */
  mobileScore: ScoreData | null;
  /** Real-time feedback from mobile */
  mobileFeedback: RealTimeFeedback | null;
  /** Song that just finished with final score */
  finishedSong: { song: QueueItem; finalScore: ScoreData | null } | null;
}

/**
 * TV Socket hook return type
 */
export interface UseTVSocketReturn extends TVSocketState {
  /** Create a new karaoke session */
  createSession: () => void;
  /** Update the queue on the server */
  updateQueue: (queue: QueueItem[]) => void;
  /** Notify that a song has started playing */
  notifySongStarted: (song: QueueItem) => void;
  /** Notify that a song has ended */
  notifySongEnded: (songId: string, score?: { pitchAccuracy: number; timing: number; totalScore: number }) => void;
  /** Set callback for playback commands from mobile */
  onPlaybackCommand: (callback: (command: 'play' | 'pause' | 'skip') => void) => void;
  /** Clear finished song state */
  clearFinishedSong: () => void;
}

/**
 * Get the WebSocket server URL - same port as page (all-in-one server)
 */
function getServerUrl(): string {
  if (typeof window !== 'undefined') {
    // Connect to same origin (same port as page)
    return window.location.origin;
  }
  return 'http://localhost:3000';
}

/**
 * Custom hook for TV Socket.io client
 * 
 * Handles:
 * - Connection to WebSocket server
 * - Session creation
 * - Queue synchronization
 * - Song playback events
 * - Mobile connection notifications
 */
export function useTVSocket(): UseTVSocketReturn {
  const socketRef = useRef<TypedSocket | null>(null);
  const playbackCallbackRef = useRef<((command: 'play' | 'pause' | 'skip') => void) | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const isInitializedRef = useRef(false);
  
  const [state, setState] = useState<TVSocketState>({
    isConnected: false,
    session: null,
    error: null,
    isReconnecting: false,
    mobileScore: null,
    mobileFeedback: null,
    finishedSong: null,
  });

  // Get queue store actions - use ref to avoid stale closure
  const setQueueRef = useRef(useQueueStore.getState().setQueue);
  
  // Keep ref updated
  useEffect(() => {
    setQueueRef.current = useQueueStore.getState().setQueue;
  });

  /**
   * Initialize socket connection - only once
   */
  useEffect(() => {
    // Prevent double initialization in StrictMode
    if (isInitializedRef.current && socketRef.current) {
      return;
    }
    isInitializedRef.current = true;

    const serverUrl = getServerUrl();
    console.log('[TV Socket] Connecting to:', serverUrl);

    const socket: TypedSocket = io(serverUrl, {
      transports: ['polling', 'websocket'], // Try polling first, faster initial connection
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 10000,
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('[TV Socket] Connected:', socket.id);
      setState((prev) => ({
        ...prev,
        isConnected: true,
        error: null,
        isReconnecting: false,
      }));
      
      // If we had a session before reconnecting, try to rejoin
      if (sessionRef.current) {
        console.log('[TV Socket] Attempting to rejoin session:', sessionRef.current.code);
        // Note: Server may have deleted the session, in which case we'll need to create a new one
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[TV Socket] Disconnected:', reason);
      // Only set reconnecting if it wasn't a manual disconnect
      if (reason !== 'io client disconnect') {
        setState((prev) => ({
          ...prev,
          isConnected: false,
          isReconnecting: true,
        }));
      }
    });

    socket.on('connect_error', (error) => {
      console.error('[TV Socket] Connection error:', error.message);
      setState((prev) => ({
        ...prev,
        error: `Không thể kết nối: ${error.message}`,
        isReconnecting: true,
      }));
    });

    // Session events
    socket.on('session:joined', (session: Session) => {
      console.log('[TV Socket] Session created:', session.code);
      sessionRef.current = session;
      setState((prev) => ({
        ...prev,
        session,
        error: null,
      }));
      // Sync queue from session
      if (session.queue) {
        console.log('[TV Socket] Syncing queue from session:', session.queue.length, 'items');
        setQueueRef.current(session.queue);
      }
    });

    // Queue events
    socket.on('queue:updated', (queue: QueueItem[]) => {
      console.log('[TV Socket] Queue updated:', queue.length, 'items');
      setQueueRef.current(queue);
    });

    // Song events
    socket.on('song:playing', (song: QueueItem) => {
      console.log('[TV Socket] Song playing:', song.song.title);
      // Clear finished song when new song starts
      setState((prev) => ({
        ...prev,
        finishedSong: null,
      }));
    });

    // Song finished event - show final score
    socket.on('song:finished', (data: { song: QueueItem; finalScore: ScoreData | null }) => {
      console.log('[TV Socket] Song finished:', data.song.song.title, 'Score:', data.finalScore?.totalScore);
      setState((prev) => ({
        ...prev,
        finishedSong: data,
      }));
    });

    // Mobile connection events
    socket.on('mobile:connected', (userId: string) => {
      console.log('[TV Socket] Mobile connected:', userId);
    });

    socket.on('mobile:disconnected', (userId: string) => {
      console.log('[TV Socket] Mobile disconnected:', userId);
    });

    // Error events
    socket.on('error', (message: string) => {
      console.error('[TV Socket] Error:', message);
      setState((prev) => ({
        ...prev,
        error: message,
      }));
    });

    // Playback command events from mobile
    socket.on('playback:command', (command: 'play' | 'pause' | 'skip') => {
      console.log('[TV Socket] Playback command:', command);
      if (playbackCallbackRef.current) {
        playbackCallbackRef.current(command);
      }
    });

    // Score events from mobile
    socket.on('score:updated', (score: ScoreData) => {
      console.log('[TV Socket] Score updated:', score.totalScore);
      setState((prev) => ({
        ...prev,
        mobileScore: score,
      }));
    });

    socket.on('score:feedback', (feedback: RealTimeFeedback) => {
      setState((prev) => ({
        ...prev,
        mobileFeedback: feedback,
      }));
    });

    // Cleanup on unmount - but don't disconnect in dev mode
    return () => {
      // In development, React StrictMode will call this
      // We keep the socket alive to prevent reconnection issues
      if (process.env.NODE_ENV === 'production') {
        console.log('[TV Socket] Cleaning up');
        socket.disconnect();
        socketRef.current = null;
        isInitializedRef.current = false;
      }
    };
  }, []); // No dependencies - socket should only be created once

  /**
   * Create a new karaoke session
   */
  const createSession = useCallback(() => {
    if (socketRef.current?.connected) {
      console.log('[TV Socket] Creating session');
      socketRef.current.emit('session:create');
    } else {
      console.warn('[TV Socket] Cannot create session - not connected');
      setState((prev) => ({
        ...prev,
        error: 'Chưa kết nối đến server',
      }));
    }
  }, []);

  /**
   * Update the queue on the server
   */
  const updateQueue = useCallback((queue: QueueItem[]) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('queue:update', queue);
    }
  }, []);

  /**
   * Notify that a song has started playing
   */
  const notifySongStarted = useCallback((song: QueueItem) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('song:started', song);
    }
  }, []);

  /**
   * Notify that a song has ended
   */
  const notifySongEnded = useCallback((songId: string, score?: { pitchAccuracy: number; timing: number; totalScore: number }) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('song:ended', songId, score);
    }
  }, []);

  /**
   * Set callback for playback commands from mobile
   */
  const onPlaybackCommand = useCallback((callback: (command: 'play' | 'pause' | 'skip') => void) => {
    playbackCallbackRef.current = callback;
  }, []);

  /**
   * Clear finished song state
   */
  const clearFinishedSong = useCallback(() => {
    setState((prev) => ({
      ...prev,
      finishedSong: null,
    }));
  }, []);

  return {
    ...state,
    createSession,
    updateQueue,
    notifySongStarted,
    notifySongEnded,
    onPlaybackCommand,
    clearFinishedSong,
  };
}

export default useTVSocket;
