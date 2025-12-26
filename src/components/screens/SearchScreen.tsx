'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { NavigationGrid } from '@/components/NavigationGrid';
import { FocusableButton } from '@/components/FocusableButton';
import { LazyImage } from '@/components/LazyImage';
import type { Song } from '@/types/song';

export interface SearchScreenProps {
  onSongSelect: (song: Song) => void;
  onPlayNow?: (song: Song) => void;
  onBack: () => void;
  onSearch: (query: string, continuation?: string | null) => Promise<{ songs: Song[], continuation?: string | null }>;
  recentSearches?: string[];
  onRecentSearchSelect?: (query: string) => void;
  onGetSuggestions?: (videoIds: string[], maxResults?: number) => Promise<Song[]>;
  lastPlayedVideoId?: string;
}

const POPULAR_KEYWORDS = ['karaoke', 'beat', 'nhạc trẻ', 'bolero', 'remix', 'acoustic'];

function BackIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function MicIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function SongCard({ song, row, col, onSelect }: { 
  song: Song; row: number; col: number; onSelect: () => void;
}) {
  return (
    <FocusableButton
      row={row}
      col={col}
      onSelect={onSelect}
      variant="ghost"
      className="!p-0 !min-w-0 text-left !border-0 !rounded-lg"
    >
      <div className="flex flex-col w-full bg-white/5 rounded-lg overflow-hidden">
        {/* Fixed height thumbnail with 16:9 aspect ratio */}
        <div className="relative w-full aspect-video">
          <LazyImage 
            src={song.thumbnail} 
            alt={song.title}
            className="absolute inset-0 w-full h-full object-cover"
            width={320}
            height={180}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          {song.duration ? (
            <div className="absolute bottom-1 right-1 bg-black/70 px-1.5 py-0.5 rounded text-xs">
              {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}
            </div>
          ) : null}
        </div>
        <div className="p-2">
          <p className="text-sm font-medium line-clamp-2 leading-tight">{song.title}</p>
          <p className="text-xs text-gray-400 truncate mt-1">{song.channelName}</p>
        </div>
      </div>
    </FocusableButton>
  );
}

