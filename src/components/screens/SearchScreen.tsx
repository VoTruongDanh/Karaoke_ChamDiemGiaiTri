'use client';

import React, { useState, useCallback } from 'react';
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
}

const KEYBOARD_LAYOUT = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', '⌫'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M', ' ', '🔍'],
];

function BackIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function AddIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function SongCard({ song, row, col, onSelect }: { song: Song; row: number; col: number; onSelect: () => void }) {
  return (
    <FocusableButton
      row={row}
      col={col}
      onSelect={onSelect}
      variant="ghost"
      className="!p-0 !min-h-0 !min-w-0 w-full text-left"
    >
      <div className="flex items-center gap-3 p-2 w-full">
        <LazyImage 
          src={song.thumbnail} 
          alt={song.title}
          className="w-20 h-12 rounded-lg object-cover flex-shrink-0"
          width={80}
          height={48}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{song.title}</p>
          <p className="text-xs text-gray-400 truncate">{song.channelName}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-gray-500">{formatDuration(song.duration)}</span>
          <span className="text-primary-400"><AddIcon /></span>
        </div>
      </div>
    </FocusableButton>
  );
}

function OnScreenKeyboard({ onKeyPress, startRow }: { onKeyPress: (key: string) => void; startRow: number }) {
  return (
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
              className={`!min-w-[44px] !min-h-[44px] !px-2 !text-sm ${
                key === ' ' ? '!min-w-[88px]' : ''
              } ${key === '🔍' ? '!bg-primary-600' : ''}`}
              autoFocus={rowIndex === 0 && colIndex === 0}
            >
              {key === ' ' ? '␣' : key}
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
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [onSearch, onRecentSearchSelect]);

  const KEYBOARD_ROWS = KEYBOARD_LAYOUT.length;
  const RESULTS_START_ROW = KEYBOARD_ROWS + 2;

  return (
    <NavigationGrid className="min-h-screen bg-tv-bg p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="flex items-center gap-4 mb-6">
          <FocusableButton
            row={0}
            col={0}
            onSelect={onBack}
            variant="secondary"
            size="sm"
            icon={<BackIcon />}
            className="!min-w-0 !px-3"
          >
            Quay lại
          </FocusableButton>
          <h1 className="text-2xl font-bold">Tìm kiếm</h1>
        </header>

        <div className="grid grid-cols-12 gap-6">
          {/* Left - Keyboard */}
          <div className="col-span-5">
            {/* Search input */}
            <div className="bg-white/5 backdrop-blur rounded-xl p-3 mb-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <div className="flex-1 min-h-[32px] flex items-center">
                  {query ? (
                    <span className="text-base">{query}</span>
                  ) : (
                    <span className="text-base text-gray-500">Nhập tên bài hát...</span>
                  )}
                  <span className="w-0.5 h-5 bg-primary-400 animate-pulse ml-1" />
                </div>
              </div>
            </div>

            {/* Keyboard */}
            <OnScreenKeyboard onKeyPress={handleKeyPress} startRow={1} />

            {/* Recent searches */}
            {recentSearches.length > 0 && !hasSearched && (
              <div className="mt-4">
                <p className="text-xs text-gray-400 mb-2">Gần đây</p>
                <div className="flex flex-wrap gap-1">
                  {recentSearches.slice(0, 5).map((search, index) => (
                    <FocusableButton
                      key={index}
                      row={KEYBOARD_ROWS + 1}
                      col={index}
                      onSelect={() => handleRecentSearch(search)}
                      variant="secondary"
                      size="sm"
                      className="!py-1 !px-2 !min-h-0 !min-w-0 !text-xs"
                    >
                      {search}
                    </FocusableButton>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right - Results */}
          <div className="col-span-7">
            <div className="bg-white/5 backdrop-blur rounded-2xl p-4 min-h-[400px]">
              <p className="text-sm text-gray-400 mb-3">
                {isSearching ? 'Đang tìm...' : hasSearched ? `Kết quả (${results.length})` : 'Kết quả'}
              </p>

              {isSearching ? (
                <div className="flex items-center justify-center h-48">
                  <div className="w-8 h-8 border-3 border-primary-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : results.length > 0 ? (
                <div className="space-y-1 max-h-[500px] overflow-y-auto hide-scrollbar">
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
                <div className="text-center py-12 text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm">Không tìm thấy</p>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="text-sm">Nhập để tìm kiếm</p>
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
