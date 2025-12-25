'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { NavigationGrid } from '@/components/NavigationGrid';
import { FocusableButton } from '@/components/FocusableButton';
import { LazyImage } from '@/components/LazyImage';
import type { Song } from '@/types/song';

export interface SearchScreenProps {
  onSongSelect: (song: Song) => void;
  onBack: () => void;
  onSearch: (query: string, continuation?: string | null) => Promise<{ songs: Song[], continuation?: string | null }>;
  recentSearches?: string[];
  onRecentSearchSelect?: (query: string) => void;
  onGetSuggestions?: (videoIds: string[], maxResults?: number) => Promise<Song[]>;
  lastPlayedVideoId?: string;
}

const KEYBOARD_LAYOUT = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', '⌫'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M', ' ', '🔍'],
];

const POPULAR_KEYWORDS = ['karaoke', 'beat', 'nhạc trẻ', 'bolero', 'remix', 'acoustic'];

function BackIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function MicIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  );
}

function KeyboardIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect x="2" y="6" width="20" height="12" rx="2" strokeWidth={2} />
      <path strokeLinecap="round" strokeWidth={2} d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8" />
    </svg>
  );
}

function SongCard({ song, row, col, onSelect, isLarge = false }: { 
  song: Song; row: number; col: number; onSelect: () => void; isLarge?: boolean 
}) {
  return (
    <FocusableButton
      row={row}
      col={col}
      onSelect={onSelect}
      variant="ghost"
      className={`!p-0 !min-w-0 text-left !border-0 !rounded-xl ${
        isLarge ? '!min-h-[200px]' : '!min-h-[180px]'
      }`}
    >
      <div className="flex flex-col w-full h-full bg-white/5 rounded-xl overflow-hidden">
        <div className={`relative w-full ${isLarge ? 'h-[140px]' : 'h-[120px]'}`}>
          <LazyImage 
            src={song.thumbnail} 
            alt={song.title}
            className="w-full h-full object-cover"
            width={320}
            height={180}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          {song.duration ? (
            <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-0.5 rounded text-xs">
              {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}
            </div>
          ) : null}
        </div>
        <div className="p-2 flex-1">
          <p className="text-sm font-medium line-clamp-2 leading-tight">{song.title}</p>
          <p className="text-xs text-gray-400 truncate mt-1">{song.channelName}</p>
        </div>
      </div>
    </FocusableButton>
  );
}

