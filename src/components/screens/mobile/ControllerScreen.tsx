'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
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
  /** Callback to get YouTube suggestions based on video IDs */
  onGetSuggestions?: (videoIds: string[]) => Promise<Song[]>;
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

// Default quick searches when no history
const DEFAULT_SEARCHES = ['Karaoke Việt', 'Ballad', 'Nhạc trẻ', 'Bolero', 'EDM', 'Rap Việt'];

/**
 * Extract keywords from search queries and song titles
 */
function extractKeywords(text: string): string[] {
  const keywords = text.toLowerCase()
    .replace(/karaoke|beat|lyrics|official|mv|music video|\(.*?\)|\[.*?\]/gi, '')
    .split(/[\s\-_,]+/)
    .filter(w => w.length > 2)
    .slice(0, 3);
  return keywords;
}

/**
 * Generate smart suggestions based on search history and added songs
 */
function generateSuggestions(
  searchHistory: string[],
  addedSongs: Song[],
  defaultSuggestions: string[]
): string[] {
  const suggestions: Map<string, number> = new Map();
  
  // Weight recent searches higher
  searchHistory.slice(0, 10).forEach((query, index) => {
    const weight = 10 - index;
    const keywords = extractKeywords(query);
    keywords.forEach(kw => {
      suggestions.set(kw, (suggestions.get(kw) || 0) + weight);
    });
    if (query.length <= 20) {
      suggestions.set(query, (suggestions.get(query) || 0) + weight * 2);
    }
  });
  
  // Add keywords from added songs
  addedSongs.slice(0, 5).forEach((song, index) => {
    const weight = 5 - index;
    const keywords = extractKeywords(song.title);
    keywords.forEach(kw => {
      suggestions.set(kw, (suggestions.get(kw) || 0) + weight);
    });
    if (song.channelName) {
      const channelKeywords = extractKeywords(song.channelName);
      channelKeywords.forEach(kw => {
        suggestions.set(kw, (suggestions.get(kw) || 0) + weight / 2);
      });
    }
  });
  
  const sorted = Array.from(suggestions.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([text]) => text)
    .filter(text => text.length > 2)
    .slice(0, 6);
  
  if (sorted.length < 4) {
    const remaining = defaultSuggestions.filter(d => !sorted.includes(d.toLowerCase()));
    return [...sorted, ...remaining].slice(0, 6);
  }
  
  return sorted;
}

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
      <div className="relative aspect-video w-full">
        <img
          src={song.thumbnail || `https://i.ytimg.com/vi/${song.youtubeId}/hqdefault.jpg`}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
        />
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
      <div className="p-2 text-left">
        <p className="font-medium text-sm line-clamp-2 text-slate-800 dark:text-white leading-tight">{song.title}</p>
        <p className="text-xs text-slate-500 dark:text-gray-400 truncate mt-1">{song.channelName}</p>
      </div>
    </button>
  );
}

/**
 * Compact now playing bar
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
      <img src={currentSong.song.thumbnail} alt="" className="w-10 h-10 object-cover rounded-lg" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white/70">Đang phát</p>
        <p className="text-sm font-medium text-white truncate">{currentSong.song.title}</p>
      </div>
      {onSkip && (
        <button onClick={onSkip} className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
          </svg>
        </button>
      )}
    </div>
  );
}

/**
 * ControllerScreen - Mobile controller with smart suggestions
 */
