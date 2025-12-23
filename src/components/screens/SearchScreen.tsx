'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { NavigationGrid } from '@/components/NavigationGrid';
import { FocusableButton } from '@/components/FocusableButton';
import { LazyImage } from '@/components/LazyImage';
import type { Song } from '@/types/song';

export interface SearchScreenProps {
  onSongSelect: (song: Song) => void;
  onBack: () => void;
  onSearch: (query: string) => Promise<Song[]>;
  recentSearches?: string[];
  onRecentSearchSelect?: (query: string) => void;
  suggestions?: Song[]; // Đề xuất bài hát
}

const KEYBOARD_LAYOUT = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', '⌫'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M', ' ', '🔍'],
];

// Từ khóa gợi ý phổ biến
const POPULAR_KEYWORDS = [
  'karaoke', 'beat', 'nhạc trẻ', 'bolero', 'remix', 'acoustic'
];

function BackIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  );
}

function SongCard({ song, row, col, onSelect }: { song: Song; row: number; col: number; onSelect: () => void }) {
  return (
    <FocusableButton
      row={row}
      col={col}
      onSelect={onSelect}
      variant="ghost"
      className="!p-0 !min-h-[200px] !h-[200px] !min-w-0 text-left !rounded-lg !border-0"
    >
      <div className="flex flex-col w-full h-[200px]">
        <LazyImage 
          src={song.thumbnail} 
          alt={song.title}
          className="w-full h-[130px] rounded-t-lg object-cover flex-shrink-0"
          width={260}
          height={130}
        />
        <div className="p-2 h-[70px] overflow-hidden">
          <p className="text-sm font-medium line-clamp-2 leading-tight">{song.title}</p>
          <p className="text-xs text-gray-400 truncate mt-1">{song.channelName}</p>
        </div>
      </div>
    </FocusableButton>
  );
}

function SearchKeyIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function OnScreenKeyboard({ onKeyPress, startRow }: { onKeyPress: (key: string) => void; startRow: number }) {
  return (
    <div className="space-y-0.5">
      {KEYBOARD_LAYOUT.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-0.5 justify-center">
          {row.map((key, colIndex) => (
            <FocusableButton
              key={`${rowIndex}-${colIndex}`}
              row={startRow + rowIndex}
              col={colIndex}
              onSelect={() => onKeyPress(key)}
              variant="secondary"
              size="sm"
              className={`!min-w-[36px] !min-h-[36px] !px-1 !text-xs ${
                key === ' ' ? '!min-w-[72px]' : ''
              } ${key === '🔍' ? '!bg-primary-600 !text-white' : ''}`}
            >
              {key === ' ' ? '␣' : key === '🔍' ? <SearchKeyIcon /> : key}
            </FocusableButton>
          ))}
        </div>
      ))}
    </div>
  );
}

