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
  'https://api.piped.yt',
  'https://pipedapi.in.projectsegfau.lt',
];

interface PipedVideo {
  url: string;
  title: string;
  thumbnail: string;
  uploaderName: string;
  duration: number;
}

// Race all instances in parallel - return first successful result
async function searchPipedParallel(query: string): Promise<any[]> {
  console.log('[Search API] Trying Piped instances for:', query);
  
  const promises = PIPED_INSTANCES.map(async (instance) => {
    try {
      const url = `${instance}/search?q=${encodeURIComponent(query)}&filter=videos`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        console.log('[Search API] Success from:', instance, '- got', data.items.length, 'results');
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
      throw new Error('No results');
    } catch (err: any) {
      // Silent fail for individual instances
      throw new Error(`${instance} failed: ${err.message}`);
    }
  });

  // Return first successful result
  try {
    return await Promise.any(promises);
  } catch (err) {
    console.log('[Search API] All Piped instances failed');
    return [];
  }
}

// Fallback: scrape YouTube directly (basic)
async function searchYouTubeDirect(query: string): Promise<any[]> {
  console.log('[Search API] Trying direct YouTube scrape for:', query);
  
  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.log('[Search API] YouTube returned:', response.status);
      return [];
    }
    
    const html = await response.text();
    console.log('[Search API] Got HTML, length:', html.length);
    
    // Extract ytInitialData JSON
    const match = html.match(/var ytInitialData = ({.+?});<\/script>/);
    if (!match) {
      console.log('[Search API] No ytInitialData found in HTML');
      return [];
    }
    
    const data = JSON.parse(match[1]);
    const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
      ?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || [];
    
    console.log('[Search API] Found', contents.length, 'content items');
    
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
    
    console.log('[Search API] Extracted', videos.length, 'videos from YouTube');
    return videos.slice(0, 20);
  } catch (err: any) {
    console.log('[Search API] YouTube scrape error:', err.message);
    return [];
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  
  console.log('[Search API] Request:', query);
  
  if (!query.trim()) {
    return NextResponse.json({ songs: [] });
  }
  
  // Add "karaoke" if not present
  const karaokeQuery = query.toLowerCase().includes('karaoke') ? query : `${query} karaoke`;
  
  // Try Piped instances in parallel (race)
  let songs = await searchPipedParallel(karaokeQuery);
  
  // Fallback to direct scrape only if Piped failed
  if (songs.length === 0) {
    console.log('[Search API] Piped failed, trying direct scrape...');
    songs = await searchYouTubeDirect(karaokeQuery);
  }
  
  console.log('[Search API] Final result:', songs.length, 'songs');
  
  // Prioritize karaoke videos
  const karaokeKeywords = ['karaoke', 'beat', 'instrumental', 'lyrics'];
  songs.sort((a, b) => {
    const aKaraoke = karaokeKeywords.some(k => a.title.toLowerCase().includes(k));
    const bKaraoke = karaokeKeywords.some(k => b.title.toLowerCase().includes(k));
    if (aKaraoke && !bKaraoke) return -1;
    if (!aKaraoke && bKaraoke) return 1;
    return 0;
  });
  
  // Set cache headers for faster subsequent requests
  return NextResponse.json(
    { songs },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    }
  );
}
