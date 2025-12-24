'use client';

import React, { useState, useCallback } from 'react';
import type { QueueItem } from '@/types/queue';
import type { Song } from '@/types/song';

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
  /** Callback to remove a song from queue */
  onRemove?: (itemId: string) => void;
  /** Callback to add a song to queue (for replay) */
  onAddToQueue?: (song: Song) => void;
  /** Callback to reorder queue */
  onReorder?: (itemId: string, newIndex: number) => void;
}

function BackIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function MusicIcon() {
  return (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
    </svg>
  );
}

function ReplayIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function ChevronUpIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function NowPlayingCard({ currentSong }: { currentSong: QueueItem | null }) {
  if (!currentSong) {
    return (
      <div className="bg-gradient-to-br from-slate-100 to-slate-50 dark:from-tv-card dark:to-tv-surface rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-slate-200 dark:bg-tv-border rounded-xl flex items-center justify-center text-slate-400">
            <MusicIcon />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-gray-500 mb-1">Đang phát</p>
            <p className="text-lg font-medium text-slate-400 dark:text-gray-400">Chưa có bài hát</p>
            <p className="text-sm text-slate-500 dark:text-gray-500">Thêm bài hát vào hàng đợi</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-primary-500/20 to-primary-600/10 dark:from-primary-900/50 dark:to-tv-card rounded-2xl p-4 mb-4 border border-primary-500/30">
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
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <p className="text-xs text-green-600 dark:text-accent-green">Đang phát</p>
          </div>
          <p className="font-semibold truncate text-slate-800 dark:text-white">{currentSong.song.title}</p>
          <p className="text-sm text-slate-500 dark:text-gray-400 truncate">{currentSong.song.channelName}</p>
        </div>
      </div>
    </div>
  );
}

function QueueItemCard({
  item,
  index,
  totalItems,
  onRemove,
  onReplay,
  onMoveUp,
  onMoveDown,
  canReorder,
  isReplayAdded,
}: {
  item: QueueItem;
  index: number;
  totalItems: number;
  onRemove?: () => void;
  onReplay?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canReorder?: boolean;
  isReplayAdded?: boolean;
}) {
  const isCompleted = item.status === 'completed';
  const isWaiting = item.status === 'waiting';

  return (
    <div className={`flex items-center gap-3 p-3 bg-white dark:bg-tv-card rounded-xl ${isCompleted ? 'opacity-60' : ''}`}>
      {/* Position number */}
      <div className="w-8 h-8 bg-slate-100 dark:bg-tv-surface rounded-lg flex items-center justify-center text-sm font-medium text-slate-500 dark:text-gray-400 flex-shrink-0">
        {index + 1}
      </div>
      
      {/* Thumbnail */}
      <img
        src={item.song.thumbnail}
        alt={item.song.title}
        className="w-14 h-10 object-cover rounded-lg flex-shrink-0"
      />
      
      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate text-slate-800 dark:text-white ${isCompleted ? 'line-through text-slate-400 dark:text-gray-500' : ''}`}>
          {item.song.title}
        </p>
        <p className="text-xs text-slate-500 dark:text-gray-400 truncate">
          {formatDuration(item.song.duration)}
        </p>
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Move up/down for waiting items */}
        {isWaiting && canReorder && totalItems > 1 && (
          <div className="flex flex-col -my-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onMoveUp) onMoveUp();
              }}
              disabled={index === 0}
              className="p-2 text-slate-400 hover:text-primary-500 active:bg-primary-100 dark:active:bg-primary-900/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded"
            >
              <ChevronUpIcon />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onMoveDown) onMoveDown();
              }}
              disabled={index === totalItems - 1}
              className="p-2 text-slate-400 hover:text-primary-500 active:bg-primary-100 dark:active:bg-primary-900/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded"
            >
              <ChevronDownIcon />
            </button>
          </div>
        )}
        
        {/* Remove for waiting items */}
        {isWaiting && onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="p-2 text-slate-400 hover:text-red-500 active:bg-red-100 dark:active:bg-red-900/30 transition-colors rounded"
          >
            <TrashIcon />
          </button>
        )}
        
        {/* Replay for completed items */}
        {isCompleted && onReplay && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReplay();
            }}
            disabled={isReplayAdded}
            className={`p-2 transition-colors rounded ${
              isReplayAdded 
                ? 'text-green-500' 
                : 'text-slate-400 hover:text-primary-500 active:bg-primary-100 dark:active:bg-primary-900/30'
            }`}
          >
            {isReplayAdded ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <ReplayIcon />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export function MobileQueueScreen({
  queue,
  currentSong,
  onBack,
  onRemove,
  onAddToQueue,
  onReorder,
}: MobileQueueScreenProps) {
  const [replayAddedIds, setReplayAddedIds] = useState<Set<string>>(new Set());
  
  // Separate waiting and completed items
  const waitingItems = queue.filter(item => item.status === 'waiting');
  const completedItems = queue.filter(item => item.status === 'completed');

  // Handle replay - add song back to queue
  const handleReplay = useCallback((item: QueueItem) => {
    console.log('[Queue] Replay:', item.song.title);
    if (!onAddToQueue) {
      console.log('[Queue] onAddToQueue not provided');
      return;
    }
    onAddToQueue(item.song);
    setReplayAddedIds(prev => new Set(prev).add(item.id));
    
    // Clear the added state after 2 seconds
    setTimeout(() => {
      setReplayAddedIds(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }, 2000);
  }, [onAddToQueue]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-tv-bg flex flex-col">
      {/* Header */}
      <header className="p-4 border-b border-slate-200 dark:border-tv-border bg-white dark:bg-tv-surface">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-tv-card rounded-lg transition-colors"
          >
            <BackIcon />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-slate-800 dark:text-white">Hàng đợi</h1>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              {waitingItems.length} bài chờ hát
              {completedItems.length > 0 && ` • ${completedItems.length} đã hát`}
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
            <h2 className="text-sm font-medium text-slate-500 dark:text-gray-400 mb-3">Tiếp theo</h2>
            <div className="space-y-2">
              {waitingItems.map((item, index) => (
                <QueueItemCard
                  key={item.id}
                  item={item}
                  index={index}
                  totalItems={waitingItems.length}
                  canReorder={!!onReorder}
                  onRemove={onRemove ? () => {
                    console.log('[Queue] Remove clicked:', item.id);
                    onRemove(item.id);
                  } : undefined}
                  onMoveUp={onReorder ? () => {
                    console.log('[Queue] MoveUp clicked:', item.id, index, '->', index - 1);
                    onReorder(item.id, index - 1);
                  } : undefined}
                  onMoveDown={onReorder ? () => {
                    console.log('[Queue] MoveDown clicked:', item.id, index, '->', index + 1);
                    onReorder(item.id, index + 1);
                  } : undefined}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-slate-100 dark:bg-tv-card rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
              <MusicIcon />
            </div>
            <p className="text-slate-500 dark:text-gray-400">Hàng đợi trống</p>
            <p className="text-sm text-slate-400 dark:text-gray-500 mt-1">Tìm và thêm bài hát để bắt đầu</p>
          </div>
        )}

        {/* Completed songs */}
        {completedItems.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-slate-500 dark:text-gray-400 mb-3">
              Đã hát ({completedItems.length})
            </h2>
            <div className="space-y-2">
              {completedItems.map((item, index) => (
                <QueueItemCard
                  key={item.id}
                  item={item}
                  index={waitingItems.length + index}
                  totalItems={completedItems.length}
                  onReplay={onAddToQueue ? () => handleReplay(item) : undefined}
                  isReplayAdded={replayAddedIds.has(item.id)}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="p-4 border-t border-slate-200 dark:border-tv-border bg-white dark:bg-tv-surface">
        <button
          onClick={onBack}
          className="w-full py-3 bg-primary-600 hover:bg-primary-500 rounded-xl font-medium text-white transition-colors active:scale-[0.98]"
        >
          Thêm bài hát
        </button>
      </footer>
    </div>
  );
}

export default MobileQueueScreen;
