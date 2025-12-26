'use client';

import React, { useCallback } from 'react';
import { NavigationGrid } from '@/components/NavigationGrid';
import { FocusableButton } from '@/components/FocusableButton';
import { LazyImage } from '@/components/LazyImage';
import { useQueueStore } from '@/stores/queueStore';
import type { QueueItem } from '@/types/queue';

export interface QueueScreenProps {
  onBack: () => void;
  onPlaySong?: (item: QueueItem) => void;
}

function BackIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function UpIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  );
}

function DownIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ReplayIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
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

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function CurrentSongDisplay({ currentSong }: { currentSong: QueueItem | null }) {
  if (!currentSong) {
    return (
      <div className="bg-white/5 rounded-2xl p-4 mb-4">
        <p className="text-sm text-gray-400 mb-2">Đang phát</p>
        <div className="flex items-center gap-4 opacity-50">
          <div className="w-24 h-16 bg-gray-700 rounded-lg flex items-center justify-center">
            <MusicIcon />
          </div>
          <p className="text-base text-gray-400">Chưa có bài hát</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 rounded-2xl p-4 mb-4 ring-2 ring-primary-500">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <p className="text-sm text-green-500">Đang phát</p>
      </div>
      <div className="flex items-center gap-4">
        <LazyImage 
          src={currentSong.song.thumbnail} 
          alt={currentSong.song.title}
          className="w-24 h-16 rounded-lg object-cover"
          width={96}
          height={64}
          priority
        />
        <div className="flex-1 min-w-0">
          <p className="text-lg font-semibold truncate">{currentSong.song.title}</p>
          <p className="text-sm text-gray-400 truncate">{currentSong.song.channelName}</p>
          <p className="text-xs text-gray-500">
            {currentSong.addedBy} • {formatDuration(currentSong.song.duration)}
          </p>
        </div>
      </div>
    </div>
  );
}

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
    <div className="flex items-center gap-3 p-2 bg-white/5 rounded-xl mb-2">
      <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
        <span className="text-sm font-medium text-gray-400">{index + 1}</span>
      </div>

      <LazyImage 
        src={item.song.thumbnail} 
        alt={item.song.title}
        className="w-16 h-10 rounded-lg object-cover flex-shrink-0"
        width={64}
        height={40}
      />
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.song.title}</p>
        <p className="text-xs text-gray-400 truncate">
          {item.song.channelName} • {formatDuration(item.song.duration)}
        </p>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <FocusableButton
          row={row}
          col={0}
          onSelect={onMoveUp}
          variant="ghost"
          size="sm"
          disabled={!canMoveUp}
          className="!min-w-[36px] !min-h-[36px] !p-0"
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
          className="!min-w-[36px] !min-h-[36px] !p-0"
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
          className="!min-w-[36px] !min-h-[36px] !p-0 text-red-400"
          ariaLabel="Xóa"
        >
          <DeleteIcon />
        </FocusableButton>
      </div>
    </div>
  );
}

export function QueueScreen({ onBack }: QueueScreenProps) {
  const items = useQueueStore((state) => state.items);
  const reorder = useQueueStore((state) => state.reorder);
  const remove = useQueueStore((state) => state.remove);
  const replay = useQueueStore((state) => state.replay);
  const getCurrent = useQueueStore((state) => state.getCurrent);

  const currentSong = getCurrent();
  const waitingItems = items.filter(item => item.status === 'waiting');
  const completedItems = items.filter(item => item.status === 'completed');

  const handleMoveUp = useCallback((itemId: string, currentIndex: number) => {
    if (currentIndex > 0) reorder(itemId, currentIndex - 1);
  }, [reorder]);

  const handleMoveDown = useCallback((itemId: string, currentIndex: number) => {
    if (currentIndex < waitingItems.length - 1) reorder(itemId, currentIndex + 1);
  }, [reorder, waitingItems.length]);

  const handleRemove = useCallback((itemId: string) => {
    remove(itemId);
  }, [remove]);

  const handleReplay = useCallback((item: QueueItem) => {
    replay(item.song, 'TV User');
  }, [replay]);

  // Calculate row offset for completed items section
  const completedRowOffset = waitingItems.length + 2; // +2 for header and spacing

  return (
    <NavigationGrid className="min-h-screen bg-tv-bg p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="flex items-center gap-4 mb-6">
          <FocusableButton
            row={0}
            col={0}
            onSelect={onBack}
            variant="secondary"
            size="sm"
            icon={<BackIcon />}
            autoFocus
            className="!min-w-0 !px-3"
          >
            Quay lại
          </FocusableButton>
          <h1 className="text-2xl font-bold">Hàng đợi</h1>
          <span className="text-sm text-gray-400 ml-auto">
            {waitingItems.length} bài chờ
          </span>
        </header>

        {/* Current song */}
        <CurrentSongDisplay currentSong={currentSong} />

        {/* Queue list */}
        <div className="bg-white/5 rounded-2xl p-4">
          <p className="text-sm text-gray-400 mb-3">Danh sách chờ</p>
          
          {waitingItems.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <MusicIcon />
              <p className="text-sm mt-2">Hàng đợi trống</p>
            </div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto hide-scrollbar">
              {waitingItems.map((item, index) => (
                <QueueItemRow
                  key={item.id}
                  item={item}
                  index={index}
                  row={index + 1}
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

        {/* Completed songs - can replay */}
        {completedItems.length > 0 && (
          <div className="bg-white/5 rounded-2xl p-4 mt-4">
            <p className="text-sm text-gray-400 mb-3">Đã hát ({completedItems.length})</p>
            <div className="max-h-[200px] overflow-y-auto hide-scrollbar">
              {completedItems.map((item, index) => (
                <div key={item.id} className="flex items-center gap-3 p-2 bg-white/5 rounded-xl mb-2 opacity-70 hover:opacity-100 transition-opacity">
                  <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-sm text-green-400">✓</span>
                  </div>

                  <LazyImage 
                    src={item.song.thumbnail} 
                    alt={item.song.title}
                    className="w-16 h-10 rounded-lg object-cover flex-shrink-0"
                    width={64}
                    height={40}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.song.title}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {item.song.channelName} • {formatDuration(item.song.duration)}
                    </p>
                  </div>

                  <FocusableButton
                    row={completedRowOffset + index}
                    col={0}
                    onSelect={() => handleReplay(item)}
                    variant="secondary"
                    size="sm"
                    className="!min-w-[80px] !px-3 text-primary-400"
                    ariaLabel="Hát lại"
                  >
                    <ReplayIcon />
                    <span className="ml-1">Hát lại</span>
                  </FocusableButton>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Total time */}
        {waitingItems.length > 0 && (
          <p className="text-center text-xs text-gray-500 mt-3">
            Tổng: {formatDuration(waitingItems.reduce((t, i) => t + i.song.duration, 0))}
          </p>
        )}
      </div>
    </NavigationGrid>
  );
}

export default QueueScreen;
