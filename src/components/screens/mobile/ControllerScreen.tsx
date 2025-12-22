'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { Song } from '@/types/song';
import type { QueueItem } from '@/types/queue';

/**
 * Props for ControllerScreen component
 */
export interface ControllerScreenProps {
  /** Session code for display */
  sessionCode: string;
  /** Current queue items */
  queue: QueueItem[];
  /** Currently playing song */
  currentSong: QueueItem | null;
  /** Callback to search for songs */
  onSearch: (query: string, pageToken?: string) => Promise<{ songs: Song[]; nextPageToken?: string }>;
  /** Callback when a song is added to queue */
  onAddToQueue: (song: Song) => void;
  /** Callback to view full queue */
  onViewQueue: () => void;
  /** Callback to disconnect */
  onDisconnect: () => void;
  /** Callback to request play */
  onPlay?: () => void;
  /** Callback to request pause */
  onPause?: () => void;
  /** Callback to request skip */
  onSkip?: () => void;
}

// Popular search suggestions - optimized for karaoke
const QUICK_SEARCHES = ['Karaoke Việt', 'Ballad', 'Nhạc trẻ', 'Bolero', 'EDM', 'Rap Việt'];

/**
 * Song result card - Vertical layout: image on top, text below
 */
function SongResultCard({
  song,
  onAdd,
  isAdded,
}: {
  song: Song;
  onAdd: () => void;
  isAdded: boolean;
}) {
  return (
    <button
      onClick={onAdd}
      disabled={isAdded}
      className={`w-full rounded-xl overflow-hidden transition-all active:scale-[0.97] ${
        isAdded 
          ? 'ring-2 ring-accent-green' 
          : 'bg-white dark:bg-tv-card shadow-sm hover:shadow-md'
      }`}
    >
      {/* Thumbnail - 16:9 aspect ratio */}
      <div className="relative aspect-video w-full">
        <img
          src={song.thumbnail || `https://i.ytimg.com/vi/${song.youtubeId}/hqdefault.jpg`}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {/* Add indicator overlay */}
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${
          isAdded ? 'bg-accent-green/80' : 'bg-black/0 hover:bg-black/20'
        }`}>
          {isAdded ? (
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
              <svg className="w-6 h-6 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary-500/90 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          )}
        </div>
      </div>
      {/* Song info */}
      <div className="p-2 text-left">
        <p className="font-medium text-sm line-clamp-2 text-slate-800 dark:text-white leading-tight">{song.title}</p>
        <p className="text-xs text-slate-500 dark:text-gray-400 truncate mt-1">{song.channelName}</p>
      </div>
    </button>
  );
}

/**
 * Compact now playing bar - minimal, always visible when playing
 */
function NowPlayingBar({ 
  currentSong,
  onSkip,
}: { 
  currentSong: QueueItem;
  onSkip?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-2 bg-primary-500 rounded-xl">
      <img
        src={currentSong.song.thumbnail}
        alt=""
        className="w-10 h-10 object-cover rounded-lg"
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white/70">Đang phát</p>
        <p className="text-sm font-medium text-white truncate">{currentSong.song.title}</p>
      </div>
      {onSkip && (
        <button
          onClick={onSkip}
          className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
          </svg>
        </button>
      )}
    </div>
  );
}

/**
 * ControllerScreen component - Simplified mobile controller
 * Focus: Search → Add → Auto-play
 */
export function ControllerScreen({
  sessionCode,
  queue,
  currentSong,
  onSearch,
  onAddToQueue,
  onViewQueue,
  onDisconnect,
  onPlay,
  onSkip,
}: ControllerScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [addedSongs, setAddedSongs] = useState<Set<string>>(new Set());
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentQueryRef = useRef<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const waitingCount = queue.filter(item => item.status === 'waiting').length;

  // Debounced search - faster response
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!value.trim()) {
      setSearchResults([]);
      setNextPageToken(undefined);
      currentQueryRef.current = '';
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      currentQueryRef.current = value;
      
      try {
        const result = await onSearch(value);
        if (currentQueryRef.current === value) {
          setSearchResults(result.songs || []);
          setNextPageToken(result.nextPageToken);
        }
      } catch {
        if (currentQueryRef.current === value) setSearchResults([]);
      } finally {
        if (currentQueryRef.current === value) setIsSearching(false);
      }
    }, 300);
  }, [onSearch]);

  // Load more
  const loadMore = useCallback(async () => {
    if (!nextPageToken || isLoadingMore || !currentQueryRef.current) return;
    setIsLoadingMore(true);
    try {
      const result = await onSearch(currentQueryRef.current, nextPageToken);
      setSearchResults(prev => [...prev, ...(result.songs || [])]);
      setNextPageToken(result.nextPageToken);
    } catch { /* ignore */ }
    setIsLoadingMore(false);
  }, [nextPageToken, isLoadingMore, onSearch]);

  // Infinite scroll
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollHeight - scrollTop - clientHeight < 200) loadMore();
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [loadMore]);

  // Add to queue with visual feedback - focus input after adding
  const handleAddToQueue = useCallback((song: Song) => {
    onAddToQueue(song);
    setAddedSongs(prev => new Set(prev).add(song.youtubeId));
    // Focus input after adding song
    inputRef.current?.focus();
    setTimeout(() => {
      setAddedSongs(prev => {
        const next = new Set(prev);
        next.delete(song.youtubeId);
        return next;
      });
    }, 2000);
  }, [onAddToQueue]);

  // Quick search tag click
  const handleQuickSearch = useCallback((tag: string) => {
    setSearchQuery(tag);
    handleSearchChange(tag);
    inputRef.current?.focus();
  }, [handleSearchChange]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-tv-bg flex flex-col">
      {/* Compact header */}
      <header className="p-3 border-b border-slate-200 dark:border-tv-border sticky top-0 bg-white/95 dark:bg-tv-bg/95 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🎤</span>
          <span className="text-sm font-medium text-primary-600 dark:text-primary-400">{sessionCode}</span>
          <div className="flex-1" />
          <button onClick={onDisconnect} className="text-xs text-slate-400 hover:text-red-500">
            Ngắt
          </button>
        </div>

        {/* Search input */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="search"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Tìm bài hát..."
            className="w-full pl-9 pr-4 py-2.5 bg-slate-100 dark:bg-tv-card rounded-xl text-sm focus:ring-2 focus:ring-primary-500/30 border-0"
            autoComplete="off"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </header>

      {/* Now playing bar - compact, always visible when playing */}
      {currentSong && (
        <div className="px-3 py-2 bg-white dark:bg-tv-surface border-b border-slate-100 dark:border-tv-border">
          <NowPlayingBar currentSong={currentSong} onSkip={onSkip} />
        </div>
      )}

      {/* Main content */}
      <main ref={scrollContainerRef} className="flex-1 overflow-y-auto p-3">
        {searchQuery.trim() ? (
          <div className="flex flex-col gap-3">
            {searchResults.map((song, i) => (
              <SongResultCard
                key={`${song.youtubeId}-${i}`}
                song={song}
                onAdd={() => handleAddToQueue(song)}
                isAdded={addedSongs.has(song.youtubeId)}
              />
            ))}
            {isLoadingMore && (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {!isSearching && searchResults.length === 0 && (
              <p className="text-center text-slate-400 py-8">Không tìm thấy kết quả</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Play button if queue has songs but not playing */}
            {waitingCount > 0 && !currentSong && onPlay && (
              <button
                onClick={onPlay}
                className="w-full py-4 bg-accent-green hover:bg-green-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Phát ngay ({waitingCount} bài)
              </button>
            )}

            {/* Quick search tags */}
            <div>
              <p className="text-xs text-slate-500 mb-2">Tìm nhanh</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_SEARCHES.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleQuickSearch(tag)}
                    className="px-3 py-1.5 bg-white dark:bg-tv-card rounded-full text-sm hover:bg-primary-50 dark:hover:bg-tv-hover active:scale-95 transition-all border border-slate-200 dark:border-tv-border"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Empty state */}
            {!currentSong && waitingCount === 0 && (
              <div className="text-center py-8">
                <span className="text-4xl mb-3 block">🎵</span>
                <p className="text-slate-500">Tìm và thêm bài hát để bắt đầu</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom bar - Queue button */}
      <footer className="p-3 border-t border-slate-200 dark:border-tv-border bg-white dark:bg-tv-surface">
        <button
          onClick={onViewQueue}
          className="w-full py-3 bg-slate-100 dark:bg-tv-card hover:bg-slate-200 dark:hover:bg-tv-hover rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          <span>Hàng đợi</span>
          {waitingCount > 0 && (
            <span className="px-2 py-0.5 bg-primary-500 text-white rounded-full text-xs">{waitingCount}</span>
          )}
        </button>
      </footer>
    </div>
  );
}

export default ControllerScreen;
