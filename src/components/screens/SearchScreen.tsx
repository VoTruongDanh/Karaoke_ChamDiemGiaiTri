'use client';

import React, { useState, useCallback } from 'react';
import { NavigationGrid } from '@/components/NavigationGrid';
import { FocusableButton } from '@/components/FocusableButton';
import { LazyImage } from '@/components/LazyImage';
import type { Song } from '@/types/song';

/**
 * Props for SearchScreen component
 */
export interface SearchScreenProps {
  /** Callback when a song is selected to add to queue */
  onSongSelect: (song: Song) => void;
  /** Callback when back is pressed */
  onBack: () => void;
  /** Search function */
  onSearch: (query: string) => Promise<Song[]>;
  /** Recent searches */
  recentSearches?: string[];
  /** Callback when a recent search is selected */
  onRecentSearchSelect?: (query: string) => void;
}

/**
 * On-screen keyboard layout for TV
 */
const KEYBOARD_LAYOUT = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', '⌫'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M', ' ', '🔍'],
];

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
 * Add icon component
 */
function AddIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
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
 * Song result card component
 */
function SongCard({ 
  song, 
  row, 
  col, 
  onSelect 
}: { 
  song: Song; 
  row: number; 
  col: number;
  onSelect: () => void;
}) {
  return (
    <FocusableButton
      row={row}
      col={col}
      onSelect={onSelect}
      variant="ghost"
      className="!p-0 !min-h-0 !min-w-0 w-full text-left"
    >
      <div className="flex items-center gap-tv-2 p-tv-2 w-full">
        <LazyImage 
          src={song.thumbnail} 
          alt={song.title}
          className="w-24 h-16 rounded-tv flex-shrink-0"
          width={96}
          height={64}
        />
        <div className="flex-1 min-w-0">
          <p className="text-tv-xs font-semibold truncate">{song.title}</p>
          <p className="text-tv-xs text-gray-400 truncate">{song.channelName}</p>
        </div>
        <div className="flex items-center gap-tv-2 flex-shrink-0">
          <span className="text-tv-xs text-gray-500">{formatDuration(song.duration)}</span>
          <span className="text-primary-400"><AddIcon /></span>
        </div>
      </div>
    </FocusableButton>
  );
}


/**
 * On-screen keyboard component for TV
 */
function OnScreenKeyboard({
  onKeyPress,
  startRow,
}: {
  onKeyPress: (key: string) => void;
  startRow: number;
}) {
  return (
    <div className="space-y-tv-1">
      {KEYBOARD_LAYOUT.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-tv-1 justify-center" role="row">
          {row.map((key, colIndex) => (
            <FocusableButton
              key={`${rowIndex}-${colIndex}`}
              row={startRow + rowIndex}
              col={colIndex}
              onSelect={() => onKeyPress(key)}
              variant="secondary"
              size="sm"
              className={`!min-w-[56px] !min-h-[56px] !px-tv-2 ${
                key === ' ' ? '!min-w-[120px]' : ''
              } ${key === '🔍' ? '!bg-primary-600' : ''}`}
              autoFocus={rowIndex === 0 && colIndex === 0}
            >
              {key === ' ' ? 'Space' : key}
            </FocusableButton>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * SearchScreen component - Song search with on-screen keyboard
 * 
 * Requirements: 2.1 - Search for karaoke songs from YouTube
 * Requirements: 2.3 - Display thumbnail, title, channel name, and duration
 * Requirements: 1.2 - Grid pattern navigation with arrow keys
 * 
 * Features:
 * - On-screen keyboard optimized for TV navigation
 * - Search results grid
 * - Recent searches
 * - TV-friendly large touch targets
 */
export function SearchScreen({
  onSongSelect,
  onBack,
  onSearch,
  recentSearches = [],
  onRecentSearchSelect,
}: SearchScreenProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

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

  const handleRecentSearch = useCallback(async (searchQuery: string) => {
    setQuery(searchQuery);
    onRecentSearchSelect?.(searchQuery);
    setIsSearching(true);
    setHasSearched(true);
    try {
      const searchResults = await onSearch(searchQuery);
      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [onSearch, onRecentSearchSelect]);

  // Calculate row offset for search results (after keyboard)
  const KEYBOARD_ROWS = KEYBOARD_LAYOUT.length;
  const RESULTS_START_ROW = KEYBOARD_ROWS + 1;

  return (
    <NavigationGrid className="min-h-screen bg-tv-bg p-tv-4">
      <div className="max-w-6xl mx-auto">
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
          <h1 className="text-tv-xl font-bold">Tìm kiếm bài hát</h1>
        </header>

        <div className="grid grid-cols-12 gap-tv-4">
          {/* Left side - Keyboard */}
          <div className="col-span-5">
            {/* Search input display */}
            <div className="tv-card mb-tv-3">
              <div className="flex items-center gap-tv-2">
                <span className="text-tv-lg">🔍</span>
                <div className="flex-1 min-h-[48px] flex items-center">
                  {query ? (
                    <span className="text-tv-sm">{query}</span>
                  ) : (
                    <span className="text-tv-sm text-gray-500">Nhập tên bài hát...</span>
                  )}
                  <span className="w-0.5 h-8 bg-primary-400 animate-pulse ml-1" />
                </div>
              </div>
            </div>

            {/* On-screen keyboard */}
            <OnScreenKeyboard onKeyPress={handleKeyPress} startRow={0} />

            {/* Recent searches */}
            {recentSearches.length > 0 && !hasSearched && (
              <div className="mt-tv-4">
                <h3 className="text-tv-xs text-gray-400 mb-tv-2">Tìm kiếm gần đây</h3>
                <div className="flex flex-wrap gap-tv-1">
                  {recentSearches.slice(0, 5).map((search, index) => (
                    <button
                      key={index}
                      onClick={() => handleRecentSearch(search)}
                      className="tv-button !py-tv-1 !px-tv-2 text-tv-xs"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right side - Results */}
          <div className="col-span-7">
            <div className="tv-card min-h-[500px]">
              <h2 className="text-tv-sm font-semibold mb-tv-2">
                {isSearching ? 'Đang tìm kiếm...' : 
                 hasSearched ? `Kết quả (${results.length})` : 
                 'Kết quả tìm kiếm'}
              </h2>

              {isSearching ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin w-12 h-12 border-4 border-primary-400 border-t-transparent rounded-full" />
                </div>
              ) : results.length > 0 ? (
                <div className="space-y-tv-1 max-h-[600px] overflow-y-auto hide-scrollbar">
                  {results.map((song, index) => (
                    <SongCard
                      key={song.youtubeId}
                      song={song}
                      row={RESULTS_START_ROW + index}
                      col={0}
                      onSelect={() => onSongSelect(song)}
                    />
                  ))}
                </div>
              ) : hasSearched ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <span className="text-tv-3xl mb-tv-2">🎵</span>
                  <p className="text-tv-sm">Không tìm thấy bài hát</p>
                  <p className="text-tv-xs">Thử tìm kiếm với từ khóa khác</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <span className="text-tv-3xl mb-tv-2">🔍</span>
                  <p className="text-tv-sm">Nhập tên bài hát để tìm kiếm</p>
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
