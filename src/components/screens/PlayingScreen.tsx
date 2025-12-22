'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { QueueItem } from '@/types/queue';
import type { ScoreData } from '@/types/score';

interface YTPlayer {
  destroy: () => void;
  playVideo: () => void;
  pauseVideo: () => void;
  getCurrentTime: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getDuration: () => number;
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
      PlayerState: { ENDED: number; PLAYING: number; PAUSED: number; BUFFERING: number; CUED: number };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

export interface PlayingScreenProps {
  currentSong: QueueItem;
  onSongEnd: (score?: ScoreData) => void;
  onBack: () => void;
  onSkip?: () => void;
  scoreData?: ScoreData | null;
  scoringEnabled?: boolean;
  onError?: (error: string) => void;
  autoSkipDelay?: number;
}

function BackIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function SkipIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v14" />
    </svg>
  );
}

function RewindIcon() {
  return (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
    </svg>
  );
}

function ForwardIcon() {
  return (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
    </svg>
  );
}

const YOUTUBE_ERROR_MESSAGES: Record<number, string> = {
  2: 'Video ID không hợp lệ',
  5: 'Lỗi HTML5 player',
  100: 'Video không tồn tại',
  101: 'Video không cho phép nhúng',
  150: 'Video không cho phép nhúng',
};

