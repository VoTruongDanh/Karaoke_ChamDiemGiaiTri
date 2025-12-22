import { QueueItem } from './queue';
import { Song } from './song';
import { ScoreData, RealTimeFeedback } from './score';
import { Session } from './session';

/**
 * Events emitted from TV to Server
 */
export interface TVToServerEvents {
  /** Create a new karaoke session */
  'session:create': () => void;
  /** Update the queue state */
  'queue:update': (queue: QueueItem[]) => void;
  /** Notify that a song has started playing */
  'song:started': (song: QueueItem) => void;
  /** Notify that a song has ended */
  'song:ended': (songId: string, score?: ScoreData) => void;
}

/**
 * Events emitted from Mobile to Server
 */
export interface MobileToServerEvents {
  /** Join an existing session by code */
  'session:join': (code: string) => void;
  /** Add a song to the queue */
  'queue:add': (song: Song) => void;
  /** Remove a song from the queue */
  'queue:remove': (itemId: string) => void;
  /** Request to play/start the queue */
  'playback:play': () => void;
  /** Request to pause playback */
  'playback:pause': () => void;
  /** Request to skip current song */
  'playback:skip': () => void;
  /** Send real-time score from mobile mic */
  'score:update': (score: ScoreData) => void;
  /** Send real-time feedback from mobile mic */
  'score:feedback': (feedback: RealTimeFeedback) => void;
}

/**
 * Events emitted from Server to all clients
 */
export interface ServerToClientEvents {
  /** Session joined successfully */
  'session:joined': (session: Session) => void;
  /** Queue has been updated */
  'queue:updated': (queue: QueueItem[]) => void;
  /** A song is now playing */
  'song:playing': (song: QueueItem) => void;
  /** A song has finished playing - show final score */
  'song:finished': (data: { song: QueueItem; finalScore: ScoreData | null }) => void;
  /** A mobile device has connected */
  'mobile:connected': (userId: string) => void;
  /** A mobile device has disconnected */
  'mobile:disconnected': (userId: string) => void;
  /** Playback control command from mobile */
  'playback:command': (command: 'play' | 'pause' | 'skip') => void;
  /** Real-time score update from mobile */
  'score:updated': (score: ScoreData) => void;
  /** Real-time feedback from mobile */
  'score:feedback': (feedback: RealTimeFeedback) => void;
  /** Error occurred */
  'error': (message: string) => void;
}

/**
 * Combined client events (TV + Mobile)
 */
export type ClientToServerEvents = TVToServerEvents & MobileToServerEvents;
