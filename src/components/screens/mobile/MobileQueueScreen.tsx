'use client';

import React, { useState, useCallback, useRef } from 'react';
import type { QueueItem } from '@/types/queue';
import type { Song } from '@/types/song';

export interface MobileQueueScreenProps {
  queue: QueueItem[];
  currentSong: QueueItem | null;
  onBack: () => void;
  onRemove?: (itemId: string) => void;
  onAddToQueue?: (song: Song) => void;
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
          <img src={currentSong.song.thumbnail} alt="" className="w-20 h-20 object-cover rounded-xl" />
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

export function MobileQueueScreen({
  queue,
  currentSong,
  onBack,
  onRemove,
  onAddToQueue,
  onReorder,
}: MobileQueueScreenProps) {
  const [replayAddedIds, setReplayAddedIds] = useState<Set<string>>(new Set());
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const startY = useRef(0);
  const currentY = useRef(0);
  
  const waitingItems = queue.filter(item => item.status === 'waiting');
  const completedItems = queue.filter(item => item.status === 'completed');

  const handleReplay = useCallback((item: QueueItem) => {
    if (!onAddToQueue) return;
    onAddToQueue(item.song);
    setReplayAddedIds(prev => new Set(prev).add(item.id));
    setTimeout(() => {
      setReplayAddedIds(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }, 2000);
  }, [onAddToQueue]);

  // Simple touch-based reorder
  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    if (!onReorder || waitingItems.length <= 1) return;
    startY.current = e.touches[0].clientY;
    currentY.current = e.touches[0].clientY;
    setDraggedIndex(index);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (draggedIndex === null || !onReorder) return;
    e.preventDefault();
    currentY.current = e.touches[0].clientY;
    
    // Find which item we're over
    let newTarget = draggedIndex;
    itemRefs.current.forEach((ref, i) => {
      if (ref && i !== draggedIndex) {
        const rect = ref.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (currentY.current > midY && i > draggedIndex) {
          newTarget = i;
        } else if (currentY.current < midY && i < draggedIndex) {
          newTarget = i;
        }
      }
    });
    setTargetIndex(newTarget !== draggedIndex ? newTarget : null);
  };

  const handleTouchEnd = () => {
    if (draggedIndex !== null && targetIndex !== null && onReorder) {
      const item = waitingItems[draggedIndex];
      console.log('[Queue] Reorder:', item.id, 'from', draggedIndex, 'to', targetIndex);
      onReorder(item.id, targetIndex);
    }
    setDraggedIndex(null);
    setTargetIndex(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-tv-bg flex flex-col">
      {/* Header */}
      <header className="p-4 border-b border-slate-200 dark:border-tv-border bg-white dark:bg-tv-surface">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-tv-card rounded-lg">
            <BackIcon />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-slate-800 dark:text-white">Hàng đợi</h1>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              {waitingItems.length} bài chờ • {completedItems.length} đã hát
            </p>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 overflow-y-auto p-4" ref={containerRef}>
        <NowPlayingCard currentSong={currentSong} />

        {waitingItems.length > 0 ? (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-slate-500 dark:text-gray-400">Tiếp theo</h2>
              {onReorder && waitingItems.length > 1 && (
                <span className="text-xs text-primary-500">Giữ & kéo để đổi</span>
              )}
            </div>
            <div className="space-y-2">
              {waitingItems.map((item, index) => (
                <div
                  key={item.id}
                  ref={el => { itemRefs.current[index] = el; }}
                  onTouchStart={(e) => handleTouchStart(e, index)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all select-none ${
                    draggedIndex === index 
                      ? 'bg-primary-100 dark:bg-primary-900/50 scale-[1.02] shadow-lg z-10' 
                      : targetIndex === index
                        ? 'bg-primary-50 dark:bg-primary-900/30 border-2 border-dashed border-primary-400'
                        : 'bg-white dark:bg-tv-card'
                  }`}
                  style={{ touchAction: onReorder && waitingItems.length > 1 ? 'none' : 'auto' }}
                >
                  {/* Drag indicator */}
                  {onReorder && waitingItems.length > 1 && (
                    <div className="text-slate-300 dark:text-gray-600 flex-shrink-0">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="9" cy="6" r="1.5" />
                        <circle cx="15" cy="6" r="1.5" />
                        <circle cx="9" cy="12" r="1.5" />
                        <circle cx="15" cy="12" r="1.5" />
                        <circle cx="9" cy="18" r="1.5" />
                        <circle cx="15" cy="18" r="1.5" />
                      </svg>
                    </div>
                  )}
                  
                  <div className="w-6 h-6 bg-slate-100 dark:bg-tv-surface rounded flex items-center justify-center text-xs font-medium text-slate-500 flex-shrink-0">
                    {index + 1}
                  </div>
                  
                  <img src={item.song.thumbnail} alt="" className="w-12 h-9 object-cover rounded flex-shrink-0" />
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-slate-800 dark:text-white">{item.song.title}</p>
                    <p className="text-xs text-slate-500 truncate">{formatDuration(item.song.duration)}</p>
                  </div>
                  
                  {onRemove && (
                    <button
                      onClick={() => onRemove(item.id)}
                      className="p-2 text-slate-400 hover:text-red-500 rounded flex-shrink-0"
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-slate-100 dark:bg-tv-card rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
              <MusicIcon />
            </div>
            <p className="text-slate-500 dark:text-gray-400">Hàng đợi trống</p>
          </div>
        )}

        {completedItems.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-slate-500 dark:text-gray-400 mb-3">Đã hát</h2>
            <div className="space-y-2">
              {completedItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-white dark:bg-tv-card rounded-xl opacity-50">
                  <img src={item.song.thumbnail} alt="" className="w-12 h-9 object-cover rounded flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate text-slate-500 line-through">{item.song.title}</p>
                  </div>
                  {onAddToQueue && (
                    <button
                      onClick={() => handleReplay(item)}
                      disabled={replayAddedIds.has(item.id)}
                      className={`p-2 rounded flex-shrink-0 ${replayAddedIds.has(item.id) ? 'text-green-500' : 'text-slate-400 hover:text-primary-500'}`}
                    >
                      {replayAddedIds.has(item.id) ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <ReplayIcon />
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="p-4 border-t border-slate-200 dark:border-tv-border bg-white dark:bg-tv-surface">
        <button onClick={onBack} className="w-full py-3 bg-primary-600 rounded-xl font-medium text-white active:scale-[0.98]">
          Thêm bài hát
        </button>
      </footer>
    </div>
  );
}

export default MobileQueueScreen;