function YouTubePlayer({
  videoId,
  onEnd,
  onReady,
  onError,
  playerRef,
}: {
  videoId: string;
  onEnd: () => void;
  onReady?: () => void;
  onError?: (errorMessage: string) => void;
  playerRef: React.MutableRefObject<YTPlayer | null>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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

    const loadYouTubeAPI = () => {
      return new Promise<void>((resolve, reject) => {
        if (window.YT && window.YT.Player) { resolve(); return; }
        if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
          const checkInterval = setInterval(() => {
            if (window.YT && window.YT.Player) { clearInterval(checkInterval); resolve(); }
          }, 100);
          setTimeout(() => { clearInterval(checkInterval); reject(new Error('Timeout')); }, 10000);
          return;
        }
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.onerror = () => reject(new Error('Failed to load YouTube API'));
        window.onYouTubeIframeAPIReady = () => resolve();
        document.head.appendChild(tag);
        setTimeout(() => reject(new Error('Timeout')), 10000);
      });
    };

    const initPlayer = async () => {
      try {
        await loadYouTubeAPI();
        if (!isMounted || !containerRef.current) return;
        if (playerRef.current) { playerRef.current.destroy(); playerRef.current = null; }

        playerRef.current = new window.YT.Player(containerRef.current, {
          videoId,
          width: '100%',
          height: '100%',
          playerVars: { autoplay: 1, controls: 0, modestbranding: 1, rel: 0, fs: 0, origin: window.location.origin },
          events: {
            onReady: () => { if (isMounted) { setIsLoading(false); onReadyRef.current?.(); } },
            onStateChange: (event) => { if (event.data === window.YT.PlayerState.ENDED) onEndRef.current(); },
            onError: (event) => {
              const msg = YOUTUBE_ERROR_MESSAGES[event.data] || `Lỗi (${event.data})`;
              if (isMounted) { setError(msg); setIsLoading(false); onErrorRef.current?.(msg); }
            },
          },
        });
      } catch (err) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Không thể tải video';
          setError(msg); setIsLoading(false); onErrorRef.current?.(msg);
        }
      }
    };

    initPlayer();
    return () => { isMounted = false; if (playerRef.current) { try { playerRef.current.destroy(); } catch {} playerRef.current = null; } };
  }, [videoId, playerRef]);

  if (error) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center">
        <div className="text-center p-4">
          <p className="text-red-400 text-base mb-2">⚠️ {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-black overflow-hidden relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
          <div className="w-8 h-8 border-3 border-primary-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}

export function PlayingScreen({
  currentSong,
  onSongEnd,
  onBack,
  onSkip,
  scoreData,
  scoringEnabled = false,
  onError,
  autoSkipDelay = 5000,
}: PlayingScreenProps) {
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [seekIndicator, setSeekIndicator] = useState<string | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Reset on song change
  useEffect(() => {
    setError(null);
    setCountdown(0);
    setShowControls(true);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, [currentSong.id]);

  // Auto-hide controls after 5s
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowControls(false), 5000);
  }, []);

  useEffect(() => {
    resetHideTimer();
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  }, [resetHideTimer]);

  // Handle keyboard for seek and show controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const player = playerRef.current;
      const target = e.target as HTMLElement;
      const isOnButton = target.tagName === 'BUTTON';
      
      // Any key shows controls
      resetHideTimer();
      
      // If focused on a button, let it handle Enter/Space
      if (isOnButton && (e.key === 'Enter' || e.key === ' ')) {
        return;
      }
      
      // Arrow up/down - just show controls (navigation handled by browser)
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        // Don't prevent default - allow focus navigation
        return;
      }
      
      // Arrow left/right - seek (only when not on a button or when controls hidden)
      if (player && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        // If controls are hidden, seek
        // If controls are shown and on a button, let navigation work
        if (!showControls || !isOnButton) {
          e.preventDefault();
          try {
            const currentTime = player.getCurrentTime();
            const seekAmount = e.key === 'ArrowLeft' ? -10 : 10;
            const newTime = Math.max(0, currentTime + seekAmount);
            player.seekTo(newTime, true);
            setSeekIndicator(e.key === 'ArrowLeft' ? '-10s' : '+10s');
            setTimeout(() => setSeekIndicator(null), 1000);
          } catch {}
        }
      }
      
      // Enter/OK on remote - show controls if hidden
      if ((e.key === 'Enter' || e.key === ' ') && !showControls) {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [resetHideTimer, showControls]);

  // Error auto-skip countdown
  useEffect(() => {
    if (error && autoSkipDelay > 0) {
      const seconds = Math.ceil(autoSkipDelay / 1000);
      setCountdown(seconds);
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            onSkip?.() || onSongEnd();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
    }
  }, [error, autoSkipDelay, onSkip, onSongEnd]);

  const handleError = useCallback((msg: string) => {
    setError(msg);
    onError?.(msg);
  }, [onError]);

  const handleSkipNow = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    onSkip?.() || onSongEnd();
  }, [onSkip, onSongEnd]);

  const scoreDataRef = useRef(scoreData);
  scoreDataRef.current = scoreData;

  const handleSongEnd = useCallback(() => {
    onSongEnd(scoreDataRef.current || undefined);
  }, [onSongEnd]);

  const handleSeek = useCallback((direction: 'back' | 'forward') => {
    const player = playerRef.current;
    if (!player) return;
    resetHideTimer();
    try {
      const currentTime = player.getCurrentTime();
      const seekAmount = direction === 'back' ? -10 : 10;
      const newTime = Math.max(0, currentTime + seekAmount);
      player.seekTo(newTime, true);
      setSeekIndicator(direction === 'back' ? '-10s' : '+10s');
      setTimeout(() => setSeekIndicator(null), 1000);
    } catch {}
  }, [resetHideTimer]);

  return (
    <div className="min-h-screen bg-black relative" onClick={resetHideTimer}>
      {/* YouTube Player */}
      <div className="absolute inset-0">
        <YouTubePlayer
          videoId={currentSong.song.youtubeId}
          onEnd={handleSongEnd}
          onError={handleError}
          playerRef={playerRef}
        />
      </div>

      {/* Seek indicator */}
      {seekIndicator && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="bg-black/70 px-6 py-3 rounded-xl">
            <p className="text-2xl font-bold text-white">{seekIndicator}</p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-30">
          <div className="text-center p-4">
            <p className="text-red-400 mb-2">⚠️ {error}</p>
            {countdown > 0 && <p className="text-xs text-gray-400 mb-3">Chuyển bài sau {countdown}s</p>}
            <button onClick={handleSkipNow} tabIndex={0} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-sm">
              Bỏ qua
            </button>
          </div>
        </div>
      )}

      {/* Controls overlay - auto hide */}
      <div className={`absolute inset-0 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent flex items-center justify-between">
          <button
            onClick={onBack}
            tabIndex={showControls ? 0 : -1}
            className="flex items-center gap-2 px-3 py-2 bg-black/50 hover:bg-black/70 rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary-400/60 focus:bg-black/70 focus:scale-105"
          >
            <BackIcon />
            <span>Thoát</span>
          </button>

          {onSkip && (
            <button
              onClick={onSkip}
              tabIndex={showControls ? 0 : -1}
              className="flex items-center gap-2 px-3 py-2 bg-black/50 hover:bg-black/70 rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary-400/60 focus:bg-black/70 focus:scale-105"
            >
              <span>Bỏ qua</span>
              <SkipIcon />
            </button>
          )}
        </div>

        {/* Center seek controls */}
        <div className="absolute inset-0 flex items-center justify-center gap-16 pointer-events-none">
          <button
            onClick={() => handleSeek('back')}
            tabIndex={showControls ? 0 : -1}
            className="p-4 bg-black/50 hover:bg-black/70 rounded-full transition-all pointer-events-auto focus:outline-none focus:ring-2 focus:ring-primary-400/60 focus:bg-black/70 focus:scale-110"
          >
            <RewindIcon />
          </button>
          <button
            onClick={() => handleSeek('forward')}
            tabIndex={showControls ? 0 : -1}
            className="p-4 bg-black/50 hover:bg-black/70 rounded-full transition-all pointer-events-auto focus:outline-none focus:ring-2 focus:ring-primary-400/60 focus:bg-black/70 focus:scale-110"
          >
            <ForwardIcon />
          </button>
        </div>

        {/* Bottom song info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
          <p className="text-lg font-semibold truncate">{currentSong.song.title}</p>
          <p className="text-sm text-gray-300">{currentSong.song.channelName}</p>
        </div>

        {/* Score display */}
        {scoringEnabled && scoreData && (
          <div className="absolute top-16 right-4 bg-black/60 backdrop-blur rounded-lg p-3">
            <p className="text-xs text-gray-400 text-center">Điểm</p>
            <p className="text-2xl font-bold text-primary-400 text-center">{scoreData.totalScore}</p>
          </div>
        )}
      </div>

      {/* Hint when controls hidden */}
      {!showControls && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-gray-500">
          Nhấn ◀ ▶ để tua • Nhấn phím khác để hiện điều khiển
        </div>
      )}
    </div>
  );
}

export default PlayingScreen;