function OnScreenKeyboard({ 
  onKeyPress, 
  startRow,
  query 
}: { 
  onKeyPress: (key: string) => void; 
  startRow: number;
  query: string;
}) {
  return (
    <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-4">
      {/* Search input display */}
      <div className="bg-black/30 rounded-xl p-3 mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <div className="flex-1 min-h-[28px] flex items-center">
            {query ? (
              <span className="text-base">{query}</span>
            ) : (
              <span className="text-base text-gray-500">Nhập tên bài hát...</span>
            )}
            <span className="w-0.5 h-5 bg-primary-400 animate-pulse ml-1" />
          </div>
          {query && (
            <button 
              onClick={() => onKeyPress('CLEAR')}
              className="text-gray-400 hover:text-white p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Keyboard grid */}
      <div className="space-y-1">
        {KEYBOARD_LAYOUT.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-1 justify-center">
            {row.map((key, colIndex) => (
              <FocusableButton
                key={`${rowIndex}-${colIndex}`}
                row={startRow + rowIndex}
                col={colIndex}
                onSelect={() => onKeyPress(key)}
                variant="secondary"
                size="sm"
                className={`!min-w-[44px] !min-h-[44px] !px-2 !text-base font-medium ${
                  key === ' ' ? '!min-w-[88px]' : ''
                } ${key === '🔍' ? '!bg-primary-600 hover:!bg-primary-500 !text-white !min-w-[88px]' : ''
                } ${key === '⌫' ? '!bg-red-600/50 hover:!bg-red-500' : ''}`}
              >
                {key === ' ' ? 'Space' : key === '🔍' ? 'Tìm' : key}
              </FocusableButton>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SearchScreen({
  onSongSelect,
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
  
  const [suggestions, setSuggestions] = useState<Song[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  
  // Pagination state
  const [continuation, setContinuation] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');
  const resultsContainerRef = useRef<HTMLDivElement>(null);

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
    
    if (!loadMore) {
      setQuery(searchQuery);
      setCurrentQuery(searchQuery);
      setIsSearching(true);
      setHasSearched(true);
      setShowKeyboard(false);
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

  // Load more when scrolling
  const loadMore = useCallback(() => {
    if (!continuation || isLoadingMore || !currentQuery) return;
    doSearch(currentQuery, true);
  }, [continuation, isLoadingMore, currentQuery, doSearch]);

  // Infinite scroll handler
  useEffect(() => {
    const container = resultsContainerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      // Load more when scrolled 80% down
      if (scrollTop + clientHeight >= scrollHeight * 0.8) {
        loadMore();
      }
    };
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [loadMore]);

  const handleKeyPress = useCallback(async (key: string) => {
    if (key === 'CLEAR') {
      setQuery('');
    } else if (key === '⌫') {
      setQuery(prev => prev.slice(0, -1));
    } else if (key === '🔍') {
      if (query.trim()) {
        doSearch(query);
      }
    } else {
      setQuery(prev => prev + key);
    }
  }, [query, doSearch]);

  const handleRecentSearch = useCallback(async (searchQuery: string) => {
    onRecentSearchSelect?.(searchQuery);
    doSearch(searchQuery);
  }, [onRecentSearchSelect, doSearch]);

  // Voice search
  const startVoiceSearch = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError('Trình duyệt không hỗ trợ nhận dạng giọng nói');
      setTimeout(() => setVoiceError(null), 3000);
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      
      recognition.lang = 'vi-VN';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 3;

      let hasResult = false;
      let finalTranscript = '';
      let interimTranscript = '';

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceError(null);
        setVoiceText('');
        setShowKeyboard(false);
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
          'not-allowed': 'Cho phép microphone trong cài đặt trình duyệt',
          'permission-denied': 'Cho phép microphone trong cài đặt trình duyệt',
          'no-speech': 'Không nghe thấy. Nói to và rõ hơn.',
          'audio-capture': 'Không tìm thấy microphone.',
          'network': 'Lỗi mạng. Kiểm tra internet.',
          'service-not-allowed': 'Dịch vụ không khả dụng.',
        };
        
        if (event.error !== 'aborted') {
          setVoiceError(errorMessages[event.error] || `Lỗi: ${event.error}`);
          setTimeout(() => setVoiceError(null), 4000);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        if (!finalTranscript && interimTranscript?.trim()) {
          doSearch(interimTranscript);
        }
      };

      setTimeout(() => {
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch {}
        }
      }, 10000);
      
      recognition.start();
    } catch (err: any) {
      setVoiceError(`Không thể khởi động mic`);
      setTimeout(() => setVoiceError(null), 3000);
    }
  }, [doSearch]);

  const stopVoiceSearch = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  const displaySongs = hasSearched ? results : suggestions;
  const KEYBOARD_ROWS = KEYBOARD_LAYOUT.length;
  const resultsStartRow = showKeyboard ? KEYBOARD_ROWS + 2 : 2;

  return (
    <NavigationGrid className="h-screen bg-tv-bg overflow-hidden">
      <div className="w-full h-full flex flex-col p-3">
        {/* Header */}
        <header className="flex items-center gap-3 mb-3 flex-shrink-0">
          <FocusableButton
            row={0}
            col={0}
            onSelect={onBack}
            variant="secondary"
            size="sm"
            icon={<BackIcon />}
            className="!px-3"
          >
            Quay lại
          </FocusableButton>
          
          <h1 className="text-xl font-bold flex-1">Tìm kiếm bài hát</h1>
          
          {/* Voice search button */}
          <FocusableButton
            row={0}
            col={1}
            onSelect={isListening ? stopVoiceSearch : startVoiceSearch}
            variant="secondary"
            size="md"
            icon={<MicIcon className="w-5 h-5" />}
            autoFocus
            className={`!px-4 !bg-rose-500 !text-white !border-rose-500 ${
              isListening ? '!bg-rose-600 animate-pulse' : ''
            }`}
          >
            {isListening ? 'Đang nghe...' : 'Tìm giọng nói'}
          </FocusableButton>
          
          {/* Keyboard toggle */}
          <FocusableButton
            row={0}
            col={2}
            onSelect={() => setShowKeyboard(!showKeyboard)}
            variant={showKeyboard ? "primary" : "secondary"}
            size="sm"
            icon={<KeyboardIcon />}
            className="!px-3"
          >
            {showKeyboard ? 'Ẩn' : 'Bàn phím'}
          </FocusableButton>
        </header>

        {/* Voice listening indicator */}
        {isListening && (
          <div className="mb-3 flex-shrink-0">
            <div className="flex items-center justify-center gap-2 bg-red-500/20 border border-red-500/30 rounded-xl p-3">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <div 
                    key={i} 
                    className="w-1 bg-red-500 rounded-full animate-pulse"
                    style={{ 
                      height: `${16 + Math.random() * 16}px`,
                      animationDelay: `${i * 0.1}s` 
                    }}
                  />
                ))}
              </div>
              <span className="text-base font-medium text-red-400">
                {voiceText || 'Hãy nói tên bài hát...'}
              </span>
            </div>
          </div>
        )}

        {/* Voice error */}
        {voiceError && (
          <div className="mb-3 flex-shrink-0">
            <div className="bg-red-500/20 border border-red-500/30 text-red-400 px-3 py-2 rounded-xl text-center text-sm">
              {voiceError}
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
          {/* Keyboard panel - slide in from left */}
          {showKeyboard && (
            <div className="w-[420px] flex-shrink-0 flex flex-col gap-3">
              <OnScreenKeyboard 
                onKeyPress={handleKeyPress} 
                startRow={1}
                query={query}
              />
              
              {/* Quick search tags */}
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-sm text-gray-400 mb-2">Tìm nhanh</p>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_KEYWORDS.map((keyword, index) => (
                    <FocusableButton
                      key={keyword}
                      row={KEYBOARD_ROWS + 1}
                      col={index}
                      onSelect={() => doSearch(keyword)}
                      variant="ghost"
                      size="sm"
                      className="!bg-primary-500/20 !text-primary-300 !px-3"
                    >
                      {keyword}
                    </FocusableButton>
                  ))}
                </div>
                
                {recentSearches.length > 0 && (
                  <>
                    <p className="text-sm text-gray-400 mb-2 mt-3">Gần đây</p>
                    <div className="flex flex-wrap gap-2">
                      {recentSearches.slice(0, 4).map((search, index) => (
                        <FocusableButton
                          key={`recent-${index}`}
                          row={KEYBOARD_ROWS + 2}
                          col={index}
                          onSelect={() => handleRecentSearch(search)}
                          variant="secondary"
                          size="sm"
                          className="!px-3"
                        >
                          {search}
                        </FocusableButton>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Results / Suggestions */}
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
            {/* Section header */}
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-300">
                {isSearching ? 'Đang tìm kiếm...' : 
                 hasSearched ? `Kết quả cho "${query}"` : 
                 'Gợi ý cho bạn'}
              </h2>
              {displaySongs.length > 0 && (
                <span className="text-sm text-gray-500">{displaySongs.length} bài</span>
              )}
            </div>

            {/* Content */}
            {isSearching || isLoadingSuggestions ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-3 border-primary-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-gray-400">Đang tải...</span>
                </div>
              </div>
            ) : displaySongs.length > 0 ? (
              <div ref={resultsContainerRef} className="flex-1 overflow-y-auto hide-scrollbar">
                <div className={`grid gap-5 p-4 ${
                  showKeyboard ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
                }`}>
                  {displaySongs.map((song, index) => {
                    const cols = showKeyboard ? 3 : 5;
                    return (
                      <SongCard
                        key={song.youtubeId}
                        song={song}
                        row={resultsStartRow + Math.floor(index / cols)}
                        col={index % cols}
                        onSelect={() => onSongSelect(song)}
                        isLarge={!showKeyboard}
                      />
                    );
                  })}
                </div>
                
                {/* Load more indicator */}
                {isLoadingMore && (
                  <div className="flex items-center justify-center gap-3 py-6">
                    <div className="w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-gray-400">Đang tải thêm...</span>
                  </div>
                )}
                
                {/* Load more button for search results */}
                {continuation && !isLoadingMore && hasSearched && (
                  <div className="flex justify-center py-4">
                    <FocusableButton
                      row={resultsStartRow + Math.ceil(displaySongs.length / (showKeyboard ? 3 : 5))}
                      col={0}
                      onSelect={loadMore}
                      variant="secondary"
                      size="md"
                      className="!px-8"
                    >
                      Tải thêm kết quả
                    </FocusableButton>
                  </div>
                )}
                
                {/* Load more button for suggestions (when not searched yet) */}
                {!hasSearched && !isLoadingMore && displaySongs.length >= 4 && onGetSuggestions && (
                  <div className="flex justify-center py-4">
                    <FocusableButton
                      row={resultsStartRow + Math.ceil(displaySongs.length / (showKeyboard ? 3 : 5))}
                      col={0}
                      onSelect={() => {
                        if (!onGetSuggestions || displaySongs.length === 0) return;
                        setIsLoadingMore(true);
                        const lastSong = displaySongs[displaySongs.length - 1];
                        onGetSuggestions([lastSong.youtubeId], 8)
                          .then(newSongs => {
                            const existingIds = new Set(displaySongs.map(s => s.youtubeId));
                            const filtered = newSongs.filter(s => !existingIds.has(s.youtubeId));
                            if (filtered.length > 0) {
                              setSuggestions(prev => [...prev, ...filtered]);
                            }
                          })
                          .catch(() => {})
                          .finally(() => setIsLoadingMore(false));
                      }}
                      variant="secondary"
                      size="md"
                      className="!px-8"
                    >
                      Tải thêm gợi ý
                    </FocusableButton>
                  </div>
                )}
              </div>
            ) : hasSearched ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xl text-gray-400 mb-2">Không tìm thấy kết quả</p>
                  <p className="text-gray-500">Thử tìm với từ khóa khác</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center max-w-md">
                  <div className="w-20 h-20 mx-auto mb-4 bg-primary-500/20 rounded-full flex items-center justify-center">
                    <MicIcon className="w-10 h-10 text-primary-400" />
                  </div>
                  <p className="text-xl font-medium mb-2">Tìm kiếm bài hát</p>
                  <p className="text-gray-400 mb-4">
                    Nhấn nút <span className="text-primary-400 font-medium">Tìm bằng giọng nói</span> và nói tên bài hát
                  </p>
                  <p className="text-sm text-gray-500">
                    Hoặc nhấn <span className="text-gray-400">Bàn phím</span> để gõ tìm kiếm
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </NavigationGrid>
  );
}

export default SearchScreen;
