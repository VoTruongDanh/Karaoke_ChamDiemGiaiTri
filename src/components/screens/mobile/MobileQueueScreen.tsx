'use client';

import React, { useState, useCallback } from 'react';
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
  const [dragState, setDragState] = useState<{
    dragging: boolean;
    startIndex: number;
    currentIndex: number;
    startY: number;
    currentY: number;
    offsetY: number; // Offset from item top to touch point
  } | null>(null);
  
  const waitingItems = queue.filter(item => item.status === 'waiting');
  const completedItems = queue.filter(item => item.status === 'completed');
  const itemHeight = 72; // Approximate height of each item

  const handleReplay = useCallback((item: QueueItem) => {
    if (!onAddToQueue) return;
    onAddToQueue(item.song);
    setReplayAddedIds(prev => new Set(prev).add(item.id));
  }, [onAddToQueue]);
  
  // Clear replay indicator after 2s - separate effect to avoid memory leak
  React.useEffect(() => {
    if (replayAddedIds.size === 0) return;
    
    const timer = setTimeout(() => {
      setReplayAddedIds(new Set());
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [replayAddedIds.size]);

  // Simple drag handlers using pointer events
  const handleDragStart = useCallback((index: number, clientY: number, itemTop: number) => {
    if (!onReorder || waitingItems.length <= 1) return;
    setDragState({
      dragging: true,
      startIndex: index,
      currentIndex: index,
      startY: clientY,
      currentY: clientY,
      offsetY: clientY - itemTop,
    });
  }, [onReorder, waitingItems.length]);

  const handleDragMove = useCallback((clientY: number) => {
    if (!dragState) return;
    
    // Calculate new index based on Y movement
    const deltaY = clientY - dragState.startY;
    const indexDelta = Math.round(deltaY / itemHeight);
    let newIndex = dragState.startIndex + indexDelta;
    
    // Clamp to valid range
    newIndex = Math.max(0, Math.min(waitingItems.length - 1, newIndex));
    
    setDragState(prev => prev ? { ...prev, currentIndex: newIndex, currentY: clientY } : null);
  }, [dragState, waitingItems.length, itemHeight]);

  const handleDragEnd = useCallback(() => {
    if (!dragState || !onReorder) {
      setDragState(null);
      return;
    }
    
    const { startIndex, currentIndex } = dragState;
    if (startIndex !== currentIndex) {
      const item = waitingItems[startIndex];
      if (item) {
        console.log('[Queue] Reorder:', item.id, 'from', startIndex, 'to', currentIndex);
        onReorder(item.id, currentIndex);
      }
    }
    setDragState(null);
  }, [dragState, onReorder, waitingItems]);

  // Get items excluding the dragged one (for background list)
  const getBackgroundItems = useCallback(() => {
    if (!dragState) return waitingItems;
    return waitingItems.filter((_, i) => i !== dragState.startIndex);
  }, [waitingItems, dragState]);

  const backgroundItems = getBackgroundItems();
  const draggedItem = dragState ? waitingItems[dragState.startIndex] : null;

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
      <main className="flex-1 overflow-y-auto p-4 relative">
        <NowPlayingCard currentSong={currentSong} />

        {waitingItems.length > 0 ? (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-slate-500 dark:text-gray-400">Tiếp theo</h2>
              {onReorder && waitingItems.length > 1 && (
                <span className="text-xs text-primary-500">Giữ & kéo để đổi</span>
              )}
            </div>
            <div className="space-y-2 relative">
              {/* Background items (with placeholder for dragged item) */}
              {waitingItems.map((item, index) => {
                const isDraggedItem = dragState?.startIndex === index;
                const isDropTarget = dragState && !isDraggedItem && index === dragState.currentIndex;
                
                return (
                  <div
                    key={item.id}
                    onTouchStart={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      handleDragStart(index, e.touches[0].clientY, rect.top);
                    }}
                    onTouchMove={(e) => {
                      if (dragState) {
                        e.preventDefault();
                        handleDragMove(e.touches[0].clientY);
                      }
                    }}
                    onTouchEnd={handleDragEnd}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all select-none ${
                      isDraggedItem
                        ? 'opacity-30 bg-slate-100 dark:bg-tv-surface border-2 border-dashed border-slate-300 dark:border-tv-border'
                        : isDropTarget
                          ? 'bg-primary-50 dark:bg-primary-900/30 border-2 border-dashed border-primary-400'
                          : 'bg-white dark:bg-tv-card'
                    }`}
                    style={{ touchAction: onReorder && waitingItems.length > 1 ? 'none' : 'auto' }}
                  >
                    {/* Drag handle */}
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
                    
                    {onRemove && !isDraggedItem && (
                      <button
                        onClick={() => onRemove(item.id)}
                        className="p-2 text-slate-400 hover:text-red-500 rounded flex-shrink-0"
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </div>
                );
              })}
              
              {/* Floating dragged item */}
              {dragState && draggedItem && (
                <div
                  className="fixed left-4 right-4 flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-tv-card shadow-2xl border-2 border-primary-500 z-50 pointer-events-none"
                  style={{
                    top: dragState.currentY - dragState.offsetY,
                    transform: 'scale(1.02)',
                  }}
                >
                  {/* Drag handle */}
                  <div className="text-primary-500 flex-shrink-0">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="9" cy="6" r="1.5" />
                      <circle cx="15" cy="6" r="1.5" />
                      <circle cx="9" cy="12" r="1.5" />
                      <circle cx="15" cy="12" r="1.5" />
                      <circle cx="9" cy="18" r="1.5" />
                      <circle cx="15" cy="18" r="1.5" />
                    </svg>
                  </div>
                  
                  <div className="w-6 h-6 bg-primary-100 dark:bg-primary-900 rounded flex items-center justify-center text-xs font-medium text-primary-600 dark:text-primary-400 flex-shrink-0">
                    {dragState.currentIndex + 1}
                  </div>
                  
                  <img src={draggedItem.song.thumbnail} alt="" className="w-12 h-9 object-cover rounded flex-shrink-0" />
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-slate-800 dark:text-white">{draggedItem.song.title}</p>
                    <p className="text-xs text-slate-500 truncate">{formatDuration(draggedItem.song.duration)}</p>
                  </div>
                </div>
              )}
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
