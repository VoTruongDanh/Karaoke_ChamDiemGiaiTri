/**
 * YouTube Related Videos API - Get suggestions based on video ID
 * Uses Piped API or YouTube scraping
 */

import { NextRequest, NextResponse } from 'next/server';

const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://pipedapi.in.projectsegfau.lt',
  'https://pipedapi.leptons.xyz',
];

interface PipedRelatedVideo {
  url: string;
  title: string;
  thumbnail: string;
  uploaderName: string;
  duration: number;
}

async function getRelatedFromPiped(videoId: string): Promise<any[]> {
  for (const instance of PIPED_INSTANCES) {
    try {
      const url = `${instance}/streams/${videoId}`;
      console.log('[API Related] Trying Piped:', url);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.log('[API Related] Instance failed:', instance, response.status);
        continue;
      }
      
      const data = await response.json();
      console.log('[API Related] Piped response has relatedStreams:', !!data.relatedStreams, 'count:', data.relatedStreams?.length || 0);
      
      if (data.relatedStreams && data.relatedStreams.length > 0) {
        return data.relatedStreams.map((video: PipedRelatedVideo) => {
          const id = video.url?.replace('/watch?v=', '') || '';
          return {
            youtubeId: id,
            title: video.title || '',
            thumbnail: video.thumbnail || `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
            channelName: video.uploaderName || 'Unknown',
            duration: video.duration || 0,
          };
        });
      }
    } catch (error: any) {
      console.log('[API Related] Piped error:', instance, error.message);
    }
  }
  return [];
}

// Fallback: scrape YouTube watch page for suggestions
async function getRelatedFromYouTube(videoId: string): Promise<any[]> {
  try {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    console.log('[API Related] Trying YouTube scrape for:', videoId);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    
    if (!response.ok) {
      console.log('[API Related] YouTube response not ok:', response.status);
      return [];
    }
    
    const html = await response.text();
    
    // Try to extract video IDs and titles using regex patterns
    const videos: any[] = [];
    
    // Pattern 1: Look for videoId in JSON
    const videoIdRegex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
    const seenIds = new Set<string>([videoId]); // Exclude current video
    
    let match;
    while ((match = videoIdRegex.exec(html)) !== null) {
      const id = match[1];
      if (seenIds.has(id)) continue;
      seenIds.add(id);
      
      // Try to find title for this video
      const titleRegex = new RegExp(`"videoId":"${id}"[^}]*"title":\\s*\\{[^}]*"text":\\s*"([^"]+)"`, 'g');
      const titleMatch = titleRegex.exec(html);
      
      let title = '';
      if (titleMatch) {
        title = titleMatch[1];
      } else {
        // Alternative: look for simpleText
        const simpleRegex = new RegExp(`"videoId":"${id}"[^}]*"title":\\s*\\{[^}]*"simpleText":\\s*"([^"]+)"`, 'g');
        const simpleMatch = simpleRegex.exec(html);
        if (simpleMatch) title = simpleMatch[1];
      }
      
      if (title) {
        videos.push({
          youtubeId: id,
          title: title.replace(/\\u0026/g, '&').replace(/\\"/g, '"'),
          thumbnail: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
          channelName: 'YouTube',
          duration: 0,
        });
      }
      
      if (videos.length >= 15) break;
    }
    
    console.log('[API Related] Extracted', videos.length, 'videos from YouTube');
    return videos;
  } catch (error) {
    console.error('[API Related] YouTube scrape failed:', error);
    return [];
  }
}

// Fallback 2: Search for similar karaoke videos based on title
// Uses the working /api/youtube/search endpoint
async function searchSimilarKaraoke(videoId: string, baseUrl: string): Promise<any[]> {
  try {
    // Get video title from YouTube oEmbed
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    console.log('[API Related] Getting video info from oEmbed');
    
    const infoRes = await fetch(oembedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    let searchQuery = 'karaoke việt nam hot';
    
    if (infoRes.ok) {
      const info = await infoRes.json();
      const title = info.title || '';
      console.log('[API Related] Video title:', title);
      
      // Extract keywords - remove common karaoke terms and brackets
      const cleanTitle = title
        .replace(/\(.*?\)|\[.*?\]/g, '')
        .replace(/karaoke|beat|lyrics|official|mv|music video|chuẩn|mới nhất|nhạc|việt/gi, '')
        .trim();
      
      // Get first 2-3 meaningful words
      const words = cleanTitle.split(/[\s\-|]+/).filter((w: string) => w.length > 1);
      if (words.length > 0) {
        searchQuery = words.slice(0, 2).join(' ') + ' karaoke';
      }
    }
    
    console.log('[API Related] Searching via internal API for:', searchQuery);
    
    // Use internal search API which is working
    try {
      const searchUrl = `${baseUrl}/api/youtube/search?q=${encodeURIComponent(searchQuery)}`;
      const res = await fetch(searchUrl);
      
      if (res.ok) {
        const data = await res.json();
        if (data.songs && data.songs.length > 0) {
          console.log('[API Related] Internal search got', data.songs.length, 'results');
          return data.songs.filter((s: any) => s.youtubeId !== videoId).slice(0, 10);
        }
      }
    } catch (e: any) {
      console.log('[API Related] Internal search failed:', e.message);
    }
    
    return [];
  } catch (error) {
    console.error('[API Related] searchSimilarKaraoke failed:', error);
    return [];
  }
}

// Fallback 3: Use Invidious API
async function getRelatedFromInvidious(videoId: string): Promise<any[]> {
  const INVIDIOUS_INSTANCES = [
    'https://inv.nadeko.net',
    'https://invidious.privacyredirect.com',
    'https://invidious.nerdvpn.de',
  ];
  
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const url = `${instance}/api/v1/videos/${videoId}`;
      console.log('[API Related] Trying Invidious:', url);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) continue;
      
      const data = await response.json();
      
      if (data.recommendedVideos && data.recommendedVideos.length > 0) {
        console.log('[API Related] Invidious got', data.recommendedVideos.length, 'recommendations');
        return data.recommendedVideos.slice(0, 15).map((video: any) => ({
          youtubeId: video.videoId,
          title: video.title || '',
          thumbnail: video.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`,
          channelName: video.author || 'Unknown',
          duration: video.lengthSeconds || 0,
        }));
      }
    } catch (error: any) {
      console.log('[API Related] Invidious error:', instance, error.message);
    }
  }
  return [];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('v') || '';
  const maxResults = parseInt(searchParams.get('max') || '10', 10);
  
  if (!videoId.trim()) {
    return NextResponse.json({ songs: [] });
  }
  
  // Get base URL for internal API calls
  const baseUrl = request.nextUrl.origin;
  
  console.log('[API Related] Getting related for:', videoId);
  
  // Try Piped first
  let songs = await getRelatedFromPiped(videoId);
  console.log('[API Related] Piped returned:', songs.length, 'videos');
  
  // Fallback to Invidious
  if (songs.length === 0) {
    console.log('[API Related] Piped failed, trying Invidious');
    songs = await getRelatedFromInvidious(videoId);
    console.log('[API Related] Invidious returned:', songs.length, 'videos');
  }
  
  // Fallback to YouTube scrape
  if (songs.length === 0) {
    console.log('[API Related] Invidious failed, trying YouTube scrape');
    songs = await getRelatedFromYouTube(videoId);
    console.log('[API Related] YouTube scrape returned:', songs.length, 'videos');
  }
  
  // Fallback 4: Search for similar karaoke videos using internal API
  if (songs.length === 0) {
    console.log('[API Related] All methods failed, trying keyword search');
    songs = await searchSimilarKaraoke(videoId, baseUrl);
    console.log('[API Related] Keyword search returned:', songs.length, 'videos');
  }
  
  // Prioritize karaoke videos
  const karaokeKeywords = ['karaoke', 'beat', 'instrumental', 'lyrics'];
  songs.sort((a, b) => {
    const aKaraoke = karaokeKeywords.some(k => a.title.toLowerCase().includes(k));
    const bKaraoke = karaokeKeywords.some(k => b.title.toLowerCase().includes(k));
    if (aKaraoke && !bKaraoke) return -1;
    if (!aKaraoke && bKaraoke) return 1;
    return 0;
  });
  
  console.log('[API Related] Final result:', songs.length, 'related videos');
  
  return NextResponse.json({ songs: songs.slice(0, maxResults) });
}
