/**
 * Socket.io Event Handlers
 * Requirements: 4.4, 7.2 - Real-time queue sync and connection events
 */

import { Server, Socket } from 'socket.io';
import { SessionStore } from './sessionStore';
import { 
  ClientToServerEvents, 
  ServerToClientEvents 
} from '../types/websocket';
import { QueueItem } from '../types/queue';
import { Song } from '../types/song';
import { ScoreData } from '../types/score';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

/**
 * Setup all socket event handlers
 */
export function setupSocketHandlers(io: TypedServer, sessionStore: SessionStore): void {
  io.on('connection', (socket: TypedSocket) => {
    console.log(`Client connected: ${socket.id}`);

    // ==========================================
    // TV Events
    // ==========================================

    /**
     * TV creates a new session
     * Requirements: 4.1 - Display QR code and session code
     */
    socket.on('session:create', () => {
      const session = sessionStore.createSession(socket.id);
      
      // Join socket room for this session
      socket.join(session.id);
      
      // Send session info back to TV
      socket.emit('session:joined', session);
      
      console.log(`Session created: ${session.code} (${session.id})`);
    });

    /**
     * TV updates the queue state
     * Requirements: 4.4 - Real-time queue sync
     */
    socket.on('queue:update', (queue: QueueItem[]) => {
      const session = sessionStore.getSessionBySocket(socket.id);
      if (!session) {
        socket.emit('error', 'Session not found');
        return;
      }

      sessionStore.updateQueue(session.id, queue);
      
      // Broadcast to all clients in session (except sender)
      socket.to(session.id).emit('queue:updated', queue);
    });

    /**
     * TV notifies that a song has started playing
     * Requirements: 4.4 - Song playback events
     */
    socket.on('song:started', (song: QueueItem) => {
      const session = sessionStore.getSessionBySocket(socket.id);
      if (!session) {
        socket.emit('error', 'Session not found');
        return;
      }

      sessionStore.setCurrentSong(session.id, song);
      
      // Update song status in queue
      const updatedQueue = session.queue.map(item => 
        item.id === song.id 
          ? { ...item, status: 'playing' as const }
          : item
      );
      sessionStore.updateQueue(session.id, updatedQueue);
      
      // Broadcast to all clients in session
      io.to(session.id).emit('song:playing', song);
      io.to(session.id).emit('queue:updated', updatedQueue);
    });

    /**
     * TV notifies that a song has ended
     * Requirements: 4.4, 7.4 - Song playback events and session summary tracking
     */
    socket.on('song:ended', (songId: string, score?: ScoreData) => {
      const session = sessionStore.getSessionBySocket(socket.id);
      if (!session) {
        socket.emit('error', 'Session not found');
        return;
      }

      // Find the completed song in the queue
      const completedSong = session.queue.find(item => item.id === songId);
      
      // Record the completed song with score for session summary
      if (completedSong) {
        sessionStore.recordCompletedSong(session.id, completedSong, score || null);
      }

      // Update song status to completed
      const updatedQueue = session.queue.map(item =>
        item.id === songId
          ? { ...item, status: 'completed' as const }
          : item
      );
      sessionStore.updateQueue(session.id, updatedQueue);
      sessionStore.setCurrentSong(session.id, null);
      
      // Clear primary scorer for next song (allow different mobile to score)
      sessionStore.clearPrimaryScorer(session.id);
      
      // Broadcast updated queue
      io.to(session.id).emit('queue:updated', updatedQueue);
      
      console.log(`Song ended: ${songId}${score ? ` with score ${score.totalScore}` : ''}`);
    });

    // ==========================================
    // Mobile Events
    // ==========================================

    /**
     * Mobile joins an existing session
     * Requirements: 4.2 - Join session by QR code/code
     */
    socket.on('session:join', (code: string) => {
      const session = sessionStore.joinSession(code, socket.id);
      
      if (!session) {
        socket.emit('error', 'Invalid session code');
        return;
      }

      // Join socket room for this session
      socket.join(session.id);
      
      // Send session info to mobile
      socket.emit('session:joined', session);
      
      // Notify TV and other mobiles that a new device connected
      socket.to(session.id).emit('mobile:connected', socket.id);
      
      console.log(`Mobile joined session: ${code} (socket: ${socket.id})`);
    });

    /**
     * Mobile adds a song to the queue
     * Requirements: 4.4, 7.3 - Add song with user attribution
     */
    socket.on('queue:add', (song: Song) => {
      const session = sessionStore.getSessionBySocket(socket.id);
      if (!session) {
        socket.emit('error', 'Session not found');
        return;
      }

      // Add song with user attribution (socket.id as user identifier)
      const queueItem = sessionStore.addToQueue(session.id, song, socket.id);
      if (!queueItem) {
        socket.emit('error', 'Failed to add song to queue');
        return;
      }

      // Broadcast updated queue to all clients
      const updatedSession = sessionStore.getSession(session.id);
      if (updatedSession) {
        io.to(session.id).emit('queue:updated', updatedSession.queue);
      }
      
      console.log(`Song added to queue: ${song.title} by ${socket.id}`);
    });

    /**
     * Mobile removes a song from the queue
     * Requirements: 3.4 - Remove song from queue
     */
    socket.on('queue:remove', (itemId: string) => {
      const session = sessionStore.getSessionBySocket(socket.id);
      if (!session) {
        socket.emit('error', 'Session not found');
        return;
      }

      const removed = sessionStore.removeFromQueue(session.id, itemId);
      if (!removed) {
        socket.emit('error', 'Failed to remove song from queue');
        return;
      }

      // Broadcast updated queue to all clients
      const updatedSession = sessionStore.getSession(session.id);
      if (updatedSession) {
        io.to(session.id).emit('queue:updated', updatedSession.queue);
      }
      
      console.log(`Song removed from queue: ${itemId}`);
    });

    /**
     * Mobile reorders a song in the queue
     */
    socket.on('queue:reorder', (itemId: string, newIndex: number) => {
      try {
        console.log(`[Reorder] Request: itemId=${itemId}, newIndex=${newIndex}`);
        
        const session = sessionStore.getSessionBySocket(socket.id);
        if (!session) {
          socket.emit('error', 'Session not found');
          return;
        }

        // Find the item and reorder
        const waitingItems = session.queue.filter(item => item.status === 'waiting');
        const itemIndex = waitingItems.findIndex(item => item.id === itemId);
        
        console.log(`[Reorder] Found item at index ${itemIndex}, total waiting: ${waitingItems.length}`);
        
        if (itemIndex === -1 || newIndex < 0 || newIndex >= waitingItems.length) {
          socket.emit('error', 'Invalid reorder request');
          return;
        }

        // Remove item from current position
        const [item] = waitingItems.splice(itemIndex, 1);
        // Insert at new position
        waitingItems.splice(newIndex, 0, item);
        
        // Rebuild queue with non-waiting items first, then reordered waiting items
        const nonWaitingItems = session.queue.filter(item => item.status !== 'waiting');
        const newQueue = [...nonWaitingItems, ...waitingItems];
        
        sessionStore.updateQueue(session.id, newQueue);

        // Broadcast updated queue to all clients
        io.to(session.id).emit('queue:updated', newQueue);
        
        console.log(`Song reordered: ${itemId} to position ${newIndex}`);
      } catch (err) {
        console.error('[Reorder] Error:', err);
        socket.emit('error', 'Failed to reorder queue');
      }
    });

    /**
     * Mobile requests to play/start the queue
     */
    socket.on('playback:play', () => {
      const session = sessionStore.getSessionBySocket(socket.id);
      if (!session) {
        socket.emit('error', 'Session not found');
        return;
      }

      // Send play command to TV
      io.to(session.id).emit('playback:command', 'play');
      console.log(`Playback play requested for session: ${session.code}`);
    });

    /**
     * Mobile requests to pause playback
     */
    socket.on('playback:pause', () => {
      const session = sessionStore.getSessionBySocket(socket.id);
      if (!session) {
        socket.emit('error', 'Session not found');
        return;
      }

      // Send pause command to TV
      io.to(session.id).emit('playback:command', 'pause');
      console.log(`Playback pause requested for session: ${session.code}`);
    });

    /**
     * Mobile requests to skip current song
     */
    socket.on('playback:skip', () => {
      const session = sessionStore.getSessionBySocket(socket.id);
      if (!session) {
        socket.emit('error', 'Session not found');
        return;
      }

      // Send skip command to TV
      io.to(session.id).emit('playback:command', 'skip');
      console.log(`Playback skip requested for session: ${session.code}`);
    });

    /**
     * Mobile pings to check if session is still alive
     * Returns TV online status and mobile count
     */
    socket.on('session:ping', () => {
      const session = sessionStore.getSessionBySocket(socket.id);
      if (!session) {
        socket.emit('session:pong', { tvOnline: false, mobileCount: 0 });
        return;
      }

      // Check if TV socket is still in the session
      const tvSocket = io.sockets.sockets.get(session.tvSocketId);
      const tvOnline = !!tvSocket?.connected;
      
      socket.emit('session:pong', { 
        tvOnline, 
        mobileCount: session.mobileConnections.length 
      });
    });

    /**
     * Mobile sends real-time score update
     * Only the first mobile to send score becomes the primary scorer
     */
    socket.on('score:update', (score: ScoreData) => {
      const session = sessionStore.getSessionBySocket(socket.id);
      if (!session) return;

      // Check if this mobile can score (first one or already primary)
      if (!sessionStore.isPrimaryScorer(session.id, socket.id)) {
        // Not the primary scorer - ignore silently
        return;
      }
      
      // Set as primary scorer if not already set
      sessionStore.setPrimaryScorer(session.id, socket.id);

      // Forward score to TV
      io.to(session.id).emit('score:updated', score);
    });

    /**
     * Mobile sends real-time feedback
     */
    socket.on('score:feedback', (feedback: any) => {
      const session = sessionStore.getSessionBySocket(socket.id);
      if (!session) return;

      // Only primary scorer can send feedback
      if (!sessionStore.isPrimaryScorer(session.id, socket.id)) {
        return;
      }

      // Forward feedback to TV
      io.to(session.id).emit('score:feedback', feedback);
    });

    // ==========================================
    // Connection Events
    // ==========================================

    /**
     * Handle client disconnection
     * Requirements: 7.2 - Connection events
     */
    socket.on('disconnect', () => {
      // Get session info BEFORE handling disconnect (which may cleanup)
      const session = sessionStore.getSessionBySocket(socket.id);
      
      if (session) {
        const isTv = session.tvSocketId === socket.id;
        
        if (isTv) {
          // TV disconnected - notify all mobiles BEFORE cleanup
          console.log(`TV disconnected, notifying mobiles in session ${session.code}`);
          
          // Emit to all mobile sockets directly (not via room since we're about to cleanup)
          session.mobileConnections.forEach(mobileSocketId => {
            const mobileSocket = io.sockets.sockets.get(mobileSocketId);
            if (mobileSocket) {
              mobileSocket.emit('session:ended');
              mobileSocket.emit('error', 'TV đã ngắt kết nối - phiên kết thúc');
            }
          });
          
          console.log(`TV disconnected, session ${session.code} ended`);
        }
      }
      
      // Now handle the disconnect (cleanup)
      const { session: cleanedSession, isTv, userId } = sessionStore.handleDisconnect(socket.id);
      
      if (cleanedSession && !isTv && userId) {
        // Mobile disconnected - notify others
        socket.to(cleanedSession.id).emit('mobile:disconnected', userId);
        console.log(`Mobile disconnected: ${userId}`);
      }
      
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
}
