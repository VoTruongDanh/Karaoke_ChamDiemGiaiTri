/**
 * YouTube API Service for Karaoke TV Web App
 * Requirements: 2.1 - Search for karaoke songs from YouTube
 * Requirements: 2.2 - Filter results to prioritize karaoke videos
 */

import { Song, SearchResult } from '../types';

/** YouTube API configuration */
interface YouTubeConfig {
  apiKey: string;
  maxResults?: number;
}

/** Error types for better handling */
export type YouTubeErrorType = 'quota_exceeded' | 'network_error' | 'api_error' | 'unknown';

export interface YouTubeError extends Error {
  type: YouTubeErrorType;
  retryAfter?: number; // seconds until quota resets
}

/**
 * Create a typed YouTube error
 */
function createYouTubeError(message: string, type: YouTubeErrorType): YouTubeError {
  const error = new Error(message) as YouTubeError;
  error.type = type;
  if (type === 'quota_exceeded') {
    // Quota resets at midnight Pacific Time
    const now = new Date();
    const pacific = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    const midnight = new Date(pacific);
    midnight.setDate(midnight.getDate() + 1);
    midnight.setHours(0, 0, 0, 0);
    error.retryAfter = Math.floor((midnight.getTime() - pacific.getTime()) / 1000);
  }
  return error;
}

/** Raw YouTube API search response item */
interface YouTubeSearchItem {
  id: {
    kind: string;
    videoId: string;
  };
  snippet: {
    title: string;
    description: string;
    thumbnails: {
      default?: { url: string };
      medium?: { url: string };
      high?: { url: string };
    };
    channelTitle: string;
  };
}

/** Raw YouTube API video details response item */
interface YouTubeVideoItem {
  id: string;
  contentDetails: {
    duration: string; // ISO 8601 duration format (e.g., "PT4M30S")
  };
}

/** YouTube API search response */
interface YouTubeSearchResponse {
  items: YouTubeSearchItem[];
  nextPageToken?: string;
}

/** YouTube API videos response */
interface YouTubeVideosResponse {
  items: YouTubeVideoItem[];
}

/** YouTube API related videos response item */
interface YouTubeRelatedItem {
  id: {
    kind: string;
    videoId: string;
  };
  snippet: {
    title: string;
    description: string;
    thumbnails: {
      default?: { url: string };
      medium?: { url: string };
      high?: { url: string };
    };
    channelTitle: string;
  };
}

/**
 * Parse ISO 8601 duration to seconds
 * @param duration - ISO 8601 duration string (e.g., "PT4M30S")
 * @returns Duration in seconds
 */
export function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Check if a video is likely a karaoke video based on title and description
 * @param title - Video title
 * @param description - Video description
 * @returns true if video appears to be karaoke
 */
export function isKaraokeVideo(title: string, description: string = ''): boolean {
  const karaokeKeywords = [
    'karaoke',
    'instrumental',
    'beat',
    'minus one',
    'backing track',
    'sing along',
    'lyrics'
  ];
  
  const lowerTitle = title.toLowerCase();
  const lowerDesc = description.toLowerCase();
  
  return karaokeKeywords.some(keyword => 
    lowerTitle.includes(keyword) || lowerDesc.includes(keyword)
  );
}

/**
 * Sort search results to prioritize karaoke videos
 * Requirement 2.2: Filter search results to prioritize videos with "karaoke" in title or description
 * @param songs - Array of songs with metadata
 * @param searchItems - Original search items with descriptions
 * @returns Sorted array with karaoke videos first
 */
export function prioritizeKaraokeResults(
  songs: Song[],
  searchItems: YouTubeSearchItem[]
): Song[] {
  // Create a map of videoId to description for karaoke checking
  const descriptionMap = new Map<string, string>();
  searchItems.forEach(item => {
    descriptionMap.set(item.id.videoId, item.snippet.description || '');
  });
  
  // Sort: karaoke videos first, then by original order
  return [...songs].sort((a, b) => {
    const aIsKaraoke = isKaraokeVideo(a.title, descriptionMap.get(a.youtubeId) || '');
    const bIsKaraoke = isKaraokeVideo(b.title, descriptionMap.get(b.youtubeId) || '');
    
    if (aIsKaraoke && !bIsKaraoke) return -1;
    if (!aIsKaraoke && bIsKaraoke) return 1;
    return 0;
  });
}

