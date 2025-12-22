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
    this.maxResults = config.maxResults || 25; // Increased from 20 to 25
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
    
    // Fetch search results
    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) {
      throw new Error(`YouTube search failed: ${searchResponse.statusText}`);
    }
    
    const searchData: YouTubeSearchResponse = await searchResponse.json();
    
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
