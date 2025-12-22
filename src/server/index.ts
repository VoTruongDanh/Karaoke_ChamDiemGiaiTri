/**
 * Backend Server Entry Point
 * Express + Socket.io server for Karaoke TV Web App
 * All HTTPS for microphone access on LAN
 */

import express from 'express';
import { createServer as createHttpsServer } from 'https';
import { createServer as createHttpServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { setupSocketHandlers } from './socketHandlers';
import { SessionStore } from './sessionStore';

const app = express();

// Check for SSL certificates
const certDir = path.join(__dirname, '..', '..', 'certs');
const keyFile = path.join(certDir, 'localhost-key.pem');
const certFile = path.join(certDir, 'localhost.pem');
const hasSSL = fs.existsSync(keyFile) && fs.existsSync(certFile);

let server;
if (hasSSL) {
  const httpsOptions = {
    key: fs.readFileSync(keyFile),
    cert: fs.readFileSync(certFile),
  };
  server = createHttpsServer(httpsOptions, app);
  console.log('🔒 WebSocket Server running with HTTPS');
} else {
  server = createHttpServer(app);
  console.log('⚠️  WebSocket Server running with HTTP (no SSL cert found)');
}

// CORS configuration
app.use(cors({ origin: '*', methods: ['GET', 'POST'], credentials: true }));
app.use(express.json());

// Socket.io server
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'], credentials: true },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Initialize session store
const sessionStore = new SessionStore();

// Setup socket event handlers
setupSocketHandlers(io, sessionStore);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = 3001;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  const protocol = hasSSL ? 'https' : 'http';
  console.log(`🎤 WebSocket Server: ${protocol}://${HOST}:${PORT}`);
});

export { app, io, sessionStore };
