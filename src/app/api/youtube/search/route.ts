/**
 * YouTube Search API Proxy - Server-side to avoid CORS
 * Uses ytsr (YouTube Search Results) - no API key needed
 */

import { NextRequest, NextResponse } from 'next/server';

// Piped instances for server-side (no CORS issues)
const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de', 
  'https://watchapi.whatever.social',
  'https://pipedapi.syncpundit.io',
];

interface PipedVideo {
  url: string;
  title: string;
  thumbnail: string;
  uploaderName: string;
  duration: number;
}

async function searchPiped(query: string): Promise<any[]> {
  for (const instance of PIPED_INSTANCES) {
    try {
      const url = `${instance}/search?q=${encodeURIComponent(query)}&filter=videos`;
      console.log('[API] Trying Piped:', url);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.log('[API] Piped instance failed:', instance, response.status);
        continue;
      }
      
      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        return data.items.map((video: PipedVideo) => {
          const videoId = video.url?.replace('/watch?v=', '') || '';
          return {
            youtubeId: videoId,
            title: video.title || '',
            thumbnail: video.thumbnail || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
            channelName: video.uploaderName || 'Unknown',
            duration: video.duration || 0,
          };
        });
      }
    } catch (error: any) {
      console.log('[API] Piped error:', instance, error.message);
    }
  }
  return [];
}

// Fallback: scrape YouTube directly (basic)
async function searchYouTubeDirect(query: string): Promise<any[]> {
  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    console.log('[API] Trying YouTube direct scrape');
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    
    if (!response.ok) return [];
    
    const html = await response.text();
    
    // Extract ytInitialData JSON
    const match = html.match(/var ytInitialData = ({.+?});<\/script>/);
    if (!match) return [];
    
    const data = JSON.parse(match[1]);
    const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
      ?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || [];
    
    const videos: any[] = [];
    for (const item of contents) {
      const video = item.videoRenderer;
      if (!video) continue;
      
      const videoId = video.videoId;
      const title = video.title?.runs?.[0]?.text || '';
      const channel = video.ownerText?.runs?.[0]?.text || '';
      const durationText = video.lengthText?.simpleText || '0:00';
      
      // Parse duration "4:30" -> 270 seconds
      const parts = durationText.split(':').map(Number);
      let duration = 0;
      if (parts.length === 3) duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
      else if (parts.length === 2) duration = parts[0] * 60 + parts[1];
      
      videos.push({
        youtubeId: videoId,
        title,
        thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
        channelName: channel,
        duration,
      });
    }
    
    return videos.slice(0, 20);
  } catch (error) {
    console.error('[API] YouTube scrape failed:', error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  
  if (!query.trim()) {
    return NextResponse.json({ songs: [] });
  }
  
  // Add "karaoke" if not present
  const karaokeQuery = query.toLowerCase().includes('karaoke') ? query : `${query} karaoke`;
  
  console.log('[API] Searching:', karaokeQuery);
  
  // Try Piped first
  let songs = await searchPiped(karaokeQuery);
  
  // Fallback to direct scrape
  if (songs.length === 0) {
    console.log('[API] Piped failed, trying direct scrape');
    songs = await searchYouTubeDirect(karaokeQuery);
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
  
  console.log('[API] Found', songs.length, 'songs');
  
  return NextResponse.json({ songs });
}
