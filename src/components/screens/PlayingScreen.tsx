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
  mute: () => void;
  unMute: () => void;
  getPlayerState: () => number;
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
  onSongEnd: (score?: ScoreData, videoProgress?: number) => void;
  onBack: () => void;
  onSkip?: () => void;
  scoreData?: ScoreData | null;
  scoringEnabled?: boolean;
  onError?: (error: string) => void;
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

function PlayIcon() {
  return (
    <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
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
  const playerDivRef = useRef<HTMLDivElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  
  const onEndRef = useRef(onEnd);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  
  useEffect(() => {
    onEndRef.current = onEnd;
    onReadyRef.current = onReady;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    isMountedRef.current = true;
    setIsLoading(true);
    setError(null);

    const loadYouTubeAPI = () => {
      return new Promise<void>((resolve, reject) => {
        if (window.YT && window.YT.Player) { resolve(); return; }
        if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
          const checkInterval = setInterval(() => {
            if (window.YT && window.YT.Player) { clearInterval(checkInterval); resolve(); }
          }, 100);
          setTimeout(() => { clearInterval(checkInterval); reject(new Error('Timeout loading YouTube API')); }, 30000);
          return;
        }
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.onerror = () => reject(new Error('Failed to load YouTube API'));
        window.onYouTubeIframeAPIReady = () => resolve();
        document.head.appendChild(tag);
        setTimeout(() => reject(new Error('Timeout loading YouTube API')), 30000);
      });
    };

    const initPlayer = async () => {
      try {
        await loadYouTubeAPI();
        if (!isMountedRef.current || !containerRef.current) return;
        
        // Cleanup old player safely
        if (playerRef.current) { 
          try { playerRef.current.destroy(); } catch {} 
          playerRef.current = null; 
        }
        
        // Remove old player div if exists
        if (playerDivRef.current && playerDivRef.current.parentNode) {
          try { playerDivRef.current.parentNode.removeChild(playerDivRef.current); } catch {}
        }
        
        // Create new div for player
        const playerDiv = document.createElement('div');
        playerDiv.style.width = '100%';
        playerDiv.style.height = '100%';
        containerRef.current.appendChild(playerDiv);
        playerDivRef.current = playerDiv;

        playerRef.current = new window.YT.Player(playerDiv, {
          videoId,
          width: '100%',
          height: '100%',
          playerVars: { 
            autoplay: 1, 
            controls: 0, 
            modestbranding: 1, 
            rel: 0,
            fs: 0, 
            origin: window.location.origin, 
            playsinline: 1, 
            mute: 1,
            iv_load_policy: 3,
            disablekb: 1,
            showinfo: 0,
            // Performance optimizations
            enablejsapi: 1,
            vq: 'hd720', // Limit quality to 720p for smoother playback on TV
          },
          events: {
            onReady: () => { 
              if (isMountedRef.current) { 
                setIsLoading(false); 
                onReadyRef.current?.(); 
                const player = playerRef.current;
                if (player) {
                  try {
                    player.mute();
                    player.playVideo();
                    const checkAndUnmute = () => {
                      if (!playerRef.current || !isMountedRef.current) return;
                      try {
                        const state = playerRef.current.getPlayerState();
                        if (state === window.YT.PlayerState.PLAYING) {
                          playerRef.current.unMute();
                        } else if (state === window.YT.PlayerState.BUFFERING || state === window.YT.PlayerState.CUED) {
                          setTimeout(checkAndUnmute, 200);
                        } else {
                          playerRef.current.playVideo();
                          setTimeout(checkAndUnmute, 300);
                        }
                      } catch {
                        playerRef.current?.unMute();
                      }
                    };
                    setTimeout(checkAndUnmute, 200);
                  } catch {}
                }
              } 
            },
            onStateChange: (event) => { 
              if (event.data === window.YT.PlayerState.ENDED && isMountedRef.current) {
                onEndRef.current(); 
              }
            },
            onError: (event) => {
              const msg = YOUTUBE_ERROR_MESSAGES[event.data] || `Lỗi (${event.data})`;
              if (isMountedRef.current) { setError(msg); setIsLoading(false); onErrorRef.current?.(msg); }
            },
          },
        });
      } catch (err) {
        if (isMountedRef.current) {
          const msg = err instanceof Error ? err.message : 'Không thể tải video';
          setError(msg); setIsLoading(false); onErrorRef.current?.(msg);
        }
      }
    };

    initPlayer();
    
    return () => { 
      isMountedRef.current = false;
      // Destroy player first
      if (playerRef.current) { 
        try { playerRef.current.destroy(); } catch {} 
        playerRef.current = null; 
      }
      // Then remove the div
      if (playerDivRef.current && playerDivRef.current.parentNode) {
        try { playerDivRef.current.parentNode.removeChild(playerDivRef.current); } catch {}
        playerDivRef.current = null;
      }
    };
  }, [videoId, playerRef]);

  if (error) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center">
        <div className="text-center p-4">
          <p className="text-red-400 text-base mb-2">{error}</p>
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
      <div ref={containerRef} className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full" />
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
}: PlayingScreenProps) {
  const [error, setError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [seekIndicator, setSeekIndicator] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [focusedRow, setFocusedRow] = useState<0 | 1 | 2>(1); // 0 = top row, 1 = center row, 2 = progress bar
  const [focusedCol, setFocusedCol] = useState<number>(1); // column in current row
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [errorFocused, setErrorFocused] = useState(0); // 0 = skip, 1 = back
  const playerRef = useRef<YTPlayer | null>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const timeUpdateRef = useRef<NodeJS.Timeout | null>(null);
  const seekTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track real wall-clock time for duration penalty
  const startTimeRef = useRef<number>(Date.now());
  
  // Button refs for focus management
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const skipButtonRef = useRef<HTMLButtonElement>(null);
  const playButtonRef = useRef<HTMLButtonElement>(null);

  // Row 0: back (col 0), skip (col 1)
  // Row 1: rewind (col 0), play (col 1), forward (col 2)
  // Row 2: progress bar
  const getButtonId = () => {
    if (focusedRow === 0) {
      return focusedCol === 0 ? 'back' : 'skip';
    }
    if (focusedRow === 2) return 'progress';
    if (focusedCol === 0) return 'rewind';
    if (focusedCol === 1) return 'play';
    return 'forward';
  };

  const focusedButton = getButtonId();

  // Reset on song change
  useEffect(() => {
    setError(null);
    setShowControls(true);
    setIsPlaying(true);
    setFocusedRow(1);
    setFocusedCol(1); // play button
    setCurrentTime(0);
    setDuration(0);
    setErrorFocused(0);
    // Reset wall-clock timer
    startTimeRef.current = Date.now();
  }, [currentSong.id]);

  // Update time periodically - use longer interval to reduce re-renders
  useEffect(() => {
    const updateTime = () => {
      const player = playerRef.current;
      if (player && !isSeeking && showControls) { // Only update when controls visible
        try {
          const newTime = player.getCurrentTime() || 0;
          const dur = player.getDuration();
          // Only update state if changed significantly (reduce re-renders)
          setCurrentTime(prev => Math.abs(prev - newTime) > 0.5 ? newTime : prev);
          if (dur > 0 && duration === 0) setDuration(dur);
        } catch {}
      }
    };
    
    // Longer interval when controls hidden
    const interval = showControls ? 500 : 2000;
    timeUpdateRef.current = setInterval(updateTime, interval);
    return () => {
      if (timeUpdateRef.current) clearInterval(timeUpdateRef.current);
    };
  }, [isSeeking, showControls, duration]);

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

  // Sync DOM focus with focusedButton state
  useEffect(() => {
    if (!showControls) return;
    
    const buttonId = focusedRow === 0 
      ? (focusedCol === 0 ? 'back' : 'skip')
      : focusedRow === 1 
        ? (focusedCol === 1 ? 'play' : null)
        : null;
    
    if (buttonId === 'back') backButtonRef.current?.focus();
    else if (buttonId === 'skip') skipButtonRef.current?.focus();
    else if (buttonId === 'play') playButtonRef.current?.focus();
  }, [showControls, focusedRow, focusedCol]);

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    try {
      if (isPlaying) {
        player.pauseVideo();
        setIsPlaying(false);
      } else {
        player.playVideo();
        setIsPlaying(true);
      }
    } catch {}
    resetHideTimer();
  }, [isPlaying, resetHideTimer]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const player = playerRef.current;
      
      // Handle Back button from TV remote (Escape, Backspace, or keyCode 461/10009)
      if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'GoBack' || 
          e.keyCode === 461 || e.keyCode === 10009 || e.keyCode === 8) {
        e.preventDefault();
        onBack();
        return;
      }
      
      // If error is showing, handle error screen navigation
      if (error) {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
          setErrorFocused(prev => prev === 0 ? 1 : 0);
          return;
        }
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (errorFocused === 0) {
            onSkip?.() || onSongEnd();
          } else {
            onBack();
          }
          return;
        }
        return;
      }
      
      // Any key shows controls
      resetHideTimer();
      
      // Arrow navigation
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (showControls) {
          if (focusedRow === 2) {
            // Progress bar: seek backward 5%
            if (player && duration > 0) {
              setIsSeeking(true);
              const seekAmount = duration * 0.05; // 5% of duration
              const newTime = Math.max(0, currentTime - seekAmount);
              player.seekTo(newTime, true);
              setCurrentTime(newTime);
              // Resume time updates after seek completes
              if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
              seekTimeoutRef.current = setTimeout(() => setIsSeeking(false), 1000);
            }
          } else if (focusedRow === 0) {
            // Top row: back (0), skip (1)
            if (focusedCol > 0) setFocusedCol(0);
          } else {
            // Center row: rewind (0), play (1), forward (2)
            if (focusedCol > 0) setFocusedCol(focusedCol - 1);
          }
        } else {
          // Seek when controls hidden
          if (player) {
            try {
              const ct = player.getCurrentTime();
              player.seekTo(Math.max(0, ct - 10), true);
              setSeekIndicator('-10s');
              setTimeout(() => setSeekIndicator(null), 1000);
            } catch {}
          }
        }
        return;
      }
      
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (showControls) {
          if (focusedRow === 2) {
            // Progress bar: seek forward 5%
            if (player && duration > 0) {
              setIsSeeking(true);
              const seekAmount = duration * 0.05; // 5% of duration
              const newTime = Math.min(duration, currentTime + seekAmount);
              player.seekTo(newTime, true);
              setCurrentTime(newTime);
              // Resume time updates after seek completes
              if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
              seekTimeoutRef.current = setTimeout(() => setIsSeeking(false), 1000);
            }
          } else if (focusedRow === 0) {
            // Top row: back (0), skip (1)
            if (focusedCol < 1) setFocusedCol(1);
          } else {
            // Center row: rewind (0), play (1), forward (2)
            if (focusedCol < 2) setFocusedCol(focusedCol + 1);
          }
        } else {
          // Seek when controls hidden
          if (player) {
            try {
              const ct = player.getCurrentTime();
              player.seekTo(ct + 10, true);
              setSeekIndicator('+10s');
              setTimeout(() => setSeekIndicator(null), 1000);
            } catch {}
          }
        }
        return;
      }
      
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (showControls) {
          if (focusedRow === 2) {
            setFocusedRow(1);
            setFocusedCol(1); // play button
          } else if (focusedRow === 1) {
            setFocusedRow(0);
            setFocusedCol(0); // back button
          }
        } else {
          setFocusedRow(1);
          setFocusedCol(1); // play button
        }
        return;
      }
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (showControls) {
          if (focusedRow === 0) {
            setFocusedRow(1);
            setFocusedCol(1); // play button
          } else if (focusedRow === 1) {
            setFocusedRow(2); // progress bar
          }
        } else {
          setFocusedRow(1);
          setFocusedCol(1); // play button
        }
        return;
      }
      
      // Enter/Space - execute focused button action or toggle play
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!showControls) {
          togglePlayPause();
          return;
        }
        
        const buttonId = getButtonId();
        switch (buttonId) {
          case 'back':
            onBack();
            break;
          case 'rewind':
            if (player) {
              try {
                const ct = player.getCurrentTime();
                player.seekTo(Math.max(0, ct - 10), true);
                setSeekIndicator('-10s');
                setTimeout(() => setSeekIndicator(null), 1000);
              } catch {}
            }
            break;
          case 'play':
            togglePlayPause();
            break;
          case 'forward':
            if (player) {
              try {
                const ct = player.getCurrentTime();
                player.seekTo(ct + 10, true);
                setSeekIndicator('+10s');
                setTimeout(() => setSeekIndicator(null), 1000);
              } catch {}
            }
            break;
          case 'skip':
            onSkip?.();
            break;
          case 'progress':
            // Enter on progress bar toggles play/pause
            togglePlayPause();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [resetHideTimer, showControls, focusedRow, focusedCol, togglePlayPause, onBack, onSkip, currentTime, duration, error, errorFocused, onSongEnd]);

  const handleError = useCallback((msg: string) => {
    setError(msg);
    setErrorFocused(0); // Focus on skip button by default
    onError?.(msg);
  }, [onError]);

  const handleSkipNow = useCallback(() => {
    // When skipping, calculate real-time progress
    const songDuration = currentSong.song.duration;
    const elapsedSeconds = (Date.now() - startTimeRef.current) / 1000;
    // If duration is 0 or unknown, use elapsed time as penalty indicator
    const progress = songDuration > 0 ? Math.min(1, elapsedSeconds / songDuration) : Math.min(1, elapsedSeconds / 180); // assume 3 min if unknown
    console.log(`[PlayingScreen] Skip - elapsed: ${elapsedSeconds.toFixed(1)}s, duration: ${songDuration}s, progress: ${(progress * 100).toFixed(1)}%`);
    onSkip?.() || onSongEnd(undefined, progress);
  }, [onSkip, onSongEnd, currentSong.song.duration]);

  const scoreDataRef = useRef(scoreData);
  scoreDataRef.current = scoreData;

  const handleSongEnd = useCallback(() => {
    // Video ended - calculate real-time progress (not video progress)
    const songDuration = currentSong.song.duration;
    const elapsedSeconds = (Date.now() - startTimeRef.current) / 1000;
    // If duration is 0 or unknown, use elapsed time as penalty indicator (assume 3 min song)
    const progress = songDuration > 0 ? Math.min(1, elapsedSeconds / songDuration) : Math.min(1, elapsedSeconds / 180);
    console.log(`[PlayingScreen] End - elapsed: ${elapsedSeconds.toFixed(1)}s, duration: ${songDuration}s, progress: ${(progress * 100).toFixed(1)}%`);
    onSongEnd(scoreDataRef.current || undefined, progress);
  }, [onSongEnd, currentSong.song.duration]);

  const getButtonClass = (button: typeof focusedButton) => {
    const base = "p-3 rounded-full transition-all focus:outline-none";
    if (focusedButton === button && showControls) {
      return `${base} bg-[#f5f5f5]/60 ring-2 ring-[#f5f5f5] scale-110`;
    }
    return `${base} bg-[#f5f5f5]/40 hover:bg-[#f5f5f5]/50`;
  };

  // Format time as mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle progress bar click
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const player = playerRef.current;
    if (!player || !progressRef.current || duration <= 0) return;
    
    setIsSeeking(true);
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const seekTime = percentage * duration;
    
    player.seekTo(seekTime, true);
    setCurrentTime(seekTime);
    resetHideTimer();
    
    // Resume time updates after seek completes
    if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
    seekTimeoutRef.current = setTimeout(() => setIsSeeking(false), 1000);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="h-screen w-screen bg-black relative overflow-hidden" onClick={resetHideTimer}>
      {/* YouTube Player */}
      <div className="absolute inset-0 overflow-hidden">
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

      {/* Error overlay - manual navigation only */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/95 z-30">
          <div className="text-center p-6 max-w-md">
            <div className="text-6xl mb-4 text-red-500">!</div>
            <p className="text-red-400 text-xl mb-2">{error}</p>
            <p className="text-gray-400 text-sm mb-6">Video này không thể phát trên ứng dụng</p>
            <div className="flex gap-4 justify-center">
              <button 
                onClick={handleSkipNow} 
                className={`px-6 py-3 rounded-lg text-base font-medium transition-all ${
                  errorFocused === 0 
                    ? 'bg-primary-500 text-white ring-2 ring-primary-300 scale-105' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Bỏ qua bài này
              </button>
              <button 
                onClick={onBack} 
                className={`px-6 py-3 rounded-lg text-base font-medium transition-all ${
                  errorFocused === 1 
                    ? 'bg-gray-600 text-white ring-2 ring-gray-400 scale-105' 
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                Quay lại
              </button>
            </div>
            <p className="text-gray-500 text-xs mt-4">◀ ▶ để chọn • Enter để xác nhận</p>
          </div>
        </div>
      )}

      {/* Controls overlay - auto hide */}
      <div className={`absolute inset-0 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent flex items-center justify-between pointer-events-none">
          <button
            ref={backButtonRef}
            tabIndex={0}
            onClick={onBack}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all pointer-events-auto ${
              focusedButton === 'back' ? 'bg-[#f5f5f5]/60 ring-2 ring-[#f5f5f5] scale-105' : 'bg-[#f5f5f5]/40 hover:bg-[#f5f5f5]/50'
            }`}
          >
            <BackIcon />
            <span>Thoát</span>
          </button>

          {onSkip && (
            <button
              ref={skipButtonRef}
              tabIndex={0}
              onClick={onSkip}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all pointer-events-auto ${
                focusedButton === 'skip' ? 'bg-[#f5f5f5]/60 ring-2 ring-[#f5f5f5] scale-105' : 'bg-[#f5f5f5]/40 hover:bg-[#f5f5f5]/50'
              }`}
            >
              <span>Bỏ qua</span>
              <SkipIcon />
            </button>
          )}
        </div>

        {/* Center controls - rewind, play/pause, forward */}
        <div className="absolute inset-0 flex items-center justify-center gap-8 pointer-events-none">
          <button
            tabIndex={0}
            onClick={() => {
              const player = playerRef.current;
              if (player) {
                try {
                  const currentTime = player.getCurrentTime();
                  player.seekTo(Math.max(0, currentTime - 10), true);
                  setSeekIndicator('-10s');
                  setTimeout(() => setSeekIndicator(null), 1000);
                } catch {}
              }
            }}
            className={`${getButtonClass('rewind')} pointer-events-auto`}
          >
            <RewindIcon />
          </button>
          
          <button
            ref={playButtonRef}
            tabIndex={0}
            onClick={togglePlayPause}
            className={`p-4 rounded-full transition-all pointer-events-auto ${
              focusedButton === 'play' ? 'bg-[#f5f5f5]/60 ring-2 ring-[#f5f5f5] scale-110' : 'bg-[#f5f5f5]/40 hover:bg-[#f5f5f5]/50'
            }`}
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>
          
          <button
            tabIndex={0}
            onClick={() => {
              const player = playerRef.current;
              if (player) {
                try {
                  const currentTime = player.getCurrentTime();
                  player.seekTo(currentTime + 10, true);
                  setSeekIndicator('+10s');
                  setTimeout(() => setSeekIndicator(null), 1000);
                } catch {}
              }
            }}
            className={`${getButtonClass('forward')} pointer-events-auto`}
          >
            <ForwardIcon />
          </button>
        </div>

        {/* Bottom song info + progress bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
          {/* Progress bar */}
          <div className="px-4 pt-4">
            <div 
              ref={progressRef}
              onClick={handleProgressClick}
              className={`relative h-2 bg-white/20 rounded-full cursor-pointer transition-all pointer-events-auto ${
                focusedRow === 2 ? 'ring-2 ring-primary-400 h-3' : ''
              }`}
            >
              {/* Progress fill */}
              <div 
                className="absolute left-0 top-0 h-full bg-primary-500 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
              {/* Handle - always visible when focused */}
              <div 
                className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg transition-opacity ${
                  focusedRow === 2 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
                style={{ left: `calc(${progress}% - 8px)` }}
              />
            </div>
            {/* Time display */}
            <div className="flex justify-between mt-1 text-xs text-gray-400">
              <span>{formatTime(currentTime)}</span>
              <span className={focusedRow === 2 ? 'text-primary-400' : ''}>
                {focusedRow === 2 ? '◀ ▶ để tua' : formatTime(duration)}
              </span>
            </div>
          </div>
          
          {/* Song info */}
          <div className="px-4 pb-4">
            <p className="text-lg font-semibold truncate">{currentSong.song.title}</p>
            <p className="text-sm text-gray-300">{currentSong.song.channelName}</p>
          </div>
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
          Nhấn Enter để phát/dừng • ◀ ▶ để tua
        </div>
      )}
    </div>
  );
}

export default PlayingScreen;
