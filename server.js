/**
 * Custom HTTPS server for Next.js + Socket.io
 * Runs both on same port - only need to accept 1 certificate
 */

const { createServer: createHttpsServer } = require('https');
const { createServer: createHttpServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

// Check for SSL certificates
const certDir = path.join(__dirname, 'certs');
const keyFile = path.join(certDir, 'localhost-key.pem');
const certFile = path.join(certDir, 'localhost.pem');

const useHttps = fs.existsSync(keyFile) && fs.existsSync(certFile);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// ==========================================
// Session Store (inline for simplicity)
// ==========================================
class SessionStore {
  constructor() {
    this.sessions = new Map();
    this.socketToSession = new Map();
  }

  generateCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  createSession(tvSocketId) {
    let code;
    do {
      code = this.generateCode();
    } while (this.getSessionByCode(code));

    const session = {
      id: `session_${Date.now()}`,
      code,
      tvSocketId,
      mobileSocketIds: [],
      queue: [],
      currentSong: null,
      createdAt: new Date(),
      completedSongs: [],
    };

    this.sessions.set(session.id, session);
    this.socketToSession.set(tvSocketId, { sessionId: session.id, isTv: true });
    return session;
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId) || null;
  }

  getSessionByCode(code) {
    for (const session of this.sessions.values()) {
      if (session.code === code) return session;
    }
    return null;
  }

  getSessionBySocket(socketId) {
    const mapping = this.socketToSession.get(socketId);
    if (!mapping) return null;
    return this.sessions.get(mapping.sessionId) || null;
  }

  joinSession(code, mobileSocketId) {
    const session = this.getSessionByCode(code);
    if (!session) return null;

    if (!session.mobileSocketIds.includes(mobileSocketId)) {
      session.mobileSocketIds.push(mobileSocketId);
    }
    this.socketToSession.set(mobileSocketId, { sessionId: session.id, isTv: false });
    return session;
  }

  updateQueue(sessionId, queue) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.queue = queue;
    }
  }

  setCurrentSong(sessionId, song) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.currentSong = song;
    }
  }

  addToQueue(sessionId, song, userId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const queueItem = {
      id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      song,
      addedBy: userId,
      addedAt: new Date(),
      status: 'waiting', // Use 'waiting' to match QueueItemStatus type
    };

    session.queue.push(queueItem);
    return queueItem;
  }

  removeFromQueue(sessionId, itemId) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const index = session.queue.findIndex(item => item.id === itemId);
    if (index === -1) return false;

    session.queue.splice(index, 1);
    return true;
  }

  recordCompletedSong(sessionId, queueItem, score) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.completedSongs.push({ queueItem, score, completedAt: new Date() });
    }
  }

  handleDisconnect(socketId) {
    const mapping = this.socketToSession.get(socketId);
    if (!mapping) return { session: null, isTv: false, userId: null };

    const session = this.sessions.get(mapping.sessionId);
    this.socketToSession.delete(socketId);

    if (!session) return { session: null, isTv: false, userId: null };

    if (mapping.isTv) {
      // TV disconnected - clean up session
      for (const mobileId of session.mobileSocketIds) {
        this.socketToSession.delete(mobileId);
      }
      this.sessions.delete(session.id);
      return { session, isTv: true, userId: null };
    } else {
      // Mobile disconnected
      session.mobileSocketIds = session.mobileSocketIds.filter(id => id !== socketId);
      return { session, isTv: false, userId: socketId };
    }
  }
}

