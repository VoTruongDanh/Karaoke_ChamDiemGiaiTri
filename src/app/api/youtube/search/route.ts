/**
 * YouTube Search API Proxy - Server-side to avoid CORS
 * Uses Invidious instances (more stable than Piped)
 */

import { NextRequest, NextResponse } from 'next/server';

// Invidious instances - more stable than Piped
const INVIDIOUS_INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
  'https://invidious.jing.rocks',
  'https://yewtu.be',
  'https://vid.puffyan.us',
  'https://invidious.privacyredirect.com',
];

interface InvidiousVideo {
  videoId: string;
  title: string;
  videoThumbnails?: { url: string }[];
  author: string;
  lengthSeconds: number;
}

// Try each Invidious instance sequentially (more reliable than race)
async function searchInvidious(query: string): Promise<any[]> {
  console.log('[Search API] Trying Invidious instances for:', query);
  
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const url = `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video`;
      console.log('[Search API] Trying:', instance);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.log('[Search API]', instance, 'returned:', response.status);
        continue;
      }
      
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        console.log('[Search API] Success from:', instance, '- got', data.length, 'results');
        
        return data
          .filter((v: InvidiousVideo) => v.videoId && v.title)
          .map((video: InvidiousVideo) => ({
            youtubeId: video.videoId,
            title: video.title,
            thumbnail: video.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`,
            channelName: video.author || 'Unknown',
            duration: video.lengthSeconds || 0,
          }));
      }
    } catch (err: any) {
      console.log('[Search API]', instance, 'failed:', err.message);
    }
  }
  
  console.log('[Search API] All Invidious instances failed');
  return [];
}

// Fallback: scrape YouTube directly
async function searchYouTubeDirect(query: string): Promise<any[]> {
  console.log('[Search API] Trying direct YouTube scrape for:', query);
  
  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.log('[Search API] YouTube returned:', response.status);
      return [];
    }
    
    const html = await response.text();
    
    // Extract ytInitialData JSON
    const match = html.match(/var ytInitialData = ({.+?});<\/script>/);
    if (!match) {
      console.log('[Search API] No ytInitialData found');
      return [];
    }
    
    const data = JSON.parse(match[1]);
    const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
      ?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || [];
    
    const videos: any[] = [];
    for (const item of contents) {
      const video = item.videoRenderer;
      if (!video?.videoId) continue;
      
      const title = video.title?.runs?.[0]?.text || '';
      const channel = video.ownerText?.runs?.[0]?.text || '';
      const durationText = video.lengthText?.simpleText || '0:00';
      
      const parts = durationText.split(':').map(Number);
      let duration = 0;
      if (parts.length === 3) duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
      else if (parts.length === 2) duration = parts[0] * 60 + parts[1];
      
      videos.push({
        youtubeId: video.videoId,
        title,
        thumbnail: `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`,
        channelName: channel,
        duration,
      });
    }
    
    console.log('[Search API] Scraped', videos.length, 'videos');
    return videos.slice(0, 20);
  } catch (err: any) {
    console.log('[Search API] Scrape error:', err.message);
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
  
  // Try Invidious first
  let songs = await searchInvidious(karaokeQuery);
  
  // Fallback to direct scrape
  if (songs.length === 0) {
    console.log('[Search API] Invidious failed, trying scrape...');
    songs = await searchYouTubeDirect(karaokeQuery);
  }
  
  console.log('[Search API] Final:', songs.length, 'songs');
  
  // Prioritize karaoke videos
  const karaokeKeywords = ['karaoke', 'beat', 'instrumental', 'lyrics'];
  songs.sort((a, b) => {
    const aK = karaokeKeywords.some(k => a.title.toLowerCase().includes(k));
    const bK = karaokeKeywords.some(k => b.title.toLowerCase().includes(k));
    if (aK && !bK) return -1;
    if (!aK && bK) return 1;
    return 0;
  });
  
  return NextResponse.json(
    { songs },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
  );
}
