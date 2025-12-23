'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import QRCode from 'qrcode';
import { NavigationGrid } from '@/components/NavigationGrid';
import { FocusableButton } from '@/components/FocusableButton';
import { LazyImage } from '@/components/LazyImage';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useQueueStore } from '@/stores/queueStore';
import type { Song } from '@/types/song';

export interface HomeScreenProps {
  sessionCode: string;
  onSearchSelect: () => void;
  onQueueSelect: () => void;
  onPopularSelect: () => void;
  onNowPlayingSelect?: () => void;
  onSummarySelect?: () => void;
  onPlayNow?: () => void;
  onGetSuggestions?: (videoIds: string[], maxResults?: number) => Promise<Song[]>;
  onAddToQueue?: (song: Song) => void;
  lastPlayedVideoId?: string; // Video vừa hát xong - dùng để lấy gợi ý
}

function SearchIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function QueueIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
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

function MusicIcon() {
  return (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
    </svg>
  );
}

function QRCodeDisplay({ code }: { code: string }) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [mobileUrl, setMobileUrl] = useState<string>('');

  useEffect(() => {
    if (code && code !== '----') {
      const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      const protocol = typeof window !== 'undefined' ? window.location.protocol : 'https:';
      const port = typeof window !== 'undefined' ? window.location.port : '3000';
      const url = `${protocol}//${hostname}:${port}/mobile?code=${code}`;
      setMobileUrl(url);
      
      QRCode.toDataURL(url, {
        width: 336,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      })
        .then((dataUrl) => setQrDataUrl(dataUrl))
        .catch((err) => console.error('QR Code error:', err));
    }
  }, [code]);

  return (
    <div className="flex flex-col items-center text-center">
      <div className="bg-white p-3 rounded-xl mb-4 shadow-lg">
        {qrDataUrl ? (
          <img src={qrDataUrl} alt="QR Code" className="w-[252px] h-[252px]" />
        ) : (
          <div className="w-[252px] h-[252px] flex items-center justify-center bg-gray-100">
            <span className="text-gray-400 text-base">Đang tạo...</span>
          </div>
        )}
      </div>
      <p className="text-base text-gray-400 mb-1">Quét QR hoặc nhập mã</p>
      <p className="text-5xl font-bold text-primary-500 tracking-widest mb-2">{code}</p>
      {mobileUrl && (
        <p className="text-xs text-gray-500 break-all leading-tight max-w-[252px]">
          {mobileUrl}
        </p>
      )}
    </div>
  );
}