export function ControllerScreen({
  sessionCode, queue, currentSong, onSearch, onGetSuggestions, onAddToQueue, onViewQueue, onDisconnect, onPlay, onSkip,
}: ControllerScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [addedSongsSet, setAddedSongsSet] = useState<Set<string>>(new Set());
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [recentlyAddedSongs, setRecentlyAddedSongs] = useState<Song[]>([]);
  const [ytSuggestions, setYtSuggestions] = useState<Song[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentQueryRef = useRef<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const waitingCount = queue.filter(item => item.status === 'waiting').length;

  // Load YouTube suggestions when songs are added
  useEffect(() => {
    if (recentlyAddedSongs.length > 0 && onGetSuggestions) {
      console.log('[Controller] Loading suggestions for:', recentlyAddedSongs.slice(0, 3).map(s => s.youtubeId));
      setIsLoadingSuggestions(true);
      const videoIds = recentlyAddedSongs.slice(0, 3).map(s => s.youtubeId);
      onGetSuggestions(videoIds)
        .then(suggestions => {
          console.log('[Controller] Got suggestions:', suggestions.length);
          // Filter out songs already in queue or recently added
          const queueIds = new Set(queue.map(q => q.song.youtubeId));
          const addedIds = new Set(recentlyAddedSongs.map(s => s.youtubeId));
          const filtered = suggestions.filter(s => !queueIds.has(s.youtubeId) && !addedIds.has(s.youtubeId));
          console.log('[Controller] Filtered suggestions:', filtered.length);
          setYtSuggestions(filtered.slice(0, 6));
        })
        .catch((err) => {
          console.error('[Controller] Suggestions error:', err);
          setYtSuggestions([]);
        })
        .finally(() => setIsLoadingSuggestions(false));
    }
  }, [recentlyAddedSongs, onGetSuggestions]); // Remove queue dependency to avoid re-fetching

  // Generate smart keyword suggestions based on history
  const smartSuggestions = useMemo(() => 
    generateSuggestions(searchHistory, recentlyAddedSongs, DEFAULT_SEARCHES),
    [searchHistory, recentlyAddedSongs]
  );

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
      setApiError(null);
      currentQueryRef.current = value;
      
      try {
        const result = await onSearch(value);
        if (currentQueryRef.current === value) {
          setSearchResults(result.songs || []);
          setNextPageToken(result.nextPageToken);
        }
      } catch (err: any) {
        if (currentQueryRef.current === value) {
          setSearchResults([]);
          // Check for quota error
          if (err?.type === 'quota_exceeded' || err?.message?.includes('quota')) {
            setApiError('⚠️ YouTube API đã hết quota hôm nay. Vui lòng thử lại sau hoặc liên hệ admin.');
          }
        }
      } finally {
        if (currentQueryRef.current === value) setIsSearching(false);
      }
    }, 300);
  }, [onSearch]);

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

  const handleAddToQueue = useCallback((song: Song) => {
    onAddToQueue(song);
    setAddedSongsSet(prev => new Set(prev).add(song.youtubeId));
    
    // Save search query to history only when adding a song
    if (currentQueryRef.current.trim()) {
      setSearchHistory(prev => {
        const query = currentQueryRef.current.trim();
        const filtered = prev.filter(q => q.toLowerCase() !== query.toLowerCase());
        return [query, ...filtered].slice(0, 20);
      });
    }
    
    setRecentlyAddedSongs(prev => {
      const filtered = prev.filter(s => s.youtubeId !== song.youtubeId);
      return [song, ...filtered].slice(0, 10);
    });
    inputRef.current?.focus();
    setTimeout(() => {
      setAddedSongsSet(prev => {
        const next = new Set(prev);
        next.delete(song.youtubeId);
        return next;
      });
    }, 2000);
  }, [onAddToQueue]);

  const handleQuickSearch = useCallback((tag: string) => {
    setSearchQuery(tag);
    handleSearchChange(tag);
    inputRef.current?.focus();
  }, [handleSearchChange]);

  // Voice search - only available when no song is playing
  const canUseVoiceSearch = !currentSong;
  
  const startVoiceSearch = useCallback(() => {
    if (!canUseVoiceSearch) return;
    
    // Check for Web Speech API support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError('Trình duyệt không hỗ trợ tìm kiếm giọng nói');
      setTimeout(() => setVoiceError(null), 3000);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      
      recognition.lang = 'vi-VN'; // Vietnamese
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceError(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSearchQuery(transcript);
        
        // If final result, trigger search
        if (event.results[0].isFinal) {
          handleSearchChange(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('[Voice] Error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setVoiceError('Vui lòng cho phép truy cập microphone');
        } else if (event.error === 'no-speech') {
          setVoiceError('Không nghe thấy giọng nói');
        } else {
          setVoiceError('Lỗi nhận dạng giọng nói');
        }
        setTimeout(() => setVoiceError(null), 3000);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (error) {
      console.error('[Voice] Failed to start:', error);
      setVoiceError('Không thể khởi động tìm kiếm giọng nói');
      setTimeout(() => setVoiceError(null), 3000);
    }
  }, [canUseVoiceSearch, handleSearchChange]);

  const stopVoiceSearch = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-tv-bg flex flex-col">
      <header className="p-3 border-b border-slate-200 dark:border-tv-border sticky top-0 bg-white/95 dark:bg-tv-bg/95 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-primary-600 dark:text-primary-400">{sessionCode}</span>
          <div className="flex-1" />
          <button onClick={onDisconnect} className="text-xs text-slate-400 hover:text-red-500">Ngắt</button>
        </div>
        <div className="relative flex gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={isListening ? "Đang nghe..." : "Tìm bài hát..."}
              className={`w-full pl-9 pr-4 py-2.5 bg-slate-100 dark:bg-tv-card rounded-xl text-sm focus:ring-2 focus:ring-primary-500/30 border-0 ${
                isListening ? 'ring-2 ring-red-500/50' : ''
              }`}
              autoComplete="off"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          
          {/* Voice search button - only show when no song playing */}
          {canUseVoiceSearch && (
            <button
              onClick={isListening ? stopVoiceSearch : startVoiceSearch}
              className={`p-2.5 rounded-xl transition-all active:scale-95 ${
                isListening 
                  ? 'bg-red-500 text-white animate-pulse' 
                  : 'bg-slate-100 dark:bg-tv-card text-slate-600 dark:text-slate-300 hover:bg-primary-100 dark:hover:bg-tv-hover'
              }`}
              title={isListening ? "Dừng" : "Tìm bằng giọng nói"}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" 
                />
              </svg>
            </button>
          )}
        </div>
        
        {/* Voice error message */}
        {voiceError && (
          <p className="text-xs text-red-500 mt-1 text-center">{voiceError}</p>
        )}
      </header>

      {currentSong && (
        <div className="px-3 py-2 bg-white dark:bg-tv-surface border-b border-slate-100 dark:border-tv-border">
          <NowPlayingBar currentSong={currentSong} onSkip={onSkip} />
        </div>
      )}

      <main ref={scrollContainerRef} className="flex-1 overflow-y-auto p-3">
        {searchQuery.trim() ? (
          <div className="flex flex-col gap-3">
            {searchResults.map((song, i) => (
              <SongResultCard
                key={`${song.youtubeId}-${i}`}
                song={song}
                onAdd={() => handleAddToQueue(song)}
                isAdded={addedSongsSet.has(song.youtubeId)}
              />
            ))}
            {isLoadingMore && (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {!isSearching && searchResults.length === 0 && !apiError && (
              <p className="text-center text-slate-400 py-8">Không tìm thấy kết quả</p>
            )}
            {apiError && (
              <div className="text-center py-8 px-4">
                <span className="text-3xl mb-3 block">😢</span>
                <p className="text-amber-600 dark:text-amber-400 text-sm">{apiError}</p>
                <p className="text-slate-400 text-xs mt-2">Quota sẽ reset vào 0h (giờ Pacific)</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {waitingCount > 0 && !currentSong && onPlay && (
              <button
                onClick={onPlay}
                className="w-full py-4 bg-accent-green hover:bg-green-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                Phát ngay ({waitingCount} bài)
              </button>
            )}

            <div>
              <p className="text-xs text-slate-500 mb-2">
                {searchHistory.length > 0 ? '🔤 Từ khóa gợi ý' : 'Tìm nhanh'}
              </p>
              <div className="flex flex-wrap gap-2">
                {smartSuggestions.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleQuickSearch(tag)}
                    className="px-3 py-1.5 bg-white dark:bg-tv-card rounded-full text-sm hover:bg-primary-50 dark:hover:bg-tv-hover active:scale-95 transition-all border border-slate-200 dark:border-tv-border capitalize"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* YouTube Suggestions */}
            {ytSuggestions.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 mb-2">🎵 YouTube đề xuất</p>
                <div className="flex flex-col gap-2">
                  {ytSuggestions.map((song) => (
                    <button
                      key={song.youtubeId}
                      onClick={() => handleAddToQueue(song)}
                      disabled={addedSongsSet.has(song.youtubeId)}
                      className={`flex items-center gap-3 p-2 rounded-xl transition-all active:scale-[0.98] ${
                        addedSongsSet.has(song.youtubeId)
                          ? 'bg-accent-green/10 ring-1 ring-accent-green'
                          : 'bg-white dark:bg-tv-card hover:bg-slate-50 dark:hover:bg-tv-hover'
                      }`}
                    >
                      <img
                        src={song.thumbnail}
                        alt=""
                        className="w-16 h-12 object-cover rounded-lg"
                      />
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium text-slate-800 dark:text-white line-clamp-1">{song.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{song.channelName}</p>
                      </div>
                      {addedSongsSet.has(song.youtubeId) ? (
                        <svg className="w-5 h-5 text-accent-green flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-primary-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isLoadingSuggestions && (
              <div className="flex items-center justify-center gap-2 py-4">
                <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-slate-400">Đang tải gợi ý...</span>
              </div>
            )}

            {searchHistory.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 mb-2">🕐 Tìm gần đây</p>
                <div className="flex flex-wrap gap-2">
                  {searchHistory.slice(0, 5).map((query, i) => (
                    <button
                      key={`${query}-${i}`}
                      onClick={() => handleQuickSearch(query)}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-tv-surface rounded-full text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-tv-hover active:scale-95 transition-all"
                    >
                      {query}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!currentSong && waitingCount === 0 && (
              <div className="text-center py-8">
                <span className="text-4xl mb-3 block">🎵</span>
                <p className="text-slate-500">Tìm và thêm bài hát để bắt đầu</p>
              </div>
            )}
          </div>
        )}
      </main>

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