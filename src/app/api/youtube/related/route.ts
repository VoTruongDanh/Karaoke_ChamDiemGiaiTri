/**
 * YouTube Related Videos API - Get suggestions based on video ID
 * Uses Piped API or YouTube scraping
 */

import { NextRequest, NextResponse } from 'next/server';

const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://watchapi.whatever.social',
  'https://pipedapi.syncpundit.io',
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
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.log('[API Related] Instance failed:', instance, response.status);
        continue;
      }
      
      const data = await response.json();
      
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
    console.log('[API Related] Trying YouTube scrape');
    
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
    
    // Find secondary results (related videos)
    const secondaryResults = data?.contents?.twoColumnWatchNextResults?.secondaryResults
      ?.secondaryResults?.results || [];
    
    const videos: any[] = [];
    for (const item of secondaryResults) {
      const video = item.compactVideoRenderer;
      if (!video) continue;
      
      const id = video.videoId;
      if (!id) continue;
      
      const title = video.title?.simpleText || video.title?.runs?.[0]?.text || '';
      const channel = video.shortBylineText?.runs?.[0]?.text || '';
      const durationText = video.lengthText?.simpleText || '0:00';
      
      // Parse duration
      const parts = durationText.split(':').map(Number);
      let duration = 0;
      if (parts.length === 3) duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
      else if (parts.length === 2) duration = parts[0] * 60 + parts[1];
      
      videos.push({
        youtubeId: id,
        title,
        thumbnail: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
        channelName: channel,
        duration,
      });
    }
    
    return videos.slice(0, 15);
  } catch (error) {
    console.error('[API Related] YouTube scrape failed:', error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('v') || '';
  const maxResults = parseInt(searchParams.get('max') || '10', 10);
  
  if (!videoId.trim()) {
    return NextResponse.json({ songs: [] });
  }
  
  console.log('[API Related] Getting related for:', videoId);
  
  // Try Piped first
  let songs = await getRelatedFromPiped(videoId);
  
  // Fallback to YouTube scrape
  if (songs.length === 0) {
    console.log('[API Related] Piped failed, trying YouTube scrape');
    songs = await getRelatedFromYouTube(videoId);
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
  
  console.log('[API Related] Found', songs.length, 'related videos');
  
  return NextResponse.json({ songs: songs.slice(0, maxResults) });
}
