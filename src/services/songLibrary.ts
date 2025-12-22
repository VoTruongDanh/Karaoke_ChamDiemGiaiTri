/**
 * Song Library Service - Combines YouTube API with caching
 * Falls back to Invidious when YouTube quota exceeded
 * Implements the SongLibrary interface from design document
 * Requirements: 2.1, 2.2, 2.5
 */

import { Song, SearchResult } from '../types';
import { YouTubeService, createYouTubeService } from './youtubeService';
import { InvidiousService, createInvidiousService } from './invidiousService';
import { SearchCache, createSearchCache } from './searchCache';

/** Song Library configuration */
interface SongLibraryConfig {
  youtubeApiKey?: string;
  maxResults?: number;
  cacheTTL?: number;
  maxRecentSearches?: number;
  useInvidiousOnly?: boolean;
}

/**
 * Song Library class
 * Provides a unified interface for searching songs with caching
 * Automatically falls back to Invidious when YouTube API fails
 */
export class SongLibrary {
  private youtubeService: YouTubeService | null;
  private invidiousService: InvidiousService;
  private cache: SearchCache;
  private useInvidiousOnly: boolean;
  private youtubeQuotaExceeded: boolean = false;

  constructor(config: SongLibraryConfig) {
    this.useInvidiousOnly = config.useInvidiousOnly || !config.youtubeApiKey;
    this.youtubeService = config.youtubeApiKey && !this.useInvidiousOnly
      ? createYouTubeService(config.youtubeApiKey)
      : null;
    this.invidiousService = createInvidiousService();
    this.cache = createSearchCache({
      cacheTTL: config.cacheTTL,
      maxRecentSearches: config.maxRecentSearches,
    });
    
    console.log('[SongLibrary] Initialized with:', this.useInvidiousOnly ? 'Invidious only' : 'YouTube + Invidious fallback');
  }

  /**
   * Search for karaoke songs
   * Requirement 2.1: Query YouTube for karaoke versions
   * Requirement 2.5: Use cached results when available
   * Falls back to Invidious if YouTube fails
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

    // Try YouTube first if available and not quota exceeded
    if (this.youtubeService && !this.youtubeQuotaExceeded && !this.useInvidiousOnly) {
      try {
        const result = await this.youtubeService.search(query, pageToken);
        
        // Cache first page results
        if (!pageToken && result.songs.length > 0) {
          this.cache.set(query, result);
        }
        
        return result;
      } catch (error: any) {
        console.warn('[SongLibrary] YouTube failed, falling back to Invidious:', error.message);
        
        // Mark quota exceeded to skip YouTube for future requests
        if (error.type === 'quota_exceeded' || error.message?.includes('quota')) {
          this.youtubeQuotaExceeded = true;
          console.log('[SongLibrary] YouTube quota exceeded, switching to Invidious');
        }
      }
    }

    // Fallback to Invidious
    try {
      const result = await this.invidiousService.search(query, pageToken);
      
      // Cache first page results
      if (!pageToken && result.songs.length > 0) {
        this.cache.set(query, result);
      }
      
      return result;
    } catch (error) {
      console.error('[SongLibrary] Invidious also failed:', error);
      return { songs: [] };
    }
  }

  /**
   * Get YouTube's suggested/related videos based on recently added songs
   * Uses local API proxy for suggestions
   * 
   * @param videoIds - Array of YouTube video IDs from recently added songs
   * @param maxResults - Maximum number of suggestions
   * @param addedSongs - Optional array of Song objects for search fallback
   * @returns Array of suggested songs
   */
  async getSuggestions(videoIds: string[], maxResults: number = 10, addedSongs?: Song[]): Promise<Song[]> {
    if (videoIds.length === 0) return [];
    
    console.log('[SongLibrary] Getting suggestions for:', videoIds.slice(0, 2));
    
    // Always use Invidious (local API proxy) for suggestions - more reliable
    try {
      const result = await this.invidiousService.getSuggestionsFromVideos(videoIds, maxResults, addedSongs);
      console.log('[SongLibrary] Got', result.length, 'suggestions');
      return result;
    } catch (error) {
      console.error('[SongLibrary] Suggestions failed:', error);
      return [];
    }
  }

  /**
   * Get related videos for a specific video
   * @param videoId - YouTube video ID
   * @param maxResults - Maximum number of results
   * @returns Array of related songs
   */
  async getRelatedVideos(videoId: string, maxResults: number = 10): Promise<Song[]> {
    console.log('[SongLibrary] Getting related for:', videoId);
    
    // Always use Invidious (local API proxy) - more reliable
    try {
      const result = await this.invidiousService.getRelatedVideos(videoId, maxResults);
      console.log('[SongLibrary] Got', result.length, 'related videos');
      return result;
    } catch (error) {
      console.error('[SongLibrary] Related failed:', error);
      return [];
    }
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

    let songs: Song[] = [];
    
    // Try YouTube first
    if (this.youtubeService && !this.youtubeQuotaExceeded && !this.useInvidiousOnly) {
      try {
        songs = await this.youtubeService.getPopularKaraoke();
      } catch {
        console.warn('[SongLibrary] YouTube popular failed, using Invidious');
      }
    }
    
    // Fallback to Invidious
    if (songs.length === 0) {
      songs = await this.invidiousService.getPopularKaraoke();
    }

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
 * @param apiKey - YouTube Data API key (optional, will use Invidious if not provided)
 * @returns SongLibrary instance
 */
export function createSongLibrary(apiKey?: string): SongLibrary {
  return new SongLibrary({ youtubeApiKey: apiKey });
}

export default SongLibrary;