// ==========================================
// Socket.io Setup
// ==========================================
function setupSocketHandlers(io, sessionStore) {
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // TV creates session
    socket.on('session:create', () => {
      const session = sessionStore.createSession(socket.id);
      socket.join(session.id);
      socket.emit('session:joined', session);
      console.log(`Session created: ${session.code}`);
    });

    // TV updates queue
    socket.on('queue:update', (queue) => {
      const session = sessionStore.getSessionBySocket(socket.id);
      if (!session) return socket.emit('error', 'Session not found');
      sessionStore.updateQueue(session.id, queue);
      socket.to(session.id).emit('queue:updated', queue);
    });

    // TV: song started
    socket.on('song:started', (song) => {
      const session = sessionStore.getSessionBySocket(socket.id);
      if (!session) return socket.emit('error', 'Session not found');
      sessionStore.setCurrentSong(session.id, song);
      const updatedQueue = session.queue.map(item =>
        item.id === song.id ? { ...item, status: 'playing' } : item
      );
      sessionStore.updateQueue(session.id, updatedQueue);
      io.to(session.id).emit('song:playing', song);
      io.to(session.id).emit('queue:updated', updatedQueue);
    });

    // TV: song ended
    socket.on('song:ended', (songId, score) => {
      const session = sessionStore.getSessionBySocket(socket.id);
      if (!session) return socket.emit('error', 'Session not found');
      const completedSong = session.queue.find(item => item.id === songId);
      if (completedSong) {
        sessionStore.recordCompletedSong(session.id, completedSong, score || null);
        // Broadcast song:finished to all clients (TV and Mobile) with final score
        io.to(session.id).emit('song:finished', { 
          song: completedSong, 
          finalScore: score || null 
        });
      }
      const updatedQueue = session.queue.map(item =>
        item.id === songId ? { ...item, status: 'completed' } : item
      );
      sessionStore.updateQueue(session.id, updatedQueue);
      sessionStore.setCurrentSong(session.id, null);
      io.to(session.id).emit('queue:updated', updatedQueue);
    });

    // Mobile joins session
    socket.on('session:join', (code) => {
      const session = sessionStore.joinSession(code, socket.id);
      if (!session) return socket.emit('error', 'Invalid session code');
      socket.join(session.id);
      socket.emit('session:joined', session);
      socket.to(session.id).emit('mobile:connected', socket.id);
      console.log(`Mobile joined: ${code}`);
    });

    // Mobile adds song
    socket.on('queue:add', (song) => {
      const session = sessionStore.getSessionBySocket(socket.id);
      if (!session) return socket.emit('error', 'Session not found');
      const queueItem = sessionStore.addToQueue(session.id, song, socket.id);
      if (!queueItem) return socket.emit('error', 'Failed to add song');
      const updatedSession = sessionStore.getSession(session.id);
      if (updatedSession) {
        io.to(session.id).emit('queue:updated', updatedSession.queue);
      }
    });

    // Mobile removes song
    socket.on('queue:remove', (itemId) => {
      const session = sessionStore.getSessionBySocket(socket.id);
      if (!session) return socket.emit('error', 'Session not found');
      if (!sessionStore.removeFromQueue(session.id, itemId)) {
        return socket.emit('error', 'Failed to remove song');
      }
      const updatedSession = sessionStore.getSession(session.id);
      if (updatedSession) {
        io.to(session.id).emit('queue:updated', updatedSession.queue);
      }
    });

    // Playback controls
    socket.on('playback:play', () => {
      const session = sessionStore.getSessionBySocket(socket.id);
      if (session) io.to(session.id).emit('playback:command', 'play');
    });

    socket.on('playback:pause', () => {
      const session = sessionStore.getSessionBySocket(socket.id);
      if (session) io.to(session.id).emit('playback:command', 'pause');
    });

    socket.on('playback:skip', () => {
      const session = sessionStore.getSessionBySocket(socket.id);
      if (session) io.to(session.id).emit('playback:command', 'skip');
    });

    // Mobile scoring - forward to TV
    socket.on('score:update', (score) => {
      const session = sessionStore.getSessionBySocket(socket.id);
      if (session) {
        // Broadcast to all clients in session (including TV)
        io.to(session.id).emit('score:updated', score);
      }
    });

    socket.on('score:feedback', (feedback) => {
      const session = sessionStore.getSessionBySocket(socket.id);
      if (session) {
        // Broadcast to all clients in session (including TV)
        io.to(session.id).emit('score:feedback', feedback);
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      const { session, isTv, userId } = sessionStore.handleDisconnect(socket.id);
      if (session) {
        if (isTv) {
          io.to(session.id).emit('error', 'TV disconnected');
        } else if (userId) {
          socket.to(session.id).emit('mobile:disconnected', userId);
        }
      }
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
}

// ==========================================
// Main Server
// ==========================================
app.prepare().then(() => {
  let server;

  if (useHttps) {
    const httpsOptions = {
      key: fs.readFileSync(keyFile),
      cert: fs.readFileSync(certFile),
    };
    server = createHttpsServer(httpsOptions, async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error:', req.url, err);
        res.statusCode = 500;
        res.end('internal server error');
      }
    });
    console.log('🔒 HTTPS enabled');
  } else {
    server = createHttpServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error:', req.url, err);
        res.statusCode = 500;
        res.end('internal server error');
      }
    });
    console.log('⚠️  HTTP mode');
  }

  // Socket.io on same server
  const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  const sessionStore = new SessionStore();
  setupSocketHandlers(io, sessionStore);

  server.listen(port, hostname, () => {
    const protocol = useHttps ? 'https' : 'http';
    const ip = getLocalIP();
    console.log(`\n🎤 Karaoke TV Web App (All-in-One)`);
    console.log(`   TV:      ${protocol}://${ip}:${port}`);
    console.log(`   Mobile:  ${protocol}://${ip}:${port}/mobile`);
    console.log(`   Socket:  ${protocol}://${ip}:${port} (same port!)\n`);
  });
});

function getLocalIP() {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}
