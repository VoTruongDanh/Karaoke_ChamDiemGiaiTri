'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { 
  HomeScreen, 
  SearchScreen, 
  QueueScreen, 
  PlayingScreen,
  SessionSummaryScreen 
} from '@/components/screens';
import { NetworkStatus } from '@/components/NetworkStatus';
import { ToastProvider, useToast } from '@/components/Toast';
import { ScreenTransition } from '@/components/ScreenTransition';
import { useQueueStore } from '@/stores/queueStore';
import { useTVSocket } from '@/hooks/useTVSocket';
import { createSongLibrary, SongLibrary } from '@/services/songLibrary';
import type { Song } from '@/types/song';
import type { CompletedSongRecord, SessionSummary } from '@/types/session';
import type { ScoreData } from '@/types/score';
import type { QueueItem } from '@/types/queue';

type Screen = 'home' | 'search' | 'queue' | 'playing' | 'summary' | 'result';

const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || '';

interface GradeInfo {
  grade: string;
  title: string;
  emoji: string;
  gradient: string;
  glow: string;
  textGradient: string;
  particles: string[];
}

function getScoreGrade(score: number): GradeInfo {
  if (score >= 90) return { 
    grade: 'S', 
    title: 'XUẤT SẮC!', 
    emoji: '👑',
    gradient: 'from-yellow-400 via-amber-500 to-orange-500',
    glow: 'shadow-[0_0_100px_rgba(251,191,36,0.6)]',
    textGradient: 'from-yellow-300 via-amber-400 to-orange-500',
    particles: ['⭐', '✨', '🌟', '💫']
  };
  if (score >= 80) return { 
    grade: 'A', 
    title: 'TUYỆT VỜI!', 
    emoji: '🌟',
    gradient: 'from-emerald-400 via-green-500 to-teal-500',
    glow: 'shadow-[0_0_80px_rgba(34,197,94,0.5)]',
    textGradient: 'from-emerald-300 via-green-400 to-teal-500',
    particles: ['🎉', '✨', '🎊']
  };
  if (score >= 70) return { 
    grade: 'B', 
    title: 'RẤT TỐT!', 
    emoji: '✨',
    gradient: 'from-cyan-400 via-sky-500 to-blue-500',
    glow: 'shadow-[0_0_60px_rgba(6,182,212,0.5)]',
    textGradient: 'from-cyan-300 via-sky-400 to-blue-500',
    particles: ['💎', '✨']
  };
  if (score >= 60) return { 
    grade: 'C', 
    title: 'KHÁ TỐT', 
    emoji: '👍',
    gradient: 'from-blue-400 via-indigo-500 to-violet-500',
    glow: 'shadow-[0_0_50px_rgba(99,102,241,0.5)]',
    textGradient: 'from-blue-300 via-indigo-400 to-violet-500',
    particles: ['💜', '✨']
  };
  if (score >= 50) return { 
    grade: 'D', 
    title: 'CỐ GẮNG THÊM', 
    emoji: '💪',
    gradient: 'from-orange-400 via-amber-500 to-yellow-500',
    glow: 'shadow-[0_0_40px_rgba(249,115,22,0.5)]',
    textGradient: 'from-orange-300 via-amber-400 to-yellow-500',
    particles: ['🔥']
  };
  return { 
    grade: 'F', 
    title: 'THỬ LẠI NHÉ', 
    emoji: '🎤',
    gradient: 'from-rose-400 via-red-500 to-pink-500',
    glow: 'shadow-[0_0_40px_rgba(244,63,94,0.5)]',
    textGradient: 'from-rose-300 via-red-400 to-pink-500',
    particles: ['❤️']
  };
}

/**
 * Animated score counter for TV with proper cleanup
 */
function TVAnimatedScore({ target, duration = 2000 }: { target: number; duration?: number }) {
  const [current, setCurrent] = useState(0);
  const frameRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const startTime = Date.now();
    
    const animate = () => {
      if (!mountedRef.current) return;
      
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setCurrent(Math.round(target * eased));
      
      if (progress < 1 && mountedRef.current) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };
    
    frameRef.current = requestAnimationFrame(animate);
    
    return () => {
      mountedRef.current = false;
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [target, duration]);

  return <>{current}</>;
}

