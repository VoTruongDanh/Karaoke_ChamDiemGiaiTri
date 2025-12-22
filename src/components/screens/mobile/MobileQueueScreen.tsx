'use client';

import React from 'react';
import type { QueueItem } from '@/types/queue';

/**
 * Props for MobileQueueScreen component
 */
export interface MobileQueueScreenProps {
  /** Current queue items */
  queue: QueueItem[];
  /** Currently playing song */
  currentSong: QueueItem | null;
  /** Callback to go back to controller */
  onBack: () => void;
  /** Callback to remove a song from queue (optional) */
  onRemove?: (itemId: string) => void;
}

/**
 * Back arrow icon component
 */
function BackIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

/**
 * Trash icon component
 */
function TrashIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

/**
 * Music note icon component
 */
function MusicIcon() {
  return (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
    </svg>
  );
}

/**
 * Format duration from seconds to mm:ss
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Now playing card component
 */
function NowPlayingCard({ currentSong }: { currentSong: QueueItem | null }) {
  if (!currentSong) {
    return (
      <div className="bg-gradient-to-br from-tv-card to-tv-surface rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-tv-border rounded-xl flex items-center justify-center">
            <MusicIcon />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Đang phát</p>
            <p className="text-lg font-medium text-gray-400">Chưa có bài hát</p>
            <p className="text-sm text-gray-500">Thêm bài hát vào hàng đợi</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-primary-900/50 to-tv-card rounded-2xl p-4 mb-4 border border-primary-500/30">
      <div className="flex items-center gap-4">
        <div className="relative">
          <img
            src={currentSong.song.thumbnail}
            alt={currentSong.song.title}
            className="w-20 h-20 object-cover rounded-xl"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-white rounded-sm" />
            </div>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 bg-accent-green rounded-full animate-pulse" />
            <p className="text-xs text-accent-green">Đang phát</p>
          </div>
          <p className="font-semibold truncate">{currentSong.song.title}</p>
          <p className="text-sm text-gray-400 truncate">{currentSong.song.channelName}</p>
          <p className="text-xs text-gray-500 mt-1">
            Thêm bởi {currentSong.addedBy} • {formatDuration(currentSong.song.duration)}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Queue item component
 */
function QueueItemCard({
  item,
  index,
  onRemove,
}: {
  item: QueueItem;
  index: number;
  onRemove?: () => void;
}) {
  const isCompleted = item.status === 'completed';

  return (
    <div className={`flex items-center gap-3 p-3 bg-tv-card rounded-xl ${isCompleted ? 'opacity-50' : ''}`}>
      <div className="w-8 h-8 bg-tv-surface rounded-lg flex items-center justify-center text-sm font-medium text-gray-400">
        {index + 1}
      </div>
      <img
        src={item.song.thumbnail}
        alt={item.song.title}
        className="w-14 h-10 object-cover rounded-lg flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isCompleted ? 'line-through' : ''}`}>
          {item.song.title}
        </p>
        <p className="text-xs text-gray-400 truncate">
          {item.addedBy} • {formatDuration(item.song.duration)}
        </p>
      </div>
      {onRemove && !isCompleted && (
        <button
          onClick={onRemove}
          className="p-2 text-gray-400 hover:text-red-400 transition-colors"
        >
          <TrashIcon />
        </button>
      )}
      {isCompleted && (
        <span className="text-xs text-gray-500 px-2 py-1 bg-tv-surface rounded">
          Đã hát
        </span>
      )}
    </div>
  );
}

/**
 * MobileQueueScreen component - View current queue on mobile
 * 
 * Requirements: 4.5 - THE Mobile_Controller SHALL display current playing song and queue status
 * 
 * Features:
 * - View current queue
 * - Now playing info with visual indicator
 * - Queue position numbers
 * - Added by user info
 */
export function MobileQueueScreen({
  queue,
  currentSong,
  onBack,
  onRemove,
}: MobileQueueScreenProps) {
  // Separate waiting and completed items
  const waitingItems = queue.filter(item => item.status === 'waiting');
  const completedItems = queue.filter(item => item.status === 'completed');

  return (
    <div className="min-h-screen bg-tv-bg flex flex-col">
      {/* Header */}
      <header className="p-4 border-b border-tv-border">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 hover:bg-tv-card rounded-lg transition-colors"
          >
            <BackIcon />
          </button>
          <div>
            <h1 className="text-lg font-semibold">Hàng đợi</h1>
            <p className="text-xs text-gray-400">
              {waitingItems.length} bài chờ hát
            </p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-4">
        {/* Now playing */}
        <NowPlayingCard currentSong={currentSong} />

        {/* Waiting queue */}
        {waitingItems.length > 0 ? (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-gray-400 mb-3">Tiếp theo</h2>
            <div className="space-y-2">
              {waitingItems.map((item, index) => (
                <QueueItemCard
                  key={item.id}
                  item={item}
                  index={index}
                  onRemove={onRemove ? () => onRemove(item.id) : undefined}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-tv-card rounded-full flex items-center justify-center mx-auto mb-3">
              <MusicIcon />
            </div>
            <p className="text-gray-400">Hàng đợi trống</p>
            <p className="text-sm text-gray-500 mt-1">Tìm và thêm bài hát để bắt đầu</p>
          </div>
        )}

        {/* Completed songs */}
        {completedItems.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-gray-400 mb-3">Đã hát</h2>
            <div className="space-y-2">
              {completedItems.map((item, index) => (
                <QueueItemCard
                  key={item.id}
                  item={item}
                  index={waitingItems.length + index}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="p-4 border-t border-tv-border bg-tv-surface">
        <button
          onClick={onBack}
          className="w-full py-3 bg-primary-600 hover:bg-primary-500 rounded-xl font-medium transition-colors"
        >
          Thêm bài hát
        </button>
      </footer>
    </div>
  );
}

export default MobileQueueScreen;
