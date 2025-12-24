/**
 * YouTube Related Videos API - Direct scraping
 */

import { NextRequest, NextResponse } from 'next/server';

// Cache
const cache = new Map<string, { data: any[]; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000;

interface RelatedVideo {
  youtubeId: string;
  title: string;
  thumbnail: string;
  channelName: string;
  duration: number;
}

function parseDuration(text?: string): number {
  if (!text) return 0;
  const parts = text.split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

// Scrape YouTube watch page for related videos
async function scrapeYouTube(videoId: string): Promise<RelatedVideo[]> {
  try {
    console.log('[Related] Scraping YouTube for:', videoId);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.log('[Related] YouTube returned:', response.status);
      return [];
    }
    
    const html = await response.text();
    console.log('[Related] Got HTML, length:', html.length);
    
    // Find ytInitialData
    const match = html.match(/var\s+ytInitialData\s*=\s*(\{[\s\S]+?\});\s*<\/script>/);
    if (!match) {
      const altMatch = html.match(/ytInitialData\s*=\s*(\{[\s\S]+?\});/);
      if (!altMatch) {
        console.log('[Related] No ytInitialData found');
        return [];
      }
      return parseRelatedVideos(altMatch[1], videoId);
    }
    
    return parseRelatedVideos(match[1], videoId);
  } catch (err: any) {
    console.log('[Related] Scrape error:', err.message);
    return [];
  }
}

function parseRelatedVideos(jsonStr: string, currentVideoId: string): RelatedVideo[] {
  try {
    const data = JSON.parse(jsonStr);
    const videos: RelatedVideo[] = [];
    
    // Method 1: Extract from secondaryResults (sidebar)
    const secondaryResults = data?.contents?.twoColumnWatchNextResults?.secondaryResults?.secondaryResults?.results;
    
    if (secondaryResults?.length) {
      console.log('[Related] Found secondaryResults:', secondaryResults.length);
      
      for (const item of secondaryResults) {
        let id = '';
        let title = '';
        let channelName = 'Unknown';
        let duration = 0;
        
        // compactVideoRenderer (common format)
        if (item.compactVideoRenderer) {
          const renderer = item.compactVideoRenderer;
          id = renderer.videoId || '';
          
          if (renderer.title?.simpleText) {
            title = renderer.title.simpleText;
          } else if (renderer.title?.runs?.[0]?.text) {
            title = renderer.title.runs[0].text;
          }
          
          if (renderer.shortBylineText?.runs?.[0]?.text) {
            channelName = renderer.shortBylineText.runs[0].text;
          }
          
          duration = parseDuration(renderer.lengthText?.simpleText);
        }
        // lockupViewModel (newer format)
        else if (item.lockupViewModel) {
          const lockup = item.lockupViewModel;
          const command = lockup.rendererContext?.commandContext?.onTap?.innertubeCommand;
          id = command?.watchEndpoint?.videoId || lockup.contentId || '';
          
          const metadata = lockup.metadata?.lockupMetadataViewModel;
          if (metadata?.title?.content) {
            title = metadata.title.content;
          }
        }
        
        if (!id || id === currentVideoId || !title) continue;
        
        videos.push({
          youtubeId: id,
          title,
          thumbnail: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
          channelName,
          duration,
        });
        
        if (videos.length >= 20) break;
      }
    }
    
    console.log('[Related] Parsed', videos.length, 'videos');
    return videos;
  } catch (err: any) {
    console.log('[Related] Parse error:', err.message);
    return [];
  }
}

// Search fallback
async function searchKaraoke(): Promise<RelatedVideo[]> {
  console.log('[Related] Searching popular karaoke...');
  
  try {
    const response = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent('karaoke việt hot 2024')}&sp=EgIQAQ%253D%253D`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'vi-VN,vi;q=0.9',
      },
    });
    
    if (!response.ok) return [];
    
    const html = await response.text();
    const match = html.match(/var ytInitialData = ({.+?});<\/script>/s);
    if (!match) return [];
    
    const data = JSON.parse(match[1]);
    const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
    
    const videos: RelatedVideo[] = [];
    
    for (const section of contents || []) {
      const items = section?.itemSectionRenderer?.contents || [];
      for (const item of items) {
        const renderer = item.videoRenderer;
        if (!renderer?.videoId) continue;
        
        let title = renderer.title?.runs?.[0]?.text || '';
        if (!title) continue;
        
        videos.push({
          youtubeId: renderer.videoId,
          title,
          thumbnail: `https://i.ytimg.com/vi/${renderer.videoId}/mqdefault.jpg`,
          channelName: renderer.ownerText?.runs?.[0]?.text || 'Unknown',
          duration: parseDuration(renderer.lengthText?.simpleText),
        });
        
        if (videos.length >= 15) break;
      }
      if (videos.length >= 15) break;
    }
    
    return videos;
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('v') || '';
  const maxResults = parseInt(searchParams.get('max') || '15', 10);
  
  if (!videoId.trim()) {
    return NextResponse.json({ songs: [] });
  }
  
  console.log('[Related] Request:', videoId);
  
  // Check cache
  const cached = cache.get(videoId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('[Related] Cache hit:', cached.data.length);
    return NextResponse.json({ songs: cached.data.slice(0, maxResults) });
  }
  
  // Scrape YouTube
  let songs = await scrapeYouTube(videoId);
  
  // Fallback: search karaoke
  if (songs.length === 0) {
    songs = await searchKaraoke();
  }
  
  // Sort: karaoke first
  if (songs.length > 0) {
    const keywords = ['karaoke', 'beat', 'instrumental', 'lyrics'];
    songs.sort((a, b) => {
      const aK = keywords.some(k => a.title.toLowerCase().includes(k));
      const bK = keywords.some(k => b.title.toLowerCase().includes(k));
      if (aK && !bK) return -1;
      if (!aK && bK) return 1;
      return 0;
    });
    
    // Cache
    cache.set(videoId, { data: songs, timestamp: Date.now() });
    if (cache.size > 100) {
      const oldest = cache.keys().next().value;
      if (oldest) cache.delete(oldest);
    }
  }
  
  console.log('[Related] Returning:', songs.length);
  return NextResponse.json({ songs: songs.slice(0, maxResults) });
}
