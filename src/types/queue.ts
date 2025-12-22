import { Song } from './song';

/**
 * Status of a queue item
 */
export type QueueItemStatus = 'waiting' | 'playing' | 'completed';

/**
 * Queue item representing a song in the karaoke queue
 * Requirements: 3.1 - Queue management with song order
 */
export interface QueueItem {
  /** Unique identifier for this queue item */
  id: string;
  /** The song in the queue */
  song: Song;
  /** User identifier who added this song */
  addedBy: string;
  /** Timestamp when the song was added */
  addedAt: Date;
  /** Current status of the queue item */
  status: QueueItemStatus;
}

/**
 * Queue interface for managing the song queue
 * Requirements: 3.1, 3.3, 3.4, 3.5
 */
export interface Queue {
  /** All items in the queue */
  items: QueueItem[];
  
  /**
   * Add a song to the queue
   * @param song - The song to add
   * @param userId - The user adding the song
   * @returns The created queue item
   */
  add(song: Song, userId: string): QueueItem;
  
  /**
   * Remove a song from the queue
   * @param itemId - The ID of the queue item to remove
   * @returns True if removed successfully
   */
  remove(itemId: string): boolean;
  
  /**
   * Reorder a queue item to a new position
   * @param itemId - The ID of the queue item to move
   * @param newIndex - The new index position
   */
  reorder(itemId: string, newIndex: number): void;
  
  /**
   * Get the next song to play
   * @returns The next queue item or null if queue is empty
   */
  getNext(): QueueItem | null;
  
  /**
   * Get the currently playing song
   * @returns The current queue item or null if nothing is playing
   */
  getCurrent(): QueueItem | null;
}