export function SearchScreen({
  onSongSelect,
  onPlayNow,
  onBack,
  onSearch,
  recentSearches = [],
  onRecentSearchSelect,
  onGetSuggestions,
  lastPlayedVideoId,
}: SearchScreenProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [suggestions, setSuggestions] = useState<Song[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  
  const [continuation, setContinuation] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Anti-spam refs
  const voiceErrorTimerRef = useRef<NodeJS.Timeout | null>(null);
  const voiceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastVoiceStartRef = useRef<number>(0);
  const voiceCooldownRef = useRef<boolean>(false);

  // Load suggestions
  useEffect(() => {
    if (!onGetSuggestions || hasSearched) return;
    
    setIsLoadingSuggestions(true);
    const videoIds = lastPlayedVideoId ? [lastPlayedVideoId] : [];
    
    onGetSuggestions(videoIds, 12)
      .then(results => {
        const filtered = lastPlayedVideoId 
          ? results.filter(s => s.youtubeId !== lastPlayedVideoId)
          : results;
        setSuggestions(filtered);
      })
      .catch(() => setSuggestions([]))
      .finally(() => setIsLoadingSuggestions(false));
  }, [onGetSuggestions, lastPlayedVideoId, hasSearched]);

  const doSearch = useCallback(async (searchQuery: string, loadMore = false) => {
    if (!searchQuery.trim()) return;
    
    // Blur input to hide keyboard
    inputRef.current?.blur();
    
    if (!loadMore) {
      setQuery(searchQuery);
      setCurrentQuery(searchQuery);
      setIsSearching(true);
      setHasSearched(true);
      setResults([]);
      setContinuation(null);
    } else {
      setIsLoadingMore(true);
    }
    
    try {
      const searchResults = await onSearch(searchQuery, loadMore ? continuation : undefined);
      
      if (loadMore) {
        setResults(prev => [...prev, ...searchResults.songs]);
      } else {
        setResults(searchResults.songs);
      }
      setContinuation(searchResults.continuation || null);
    } catch {
      if (!loadMore) setResults([]);
    } finally {
      setIsSearching(false);
      setIsLoadingMore(false);
    }
  }, [onSearch, continuation]);

  const loadMore = useCallback(() => {
    if (!continuation || isLoadingMore || !currentQuery) return;
    doSearch(currentQuery, true);
  }, [continuation, isLoadingMore, currentQuery, doSearch]);

  // Infinite scroll
  useEffect(() => {
    const container = resultsContainerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollTop + clientHeight >= scrollHeight * 0.8) {
        loadMore();
      }
    };
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [loadMore]);

  const handleRecentSearch = useCallback(async (searchQuery: string) => {
    onRecentSearchSelect?.(searchQuery);
    doSearch(searchQuery);
  }, [onRecentSearchSelect, doSearch]);

  const clearVoiceErrorAfterDelay = useCallback((delay: number) => {
    if (voiceErrorTimerRef.current) clearTimeout(voiceErrorTimerRef.current);
    voiceErrorTimerRef.current = setTimeout(() => setVoiceError(null), delay);
  }, []);

  // Voice search with anti-spam
  const startVoiceSearch = useCallback(() => {
    const now = Date.now();
    if (voiceCooldownRef.current || now - lastVoiceStartRef.current < 2000) return;
    lastVoiceStartRef.current = now;
    
    if (isListening || recognitionRef.current) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
        recognitionRef.current = null;
      }
      setIsListening(false);
      return;
    }
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError('Trình duyệt không hỗ trợ');
      clearVoiceErrorAfterDelay(3000);
      return;
    }

    voiceCooldownRef.current = true;
    setTimeout(() => { voiceCooldownRef.current = false; }, 1500);

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      
      recognition.lang = 'vi-VN';
      recognition.continuous = false;
      recognition.interimResults = true;

      let hasResult = false;
      let finalTranscript = '';
      let interimTranscript = '';

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceError(null);
        setVoiceText('');
        hasResult = false;
        finalTranscript = '';
        interimTranscript = '';
      };

      recognition.onresult = (event: any) => {
        hasResult = true;
        interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          if (result.isFinal) {
            finalTranscript = transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        const displayText = finalTranscript || interimTranscript;
        setVoiceText(displayText);
        setQuery(displayText);
        
        if (finalTranscript) {
          setIsListening(false);
          doSearch(finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        
        if (hasResult && (finalTranscript || interimTranscript)) {
          const searchText = finalTranscript || interimTranscript;
          if (searchText.trim()) {
            setVoiceText('');
            doSearch(searchText);
            return;
          }
        }
        
        setVoiceText('');
        
        const errorMessages: Record<string, string> = {
          'not-allowed': 'Cho phép mic trong cài đặt',
          'no-speech': 'Không nghe thấy',
          'audio-capture': 'Không tìm thấy mic',
          'network': 'Lỗi mạng',
        };
        
        if (event.error !== 'aborted') {
          setVoiceError(errorMessages[event.error] || `Lỗi: ${event.error}`);
          clearVoiceErrorAfterDelay(3000);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        if (!finalTranscript && interimTranscript?.trim()) {
          doSearch(interimTranscript);
        }
      };

      if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
      voiceTimeoutRef.current = setTimeout(() => {
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch {}
        }
      }, 10000);
      
      recognition.start();
    } catch {
      setVoiceError('Không thể khởi động mic');
      clearVoiceErrorAfterDelay(3000);
    }
  }, [isListening, doSearch, clearVoiceErrorAfterDelay]);

  const stopVoiceSearch = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (voiceErrorTimerRef.current) clearTimeout(voiceErrorTimerRef.current);
      if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
    };
  }, []);

  // Handle input submit
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) doSearch(query);
  }, [query, doSearch]);

  // Focus input when clicking search area
  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const displaySongs = hasSearched ? results : suggestions;
  const RESULTS_START_ROW = 2;

  return (
    <NavigationGrid className="h-screen bg-tv-bg overflow-hidden">
      <div className="w-full h-full flex flex-col p-3">
        {/* Header: Back | Search Input | Mic */}
        <header className="flex items-center gap-2 mb-3 flex-shrink-0">
          <FocusableButton
            row={0}
            col={0}
            onSelect={onBack}
            variant="secondary"
            size="sm"
            icon={<BackIcon />}
            className="!px-3 flex-shrink-0"
          >
            Quay lại
          </FocusableButton>
          
          {/* Search Input */}
          <form onSubmit={handleSubmit} className="flex-1 flex gap-2">
            <FocusableButton
              row={0}
              col={1}
              onSelect={focusInput}
              variant="ghost"
              className="!flex-1 !p-0 !min-h-0 !border-0"
            >
              <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2 w-full">
                <SearchIcon />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm bài hát..."
                  className="flex-1 bg-transparent outline-none text-white placeholder-gray-400"
                />
                {query && (
                  <button 
                    type="button"
                    onClick={() => setQuery('')}
                    className="text-gray-400 hover:text-white"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </FocusableButton>
            
            <FocusableButton
              row={0}
              col={2}
              onSelect={() => query.trim() && doSearch(query)}
              variant="primary"
              size="sm"
              icon={<SearchIcon />}
              className="!px-4 flex-shrink-0"
            >
              Tìm
            </FocusableButton>
          </form>
          
          {/* Mic button - auto focus */}
          <FocusableButton
            row={0}
            col={3}
            onSelect={isListening ? stopVoiceSearch : startVoiceSearch}
            variant="secondary"
            size="sm"
            icon={<MicIcon />}
            autoFocus
            className={`!px-3 flex-shrink-0 ${isListening ? '!bg-rose-500 !border-rose-500 animate-pulse' : ''}`}
          >
            {isListening ? 'Dừng' : 'Mic'}
          </FocusableButton>
        </header>

        {/* Voice indicator */}
        {isListening && (
          <div className="mb-2 flex-shrink-0">
            <div className="flex items-center justify-center gap-2 bg-rose-500/20 border border-rose-500/30 rounded-lg p-2">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <div 
                    key={i} 
                    className="w-1 bg-rose-500 rounded-full animate-pulse"
                    style={{ height: `${12 + Math.random() * 12}px`, animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
              <span className="text-sm text-rose-400">{voiceText || 'Đang nghe...'}</span>
            </div>
          </div>
        )}

        {/* Voice error */}
        {voiceError && (
          <div className="mb-2 flex-shrink-0">
            <div className="bg-red-500/20 text-red-400 px-3 py-2 rounded-lg text-center text-sm">
              {voiceError}
            </div>
          </div>
        )}

        {/* Quick tags */}
        {!hasSearched && (
          <div className="flex items-center gap-2 mb-3 flex-shrink-0 overflow-x-auto hide-scrollbar">
            <span className="text-xs text-gray-500 flex-shrink-0">Gợi ý:</span>
            {POPULAR_KEYWORDS.map((keyword, index) => (
              <FocusableButton
                key={keyword}
                row={1}
                col={index}
                onSelect={() => doSearch(keyword)}
                variant="ghost"
                size="sm"
                className="!bg-white/5 !px-2 !py-1 !text-xs flex-shrink-0"
              >
                {keyword}
              </FocusableButton>
            ))}
            {recentSearches.slice(0, 3).map((search, index) => (
              <FocusableButton
                key={`recent-${index}`}
                row={1}
                col={POPULAR_KEYWORDS.length + index}
                onSelect={() => handleRecentSearch(search)}
                variant="ghost"
                size="sm"
                className="!bg-primary-500/20 !text-primary-300 !px-2 !py-1 !text-xs flex-shrink-0"
              >
                {search}
              </FocusableButton>
            ))}
          </div>
        )}

        {/* Results header */}
        {hasSearched && (
          <div className="mb-2 flex-shrink-0">
            <span className="text-sm text-gray-400">
              {isSearching ? 'Đang tìm...' : `Kết quả: "${currentQuery}"`}
            </span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {isSearching || isLoadingSuggestions ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-gray-400 text-sm">Đang tải...</span>
              </div>
            </div>
          ) : displaySongs.length > 0 ? (
            <div ref={resultsContainerRef} className="h-full overflow-y-auto hide-scrollbar">
              <div className="grid grid-cols-3 gap-3 p-1">
                {displaySongs.map((song, index) => (
                  <SongCard
                    key={song.youtubeId}
                    song={song}
                    row={RESULTS_START_ROW + Math.floor(index / 3)}
                    col={index % 3}
                    onSelect={() => onPlayNow ? onPlayNow(song) : onSongSelect(song)}
                  />
                ))}
              </div>
              
              {isLoadingMore && (
                <div className="flex items-center justify-center gap-2 py-4">
                  <div className="w-5 h-5 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-gray-400 text-sm">Đang tải thêm...</span>
                </div>
              )}
              
              {continuation && !isLoadingMore && hasSearched && (
                <div className="flex justify-center py-3">
                  <FocusableButton
                    row={RESULTS_START_ROW + Math.ceil(displaySongs.length / 3)}
                    col={1}
                    onSelect={loadMore}
                    variant="secondary"
                    size="sm"
                    className="!px-6"
                  >
                    Tải thêm
                  </FocusableButton>
                </div>
              )}
            </div>
          ) : hasSearched ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <p className="text-lg text-gray-400 mb-1">Không tìm thấy</p>
                <p className="text-sm text-gray-500">Thử từ khóa khác</p>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <MicIcon className="w-12 h-12 mx-auto mb-3 text-primary-400" />
                <p className="text-base text-gray-300 mb-1">Tìm bài hát</p>
                <p className="text-sm text-gray-500">Nhập tên hoặc dùng mic</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </NavigationGrid>
  );
}

export default SearchScreen;