/**
 * YouTube API Service class
 * Handles all YouTube Data API interactions for the karaoke app
 */
export class YouTubeService {
  private apiKey: string;
  private maxResults: number;
  private baseUrl = 'https://www.googleapis.com/youtube/v3';

  constructor(config: YouTubeConfig) {
    this.apiKey = config.apiKey;
    this.maxResults = config.maxResults || 25;
  }

  /**
   * Search for karaoke songs on YouTube
   * Requirement 2.1: Query YouTube for karaoke versions and display results
   * Requirement 2.2: Filter results to prioritize karaoke videos
   * 
   * @param query - Search query string
   * @param pageToken - Optional pagination token for next page
   * @returns SearchResult with songs and optional nextPageToken
   */
  async search(query: string, pageToken?: string): Promise<SearchResult> {
    // Append "karaoke" to search query to get better results
    const karaokeQuery = query.toLowerCase().includes('karaoke') 
      ? query 
      : `${query} karaoke`;

    // Build search URL
    const searchParams = new URLSearchParams({
      part: 'snippet',
      q: karaokeQuery,
      type: 'video',
      videoCategoryId: '10', // Music category
      maxResults: this.maxResults.toString(),
      key: this.apiKey,
    });

    if (pageToken) {
      searchParams.set('pageToken', pageToken);
    }

    const searchUrl = `${this.baseUrl}/search?${searchParams.toString()}`;
    
    console.log('[YouTube] Searching:', karaokeQuery);
    
    // Fetch search results
    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('[YouTube] Search failed:', searchResponse.status, errorText);
      
      // Check for quota exceeded
      if (searchResponse.status === 403 && errorText.includes('quotaExceeded')) {
        throw createYouTubeError('YouTube API quota đã hết. Vui lòng thử lại sau hoặc sử dụng API key khác.', 'quota_exceeded');
      }
      
      throw createYouTubeError(`YouTube search failed: ${searchResponse.statusText}`, 'api_error');
    }
    
    const searchData: YouTubeSearchResponse = await searchResponse.json();
    
    console.log('[YouTube] Got', searchData.items?.length || 0, 'results');
    
    if (!searchData.items || searchData.items.length === 0) {
      return { songs: [] };
    }

    // Get video IDs for duration lookup
    const videoIds = searchData.items.map(item => item.id.videoId).join(',');
    
    // Fetch video details for duration
    const videosParams = new URLSearchParams({
      part: 'contentDetails',
      id: videoIds,
      key: this.apiKey,
    });

    const videosUrl = `${this.baseUrl}/videos?${videosParams.toString()}`;
    const videosResponse = await fetch(videosUrl);
    
    let durationMap = new Map<string, number>();
    if (videosResponse.ok) {
      const videosData: YouTubeVideosResponse = await videosResponse.json();
      videosData.items.forEach(item => {
        durationMap.set(item.id, parseDuration(item.contentDetails.duration));
      });
    }

    // Convert to Song objects
    const songs: Song[] = searchData.items.map(item => ({
      youtubeId: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.medium?.url || 
                 item.snippet.thumbnails.default?.url || '',
      channelName: item.snippet.channelTitle,
      duration: durationMap.get(item.id.videoId) || 0,
    }));

    // Prioritize karaoke videos in results
    const sortedSongs = prioritizeKaraokeResults(songs, searchData.items);