export function HomeScreen({
  sessionCode,
  onSearchSelect,
  onQueueSelect,
  onNowPlayingSelect,
  onPlayNow,
  onGetSuggestions,
  onAddToQueue,
  lastPlayedVideoId,
}: HomeScreenProps) {
  const currentSong = useQueueStore((state) => state.getCurrent());
  const queueItems = useQueueStore((state) => state.items);
  const waitingCount = queueItems.filter(item => item.status === 'waiting').length;
  
  // Suggestions state
  const [suggestions, setSuggestions] = useState<Song[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const suggestionsContainerRef = useRef<HTMLDivElement>(null);
  const loadedIdsRef = useRef<Set<string>>(new Set());

  // Track current video ID to detect changes
  // Priority: lastPlayedVideoId (vừa hát xong) > currentSong (đang phát) > queue
  const primaryVideoId = lastPlayedVideoId || currentSong?.song.youtubeId || queueItems[0]?.song.youtubeId || '';
  const lastFetchedVideoIdRef = useRef<string>('');
  const initialLoadDone = useRef(false);

  // Load suggestions based on last played or current song
  // If no video, search for "karaoke 2025"
  useEffect(() => {
    console.log('[Home] useEffect - onGetSuggestions:', !!onGetSuggestions, 'primaryVideoId:', primaryVideoId, 'initialLoadDone:', initialLoadDone.current);
    
    if (!onGetSuggestions) {
      console.log('[Home] No onGetSuggestions callback');
      return;
    }
    
    // If no video yet, fetch popular karaoke (pass empty array to trigger search)
    if (!primaryVideoId) {
      if (initialLoadDone.current && suggestions.length > 0) {
        console.log('[Home] Already loaded initial suggestions');
        return;
      }
      
      console.log('[Home] No video yet, fetching popular karaoke');
      initialLoadDone.current = true;
      setIsLoadingSuggestions(true);
      
      onGetSuggestions([], 12) // Empty array triggers search fallback
        .then(results => {
          console.log('[Home] Got popular karaoke:', results.length);
          setSuggestions(results);
          loadedIdsRef.current = new Set(results.map(s => s.youtubeId));
        })
        .catch((err) => {
          console.error('[Home] Failed to get popular karaoke:', err);
          setSuggestions([]);
        })
        .finally(() => setIsLoadingSuggestions(false));
      return;
    }
    
    // Reset initial load flag when we have a video
    initialLoadDone.current = false;
    
    // Skip if we already fetched for this video
    if (primaryVideoId === lastFetchedVideoIdRef.current && suggestions.length > 0) {
      return;
    }
    
    console.log('[Home] Fetching suggestions for:', primaryVideoId);
    lastFetchedVideoIdRef.current = primaryVideoId;
    
    setIsLoadingSuggestions(true);
    setSuggestions([]); // Clear old suggestions
    loadedIdsRef.current.clear();
    
    // Build video IDs list - primary video first
    const videoIds = [primaryVideoId];
    if (currentSong && currentSong.song.youtubeId !== primaryVideoId) {
      videoIds.push(currentSong.song.youtubeId);
    }
    
    // Exclude videos already in queue
    const existingIds = new Set([
      primaryVideoId,
      ...queueItems.map(item => item.song.youtubeId),
    ]);
    
    onGetSuggestions(videoIds, 12)
      .then(results => {
        const filtered = results.filter(s => !existingIds.has(s.youtubeId));
        setSuggestions(filtered);
        loadedIdsRef.current = new Set(filtered.map(s => s.youtubeId));
      })
      .catch(() => setSuggestions([]))
      .finally(() => setIsLoadingSuggestions(false));
  }, [primaryVideoId, queueItems, onGetSuggestions]);

  // Load more suggestions when scrolling
  const loadMoreSuggestions = useCallback(async () => {
    if (!onGetSuggestions || isLoadingMore || suggestions.length === 0) return;
    
    const queueSongs = queueItems.map(item => item.song);
    if (currentSong) queueSongs.unshift(currentSong.song);
    if (queueSongs.length === 0) return;
    
    setIsLoadingMore(true);
    
    // Use last suggestion as seed for more
    const lastSuggestion = suggestions[suggestions.length - 1];
    const videoIds = [lastSuggestion.youtubeId];
    
    try {
      const results = await onGetSuggestions(videoIds, 8);
      const existingIds = new Set([
        ...queueSongs.map(s => s.youtubeId),
        ...Array.from(loadedIdsRef.current),
      ]);
      
      const newSuggestions = results.filter(s => !existingIds.has(s.youtubeId));
      
      if (newSuggestions.length > 0) {
        setSuggestions(prev => [...prev, ...newSuggestions]);
        newSuggestions.forEach(s => loadedIdsRef.current.add(s.youtubeId));
      }
    } catch (e) {
      console.log('[Home] Load more failed');
    } finally {
      setIsLoadingMore(false);
    }
  }, [onGetSuggestions, isLoadingMore, suggestions, queueItems, currentSong]);

  // Infinite scroll handler - auto load when near bottom (with debounce)
  const lastLoadTimeRef = useRef(0);
  
  useEffect(() => {
    const container = suggestionsContainerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      // Debounce: only load every 2 seconds
      const now = Date.now();
      if (now - lastLoadTimeRef.current < 2000) return;
      
      const { scrollTop, scrollHeight, clientHeight } = container;
      // Load more when scrolled 70% down
      if (scrollTop + clientHeight >= scrollHeight * 0.7 && !isLoadingMore) {
        lastLoadTimeRef.current = now;
        loadMoreSuggestions();
      }
    };
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [loadMoreSuggestions, isLoadingMore]);

  const handleAddSuggestion = useCallback((song: Song) => {
    if (!onAddToQueue) return;
    onAddToQueue(song);
    setAddedIds(prev => new Set(prev).add(song.youtubeId));
    setTimeout(() => {
      setAddedIds(prev => {
        const next = new Set(prev);
        next.delete(song.youtubeId);
        return next;
      });
    }, 2000);
  }, [onAddToQueue]);

  return (
    <NavigationGrid className="min-h-screen bg-tv-bg p-6 lg:p-8">
      <div className="max-w-6xl mx-auto h-full">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-3xl lg:text-4xl font-bold text-primary-500">Karaoke</h1>
          <div className="flex items-center gap-3">
            {waitingCount > 0 && (
              <span className="text-base bg-primary-600 text-white px-3 py-1 rounded-full whitespace-nowrap">
                {waitingCount} bài
              </span>
            )}
            <ThemeToggle />
          </div>
        </header>

        {/* Main content */}
        <div className="flex gap-6 lg:gap-8 items-start">
          {/* Left - QR Code */}
          <div className="bg-white/5 dark:bg-white/5 backdrop-blur rounded-2xl p-4 flex-shrink-0">
            <QRCodeDisplay code={sessionCode} />
          </div>

          {/* Right - Main content */}
          <div className="flex-1 flex flex-col gap-4 min-w-0 overflow-visible">
            {/* Now Playing - Top - 2 rows layout like search results */}
            {currentSong ? (
              <FocusableButton
                row={0}
                col={0}
                onSelect={onNowPlayingSelect || (() => {})}
                variant="ghost"
                className="!p-0 !min-h-0 !min-w-0 w-full text-left !rounded-2xl !overflow-hidden"
              >
                {/* Video with overlay - 16:9 */}
                <div className="relative w-full max-w-md p-2">
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden">
                    <LazyImage 
                      src={currentSong.song.thumbnail} 
                      alt={currentSong.song.title}
                      className="w-full h-full object-cover"
                      width={480}
                      height={270}
                      priority
                    />
                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    {/* "Đang phát" badge */}
                    <div className="absolute top-2 left-2 flex items-center gap-2 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <p className="text-xs text-green-400 font-medium">Đang phát</p>
                    </div>
                  </div>
                  {/* Song info below video */}
                  <div className="mt-2">
                    <p className="text-base font-semibold truncate">{currentSong.song.title}</p>
                    <p className="text-sm text-gray-400 truncate">{currentSong.song.channelName}</p>
                  </div>
                </div>
              </FocusableButton>
            ) : (
              <div className="bg-white/5 backdrop-blur rounded-2xl p-4">
                <p className="text-base text-gray-400 mb-3">Đang phát</p>
                <div className="flex flex-col items-center opacity-50 py-6">
                  <div className="w-24 h-24 bg-gray-700 rounded-xl flex items-center justify-center mb-3">
                    <MusicIcon />
                  </div>
                  <p className="text-lg text-gray-400">Chưa có bài hát</p>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-4">
              <FocusableButton
                row={1}
                col={0}
                onSelect={onSearchSelect}
                variant="primary"
                size="md"
                icon={<SearchIcon />}
                autoFocus
                className="flex-1 !whitespace-nowrap"
              >
                Tìm kiếm
              </FocusableButton>
              
              <FocusableButton
                row={1}
                col={1}
                onSelect={onQueueSelect}
                variant="secondary"
                size="md"
                icon={<QueueIcon />}
                className="flex-1 !whitespace-nowrap"
              >
                Hàng đợi {waitingCount > 0 && `(${waitingCount})`}
              </FocusableButton>
            </div>

            {/* Play Now button */}
            {waitingCount > 0 && !currentSong && onPlayNow && (
              <FocusableButton
                row={2}
                col={0}
                onSelect={onPlayNow}
                variant="primary"
                size="md"
                icon={<PlayIcon />}
                className="w-full !bg-green-500 hover:!bg-green-600"
              >
                Phát ngay ({waitingCount} bài)
              </FocusableButton>
            )}

            {/* Queue preview */}
            {waitingCount > 0 && (
              <div className="bg-white/5 dark:bg-white/5 backdrop-blur rounded-2xl p-4">
                <p className="text-base text-gray-400 mb-3">Tiếp theo</p>
                <div className="flex gap-3 overflow-x-auto hide-scrollbar p-1">
                  {queueItems
                    .filter(item => item.status === 'waiting')
                    .slice(0, 6)
                    .map((item, index) => {
                      // Row 2 if no PlayNow button, Row 3 if PlayNow button exists
                      const hasPlayNow = waitingCount > 0 && !currentSong && onPlayNow;
                      const queueRow = hasPlayNow ? 3 : 2;
                      return (
                        <FocusableButton
                          key={item.id}
                          row={queueRow}
                          col={index}
                          onSelect={onQueueSelect}
                          variant="ghost"
                          className="!p-0 !min-h-0 !min-w-0 flex-shrink-0 w-32 lg:w-36 text-left !rounded-lg"
                        >
                          <div className="w-full">
                            <LazyImage 
                              src={item.song.thumbnail} 
                              alt={item.song.title}
                              className="w-32 h-20 lg:w-36 lg:h-24 rounded-lg mb-1 object-cover"
                              width={144}
                              height={96}
                            />
                            <p className="text-base truncate">{item.song.title}</p>
                          </div>
                        </FocusableButton>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Suggestions - always show if available */}
            {suggestions.length > 0 && onAddToQueue && (
              <div className="bg-white/5 dark:bg-white/5 backdrop-blur rounded-2xl p-4 overflow-visible">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-base text-gray-400">Gợi ý cho bạn</p>
                  <p className="text-xs text-gray-500">{suggestions.length} bài</p>
                </div>
                <div 
                  ref={suggestionsContainerRef}
                  className="max-h-[400px] overflow-y-auto hide-scrollbar p-2"
                >
                  <div className="grid grid-cols-2 gap-3">
                    {suggestions.map((song, index) => {
                      const isAdded = addedIds.has(song.youtubeId);
                      // Calculate base row based on what's visible above
                      const hasPlayNow = waitingCount > 0 && !currentSong && onPlayNow;
                      const hasQueuePreview = waitingCount > 0;
                      let baseRow = 2;
                      if (hasPlayNow) baseRow++;
                      if (hasQueuePreview) baseRow++;
                      
                      // 2 columns
                      const suggestionRow = baseRow + Math.floor(index / 2);
                      const suggestionCol = index % 2;
                      
                      return (
                        <FocusableButton
                          key={song.youtubeId}
                          row={suggestionRow}
                          col={suggestionCol}
                          onSelect={() => {
                            if (!isAdded) {
                              handleAddSuggestion(song);
                            }
                            // Trigger load more when selecting items near the end
                            if (index >= suggestions.length - 4) {
                              loadMoreSuggestions();
                            }
                          }}
                          variant="ghost"
                          className={`!p-0 !min-h-0 !min-w-0 w-full text-left !rounded-xl !overflow-hidden ${
                            isAdded ? 'ring-2 ring-green-500' : ''
                          }`}
                        >
                          <div className="flex flex-col bg-white/5 w-full">
                            <div className="relative w-full aspect-video">
                              <LazyImage 
                                src={song.thumbnail} 
                                alt={song.title}
                                className="w-full h-full object-cover"
                                width={200}
                                height={112}
                              />
                              {isAdded ? (
                                <div className="absolute inset-0 bg-green-500/50 flex items-center justify-center">
                                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              ) : (
                                <div className="absolute top-1 right-1 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div className="p-2">
                              <p className="text-sm font-medium line-clamp-2 leading-tight">{song.title}</p>
                              <p className="text-xs text-gray-400 truncate mt-1">{song.channelName}</p>
                            </div>
                          </div>
                        </FocusableButton>
                      );
                    })}
                  </div>
                  
                  {/* Load more indicator */}
                  {isLoadingMore && (
                    <div className="flex items-center justify-center gap-2 py-4">
                      <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm text-gray-400">Đang tải thêm...</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Loading suggestions - show always when loading */}
            {isLoadingSuggestions && (
              <div className="flex items-center justify-center gap-2 py-4">
                <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-gray-400">Đang tải gợi ý...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </NavigationGrid>
  );
}

export default HomeScreen;
