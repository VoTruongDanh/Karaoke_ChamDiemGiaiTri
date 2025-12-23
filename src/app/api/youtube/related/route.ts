/**
 * YouTube Related Videos API - Get YouTube's actual "Up next" suggestions
 * Scrapes YouTube watch page to extract related videos
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
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) return [];
    
    const html = await response.text();
    
    // Find ytInitialData
    const match = html.match(/var\s+ytInitialData\s*=\s*(\{[\s\S]+?\});\s*<\/script>/);
    if (!match) {
      console.log('[Related] No ytInitialData found');
      return [];
    }
    
    const data = JSON.parse(match[1]);
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
        
        // New format: lockupViewModel (YouTube 2024+)
        if (item.lockupViewModel) {
          const lockup = item.lockupViewModel;
          
          // Get video ID from onTap command
          const command = lockup.rendererContext?.commandContext?.onTap?.innertubeCommand;
          id = command?.watchEndpoint?.videoId || '';
          
          // Alternative: get from contentId
          if (!id) {
            id = lockup.contentId || '';
          }
          
          // Get title from metadata
          const metadata = lockup.metadata?.lockupMetadataViewModel;
          if (metadata?.title?.content) {
            title = metadata.title.content;
          }
          
          // Get channel from metadata
          if (metadata?.metadata?.contentMetadataViewModel?.metadataRows) {
            const rows = metadata.metadata.contentMetadataViewModel.metadataRows;
            for (const row of rows) {
              const parts = row.metadataParts || [];
              for (const part of parts) {
                if (part.text?.content && !part.text.content.includes('lượt xem') && !part.text.content.match(/^\d/)) {
                  channelName = part.text.content;
                  break;
                }
              }
              if (channelName !== 'Unknown') break;
            }
          }
          
          // Get duration from contentImage overlay
          const overlay = lockup.contentImage?.collectionThumbnailViewModel?.primaryThumbnail?.thumbnailViewModel?.overlays;
          if (overlay) {
            for (const o of overlay) {
              if (o.thumbnailOverlayBadgeViewModel?.thumbnailBadges) {
                for (const badge of o.thumbnailOverlayBadgeViewModel.thumbnailBadges) {
                  const durationText = badge.thumbnailBadgeViewModel?.text;
                  if (durationText) {
                    duration = parseDuration(durationText);
                  }
                }
              }
            }
          }
        }
        // Old format: compactVideoRenderer
        else if (item.compactVideoRenderer) {
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
          
          const durationText = renderer.lengthText?.simpleText;
          duration = parseDuration(durationText);
        }
        
        // Skip if no valid data
        if (!id || id === videoId || !title) continue;
        
        videos.push({
          youtubeId: id,
          title: title,
          thumbnail: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
          channelName: channelName,
          duration: duration,
        });
        
        if (videos.length >= 20) break;
      }
      
      console.log('[Related] Extracted from secondaryResults:', videos.length);
    }
    
    // Method 2: If no videos found, try to find in autoplay
    if (videos.length === 0) {
      const autoplay = data?.contents?.twoColumnWatchNextResults?.autoplay?.autoplay?.sets?.[0]?.autoplayVideo;
      if (autoplay?.videoId) {
        console.log('[Related] Found autoplay video');
        videos.push({
          youtubeId: autoplay.videoId,
          title: 'Tiếp theo',
          thumbnail: `https://i.ytimg.com/vi/${autoplay.videoId}/mqdefault.jpg`,
          channelName: 'YouTube',
          duration: 0,
        });
      }
    }
    
    // Method 3: Regex fallback - search for compactVideoRenderer patterns
    if (videos.length === 0) {
      console.log('[Related] Trying regex extraction...');
      
      // Find all compactVideoRenderer blocks
      const rendererPattern = /"compactVideoRenderer":\s*\{[^}]*"videoId":\s*"([a-zA-Z0-9_-]{11})"[^}]*"title":\s*\{[^}]*(?:"simpleText":\s*"([^"]+)"|"runs":\s*\[\s*\{\s*"text":\s*"([^"]+)")/g;
      
      const seenIds = new Set([videoId]);
      let regexMatch;
      
      while ((regexMatch = rendererPattern.exec(match[1])) !== null && videos.length < 20) {
        const id = regexMatch[1];
        const title = regexMatch[2] || regexMatch[3];
        
        if (seenIds.has(id) || !title) continue;
        seenIds.add(id);
        
        videos.push({
          youtubeId: id,
          title: title.replace(/\\u0026/g, '&').replace(/\\"/g, '"'),
          thumbnail: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
          channelName: 'YouTube',
          duration: 0,
        });
      }
    }
    
    console.log('[Related] Scraped:', videos.length, 'videos');
    return videos;
  } catch (err: any) {
    console.log('[Related] Scrape error:', err.message);
    return [];
  }
}

// Search YouTube for karaoke videos (fallback)
async function searchKaraoke(query: string): Promise<RelatedVideo[]> {
  try {
    console.log('[Related] Searching YouTube for:', query);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'vi-VN,vi;q=0.9',
      },
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) return [];
    
    const html = await response.text();
    const match = html.match(/var\s+ytInitialData\s*=\s*(\{[\s\S]+?\});\s*<\/script>/);
    if (!match) return [];
    
    const data = JSON.parse(match[1]);
    const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
    
    const videos: RelatedVideo[] = [];
    
    for (const section of contents || []) {
      const items = section?.itemSectionRenderer?.contents || [];
      for (const item of items) {
        const renderer = item.videoRenderer;
        if (!renderer?.videoId) continue;
        
        let title = '';
        if (renderer.title?.runs?.[0]?.text) {
          title = renderer.title.runs[0].text;
        }
        
        if (!title) continue;
        
        videos.push({
          youtubeId: renderer.videoId,
          title: title,
          thumbnail: `https://i.ytimg.com/vi/${renderer.videoId}/mqdefault.jpg`,
          channelName: renderer.ownerText?.runs?.[0]?.text || 'Unknown',
          duration: parseDuration(renderer.lengthText?.simpleText),
        });
        
        if (videos.length >= 20) break;
      }
      if (videos.length >= 20) break;
    }
    
    console.log('[Related] Search found:', videos.length, 'videos');
    return videos;
  } catch (err: any) {
    console.log('[Related] Search error:', err.message);
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
  
  // Scrape YouTube watch page
  let songs = await scrapeYouTube(videoId);
  
  // Fallback: search for similar karaoke
  if (songs.length === 0) {
    console.log('[Related] Scrape failed, trying search...');
    songs = await searchKaraoke('karaoke việt nam hot 2024');
  }
  
  // Sort: karaoke videos first
  if (songs.length > 0) {
    const karaokeKeywords = ['karaoke', 'beat', 'instrumental', 'lyrics'];
    songs.sort((a, b) => {
      const aK = karaokeKeywords.some(k => a.title.toLowerCase().includes(k));
      const bK = karaokeKeywords.some(k => b.title.toLowerCase().includes(k));
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