    return {
      songs: sortedSongs,
      nextPageToken: searchData.nextPageToken,
    };
  }

  /**
   * Get related/suggested videos based on a video ID
   * Uses YouTube's recommendation algorithm
   * @param videoId - YouTube video ID to get suggestions for
   * @param maxResults - Maximum number of results (default 10)
   * @returns Array of suggested songs
   */
  async getRelatedVideos(videoId: string, maxResults: number = 10): Promise<Song[]> {
    const searchParams = new URLSearchParams({
      part: 'snippet',
      relatedToVideoId: videoId,
      type: 'video',
      videoCategoryId: '10', // Music category
      maxResults: maxResults.toString(),
      key: this.apiKey,
    });

    const searchUrl = `${this.baseUrl}/search?${searchParams.toString()}`;
    
    try {
      const response = await fetch(searchUrl);
      if (!response.ok) {
        const errorText = await response.text();
        console.warn('[YouTube] Related videos API failed:', response.status);
        
        // Check for quota exceeded
        if (response.status === 403 && errorText.includes('quotaExceeded')) {
          console.warn('[YouTube] Quota exceeded for related videos');
        }
        return [];
      }
      
      const data: YouTubeSearchResponse = await response.json();
      
      if (!data.items || data.items.length === 0) {
        return [];
      }

      // Get video IDs for duration lookup
      const videoIds = data.items.map(item => item.id.videoId).join(',');
      
      const videosParams = new URLSearchParams({
        part: 'contentDetails',
        id: videoIds,
        key: this.apiKey,
      });

      const videosUrl = `${this.baseUrl}/videos?${videosParams.toString()}`;
      const videosResponse = await fetch(videosUrl);
      
      let durationMap = new Map<string, number>();
      if (videosResponse.ok) {
        const videosData: YouTubeVideosResponse = await videosResponse.json();
        videosData.items.forEach(item => {
          durationMap.set(item.id, parseDuration(item.contentDetails.duration));
        });
      }

      // Convert to Song objects, prioritize karaoke
      const songs: Song[] = data.items
        .filter(item => item.id.videoId) // Filter out any invalid items
        .map(item => ({
          youtubeId: item.id.videoId,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails.medium?.url || 
                     item.snippet.thumbnails.default?.url || '',
          channelName: item.snippet.channelTitle,
          duration: durationMap.get(item.id.videoId) || 0,
        }));

      // Prioritize karaoke videos
      return prioritizeKaraokeResults(songs, data.items);
    } catch (error) {
      console.error('[YouTube] Error fetching related videos:', error);
      return [];
    }
  }

  /**
   * Get suggestions based on multiple video IDs
   * Combines related videos from multiple sources
   * @param videoIds - Array of YouTube video IDs
   * @param maxResults - Maximum total results
   * @returns Array of suggested songs (deduplicated)
   */
  async getSuggestionsFromVideos(videoIds: string[], maxResults: number = 10): Promise<Song[]> {
    if (videoIds.length === 0) return [];

    // Get related videos from the most recent videos (max 3)
    const recentIds = videoIds.slice(0, 3);
    const perVideoResults = Math.ceil(maxResults / recentIds.length);
    
    const allSuggestions: Song[] = [];
    const seenIds = new Set(videoIds); // Exclude already added videos

    for (const videoId of recentIds) {
      const related = await this.getRelatedVideos(videoId, perVideoResults + 2);
      for (const song of related) {
        if (!seenIds.has(song.youtubeId)) {
          seenIds.add(song.youtubeId);
          allSuggestions.push(song);
        }
      }
    }

    return allSuggestions.slice(0, maxResults);
  }

  /**
   * Get popular karaoke songs
   * @returns Array of popular karaoke songs
   */
  async getPopularKaraoke(): Promise<Song[]> {
    const result = await this.search('popular karaoke songs');
    return result.songs;
  }
}

/**
 * Create a YouTube service instance
 * @param apiKey - YouTube Data API key
 * @returns YouTubeService instance
 */
export function createYouTubeService(apiKey: string): YouTubeService {
  return new YouTubeService({ apiKey });
}

// Default export for convenience
export default YouTubeService;
