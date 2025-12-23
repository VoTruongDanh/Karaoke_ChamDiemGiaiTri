/**
 * YouTube Search Service - Uses local API proxy
 * No API key required, no quota limits, no CORS issues
 */

import { Song, SearchResult } from '../types';

/**
 * Check if video is likely karaoke
 */
function isKaraokeVideo(title: string): boolean {
  const keywords = ['karaoke', 'instrumental', 'beat', 'minus one', 'backing track', 'lyrics'];
  const lower = title.toLowerCase();
  return keywords.some(k => lower.includes(k));
}

/**
 * YouTube Search Service using local API proxy
 */
export class InvidiousService {
  /**
   * Search for videos via local API proxy
   */
  async search(query: string, pageToken?: string): Promise<SearchResult> {
    try {
      const url = `/api/youtube/search?q=${encodeURIComponent(query)}`;
      console.log('[Search] Fetching:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      const songs: Song[] = (data.songs || []).map((video: any) => ({
        youtubeId: video.youtubeId,
        title: video.title,
        thumbnail: video.thumbnail || `https://i.ytimg.com/vi/${video.youtubeId}/mqdefault.jpg`,
        channelName: video.channelName || 'Unknown',
        duration: video.duration || 0,
      }));

      console.log('[Search] Got', songs.length, 'results');

      return {
        songs,
        nextPageToken: undefined, // Pagination not supported yet
      };
    } catch (error) {
      console.error('[Search] Failed:', error);
      throw error;
    }
  }

  /**
   * Get related/suggested videos - simplified approach using search
   */
  async getRelatedVideos(videoId: string, maxResults: number = 10): Promise<Song[]> {
    try {
      // First try the API
      const url = `/api/youtube/related?v=${encodeURIComponent(videoId)}&max=${maxResults}`;
      console.log('[Search] Getting related:', url);
      
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        const songs: Song[] = (data.songs || []).map((video: any) => ({
          youtubeId: video.youtubeId,
          title: video.title,
          thumbnail: video.thumbnail || `https://i.ytimg.com/vi/${video.youtubeId}/mqdefault.jpg`,
          channelName: video.channelName || 'Unknown',
          duration: video.duration || 0,
        }));

        if (songs.length > 0) {
          console.log('[Search] Got', songs.length, 'related videos from API');
          return songs;
        }
      }
      
      console.log('[Search] API returned 0 results');
      return [];
    } catch (error) {
      console.error('[Search] Related failed:', error);
      return [];
    }
  }

  /**
   * Get suggestions from multiple videos - YouTube's actual "Up next" recommendations
   * No keyword search fallback - only real recommendations
   */
  async getSuggestionsFromVideos(videoIds: string[], maxResults: number = 10): Promise<Song[]> {
    if (videoIds.length === 0) return [];

    // Get related videos from API (now optimized with parallel fetch + cache)
    const recentId = videoIds[0];
    const related = await this.getRelatedVideos(recentId, maxResults + 5);
    
    // Filter out videos already in the list
    const seenIds = new Set(videoIds);
    const filtered = related.filter(song => !seenIds.has(song.youtubeId));
    
    return filtered.slice(0, maxResults);
  }

  /**
   * Get trending/popular music
   */
  async getPopularKaraoke(): Promise<Song[]> {
    return this.search('karaoke việt nam hot 2024').then(r => r.songs);
  }
}

export function createInvidiousService(): InvidiousService {
  return new InvidiousService();
}

export default InvidiousService;
