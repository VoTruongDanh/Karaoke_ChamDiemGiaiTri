'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { NavigationGrid } from '@/components/NavigationGrid';
import { FocusableButton } from '@/components/FocusableButton';
import type { QueueItem } from '@/types/queue';
import type { ScoreData, RealTimeFeedback } from '@/types/score';

// YouTube IFrame API types
interface YTPlayer {
  destroy: () => void;
  playVideo: () => void;
  pauseVideo: () => void;
  getCurrentTime: () => number;
}

interface YTPlayerOptions {
  videoId: string;
  width: string;
  height: string;
  playerVars: Record<string, unknown>;
  events: {
    onReady?: () => void;
    onStateChange?: (event: { data: number }) => void;
    onError?: (event: { data: number }) => void;
  };
}

declare global {
  interface Window {
    YT: {
      Player: new (element: HTMLElement, options: YTPlayerOptions) => YTPlayer;
      PlayerState: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

/**
 * Props for PlayingScreen component
 */
export interface PlayingScreenProps {
  /** Currently playing queue item */
  currentSong: QueueItem;
  /** Callback when song ends (with optional score) */
  onSongEnd: (score?: ScoreData) => void;
  /** Callback when back/exit is pressed */
  onBack: () => void;
  /** Callback when skip is pressed */
  onSkip?: () => void;
  /** Current score data */
  scoreData?: ScoreData | null;
  /** Real-time feedback */
  realTimeFeedback?: RealTimeFeedback | null;
  /** Whether scoring is enabled */
  scoringEnabled?: boolean;
  /** Callback when YouTube error occurs */
  onError?: (error: string) => void;
  /** Auto-skip delay in ms after error (0 = no auto-skip) */
  autoSkipDelay?: number;
}

/**
 * Back icon component
 */
function BackIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

/**
 * Skip icon component
 */
function SkipIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v14" />
    </svg>
  );
}

/**
 * Format duration from seconds to mm:ss
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get accuracy color based on feedback
 */
function getAccuracyColor(accuracy: RealTimeFeedback['accuracy']): string {
  switch (accuracy) {
    case 'perfect': return 'text-accent-green';
    case 'good': return 'text-accent-cyan';
    case 'ok': return 'text-accent-yellow';
    case 'miss': return 'text-red-400';
    default: return 'text-gray-400';
  }
}

/**
 * Get accuracy label
 */
function getAccuracyLabel(accuracy: RealTimeFeedback['accuracy']): string {
  switch (accuracy) {
    case 'perfect': return 'PERFECT!';
    case 'good': return 'GOOD!';
    case 'ok': return 'OK';
    case 'miss': return 'MISS';
    default: return '';
  }
}

/**
 * Score display component - Clean design without mic icon
 */
function ScoreDisplay({ 
  scoreData, 
  realTimeFeedback,
  scoringEnabled 
}: { 
  scoreData?: ScoreData | null;
  realTimeFeedback?: RealTimeFeedback | null;
  scoringEnabled?: boolean;
}) {
  // Don't show anything if scoring is not enabled
  if (!scoringEnabled) {
    return null;
  }

  return (
    <div className="bg-black/60 backdrop-blur-sm rounded-tv-lg p-4">
      {/* Score header */}
      <div className="text-center mb-2">
        <p className="text-xs text-gray-400">Điểm số</p>
        <p className="text-4xl font-bold text-primary-400">
          {scoreData?.totalScore ?? 0}
        </p>
      </div>

      {/* Real-time feedback */}
      {realTimeFeedback && (
        <div className="flex items-center justify-center py-2">
          <span className={`text-xl font-bold ${getAccuracyColor(realTimeFeedback.accuracy)} animate-scale-in`}>
            {getAccuracyLabel(realTimeFeedback.accuracy)}
          </span>
        </div>
      )}

      {/* Score breakdown */}
      {scoreData && (
        <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-white/20">
          <div className="text-center">
            <p className="text-lg font-semibold text-white">{scoreData.pitchAccuracy}%</p>
            <p className="text-xs text-gray-400">Cao độ</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-white">{scoreData.timing}%</p>
            <p className="text-xs text-gray-400">Nhịp điệu</p>
          </div>
        </div>
      )}
    </div>
  );
}


/**
 * YouTube player error codes
 * Requirements: 8.4 - IF YouTube video fails to load, THEN display error and skip to next song
 */
const YOUTUBE_ERROR_MESSAGES: Record<number, string> = {
  2: 'Video ID không hợp lệ',
  5: 'Lỗi HTML5 player',
  100: 'Video không tồn tại hoặc đã bị xóa',
  101: 'Video không cho phép nhúng',
  150: 'Video không cho phép nhúng',
};

/**
 * YouTube player component
 * Uses YouTube IFrame API
 * 
 * Requirements: 8.4 - Handle YouTube video load failures
 */
function YouTubePlayer({
  videoId,
  onEnd,
  onReady,
  onError,
}: {
  videoId: string;
  onEnd: (score?: ScoreData) => void;
  onReady?: () => void;
  onError?: (errorMessage: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Store callbacks in refs to avoid re-creating player
  const onEndRef = useRef(onEnd);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  
  useEffect(() => {
    onEndRef.current = onEnd;
    onReadyRef.current = onReady;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);
    
    console.log('[YouTube Player] Loading video:', videoId);

    // Load YouTube IFrame API if not already loaded
    const loadYouTubeAPI = () => {
      return new Promise<void>((resolve, reject) => {
        if (window.YT && window.YT.Player) {
          resolve();
          return;
        }

        // Check if script already exists
        if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
          // Wait for it to load
          const checkInterval = setInterval(() => {
            if (window.YT && window.YT.Player) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 100);
          
          setTimeout(() => {
            clearInterval(checkInterval);
            reject(new Error('YouTube API timeout'));
          }, 10000);
          return;
        }

        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.onerror = () => reject(new Error('Failed to load YouTube API'));
        
        window.onYouTubeIframeAPIReady = () => {
          resolve();
        };
        
        document.head.appendChild(tag);
        
        setTimeout(() => {
          reject(new Error('YouTube API timeout'));
        }, 10000);
      });
    };

    const initPlayer = async () => {
      try {
        await loadYouTubeAPI();
        
        if (!isMounted || !containerRef.current) return;

        // Destroy existing player
        if (playerRef.current) {
          playerRef.current.destroy();
          playerRef.current = null;
        }

        playerRef.current = new window.YT.Player(containerRef.current, {
          videoId,
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 1,
            controls: 1,
            modestbranding: 1,
            rel: 0,
            fs: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              console.log('[YouTube Player] Ready');
              if (isMounted) {
                setIsLoading(false);
                onReadyRef.current?.();
              }
            },
            onStateChange: (event: { data: number }) => {
              console.log('[YouTube Player] State:', event.data);
              if (event.data === window.YT.PlayerState.ENDED) {
                onEndRef.current();
              }
            },
            onError: (event: { data: number }) => {
              const errorCode = event.data;
              const errorMessage = YOUTUBE_ERROR_MESSAGES[errorCode] || `Lỗi YouTube (mã: ${errorCode})`;
              console.error('[YouTube Player] Error:', errorCode, errorMessage);
              if (isMounted) {
                setError(errorMessage);
                setIsLoading(false);
                onErrorRef.current?.(errorMessage);
              }
            },
          },
        });
      } catch (err) {
        console.error('[YouTube Player] Init error:', err);
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Không thể khởi tạo YouTube player';
          setError(msg);
          setIsLoading(false);
          onErrorRef.current?.(msg);
        }
      }
    };

    initPlayer();

    return () => {
      isMounted = false;
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          // Ignore destroy errors
        }
        playerRef.current = null;
      }
    };
  }, [videoId]); // Only re-init when videoId changes

  if (error) {
    return (
      <div className="w-full h-full bg-black rounded-tv-lg flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-red-400 text-xl mb-4">⚠️ {error}</p>
          <p className="text-gray-400 text-sm">Video ID: {videoId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-black rounded-tv-lg overflow-hidden relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-primary-400 border-t-transparent rounded-full mb-4" />
            <p className="text-gray-400">Đang tải video...</p>
            <p className="text-gray-500 text-sm mt-2">ID: {videoId}</p>
          </div>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}

/**
 * Song info overlay component
 */
function SongInfoOverlay({ song }: { song: QueueItem }) {
  const [visible, setVisible] = useState(true);

  // Reset visibility and auto-hide after 5 seconds when song changes
  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(timer);
  }, [song.id]);

  if (!visible) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-6 animate-fade-in">
      <p className="text-2xl font-bold truncate text-white">{song.song.title}</p>
      <p className="text-lg text-gray-300">{song.song.channelName}</p>
      <p className="text-sm text-gray-400">
        Thêm bởi: {song.addedBy} • {formatDuration(song.song.duration)}
      </p>
    </div>
  );
}

