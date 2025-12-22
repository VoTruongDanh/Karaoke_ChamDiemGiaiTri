/**
 * Song Library Service - Combines YouTube API with caching
 * Implements the SongLibrary interface from design document
 * Requirements: 2.1, 2.2, 2.5
 */

import { Song, SearchResult } from '../types';
import { YouTubeService, createYouTubeService } from './youtubeService';
import { SearchCache, createSearchCache } from './searchCache';

/** Song Library configuration */
interface SongLibraryConfig {
  youtubeApiKey: string;
  maxResults?: number;
  cacheTTL?: number;
  maxRecentSearches?: number;
}

/**
 * Song Library class
 * Provides a unified interface for searching songs with caching
 */
export class SongLibrary {
  private youtubeService: YouTubeService;
  private cache: SearchCache;

  constructor(config: SongLibraryConfig) {
    this.youtubeService = createYouTubeService(config.youtubeApiKey);
    this.cache = createSearchCache({
      cacheTTL: config.cacheTTL,
      maxRecentSearches: config.maxRecentSearches,
    });
  }

  /**
   * Search for karaoke songs
   * Requirement 2.1: Query YouTube for karaoke versions
   * Requirement 2.5: Use cached results when available
   * 
   * @param query - Search query string
   * @param pageToken - Optional pagination token
   * @returns SearchResult with songs
   */
  async search(query: string, pageToken?: string): Promise<SearchResult> {
    // Only use cache for first page (no pageToken)
    if (!pageToken) {
      const cached = this.cache.get(query);
      if (cached) {
        return cached;
      }
    }

    // Fetch from YouTube API
    const result = await this.youtubeService.search(query, pageToken);

    // Cache first page results
    if (!pageToken && result.songs.length > 0) {
      this.cache.set(query, result);
    }

    return result;
  }

  /**
   * Get popular karaoke songs
   * Requirement 2.5: Cache popular songs for faster access
   * 
   * @returns Array of popular karaoke songs
   */
  async getPopularKaraoke(): Promise<Song[]> {
    // Check cache first
    const cached = this.cache.getPopularSongs();
    if (cached) {
      return cached;
    }

    // Fetch from YouTube
    const songs = await this.youtubeService.getPopularKaraoke();

    // Cache results
    if (songs.length > 0) {
      this.cache.setPopularSongs(songs);
    }

    return songs;
  }

  /**
   * Get recent search queries
   * @returns Array of recent search strings
   */
  getRecentSearches(): string[] {
    return this.cache.getRecentSearches();
  }

  /**
   * Remove a query from recent searches
   * @param query - Query to remove
   */
  removeRecentSearch(query: string): void {
    this.cache.removeRecentSearch(query);
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }
}

/**
 * Create a Song Library instance
 * @param apiKey - YouTube Data API key
 * @returns SongLibrary instance
 */
export function createSongLibrary(apiKey: string): SongLibrary {
  return new SongLibrary({ youtubeApiKey: apiKey });
}

export default SongLibrary;
