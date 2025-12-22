'use client';

import React, { useCallback } from 'react';
import { NavigationGrid } from '@/components/NavigationGrid';
import { FocusableButton } from '@/components/FocusableButton';
import { LazyImage } from '@/components/LazyImage';
import { useQueueStore } from '@/stores/queueStore';
import type { QueueItem } from '@/types/queue';

/**
 * Props for QueueScreen component
 */
export interface QueueScreenProps {
  /** Callback when back is pressed */
  onBack: () => void;
  /** Callback when play is pressed on a song */
  onPlaySong?: (item: QueueItem) => void;
}

/**
 * Back icon component
 */
function BackIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

/**
 * Play icon component
 */
function PlayIcon() {
  return (
    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

/**
 * Up arrow icon component
 */
function UpIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  );
}

/**
 * Down arrow icon component
 */
function DownIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

/**
 * Delete icon component
 */
function DeleteIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

/**
 * Music icon component
 */
function MusicIcon() {
  return (
    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
 * Current song display component
 */
function CurrentSongDisplay({ currentSong }: { currentSong: QueueItem | null }) {
  if (!currentSong) {
    return (
      <div className="tv-card flex items-center gap-tv-4 mb-tv-4">
        <div className="w-32 h-32 bg-tv-surface rounded-tv-lg flex items-center justify-center">
          <MusicIcon />
        </div>
        <div>
          <p className="text-tv-xs text-secondary mb-1">Đang phát</p>
          <p className="text-tv-lg text-secondary">Chưa có bài hát nào</p>
          <p className="text-tv-xs text-secondary">Thêm bài hát vào hàng đợi để bắt đầu</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tv-card flex items-center gap-tv-4 mb-tv-4 border-2 border-primary-500">
      <div className="relative">
        <LazyImage 
          src={currentSong.song.thumbnail} 
          alt={currentSong.song.title}
          className="w-32 h-32 rounded-tv-lg"
          width={128}
          height={128}
          priority
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-tv-lg">
          <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center animate-pulse">
            <PlayIcon />
          </div>
        </div>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-3 h-3 bg-accent-green rounded-full animate-pulse" />
          <p className="text-tv-xs text-accent-green">Đang phát</p>
        </div>
        <p className="text-tv-lg font-bold truncate">{currentSong.song.title}</p>
        <p className="text-tv-sm text-secondary">{currentSong.song.channelName}</p>
        <p className="text-tv-xs text-secondary">
          Thêm bởi: {currentSong.addedBy} • {formatDuration(currentSong.song.duration)}
        </p>
      </div>
    </div>
  );
}


/**
 * Queue item row component with reorder controls
 */
function QueueItemRow({
  item,
  index,
  row,
  onMoveUp,
  onMoveDown,
  onRemove,
  canMoveUp,
  canMoveDown,
}: {
  item: QueueItem;
  index: number;
  row: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  return (
    <div className="tv-card flex items-center gap-tv-3 mb-tv-2">
      {/* Position number */}
      <div className="w-12 h-12 bg-tv-surface rounded-tv flex items-center justify-center flex-shrink-0">
        <span className="text-tv-sm font-bold text-secondary">{index + 1}</span>
      </div>

      {/* Song info */}
      <LazyImage 
        src={item.song.thumbnail} 
        alt={item.song.title}
        className="w-20 h-14 rounded-tv flex-shrink-0"
        width={80}
        height={56}
      />
      <div className="flex-1 min-w-0">
        <p className="text-tv-xs font-semibold truncate">{item.song.title}</p>
        <p className="text-tv-xs text-secondary truncate">
          {item.song.channelName} • {formatDuration(item.song.duration)}
        </p>
        <p className="text-tv-xs text-secondary">Thêm bởi: {item.addedBy}</p>
      </div>

      {/* Reorder controls */}
      <div className="flex items-center gap-tv-1 flex-shrink-0">
        <FocusableButton
          row={row}
          col={0}
          onSelect={onMoveUp}
          variant="ghost"
          size="sm"
          disabled={!canMoveUp}
          className="!min-w-[48px] !min-h-[48px] !p-0"
          ariaLabel="Di chuyển lên"
        >
          <UpIcon />
        </FocusableButton>
        
        <FocusableButton
          row={row}
          col={1}
          onSelect={onMoveDown}
          variant="ghost"
          size="sm"
          disabled={!canMoveDown}
          className="!min-w-[48px] !min-h-[48px] !p-0"
          ariaLabel="Di chuyển xuống"
        >
          <DownIcon />
        </FocusableButton>
        
        <FocusableButton
          row={row}
          col={2}
          onSelect={onRemove}
          variant="ghost"
          size="sm"
          className="!min-w-[48px] !min-h-[48px] !p-0 text-red-400 hover:text-red-300"
          ariaLabel="Xóa khỏi hàng đợi"
        >
          <DeleteIcon />
        </FocusableButton>
      </div>
    </div>
  );
}

/**
 * QueueScreen component - Display and manage song queue
 * 
 * Requirements: 3.2 - Display current queue with song order, title, and thumbnail
 * Requirements: 3.5 - Allow reordering of songs
 * 
 * Features:
 * - Current song display
 * - Queue list with reorder capability
 * - Remove songs from queue
 * - TV-optimized navigation
 */
export function QueueScreen({ onBack, onPlaySong }: QueueScreenProps) {
  const items = useQueueStore((state) => state.items);
  const reorder = useQueueStore((state) => state.reorder);
  const remove = useQueueStore((state) => state.remove);
  const getCurrent = useQueueStore((state) => state.getCurrent);

  const currentSong = getCurrent();
  const waitingItems = items.filter(item => item.status === 'waiting');

  const handleMoveUp = useCallback((itemId: string, currentIndex: number) => {
    if (currentIndex > 0) {
      reorder(itemId, currentIndex - 1);
    }
  }, [reorder]);

  const handleMoveDown = useCallback((itemId: string, currentIndex: number) => {
    if (currentIndex < waitingItems.length - 1) {
      reorder(itemId, currentIndex + 1);
    }
  }, [reorder, waitingItems.length]);

  const handleRemove = useCallback((itemId: string) => {
    remove(itemId);
  }, [remove]);

  return (
    <NavigationGrid className="min-h-screen bg-tv-bg p-tv-4">
      <div className="max-w-5xl mx-auto">
        {/* Header with back button */}
        <header className="flex items-center gap-tv-3 mb-tv-4">
          <button
            onClick={onBack}
            className="tv-button flex items-center gap-2"
            aria-label="Quay lại"
          >
            <BackIcon />
            <span className="text-tv-xs">Quay lại</span>
          </button>
          <h1 className="text-tv-xl font-bold">Hàng đợi</h1>
          <span className="text-tv-sm text-secondary ml-auto">
            {waitingItems.length} bài chờ
          </span>
        </header>

        {/* Current song */}
        <CurrentSongDisplay currentSong={currentSong} />

        {/* Queue list */}
        <div className="tv-card">
          <h2 className="text-tv-sm font-semibold mb-tv-3">Danh sách chờ</h2>
          
          {waitingItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-tv-8 text-secondary">
              <span className="text-tv-3xl mb-tv-2">📋</span>
              <p className="text-tv-sm">Hàng đợi trống</p>
              <p className="text-tv-xs">Thêm bài hát từ trang tìm kiếm</p>
            </div>
          ) : (
            <div className="space-y-tv-1 max-h-[500px] overflow-y-auto hide-scrollbar">
              {waitingItems.map((item, index) => (
                <QueueItemRow
                  key={item.id}
                  item={item}
                  index={index}
                  row={index}
                  onMoveUp={() => handleMoveUp(item.id, index)}
                  onMoveDown={() => handleMoveDown(item.id, index)}
                  onRemove={() => handleRemove(item.id)}
                  canMoveUp={index > 0}
                  canMoveDown={index < waitingItems.length - 1}
                />
              ))}
            </div>
          )}
        </div>

        {/* Queue summary */}
        {waitingItems.length > 0 && (
          <div className="mt-tv-3 text-center">
            <p className="text-tv-xs text-secondary">
              Tổng thời gian: {formatDuration(
                waitingItems.reduce((total, item) => total + item.song.duration, 0)
              )}
            </p>
          </div>
        )}
      </div>
    </NavigationGrid>
  );
}

export default QueueScreen;
