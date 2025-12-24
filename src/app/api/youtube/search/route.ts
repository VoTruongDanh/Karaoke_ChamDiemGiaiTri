/**
 * YouTube Search API - Direct scraping (no external API needed)
 */

import { NextRequest, NextResponse } from 'next/server';

interface VideoResult {
  youtubeId: string;
  title: string;
  thumbnail: string;
  channelName: string;
  duration: number;
}

// Parse duration "4:30" -> 270 seconds
function parseDuration(text: string): number {
  if (!text) return 0;
  const parts = text.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

// Scrape with continuation token for pagination
async function searchYouTubeWithContinuation(query: string, continuationToken?: string): Promise<{ videos: VideoResult[], continuation?: string }> {
  console.log('[Search] Scraping YouTube for:', query, continuationToken ? '(continuation)' : '');
  
  try {
    let html: string;
    let data: any;
    
    if (continuationToken) {
      // Use continuation API
      const response = await fetch('https://www.youtube.com/youtubei/v1/search?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: 'WEB',
              clientVersion: '2.20231219.04.00',
              hl: 'vi',
              gl: 'VN',
            },
          },
          continuation: continuationToken,
        }),
      });
      
      if (!response.ok) return { videos: [] };
      data = await response.json();
      
      // Parse continuation response
      const items = data?.onResponseReceivedCommands?.[0]?.appendContinuationItemsAction?.continuationItems || [];
      const videos: VideoResult[] = [];
      let nextContinuation: string | undefined;
      
      for (const item of items) {
        if (item.continuationItemRenderer) {
          nextContinuation = item.continuationItemRenderer.continuationEndpoint?.continuationCommand?.token;
          continue;
        }
        
        const video = item.videoRenderer;
        if (!video?.videoId) continue;
        
        let title = video.title?.runs?.[0]?.text || video.title?.simpleText || '';
        if (!title) continue;
        
        let channelName = video.ownerText?.runs?.[0]?.text || video.shortBylineText?.runs?.[0]?.text || 'Unknown';
        const durationText = video.lengthText?.simpleText || '';
        
        videos.push({
          youtubeId: video.videoId,
          title,
          thumbnail: `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`,
          channelName,
          duration: parseDuration(durationText),
        });
      }
      
      return { videos, continuation: nextContinuation };
    }
    
    // Initial search
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%253D%253D`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Cache-Control': 'no-cache',
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.log('[Search] YouTube returned:', response.status);
      return { videos: [] };
    }
    
    html = await response.text();
    
    // Extract ytInitialData JSON
    const match = html.match(/var ytInitialData = ({.+?});<\/script>/s) || html.match(/ytInitialData\s*=\s*({.+?});/s);
    if (!match) {
      console.log('[Search] No ytInitialData found');
      return { videos: [] };
    }
    
    data = JSON.parse(match[1]);
    const videos: VideoResult[] = [];
    let nextContinuation: string | undefined;
    
    // Navigate to search results
    const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
      ?.sectionListRenderer?.contents || [];
    
    for (const section of contents) {
      // Check for continuation token
      if (section.continuationItemRenderer) {
        nextContinuation = section.continuationItemRenderer.continuationEndpoint?.continuationCommand?.token;
        continue;
      }
      
      const items = section?.itemSectionRenderer?.contents || [];
      
      for (const item of items) {
        const video = item.videoRenderer;
        if (!video?.videoId) continue;
        
        let title = video.title?.runs?.[0]?.text || video.title?.simpleText || '';
        if (!title) continue;
        
        let channelName = video.ownerText?.runs?.[0]?.text || video.shortBylineText?.runs?.[0]?.text || 'Unknown';
        const durationText = video.lengthText?.simpleText || '';
        
        videos.push({
          youtubeId: video.videoId,
          title,
          thumbnail: `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`,
          channelName,
          duration: parseDuration(durationText),
        });
      }
    }
    
    console.log('[Search] Parsed', videos.length, 'videos, has continuation:', !!nextContinuation);
    return { videos, continuation: nextContinuation };
  } catch (err: any) {
    console.log('[Search] Scrape error:', err.message);
    return { videos: [] };
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const continuation = searchParams.get('continuation') || undefined;
  
  console.log('[Search API] Request:', query, continuation ? '(page)' : '');
  
  if (!query.trim()) {
    return NextResponse.json({ songs: [], continuation: null });
  }
  
  // Add "karaoke" if not present
  const karaokeQuery = query.toLowerCase().includes('karaoke') ? query : `${query} karaoke`;
  
  // Scrape YouTube directly
  const result = await searchYouTubeWithContinuation(karaokeQuery, continuation);
  let songs = result.videos;
  
  console.log('[Search API] Got', songs.length, 'songs');
  
  // Prioritize karaoke videos (only for first page)
  if (songs.length > 0 && !continuation) {
    const karaokeKeywords = ['karaoke', 'beat', 'instrumental', 'lyrics'];
    songs.sort((a, b) => {
      const aK = karaokeKeywords.some(k => a.title.toLowerCase().includes(k));
      const bK = karaokeKeywords.some(k => b.title.toLowerCase().includes(k));
      if (aK && !bK) return -1;
      if (!aK && bK) return 1;
      return 0;
    });
  }
  
  return NextResponse.json(
    { songs, continuation: result.continuation || null },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
  );
}
