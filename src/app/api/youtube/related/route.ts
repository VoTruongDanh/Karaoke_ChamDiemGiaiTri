/**
 * YouTube Related Videos API - Get suggestions using Invidious
 */

import { NextRequest, NextResponse } from 'next/server';

// Cache
const cache = new Map<string, { data: any[]; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000;

// Invidious instances
const INVIDIOUS_INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
  'https://invidious.jing.rocks',
  'https://yewtu.be',
  'https://vid.puffyan.us',
];

interface RelatedVideo {
  youtubeId: string;
  title: string;
  thumbnail: string;
  channelName: string;
  duration: number;
}

// Get related videos from Invidious
async function getRelatedInvidious(videoId: string): Promise<RelatedVideo[]> {
  console.log('[Related] Getting related for:', videoId);
  
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const url = `${instance}/api/v1/videos/${videoId}`;
      console.log('[Related] Trying:', instance);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.log('[Related]', instance, 'returned:', response.status);
        continue;
      }
      
      const data = await response.json();
      
      if (data.recommendedVideos && data.recommendedVideos.length > 0) {
        console.log('[Related] Got', data.recommendedVideos.length, 'from', instance);
        
        return data.recommendedVideos
          .filter((v: any) => v.videoId && v.title)
          .map((v: any) => ({
            youtubeId: v.videoId,
            title: v.title,
            thumbnail: v.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`,
            channelName: v.author || 'Unknown',
            duration: v.lengthSeconds || 0,
          }));
      }
    } catch (err: any) {
      console.log('[Related]', instance, 'failed:', err.message);
    }
  }
  
  return [];
}

// Search fallback
async function searchKaraoke(query: string): Promise<RelatedVideo[]> {
  console.log('[Related] Searching:', query);
  
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const url = `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) continue;
      
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        return data
          .filter((v: any) => v.videoId && v.title)
          .slice(0, 15)
          .map((v: any) => ({
            youtubeId: v.videoId,
            title: v.title,
            thumbnail: v.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`,
            channelName: v.author || 'Unknown',
            duration: v.lengthSeconds || 0,
          }));
      }
    } catch {
      continue;
    }
  }
  
  return [];
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
  
  // Get related from Invidious
  let songs = await getRelatedInvidious(videoId);
  
  // Fallback: search karaoke
  if (songs.length === 0) {
    console.log('[Related] No related, searching karaoke...');
    songs = await searchKaraoke('karaoke việt hot 2024');
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
