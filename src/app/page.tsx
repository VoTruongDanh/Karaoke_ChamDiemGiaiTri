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
 * TV Song Result Screen - Premium design with thumbnail (light/dark mode)
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
  const [countdown, setCountdown] = useState(20);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (countdown <= 0) {
      onNext();
      return;
    }
    const timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, onNext]);

  const gradeInfo = finalScore ? getScoreGrade(finalScore.totalScore) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-tv-8 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-400/20 dark:bg-purple-500/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-400/20 dark:bg-pink-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Main content - horizontal layout */}
      <div className="relative z-10 flex items-center gap-tv-8 max-w-6xl w-full">
        {/* Left side - Thumbnail with gradient border */}
        <div className={`flex-shrink-0 transition-all duration-1000 ${showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
          <div className={`relative p-1 rounded-3xl bg-gradient-to-br ${gradeInfo?.gradient || 'from-purple-500 to-pink-500'} ${gradeInfo?.glow || ''}`}>
            <img 
              src={song.song.thumbnail} 
              alt="" 
              className="w-72 h-72 rounded-2xl object-cover"
            />
            {/* Grade badge overlay */}
            {gradeInfo && (
              <div className={`absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-gradient-to-br ${gradeInfo.gradient} flex items-center justify-center shadow-2xl border-4 border-white dark:border-slate-900`}>
                <span className="text-4xl font-black text-white">{gradeInfo.grade}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right side - Score info */}
        <div className="flex-1 min-w-0">
          {/* Song title */}
          <div className={`mb-tv-4 transition-all duration-1000 delay-200 ${showContent ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
            <p className="text-tv-sm text-slate-500 dark:text-slate-400 mb-1">🎵 Hoàn thành</p>
            <h2 className="text-tv-2xl font-bold text-slate-800 dark:text-white truncate">{song.song.title}</h2>
          </div>

          {finalScore && gradeInfo ? (
            <>
              {/* Title */}
              <h1 className={`text-tv-4xl font-black mb-tv-6 bg-gradient-to-r ${gradeInfo.textGradient} bg-clip-text text-transparent transition-all duration-1000 delay-400 ${showContent ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
                {gradeInfo.title} {gradeInfo.emoji}
              </h1>

              {/* Score display */}
              <div className={`flex items-end gap-tv-4 mb-tv-6 transition-all duration-1000 delay-600 ${showContent ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
                <span className={`text-[140px] font-black leading-none bg-gradient-to-br ${gradeInfo.textGradient} bg-clip-text text-transparent`}>
                  <TVAnimatedScore target={finalScore.totalScore} />
                </span>
                <span className="text-tv-2xl text-slate-500 dark:text-slate-400 mb-6">điểm</span>
              </div>

              {/* Stats */}
              <div className={`flex gap-tv-4 transition-all duration-1000 delay-800 ${showContent ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
                <TVStatCard label="Cao độ" value={finalScore.pitchAccuracy} icon="🎵" delay={0} />
                <TVStatCard label="Nhịp điệu" value={finalScore.timing} icon="🥁" delay={0} />
              </div>
            </>
          ) : (
            <div className={`transition-all duration-1000 delay-400 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
              <h1 className="text-tv-4xl font-bold text-slate-800 dark:text-white mb-tv-2">Hoàn thành! 🎵</h1>
              <p className="text-tv-lg text-slate-500 dark:text-slate-400">Bài hát đã kết thúc</p>
            </div>
          )}

          {/* Auto next indicator */}
          <div className={`mt-tv-6 transition-all duration-1000 delay-1000 ${showContent ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
            <div className="inline-flex items-center gap-tv-3 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-full px-tv-5 py-tv-2 border border-slate-200/50 dark:border-slate-700/50 shadow-lg">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">{countdown}</span>
              </div>
              <span className="text-tv-sm text-slate-600 dark:text-slate-300">
                {hasNextSong ? 'Bài tiếp theo' : 'Về trang chủ'}
              </span>
            </div>
          </div>
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
            realTimeFeedback={mobileFeedback}
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
