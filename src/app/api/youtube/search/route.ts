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

// Scrape YouTube search results directly
async function searchYouTube(query: string): Promise<VideoResult[]> {
  console.log('[Search] Scraping YouTube for:', query);
  
  try {
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
      return [];
    }
    
    const html = await response.text();
    console.log('[Search] Got HTML, length:', html.length);
    
    // Extract ytInitialData JSON
    const match = html.match(/var ytInitialData = ({.+?});<\/script>/s);
    if (!match) {
      // Try alternative pattern
      const altMatch = html.match(/ytInitialData\s*=\s*({.+?});/s);
      if (!altMatch) {
        console.log('[Search] No ytInitialData found');
        return [];
      }
      return parseYouTubeData(altMatch[1]);
    }
    
    return parseYouTubeData(match[1]);
  } catch (err: any) {
    console.log('[Search] Scrape error:', err.message);
    return [];
  }
}

function parseYouTubeData(jsonStr: string): VideoResult[] {
  try {
    const data = JSON.parse(jsonStr);
    const videos: VideoResult[] = [];
    
    // Navigate to search results
    const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
      ?.sectionListRenderer?.contents || [];
    
    for (const section of contents) {
      const items = section?.itemSectionRenderer?.contents || [];
      
      for (const item of items) {
        const video = item.videoRenderer;
        if (!video?.videoId) continue;
        
        // Get title
        let title = '';
        if (video.title?.runs?.[0]?.text) {
          title = video.title.runs[0].text;
        } else if (video.title?.simpleText) {
          title = video.title.simpleText;
        }
        
        if (!title) continue;
        
        // Get channel
        let channelName = 'Unknown';
        if (video.ownerText?.runs?.[0]?.text) {
          channelName = video.ownerText.runs[0].text;
        } else if (video.shortBylineText?.runs?.[0]?.text) {
          channelName = video.shortBylineText.runs[0].text;
        }
        
        // Get duration
        const durationText = video.lengthText?.simpleText || 
                            video.lengthText?.accessibility?.accessibilityData?.label || '';
        const duration = parseDuration(durationText);
        
        videos.push({
          youtubeId: video.videoId,
          title,
          thumbnail: `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`,
          channelName,
          duration,
        });
        
        if (videos.length >= 20) break;
      }
      
      if (videos.length >= 20) break;
    }
    
    console.log('[Search] Parsed', videos.length, 'videos');
    return videos;
  } catch (err: any) {
    console.log('[Search] Parse error:', err.message);
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
  
  // Scrape YouTube directly
  let songs = await searchYouTube(karaokeQuery);
  
  console.log('[Search API] Got', songs.length, 'songs');
  
  // Prioritize karaoke videos
  if (songs.length > 0) {
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
    { songs },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
  );
}
