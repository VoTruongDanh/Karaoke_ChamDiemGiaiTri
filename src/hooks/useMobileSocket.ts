/**
 * Mobile Socket.io Client Hook
 * Requirements: 4.4, 4.6 - Real-time queue sync and automatic reconnection
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@/types/websocket';
import type { Session } from '@/types/session';
import type { QueueItem } from '@/types/queue';
import type { Song } from '@/types/song';
import type { ScoreData } from '@/types/score';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * Connection state for the mobile socket
 */
export interface MobileSocketState {
  /** Whether the socket is connected to server */
  isConnected: boolean;
  /** Whether joined to a session */
  isJoined: boolean;
  /** Whether TV is online */
  isTvOnline: boolean;
  /** Current session info */
  session: Session | null;
  /** Current queue from server */
  queue: QueueItem[];
  /** Currently playing song */
  currentSong: QueueItem | null;
  /** Song that just finished with final score */
  finishedSong: { song: QueueItem; finalScore: ScoreData | null } | null;
  /** Connection error message */
  error: string | null;
  /** Whether we're attempting to reconnect */
  isReconnecting: boolean;
}

/**
 * Mobile Socket hook return type
 */
export interface UseMobileSocketReturn extends MobileSocketState {
  /** Join a session by code */
  joinSession: (code: string) => void;
  /** Add a song to the queue */
  addToQueue: (song: Song) => void;
  /** Remove a song from the queue */
  removeFromQueue: (itemId: string) => void;
  /** Reorder a song in the queue */
  reorderQueue: (itemId: string, newIndex: number) => void;
  /** Request to play/start the queue */
  requestPlay: () => void;
  /** Request to pause playback */
  requestPause: () => void;
  /** Request to skip current song */
  requestSkip: () => void;
  /** Send score update to TV */
  sendScore: (score: { pitchAccuracy: number; timing: number; totalScore: number }) => void;
  /** Send real-time feedback to TV */
  sendFeedback: (feedback: { currentPitch: number; targetPitch: number; accuracy: 'perfect' | 'good' | 'ok' | 'miss' }) => void;
  /** Clear finished song state */
  clearFinishedSong: () => void;
  /** Disconnect from the session */
  disconnect: () => void;
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
 * Check if WebSocket server is reachable
 */
async function checkServerReachable(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(`${url}/api/health`, { 
      signal: controller.signal,
      mode: 'cors',
    });
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Custom hook for Mobile Socket.io client
 * 
 * Handles:
 * - Connection to WebSocket server
 * - Session joining by code
 * - Queue add/remove operations
 * - Real-time state synchronization
 * - Automatic reconnection
 */
export function useMobileSocket(): UseMobileSocketReturn {
  const socketRef = useRef<TypedSocket | null>(null);
  const sessionCodeRef = useRef<string | null>(null);
  const isInitializedRef = useRef(false);
  const pendingJoinRef = useRef<string | null>(null);
  const isJoinedRef = useRef(false);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPongRef = useRef<number>(Date.now());
  
  const [state, setState] = useState<MobileSocketState>({
    isConnected: false,
    isJoined: false,
    isTvOnline: true,
    session: null,
    queue: [],
    currentSong: null,
    finishedSong: null,
    error: null,
    isReconnecting: false,
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
    console.log('[Mobile Socket] Connecting to:', serverUrl);

    // Check server reachability first (helps with HTTPS cert issues)
    checkServerReachable(serverUrl).then(reachable => {
      if (!reachable) {
        console.warn('[Mobile Socket] Server not reachable, may need to accept certificate');
      }
    });

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
      console.log('[Mobile Socket] Connected:', socket.id);
      setState((prev) => ({
        ...prev,
        isConnected: true,
        error: null,
        isReconnecting: false,
      }));

      // Auto-rejoin session if we have a code
      if (sessionCodeRef.current) {
        console.log('[Mobile Socket] Auto-rejoining session:', sessionCodeRef.current);
        socket.emit('session:join', sessionCodeRef.current);
      }
      
      // If there's a pending join request, execute it now
      if (pendingJoinRef.current) {
        console.log('[Mobile Socket] Executing pending join:', pendingJoinRef.current);
        socket.emit('session:join', pendingJoinRef.current);
        sessionCodeRef.current = pendingJoinRef.current;
        pendingJoinRef.current = null;
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[Mobile Socket] Disconnected:', reason);
      setState((prev) => ({
        ...prev,
        isConnected: false,
        isReconnecting: reason !== 'io client disconnect',
      }));
    });

    socket.on('connect_error', (error) => {
      console.error('[Mobile Socket] Connection error:', error.message);
      setState((prev) => ({
        ...prev,
        error: `Không thể kết nối: ${error.message}`,
        isReconnecting: true,
      }));
    });

    // Session events
    socket.on('session:joined', (session: Session) => {
      console.log('[Mobile Socket] Joined session:', session.code);
      isJoinedRef.current = true;
      lastPongRef.current = Date.now();
      setState((prev) => ({
        ...prev,
        isJoined: true,
        isTvOnline: true,
        session,
        queue: session.queue || [],
        currentSong: session.currentSong || null,
        error: null,
      }));
      
      // Start ping interval to check session health
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      pingIntervalRef.current = setInterval(() => {
        if (socketRef.current?.connected && isJoinedRef.current) {
          socketRef.current.emit('session:ping' as keyof ClientToServerEvents);
        }
      }, 15000); // Ping every 15 seconds
    });

    // Session ping response
    socket.on('session:pong', (data: { tvOnline: boolean; mobileCount: number }) => {
      lastPongRef.current = Date.now();
      
      if (data.tvOnline) {
        // TV is online - clear any error about TV disconnection
        setState((prev) => ({
          ...prev,
          isTvOnline: true,
          error: prev.error === 'TV đã ngắt kết nối' || prev.error === 'Mất kết nối với TV' ? null : prev.error,
        }));
      } else if (isJoinedRef.current) {
        // TV is offline
        setState((prev) => ({
          ...prev,
          isTvOnline: false,
          error: 'TV đã ngắt kết nối',
        }));
      }
    });

    // Session ended (TV disconnected)
    socket.on('session:ended', () => {
      console.log('[Mobile Socket] Session ended - TV disconnected');
      isJoinedRef.current = false;
      sessionCodeRef.current = null; // Clear saved code so we don't auto-rejoin
      
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      
      // Clear localStorage
      try {
        localStorage.removeItem('karaoke_session_code');
      } catch {}
      
      setState((prev) => ({
        ...prev,
        isJoined: false,
        isTvOnline: false,
        session: null,
        queue: [],
        currentSong: null,
        error: 'TV đã ngắt kết nối - phiên kết thúc',
      }));
    });

    // Queue events - debounce rapid updates
    let queueUpdateTimeout: NodeJS.Timeout | null = null;
    let pendingQueue: QueueItem[] | null = null;
    
    socket.on('queue:updated', (queue: QueueItem[]) => {
      console.log('[Mobile Socket] Queue updated:', queue.length, 'items');
      
      // Debounce rapid queue updates (e.g., during reorder)
      pendingQueue = queue;
      if (queueUpdateTimeout) {
        clearTimeout(queueUpdateTimeout);
      }
      queueUpdateTimeout = setTimeout(() => {
        if (pendingQueue) {
          setState((prev) => ({
            ...prev,
            queue: pendingQueue!,
          }));
          pendingQueue = null;
        }
      }, 100); // 100ms debounce
    });

    // Song events
    socket.on('song:playing', (song: QueueItem) => {
      console.log('[Mobile Socket] Song playing:', song.song.title);
      setState((prev) => ({
        ...prev,
        currentSong: song,
        finishedSong: null, // Clear finished song when new song starts
      }));
    });

    // Song finished event - show final score
    socket.on('song:finished', (data: { song: QueueItem; finalScore: ScoreData | null }) => {
      console.log('[Mobile Socket] Song finished:', data.song.song.title, 'Score:', data.finalScore?.totalScore);
      setState((prev) => {
        console.log('[Mobile Socket] Current state before update - currentSong:', prev.currentSong?.song.title);
        return {
          ...prev,
          currentSong: null,
          finishedSong: data,
        };
      });
    });

    // Mobile connection events
    socket.on('mobile:connected', (userId: string) => {
      console.log('[Mobile Socket] Another mobile connected:', userId);
    });

    socket.on('mobile:disconnected', (userId: string) => {
      console.log('[Mobile Socket] Another mobile disconnected:', userId);
    });

    // Error events
    socket.on('error', (message: string) => {
      console.error('[Mobile Socket] Error:', message);
      setState((prev) => ({
        ...prev,
        error: message,
        // If session not found, reset joined state
        isJoined: message.includes('Session') ? false : prev.isJoined,
      }));
    });

    // Cleanup on unmount - but don't disconnect in dev mode
    return () => {
      // Clear ping interval
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      
      // In development, React StrictMode will call this
      // We keep the socket alive to prevent reconnection issues
      if (process.env.NODE_ENV === 'production') {
        console.log('[Mobile Socket] Cleaning up');
        socket.disconnect();
        socketRef.current = null;
        isInitializedRef.current = false;
      }
    };
  }, []);

  /**
   * Join a session by code
   */
  const joinSession = useCallback((code: string) => {
    if (!socketRef.current) {
      setState((prev) => ({
        ...prev,
        error: 'Socket chưa được khởi tạo',
      }));
      return;
    }

    // Store code for auto-rejoin
    sessionCodeRef.current = code;

    if (socketRef.current.connected) {
      console.log('[Mobile Socket] Joining session:', code);
      socketRef.current.emit('session:join', code);
    } else {
      // Socket not connected yet, queue the join request
      console.log('[Mobile Socket] Socket not connected, queuing join request:', code);
      pendingJoinRef.current = code;
      setState((prev) => ({
        ...prev,
        error: null, // Clear error, we're waiting for connection
        isReconnecting: true,
      }));
      
      // Force reconnect if disconnected
      if (socketRef.current.disconnected) {
        socketRef.current.connect();
      }
    }
  }, []);

  /**
   * Add a song to the queue
   */
  const addToQueue = useCallback((song: Song) => {
    console.log('[Mobile Socket] addToQueue called:', song.title, 'connected:', socketRef.current?.connected, 'joined:', isJoinedRef.current);
    
    if (!socketRef.current) {
      console.warn('[Mobile Socket] Cannot add song - socket not initialized');
      return;
    }
    
    if (!socketRef.current.connected) {
      console.warn('[Mobile Socket] Cannot add song - not connected');
      return;
    }
    
    if (!isJoinedRef.current) {
      console.warn('[Mobile Socket] Cannot add song - not joined to session');
      return;
    }
    
    console.log('[Mobile Socket] Emitting queue:add for:', song.title);
    socketRef.current.emit('queue:add', song);
  }, []);

  /**
   * Remove a song from the queue
   */
  const removeFromQueue = useCallback((itemId: string) => {
    if (socketRef.current?.connected && isJoinedRef.current) {
      console.log('[Mobile Socket] Removing song:', itemId);
      socketRef.current.emit('queue:remove', itemId);
    } else {
      console.warn('[Mobile Socket] Cannot remove song - not connected or not joined');
    }
  }, []);

  /**
   * Reorder a song in the queue
   */
  const reorderQueue = useCallback((itemId: string, newIndex: number) => {
    console.log('[Mobile Socket] reorderQueue called:', itemId, newIndex);
    console.log('[Mobile Socket] connected:', socketRef.current?.connected, 'joined:', isJoinedRef.current);
    
    if (socketRef.current?.connected && isJoinedRef.current) {
      console.log('[Mobile Socket] Emitting queue:reorder');
      socketRef.current.emit('queue:reorder', itemId, newIndex);
    } else {
      console.warn('[Mobile Socket] Cannot reorder - not connected or not joined');
    }
  }, []);

  /**
   * Request to play/start the queue
   */
  const requestPlay = useCallback(() => {
    if (socketRef.current?.connected && isJoinedRef.current) {
      console.log('[Mobile Socket] Requesting play');
      socketRef.current.emit('playback:play' as keyof ClientToServerEvents);
    }
  }, []);

  /**
   * Request to pause playback
   */
  const requestPause = useCallback(() => {
    if (socketRef.current?.connected && isJoinedRef.current) {
      console.log('[Mobile Socket] Requesting pause');
      socketRef.current.emit('playback:pause' as keyof ClientToServerEvents);
    }
  }, []);

  /**
   * Request to skip current song
   */
  const requestSkip = useCallback(() => {
    if (socketRef.current?.connected && isJoinedRef.current) {
      console.log('[Mobile Socket] Requesting skip');
      socketRef.current.emit('playback:skip' as keyof ClientToServerEvents);
    }
  }, []);

  /**
   * Disconnect from the session
   */
  const disconnect = useCallback(() => {
    sessionCodeRef.current = null;
    isJoinedRef.current = false;
    
    // Clear ping interval
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    setState({
      isConnected: false,
      isJoined: false,
      isTvOnline: true,
      session: null,
      queue: [],
      currentSong: null,
      finishedSong: null,
      error: null,
      isReconnecting: false,
    });
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

  /**
   * Send score update to TV - throttled to prevent spam
   */
  const lastScoreSentRef = useRef<number>(0);
  const lastScoreValueRef = useRef<number>(0);
  
  const sendScore = useCallback((score: { pitchAccuracy: number; timing: number; totalScore: number }) => {
    if (socketRef.current?.connected && isJoinedRef.current) {
      const now = Date.now();
      // Throttle: only send if 500ms passed OR score changed significantly (>2 points)
      const timeSinceLastSend = now - lastScoreSentRef.current;
      const scoreDiff = Math.abs(score.totalScore - lastScoreValueRef.current);
      
      if (timeSinceLastSend >= 500 || scoreDiff >= 2) {
        socketRef.current.emit('score:update' as keyof ClientToServerEvents, score);
        lastScoreSentRef.current = now;
        lastScoreValueRef.current = score.totalScore;
      }
    }
  }, []);

  /**
   * Send real-time feedback to TV
   */
  const sendFeedback = useCallback((feedback: { currentPitch: number; targetPitch: number; accuracy: 'perfect' | 'good' | 'ok' | 'miss' }) => {
    if (socketRef.current?.connected && isJoinedRef.current) {
      socketRef.current.emit('score:feedback' as keyof ClientToServerEvents, feedback);
    }
  }, []);

  return {
    ...state,
    joinSession,
    addToQueue,
    removeFromQueue,
    reorderQueue,
    requestPlay,
    requestPause,
    requestSkip,
    sendScore,
    sendFeedback,
    clearFinishedSong,
    disconnect,
  };
}

export default useMobileSocket;