export function SearchScreen({
  onSongSelect,
  onBack,
  onSearch,
  recentSearches = [],
  onRecentSearchSelect,
  suggestions = [],
}: SearchScreenProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState(''); // Text đang nghe
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const handleKeyPress = useCallback(async (key: string) => {
    if (key === '⌫') {
      setQuery(prev => prev.slice(0, -1));
    } else if (key === '🔍') {
      if (query.trim()) {
        setIsSearching(true);
        setHasSearched(true);
        try {
          const searchResults = await onSearch(query);
          setResults(searchResults);
        } catch (error) {
          console.error('Search error:', error);
          setResults([]);
        } finally {
          setIsSearching(false);
        }
      }
    } else {
      setQuery(prev => prev + key);
    }
  }, [query, onSearch]);

  const doSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setQuery(searchQuery);
    setIsSearching(true);
    setHasSearched(true);
    try {
      const searchResults = await onSearch(searchQuery);
      setResults(searchResults);
    } catch (error) {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [onSearch]);

  const handleRecentSearch = useCallback(async (searchQuery: string) => {
    onRecentSearchSelect?.(searchQuery);
    doSearch(searchQuery);
  }, [onRecentSearchSelect, doSearch]);

  // Voice search - improved
  const startVoiceSearch = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError('Trình duyệt không hỗ trợ');
      setTimeout(() => setVoiceError(null), 3000);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = 'vi-VN';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceError(null);
        setVoiceText('');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setVoiceText(transcript);
        setQuery(transcript);
        
        // Tự động tìm kiếm khi nói xong
        if (event.results[0].isFinal) {
          setIsListening(false);
          doSearch(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        setVoiceText('');
        if (event.error === 'not-allowed') {
          setVoiceError('Cho phép microphone');
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
    } catch {
      setVoiceError('Không thể khởi động mic');
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

  const KEYBOARD_ROWS = KEYBOARD_LAYOUT.length;
  const RESULTS_COL_START = 10; // Results start at col 10 (after keyboard cols 0-9)

  // Hiển thị đề xuất hoặc kết quả
  const displaySongs = hasSearched ? results : suggestions;

  return (
    <NavigationGrid className="h-screen bg-tv-bg p-3 overflow-hidden">
      <div className="w-full h-full flex flex-col">
        {/* Header với nút Mic lớn */}
        <header className="flex items-center gap-3 mb-2 flex-shrink-0">
          <FocusableButton
            row={0}
            col={0}
            onSelect={onBack}
            variant="secondary"
            size="sm"
            icon={<BackIcon />}
            className="!min-w-0 !px-2 !min-h-[36px]"
          >
            Quay lại
          </FocusableButton>
          
          <h1 className="text-lg font-bold flex-1">Tìm kiếm</h1>
          
          {/* Nút Mic - đơn giản với icon 1 màu */}
          <FocusableButton
            row={0}
            col={1}
            onSelect={isListening ? stopVoiceSearch : startVoiceSearch}
            variant={isListening ? "primary" : "secondary"}
            icon={<MicIcon />}
            className={`!min-w-[160px] !min-h-[44px] !px-4 ${
              isListening ? '!bg-red-500 animate-pulse' : ''
            }`}
            autoFocus
          >
            {isListening ? 'Đang nghe...' : 'Tìm bằng giọng nói'}
          </FocusableButton>
        </header>
        
        {/* Voice status - hiển thị text đang nghe */}
        {isListening && (
          <div className="mb-2 text-center flex-shrink-0">
            <div className="inline-flex items-center gap-2 bg-red-500/20 text-red-400 px-4 py-2 rounded-full">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">
                {voiceText || 'Hãy nói tên bài hát...'}
              </span>
            </div>
          </div>
        )}
        
        {/* Voice error */}
        {voiceError && (
          <div className="mb-2 text-center text-red-400 text-sm flex-shrink-0 bg-red-500/10 py-2 rounded-lg">
            ⚠️ {voiceError}
          </div>
        )}

        <div className="flex gap-2 flex-1 min-h-0 overflow-hidden">
          {/* Left - Keyboard */}
          <div className="w-[380px] flex-shrink-0 flex flex-col">
            {/* Search input */}
            <div className="bg-white/5 backdrop-blur rounded-lg p-1.5 mb-1.5">
              <div className="flex items-center gap-1.5">
                <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <div className="flex-1 min-h-[20px] flex items-center overflow-hidden">
                  {query ? (
                    <span className="text-xs truncate">{query}</span>
                  ) : (
                    <span className="text-xs text-gray-500">Nhập tên bài hát...</span>
                  )}
                  <span className="w-0.5 h-3 bg-primary-400 animate-pulse ml-0.5 flex-shrink-0" />
                </div>
              </div>
            </div>

            {/* Keyboard */}
            <OnScreenKeyboard onKeyPress={handleKeyPress} startRow={1} />

            {/* Recent searches + Popular keywords */}
            {!hasSearched && (
              <div className="mt-1.5 space-y-1.5">
                {recentSearches.length > 0 && (
                  <div>
                    <p className="text-[10px] text-gray-400 mb-0.5">🕐 Gần đây</p>
                    <div className="flex flex-wrap gap-0.5">
                      {recentSearches.slice(0, 4).map((search, index) => (
                        <FocusableButton
                          key={`recent-${index}`}
                          row={KEYBOARD_ROWS + 2}
                          col={index}
                          onSelect={() => handleRecentSearch(search)}
                          variant="secondary"
                          size="sm"
                          className="!py-0.5 !px-1.5 !min-h-0 !min-w-0 !text-[10px]"
                        >
                          {search}
                        </FocusableButton>
                      ))}
                    </div>
                  </div>
                )}
                
                <div>
                  <p className="text-[10px] text-gray-400 mb-0.5">🔥 Phổ biến</p>
                  <div className="flex flex-wrap gap-0.5">
                    {POPULAR_KEYWORDS.map((keyword, index) => (
                      <FocusableButton
                        key={`popular-${index}`}
                        row={KEYBOARD_ROWS + 3}
                        col={index}
                        onSelect={() => doSearch(keyword)}
                        variant="ghost"
                        size="sm"
                        className="!py-0.5 !px-1.5 !min-h-0 !min-w-0 !text-[10px] !bg-primary-500/20 !text-primary-300"
                      >
                        {keyword}
                      </FocusableButton>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right - Results / Suggestions */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="bg-white/5 backdrop-blur rounded-lg p-3 h-full flex flex-col overflow-hidden">
              <p className="text-[10px] text-gray-400 mb-2 flex-shrink-0">
                {isSearching ? '🔍 Đang tìm...' : hasSearched ? `Kết quả (${results.length})` : suggestions.length > 0 ? '✨ Đề xuất cho bạn' : 'Kết quả'}
              </p>

              {isSearching ? (
                <div className="flex items-center justify-center flex-1">
                  <div className="w-5 h-5 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : displaySongs.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 overflow-y-auto hide-scrollbar flex-1 content-start p-2">
                  {displaySongs.map((song, index) => (
                    <SongCard
                      key={song.youtubeId}
                      song={song}
                      row={1 + Math.floor(index / 2)}
                      col={RESULTS_COL_START + (index % 2)}
                      onSelect={() => onSongSelect(song)}
                    />
                  ))}
                </div>
              ) : hasSearched ? (
                <div className="text-center py-2 text-gray-400 flex-1 flex flex-col items-center justify-center">
                  <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-[10px]">Không tìm thấy</p>
                </div>
              ) : (
                <div className="text-center py-2 text-gray-400 flex-1 flex flex-col items-center justify-center">
                  <div className="text-4xl mb-2">🎤</div>
                  <p className="text-sm font-medium mb-1">Nhấn nút Mic để tìm bằng giọng nói</p>
                  <p className="text-[10px]">Hoặc gõ bàn phím bên trái</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </NavigationGrid>
  );
}

export default SearchScreen;