/**
 * Error overlay component
 * Requirements: 8.4 - Display error and skip to next song after 5 seconds
 */
function ErrorOverlay({
  error,
  countdown,
  onSkip,
  onRetry,
}: {
  error: string;
  countdown: number;
  onSkip: () => void;
  onRetry?: () => void;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-10">
      <div className="text-center max-w-md px-tv-4">
        <div className="w-16 h-16 mx-auto mb-tv-3 text-red-400">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-tv-lg font-bold text-red-400 mb-tv-2">Không thể phát video</h3>
        <p className="text-tv-sm text-gray-300 mb-tv-3">{error}</p>
        {countdown > 0 && (
          <p className="text-tv-xs text-gray-400 mb-tv-3">
            Tự động chuyển bài sau {countdown} giây...
          </p>
        )}
        <div className="flex gap-tv-2 justify-center">
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-tv-3 py-tv-2 bg-primary-600 hover:bg-primary-500 rounded-tv text-tv-sm transition-colors"
            >
              Thử lại
            </button>
          )}
          <button
            onClick={onSkip}
            className="px-tv-3 py-tv-2 bg-gray-600 hover:bg-gray-500 rounded-tv text-tv-sm transition-colors"
          >
            Bỏ qua ngay
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * PlayingScreen component - YouTube player with song info and scoring
 * 
 * Requirements: 2.4 - Load and play YouTube video when song is selected
 * Requirements: 6.3 - Show lyrics overlay with karaoke-style highlighting
 * Requirements: 8.4 - Handle YouTube video load failures with auto-skip
 * 
 * Features:
 * - YouTube player embed
 * - Song info overlay
 * - Score display area
 * - TV-optimized controls
 * - Error handling with auto-skip
 */