/**
 * TV Stat card
 */
function TVStatCard({ label, value, icon, delay }: { label: string; value: number; icon: string; delay: number }) {
  const [show, setShow] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div className={`bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-tv-lg px-tv-6 py-tv-4 border border-slate-200/50 dark:border-slate-700/50 shadow-lg transition-all duration-700 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
      <div className="flex items-center gap-tv-2 mb-tv-1">
        <span className="text-tv-lg">{icon}</span>
        <span className="text-tv-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">{label}</span>
      </div>
      <p className="text-tv-3xl font-bold text-slate-800 dark:text-white">
        <TVAnimatedScore target={value} duration={1500} />
        <span className="text-tv-lg text-slate-400 dark:text-slate-500">%</span>
      </p>
    </div>
  );
}

/**
 * Confetti particle component for high scores
 */
function Confetti({ isHighScore }: { isHighScore: boolean }) {
  if (!isHighScore) return null;
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(30)].map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 rounded-full animate-confetti"
          style={{
            left: `${Math.random() * 100}%`,
            top: '-10px',
            backgroundColor: ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6bd6'][i % 5],
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${2 + Math.random() * 2}s`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Sparkle effect for medium scores
 */
function Sparkles({ show }: { show: boolean }) {
  if (!show) return null;
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-white rounded-full animate-sparkle"
          style={{
            left: `${10 + Math.random() * 80}%`,
            top: `${10 + Math.random() * 80}%`,
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${1.5 + Math.random() * 1}s`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Floating hearts for encouragement (low scores)
 */
function FloatingHearts({ show }: { show: boolean }) {
  if (!show) return null;
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute text-2xl animate-float-up"
          style={{
            left: `${15 + i * 15}%`,
            bottom: '-30px',
            animationDelay: `${i * 0.5}s`,
            animationDuration: '4s',
          }}
        >
          💪
        </div>
      ))}
    </div>
  );
}

/**
 * TV Song Result Screen - Compact design for TV with effects
 */
function TVSongResultScreen({ 
  song, 
  finalScore, 
  onNext,
  hasNextSong,
}: { 
  song: QueueItem;
  finalScore: ScoreData | null;
  onNext: () => void;
  hasNextSong: boolean;
}) {
  const gradeInfo = finalScore ? getScoreGrade(finalScore.totalScore) : null;
  const isHighScore = finalScore ? finalScore.totalScore >= 80 : false;
  const isMediumScore = finalScore ? finalScore.totalScore >= 60 && finalScore.totalScore < 80 : false;
  const isLowScore = finalScore ? finalScore.totalScore < 60 : false;

  // Play celebration sound for high scores
  useEffect(() => {
    if (isHighScore) {
      // Create a simple celebration sound using Web Audio API
      try {
        const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const masterGain = audioContext.createGain();
        masterGain.gain.value = 0.3; // 30% volume
        masterGain.connect(audioContext.destination);
        
        // Play a cheerful chord progression
        const playNote = (freq: number, startTime: number, duration: number) => {
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.3, startTime);
          gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(startTime);
          osc.stop(startTime + duration);
        };
        
        const now = audioContext.currentTime;
        // C major chord arpeggio (celebration sound)
        playNote(523.25, now, 0.15);        // C5
        playNote(659.25, now + 0.1, 0.15);  // E5
        playNote(783.99, now + 0.2, 0.15);  // G5
        playNote(1046.50, now + 0.3, 0.3);  // C6 (longer)
        
        // Cleanup after sound finishes
        setTimeout(() => audioContext.close(), 1000);
      } catch {
        // Fallback: silent if Web Audio not supported
      }
    }
  }, [isHighScore]);

  // Handle Enter key to go next
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNext]);

  return (
    <div className="h-screen bg-tv-bg flex items-center justify-center p-4 relative">
      {/* Effects based on score level */}
      <Confetti isHighScore={isHighScore} />
      <Sparkles show={isMediumScore} />
      <FloatingHearts show={isLowScore} />
      
      {/* Glow background effects based on score */}
      {isHighScore && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-yellow-500/20 rounded-full blur-[100px] animate-pulse" />
        </div>
      )}
      {isMediumScore && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-500/15 rounded-full blur-[80px] animate-pulse" style={{ animationDuration: '3s' }} />
        </div>
      )}
      {isLowScore && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-rose-500/10 rounded-full blur-[60px]" />
        </div>
      )}

      <div className="flex items-center gap-8 max-w-3xl w-full relative z-10">
        {/* Left - Thumbnail (16:9 aspect ratio like YouTube) */}
        <div className="flex-shrink-0">
          <div className={`relative p-1.5 rounded-2xl bg-gradient-to-br ${gradeInfo?.gradient || 'from-purple-500 to-pink-500'} ${isHighScore ? 'animate-pulse' : ''}`}>
            <img 
              src={song.song.thumbnail} 
              alt="" 
              className="w-80 h-44 rounded-xl object-cover"
            />
            {gradeInfo && (
              <div className={`absolute -bottom-3 -right-3 w-14 h-14 rounded-full bg-gradient-to-br ${gradeInfo.gradient} flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-900 ${isHighScore ? 'animate-bounce' : ''}`}>
                <span className="text-2xl font-black text-white">{gradeInfo.grade}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right - Score info */}
        <div className="flex-1 min-w-0">
          {/* Song title */}
          <p className="text-sm text-gray-500 mb-1">🎵 Hoàn thành</p>
          <h2 className="text-xl font-bold line-clamp-2 mb-3">{song.song.title}</h2>

          {finalScore && gradeInfo ? (
            <>
              <h1 className={`text-xl font-bold mb-3 bg-gradient-to-r ${gradeInfo.textGradient} bg-clip-text text-transparent ${isHighScore ? 'animate-pulse' : ''}`}>
                {gradeInfo.title} {gradeInfo.emoji}
              </h1>

              <div className="flex items-baseline gap-3 mb-4">
                <span className={`text-5xl font-black bg-gradient-to-br ${gradeInfo.textGradient} bg-clip-text text-transparent`}>
                  {finalScore.totalScore}
                </span>
                <span className="text-base text-gray-500">điểm</span>
              </div>

              <div className="flex gap-4 text-sm mb-4">
                <div className="bg-white/10 rounded-lg px-3 py-1.5">
                  <span className="text-gray-400">🎵 Cao độ:</span>
                  <span className="ml-1 font-semibold">{finalScore.pitchAccuracy}</span>
                </div>
                <div className="bg-white/10 rounded-lg px-3 py-1.5">
                  <span className="text-gray-400">🥁 Nhịp:</span>
                  <span className="ml-1 font-semibold">{finalScore.timing}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="mb-4">
              <h1 className="text-xl font-bold mb-2">Hoàn thành! 🎵</h1>
              <p className="text-base text-gray-500">Bài hát đã kết thúc</p>
            </div>
          )}

          {/* Manual next button */}
          <button
            onClick={onNext}
            autoFocus
            className="px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-base font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary-400 focus:scale-105"
          >
            {hasNextSong ? 'Bài tiếp theo →' : 'Về trang chủ →'}
          </button>
        </div>
      </div>
    </div>
  );
}

async function mockSearch(query: string): Promise<Song[]> {
  await new Promise(resolve => setTimeout(resolve, 500));
  return [
    { youtubeId: 'dQw4w9WgXcQ', title: `${query} - Karaoke`, thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg', channelName: 'Karaoke Channel', duration: 213 },
    { youtubeId: 'kJQP7kiw5Fk', title: `${query} - Beat`, thumbnail: 'https://i.ytimg.com/vi/kJQP7kiw5Fk/hqdefault.jpg', channelName: 'Music Karaoke', duration: 245 },
  ];
}

function TVAppContent() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [completedSongs, setCompletedSongs] = useState<CompletedSongRecord[]>([]);
  const sessionStartTime = useRef<Date>(new Date());
  // Store result data locally so it persists
  const [resultData, setResultData] = useState<{ song: QueueItem; finalScore: ScoreData | null } | null>(null);
  // Back button protection - require double press
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const backPressTimeRef = useRef<number>(0);
  
  const { addToast } = useToast();
  
  const songLibrary = useMemo<SongLibrary | null>(() => {
    if (YOUTUBE_API_KEY && YOUTUBE_API_KEY !== 'YOUR_YOUTUBE_API_KEY_HERE') {
      return createSongLibrary(YOUTUBE_API_KEY);
    }
    return null;
  }, []);
  
  const { 
    isConnected, 
    session, 
    error: socketError,
    isReconnecting,
    mobileScore,
    mobileFeedback,
    finishedSong,
    createSession,
    updateQueue,
    notifySongStarted,
    notifySongEnded,
    onPlaybackCommand,
    clearFinishedSong,
  } = useTVSocket();

  const queueStore = useQueueStore();
  const currentSong = queueStore.getCurrent();
  const queueItems = queueStore.items;
  const sessionCreatedRef = useRef(false);
  const prevQueueLengthRef = useRef(0);
  // Keep mobileScore in ref to avoid stale closure
  const mobileScoreRef = useRef(mobileScore);
  mobileScoreRef.current = mobileScore;

  // Back button protection - prevent accidental browser navigation
  useEffect(() => {
    // Push a dummy state to prevent immediate back navigation
    window.history.pushState({ karaoke: true }, '', window.location.href);
    
    const handlePopState = (e: PopStateEvent) => {
      const now = Date.now();
      const timeSinceLastPress = now - backPressTimeRef.current;
      
      // Always push state back to prevent navigation
      window.history.pushState({ karaoke: true }, '', window.location.href);
      
      if (currentScreen === 'home') {
        if (timeSinceLastPress < 2000 && backPressTimeRef.current > 0) {
          // Second press within 2s - actually allow exit
          setShowBackConfirm(false);
          window.history.go(-2); // Go back past our dummy state
          return;
        } else {
          // First press - show warning
          backPressTimeRef.current = now;
          setShowBackConfirm(true);
          addToast({ type: 'warning', message: 'Nhấn Back lần nữa để thoát', duration: 2000 });
          setTimeout(() => setShowBackConfirm(false), 2000);
        }
      } else if (currentScreen !== 'playing' && currentScreen !== 'result') {
        // Navigate to home instead of browser back
        setCurrentScreen('home');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Backspace, Escape, GoBack, BrowserBack (common back keys on TV remotes)
      if (e.key === 'Backspace' || e.key === 'Escape' || e.key === 'GoBack' || e.key === 'BrowserBack' || e.keyCode === 461 || e.keyCode === 10009) {
        e.preventDefault();
        e.stopPropagation();
        
        const now = Date.now();
        const timeSinceLastPress = now - backPressTimeRef.current;
        
        if (currentScreen === 'home') {
          if (timeSinceLastPress < 2000 && backPressTimeRef.current > 0) {
            // Second press - allow exit
            setShowBackConfirm(false);
            window.history.go(-2);
            return;
          } else {
            // First press - show warning
            backPressTimeRef.current = now;
            setShowBackConfirm(true);
            addToast({ type: 'warning', message: 'Nhấn Back lần nữa để thoát', duration: 2000 });
            setTimeout(() => setShowBackConfirm(false), 2000);
          }
        } else if (currentScreen !== 'playing' && currentScreen !== 'result') {
          setCurrentScreen('home');
        }
      }
    };

    // Prevent accidental page close
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (currentScreen === 'playing' || queueItems.length > 0) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentScreen, addToast, queueItems.length]);

  // Create session when connected
  useEffect(() => {
    if (isConnected && !session && !sessionCreatedRef.current) {
      sessionCreatedRef.current = true;
      createSession();
    }
    if (!isConnected) {
      sessionCreatedRef.current = false;
    }
  }, [isConnected, session, createSession]);

  // Sync queue to server
  useEffect(() => {
    if (isConnected && session) {
      updateQueue(queueItems);
    }
  }, [queueItems, isConnected, session, updateQueue]);

  // Auto-play when first song is added to empty queue
  useEffect(() => {
    const waitingItems = queueItems.filter(item => item.status === 'waiting');
    const playingItem = queueItems.find(item => item.status === 'playing');
    const currentTotal = waitingItems.length + (playingItem ? 1 : 0);
    
    // If queue was empty (0 items) and now has exactly 1 waiting item (no playing)
    const isNotPlaying = currentScreen !== 'playing' && currentScreen !== 'result';
    if (prevQueueLengthRef.current === 0 && waitingItems.length >= 1 && !playingItem && isNotPlaying) {
      console.log('[TV App] Auto-playing first song added to empty queue');
      // Small delay to ensure state is updated
      setTimeout(() => {
        const next = queueStore.getNext();
        if (next) {
          queueStore.setItemStatus(next.id, 'playing');
          notifySongStarted(next);
          setCurrentScreen('playing');
          addToast({ type: 'info', message: `Đang phát: ${next.song.title}`, duration: 3000 });
        }
      }, 300);
    }
    
    prevQueueLengthRef.current = currentTotal;
  }, [queueItems, queueStore, notifySongStarted, addToast, currentScreen]);

  // Handle playback commands from mobile
  useEffect(() => {
    onPlaybackCommand((command) => {
      if (command === 'play') handleStartPlaying();
      else if (command === 'skip') handleSkip();
    });
  }, [onPlaybackCommand]);

  const navigateTo = useCallback((screen: Screen) => setCurrentScreen(screen), []);
  const goBack = useCallback(() => setCurrentScreen('home'), []);

  const handleSongSelect = useCallback((song: Song) => {
    queueStore.add(song, 'TV User');
  }, [queueStore]);

  const handleSearch = useCallback(async (query: string): Promise<Song[]> => {
    setRecentSearches(prev => [query, ...prev.filter(s => s !== query)].slice(0, 10));
    
    if (songLibrary) {
      try {
        const result = await songLibrary.search(query);
        return result.songs;
      } catch {
        return mockSearch(query);
      }
    }
    return mockSearch(query);
  }, [songLibrary]);

  const handleSongEnd = useCallback((score?: ScoreData) => {
    const current = queueStore.getCurrent();
    const finalScore = score || mobileScoreRef.current || undefined;
    if (current) {
      queueStore.setItemStatus(current.id, 'completed');
      notifySongEnded(current.id, finalScore);
      setCompletedSongs(prev => [...prev, {
        queueItem: current,
        score: finalScore || null,
        completedAt: new Date(),
      }]);
    }
  }, [queueStore, notifySongEnded]);

  const handleSkip = useCallback(() => handleSongEnd(), [handleSongEnd]);

  const handleStartPlaying = useCallback(() => {
    const next = queueStore.getNext();
    if (!next) {
      addToast({ type: 'warning', message: 'Chưa có bài hát trong hàng đợi', duration: 2000 });
      return;
    }
    queueStore.setItemStatus(next.id, 'playing');
    notifySongStarted(next);
    setTimeout(() => setCurrentScreen('playing'), 100);
  }, [queueStore, notifySongStarted, addToast]);

  const handleShowSummary = useCallback(() => setCurrentScreen('summary'), []);

  const getSessionSummary = useCallback((): SessionSummary => {
    const scoredSongs = completedSongs.filter(s => s.score !== null);
    let averageScore: number | null = null;
    let highestScore: CompletedSongRecord | null = null;

    if (scoredSongs.length > 0) {
      averageScore = Math.round(scoredSongs.reduce((sum, s) => sum + (s.score?.totalScore || 0), 0) / scoredSongs.length);
      highestScore = scoredSongs.reduce((h, c) => (!h || (c.score?.totalScore || 0) > (h.score?.totalScore || 0)) ? c : h, null as CompletedSongRecord | null);
    }

    return {
      totalSongs: completedSongs.length,
      completedSongs,
      duration: Date.now() - sessionStartTime.current.getTime(),
      averageScore,
      highestScore,
    };
  }, [completedSongs]);

  const handleNewSession = useCallback(() => {
    setCompletedSongs([]);
    sessionStartTime.current = new Date();
    queueStore.setQueue([]);
    setCurrentScreen('home');
    if (isConnected) createSession();
  }, [queueStore, isConnected, createSession]);

  const handleYouTubeError = useCallback((error: string) => {
    addToast({ type: 'error', message: `Lỗi video: ${error}`, duration: 5000 });
  }, [addToast]);

  // Show result screen when song finishes
  useEffect(() => {
    if (finishedSong) {
      // Store result data locally
      setResultData({ song: finishedSong.song, finalScore: finishedSong.finalScore });
      setCurrentScreen('result');
    }
  }, [finishedSong]);

  const handleNextFromResult = useCallback(() => {
    clearFinishedSong();
    setResultData(null);
    const next = queueStore.getNext();
    if (next) {
      queueStore.setItemStatus(next.id, 'playing');
      notifySongStarted(next);
      setCurrentScreen('playing');
    } else {
      setCurrentScreen('home');
    }
  }, [clearFinishedSong, queueStore, notifySongStarted]);

  const sessionCode = session?.code || '----';

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return (
          <HomeScreen
            sessionCode={sessionCode}
            onSearchSelect={() => navigateTo('search')}
            onQueueSelect={() => navigateTo('queue')}
            onPopularSelect={() => navigateTo('search')}
            onNowPlayingSelect={currentSong ? () => navigateTo('playing') : undefined}
            onSummarySelect={completedSongs.length > 0 ? handleShowSummary : undefined}
            onPlayNow={handleStartPlaying}
            onGetSuggestions={songLibrary ? (videoIds, addedSongs) => songLibrary.getSuggestions(videoIds, 4, addedSongs) : undefined}
            onAddToQueue={handleSongSelect}
          />
        );

      case 'search':
        return (
          <SearchScreen
            onSongSelect={handleSongSelect}
            onBack={goBack}
            onSearch={handleSearch}
            recentSearches={recentSearches}
          />
        );

      case 'queue':
        return <QueueScreen onBack={goBack} onPlaySong={handleStartPlaying} />;

      case 'playing':
        if (!currentSong) {
          // Just show loading, don't auto-redirect
          return (
            <div className="min-h-screen bg-tv-bg flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin w-16 h-16 border-4 border-primary-400 border-t-transparent rounded-full mb-4" />
                <p className="text-gray-400">Đang tải...</p>
              </div>
            </div>
          );
        }
        return (
          <PlayingScreen
            currentSong={currentSong}
            onSongEnd={handleSongEnd}
            onBack={goBack}
            onSkip={handleSkip}
            scoringEnabled={!!mobileScore}
            scoreData={mobileScore}
            onError={handleYouTubeError}
            autoSkipDelay={5000}
          />
        );

      case 'summary':
        return (
          <SessionSummaryScreen
            summary={getSessionSummary()}
            onNewSession={handleNewSession}
            onBack={goBack}
          />
        );

      case 'result':
        if (!resultData) {
          setCurrentScreen('home');
          return null;
        }
        return (
          <TVSongResultScreen
            song={resultData.song}
            finalScore={resultData.finalScore}
            onNext={handleNextFromResult}
            hasNextSong={queueStore.getNext() !== null}
          />
        );

      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen bg-tv-bg">
      <NetworkStatus
        isConnected={isConnected}
        isReconnecting={isReconnecting}
        error={socketError}
        onRetry={createSession}
      />
      <ScreenTransition transitionKey={currentScreen} type="fade" duration={200}>
        {renderScreen()}
      </ScreenTransition>
    </main>
  );
}

export default function TVApp() {
  return (
    <ToastProvider>
      <TVAppContent />
    </ToastProvider>
  );
}
