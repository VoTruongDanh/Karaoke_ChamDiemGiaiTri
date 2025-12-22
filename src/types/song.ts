/**
 * Song interface representing a karaoke song from YouTube
 * Requirements: 2.3 - Display thumbnail, title, channel name, and duration
 */
export interface Song {
  /** YouTube video ID */
  youtubeId: string;
  /** Song/video title */
  title: string;
  /** Thumbnail URL from YouTube */
  thumbnail: string;
  /** YouTube channel name */
  channelName: string;
  /** Duration in seconds */
  duration: number;
}

/**
 * Search result from YouTube API
 */
export interface SearchResult {
  /** List of songs matching the search query */
  songs: Song[];
  /** Token for pagination to get next page of results */
  nextPageToken?: string;
}
