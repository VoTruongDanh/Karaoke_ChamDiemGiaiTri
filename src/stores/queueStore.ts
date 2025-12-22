import { create } from 'zustand';
import type { Song } from '@/types/song';
import type { QueueItem, QueueItemStatus } from '@/types/queue';

/**
 * Generate a unique ID for queue items
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Queue store state interface
 */
interface QueueState {
  /** All items in the queue */
  items: QueueItem[];
  
  /**
   * Add a song to the end of the queue
   * Requirements: 3.1 - WHEN a user adds a song to queue, THE Queue SHALL append the song to the end of the list
   * @param song - The song to add
   * @param userId - The user adding the song
   * @returns The created queue item
   */
  add: (song: Song, userId: string) => QueueItem;
  
  /**
   * Remove a song from the queue
   * Requirements: 3.4 - WHEN a user removes a song from queue, THE Queue SHALL update immediately and shift remaining songs
   * @param itemId - The ID of the queue item to remove
   * @returns True if removed successfully
   */
  remove: (itemId: string) => boolean;
  
  /**
   * Reorder a queue item to a new position
   * Requirements: 3.5 - THE Queue SHALL persist during the session and allow reordering of songs
   * @param itemId - The ID of the queue item to move
   * @param newIndex - The new index position
   */
  reorder: (itemId: string, newIndex: number) => void;
  
  /**
   * Get the next song to play (first 'waiting' item)
   * Requirements: 3.3 - WHEN the current song ends, THE Karaoke_Web_App SHALL automatically play the next song in Queue
   * @returns The next queue item or null if no waiting items
   */
  getNext: () => QueueItem | null;
  
  /**
   * Get the currently playing song
   * @returns The current queue item or null if nothing is playing
   */
  getCurrent: () => QueueItem | null;
  
  /**
   * Set the status of a queue item
   * @param itemId - The ID of the queue item
   * @param status - The new status
   */
  setItemStatus: (itemId: string, status: QueueItemStatus) => void;
  
  /**
   * Clear all completed items from the queue
   */
  clearCompleted: () => void;
  
  /**
   * Set the entire queue (used for syncing from server)
   * @param items - The new queue items
   */
  setQueue: (items: QueueItem[]) => void;
}

/**
 * Zustand store for managing the karaoke song queue
 * Requirements: 3.1, 3.3, 3.4, 3.5
 */
export const useQueueStore = create<QueueState>((set, get) => ({
  items: [],
  
  add: (song: Song, userId: string): QueueItem => {
    const newItem: QueueItem = {
      id: generateId(),
      song,
      addedBy: userId,
      addedAt: new Date(),
      status: 'waiting',
    };
    
    set((state) => ({
      items: [...state.items, newItem],
    }));
    
    return newItem;
  },
  
  remove: (itemId: string): boolean => {
    const state = get();
    const itemExists = state.items.some((item) => item.id === itemId);
    
    if (!itemExists) {
      return false;
    }
    
    set((state) => ({
      items: state.items.filter((item) => item.id !== itemId),
    }));
    
    return true;
  },
  
  reorder: (itemId: string, newIndex: number): void => {
    set((state) => {
      const items = [...state.items];
      const currentIndex = items.findIndex((item) => item.id === itemId);
      
      if (currentIndex === -1) {
        return state;
      }
      
      // Clamp newIndex to valid range
      const clampedIndex = Math.max(0, Math.min(newIndex, items.length - 1));
      
      // Remove item from current position
      const [movedItem] = items.splice(currentIndex, 1);
      
      // Insert at new position
      items.splice(clampedIndex, 0, movedItem);
      
      return { items };
    });
  },
  
  getNext: (): QueueItem | null => {
    const state = get();
    return state.items.find((item) => item.status === 'waiting') || null;
  },
  
  getCurrent: (): QueueItem | null => {
    const state = get();
    return state.items.find((item) => item.status === 'playing') || null;
  },
  
  setItemStatus: (itemId: string, status: QueueItemStatus): void => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === itemId ? { ...item, status } : item
      ),
    }));
  },
  
  clearCompleted: (): void => {
    set((state) => ({
      items: state.items.filter((item) => item.status !== 'completed'),
    }));
  },
  
  setQueue: (items: QueueItem[]): void => {
    set({ items });
  },
}));