export function PlayingScreen({
  currentSong,
  onSongEnd,
  onBack,
  onSkip,
  scoreData,
  realTimeFeedback,
  scoringEnabled = false,
  onError,
  autoSkipDelay = 5000,
}: PlayingScreenProps) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Reset state when song changes
  useEffect(() => {
    setIsReady(false);
    setError(null);
    setCountdown(0);
    setRetryCount(0);
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, [currentSong.id]);

  // Handle countdown for auto-skip
  useEffect(() => {
    if (error && autoSkipDelay > 0) {
      const seconds = Math.ceil(autoSkipDelay / 1000);
      setCountdown(seconds);
      
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            // Auto-skip to next song
            onSkip?.() || onSongEnd();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (countdownRef.current) clearInterval(countdownRef.current);
      };
    }
  }, [error, autoSkipDelay, onSkip, onSongEnd]);

  const handleReady = useCallback(() => {
    setIsReady(true);
    setError(null);
  }, []);

  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setIsReady(false);
    onError?.(errorMessage);
  }, [onError]);

  const handleRetry = useCallback(() => {
    if (retryCount < 2) {
      setError(null);
      setCountdown(0);
      setRetryCount(prev => prev + 1);
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    }
  }, [retryCount]);

  const handleSkipNow = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    onSkip?.() || onSongEnd();
  }, [onSkip, onSongEnd]);

  // Store scoreData in ref to avoid re-creating callback
  const scoreDataRef = useRef(scoreData);
  scoreDataRef.current = scoreData;

  // Handle song end with score - use ref to avoid dependency on scoreData
  const handleSongEnd = useCallback(() => {
    onSongEnd(scoreDataRef.current || undefined);
  }, [onSongEnd]);

  return (
    <NavigationGrid className="min-h-screen bg-black">
      {/* Main player area */}
      <div className="relative w-full h-screen">
        {/* YouTube Player */}
        <div className="absolute inset-0">
          <YouTubePlayer
            key={`${currentSong.song.youtubeId}-${retryCount}`}
            videoId={currentSong.song.youtubeId}
            onEnd={handleSongEnd}
            onReady={handleReady}
            onError={handleError}
          />
        </div>

        {/* Loading overlay */}
        {!isReady && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-tv-bg">
            <div className="text-center">
              <div className="animate-spin w-16 h-16 border-4 border-primary-400 border-t-transparent rounded-full mb-tv-3" />
              <p className="text-tv-sm text-gray-400">Đang tải video...</p>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <ErrorOverlay
            error={error}
            countdown={countdown}
            onSkip={handleSkipNow}
            onRetry={retryCount < 2 ? handleRetry : undefined}
          />
        )}

        {/* Song info overlay */}
        <SongInfoOverlay song={currentSong} />

        {/* Top controls */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent">
          <FocusableButton
            row={0}
            col={0}
            onSelect={onBack}
            variant="ghost"
            size="sm"
            icon={<BackIcon />}
            autoFocus
            ariaLabel="Quay lại"
            className="!bg-black/40 hover:!bg-black/60"
          >
            Thoát
          </FocusableButton>

          {onSkip && (
            <FocusableButton
              row={0}
              col={1}
              onSelect={onSkip}
              variant="ghost"
              size="sm"
              icon={<SkipIcon />}
              ariaLabel="Bỏ qua bài hát"
              className="!bg-black/40 hover:!bg-black/60"
            >
              Bỏ qua
            </FocusableButton>
          )}
        </div>

        {/* Score display - right side */}
        <div className="absolute top-20 right-4 w-56">
          <ScoreDisplay
            scoreData={scoreData}
            realTimeFeedback={realTimeFeedback}
            scoringEnabled={scoringEnabled}
          />
        </div>

        {/* Next song preview - bottom right */}
        {/* This would show the next song in queue */}
      </div>
    </NavigationGrid>
  );
}

export default PlayingScreen;
