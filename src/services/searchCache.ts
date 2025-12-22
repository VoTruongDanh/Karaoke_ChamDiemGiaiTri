/**
 * Search Cache Service for Karaoke TV Web App
 * Requirement 2.5: Cache recent searches and popular songs for faster access
 */

import { Song, SearchResult } from '../types';

/** Cache entry with timestamp for expiration */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/** Cache configuration options */
interface CacheConfig {
  /** Maximum number of search queries to cache */
  maxSearchEntries?: number;
  /** Cache TTL in milliseconds (default: 5 minutes) */
  cacheTTL?: number;
  /** Maximum number of recent searches to track */
  maxRecentSearches?: number;
}

const DEFAULT_CONFIG: Required<CacheConfig> = {
  maxSearchEntries: 50,
  cacheTTL: 5 * 60 * 1000, // 5 minutes
  maxRecentSearches: 10,
};

/**
 * Search Cache class
 * Provides in-memory caching for YouTube search results
 */
export class SearchCache {
  private searchCache: Map<string, CacheEntry<SearchResult>>;
  private popularSongsCache: CacheEntry<Song[]> | null;
  private recentSearches: string[];
  private config: Required<CacheConfig>;

  constructor(config: CacheConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.searchCache = new Map();
    this.popularSongsCache = null;
    this.recentSearches = [];
  }

  /**
   * Normalize search query for consistent cache keys
   * @param query - Raw search query
   * @returns Normalized query string
   */
  private normalizeQuery(query: string): string {
    return query.toLowerCase().trim();
  }

  /**
   * Check if a cache entry is still valid
   * @param entry - Cache entry to check
   * @returns true if entry is still valid
   */
  private isValid<T>(entry: CacheEntry<T> | null | undefined): boolean {
    if (!entry) return false;
    return Date.now() - entry.timestamp < this.config.cacheTTL;
  }

  /**
   * Get cached search results for a query
   * @param query - Search query
   * @returns Cached SearchResult or null if not found/expired
   */
  get(query: string): SearchResult | null {
    const normalizedQuery = this.normalizeQuery(query);
    const entry = this.searchCache.get(normalizedQuery) ?? null;
    
    if (this.isValid(entry)) {
      return entry!.data;
    }
    
    // Remove expired entry
    if (entry) {
      this.searchCache.delete(normalizedQuery);
    }
    
    return null;
  }

  /**
   * Cache search results for a query
   * @param query - Search query
   * @param result - Search result to cache
   */
  set(query: string, result: SearchResult): void {
    const normalizedQuery = this.normalizeQuery(query);
    
    // Enforce max entries limit (LRU-style: remove oldest entries)
    if (this.searchCache.size >= this.config.maxSearchEntries) {
      const oldestKey = this.searchCache.keys().next().value;
      if (oldestKey) {
        this.searchCache.delete(oldestKey);
      }
    }
    
    this.searchCache.set(normalizedQuery, {
      data: result,
      timestamp: Date.now(),
    });
    
    // Track as recent search
    this.addRecentSearch(query);
  }

  /**
   * Add a query to recent searches list
   * @param query - Search query to add
   */
  private addRecentSearch(query: string): void {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;
    
    // Remove if already exists (will be re-added at front)
    const existingIndex = this.recentSearches.findIndex(
      s => s.toLowerCase() === trimmedQuery.toLowerCase()
    );
    if (existingIndex !== -1) {
      this.recentSearches.splice(existingIndex, 1);
    }
    
    // Add to front
    this.recentSearches.unshift(trimmedQuery);
    
    // Enforce max limit
    if (this.recentSearches.length > this.config.maxRecentSearches) {
      this.recentSearches.pop();
    }
  }

  /**
   * Get list of recent search queries
   * @returns Array of recent search strings
   */
  getRecentSearches(): string[] {
    return [...this.recentSearches];
  }

  /**
   * Clear a specific recent search
   * @param query - Query to remove from recent searches
   */
  removeRecentSearch(query: string): void {
    const index = this.recentSearches.findIndex(
      s => s.toLowerCase() === query.toLowerCase()
    );
    if (index !== -1) {
      this.recentSearches.splice(index, 1);
    }
  }

  /**
   * Get cached popular songs
   * @returns Cached popular songs or null if not found/expired
   */
  getPopularSongs(): Song[] | null {
    if (this.isValid(this.popularSongsCache)) {
      return this.popularSongsCache!.data;
    }
    
    this.popularSongsCache = null;
    return null;
  }

  /**
   * Cache popular songs
   * @param songs - Popular songs to cache
   */
  setPopularSongs(songs: Song[]): void {
    this.popularSongsCache = {
      data: songs,
      timestamp: Date.now(),
    };
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.searchCache.clear();
    this.popularSongsCache = null;
    this.recentSearches = [];
  }

  /**
   * Clear only expired entries from cache
   */
  clearExpired(): void {
    const now = Date.now();
    
    const keysToDelete: string[] = [];
    this.searchCache.forEach((entry, key) => {
      if (now - entry.timestamp >= this.config.cacheTTL) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.searchCache.delete(key));
    
    if (this.popularSongsCache && 
        now - this.popularSongsCache.timestamp >= this.config.cacheTTL) {
      this.popularSongsCache = null;
    }
  }

  /**
   * Get cache statistics
   * @returns Object with cache stats
   */
  getStats(): { searchEntries: number; hasPopularSongs: boolean; recentSearchCount: number } {
    return {
      searchEntries: this.searchCache.size,
      hasPopularSongs: this.popularSongsCache !== null && this.isValid(this.popularSongsCache),
      recentSearchCount: this.recentSearches.length,
    };
  }
}

/**
 * Create a search cache instance with default configuration
 * @param config - Optional cache configuration
 * @returns SearchCache instance
 */
export function createSearchCache(config?: CacheConfig): SearchCache {
  return new SearchCache(config);
}

// Default export for convenience
export default SearchCache;
