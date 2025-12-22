'use client';

import React, { useState, useCallback, useEffect, useMemo, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ConnectScreen,
  ControllerScreen,
  MobileQueueScreen,
  SongResultScreen,
} from '@/components/screens';
import { useMobileSocket } from '@/hooks/useMobileSocket';
import { useSilentScoring } from '@/hooks/useSilentScoring';
import { createSongLibrary, SongLibrary } from '@/services/songLibrary';
import type { Song } from '@/types/song';

type MobileScreen = 'connect' | 'controller' | 'queue' | 'result';

const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || '';

async function mockSearch(query: string): Promise<Song[]> {
  await new Promise(resolve => setTimeout(resolve, 500));
  return [
    { youtubeId: 'dQw4w9WgXcQ', title: `${query} - Karaoke`, thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg', channelName: 'Karaoke Channel', duration: 213 },
    { youtubeId: 'kJQP7kiw5Fk', title: `${query} - Beat`, thumbnail: 'https://i.ytimg.com/vi/kJQP7kiw5Fk/hqdefault.jpg', channelName: 'Music Karaoke', duration: 245 },
  ];
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="w-10 h-10 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function MobileAppContent() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get('code') || '';
  const [currentScreen, setCurrentScreen] = useState<MobileScreen>('connect');
  // Track when we joined to ignore old finishedSong events
  const joinedAtRef = useRef<number>(0);
  // Store result data locally so it persists even if socket state changes
  const [resultData, setResultData] = useState<{ song: any; finalScore: any } | null>(null);
  
  const songLibrary = useMemo<SongLibrary | null>(() => {
    if (YOUTUBE_API_KEY && YOUTUBE_API_KEY !== 'YOUR_YOUTUBE_API_KEY_HERE') {
      return createSongLibrary(YOUTUBE_API_KEY);
    }
    return null;
  }, []);
  
  const {
    isConnected,
    isJoined,
    session,
    queue,
    currentSong,
    finishedSong,
    error: socketError,
    isReconnecting,
    joinSession,
    addToQueue,
    removeFromQueue,
    requestPlay,
    requestSkip,
    sendScore,
    clearFinishedSong,
    disconnect,
  } = useMobileSocket();

  // Silent scoring - background recording
  useSilentScoring({
    isPlaying: !!currentSong,
    onScoreUpdate: sendScore,
  });

  const handleDisconnect = useCallback(() => {
    disconnect();
    joinedAtRef.current = 0;
    setCurrentScreen('connect');
  }, [disconnect]);

  const handleSearch = useCallback(async (query: string, pageToken?: string): Promise<{ songs: Song[]; nextPageToken?: string }> => {
    if (songLibrary) {
      try {
        return await songLibrary.search(query, pageToken);
      } catch {
        return { songs: await mockSearch(query), nextPageToken: undefined };
      }
    }
    return { songs: await mockSearch(query), nextPageToken: undefined };
  }, [songLibrary]);

  const sessionCode = session?.code || '';
  const [isAttemptingJoin, setIsAttemptingJoin] = useState(false);

  const handleConnect = useCallback((code: string) => {
    setIsAttemptingJoin(true);
    joinedAtRef.current = Date.now(); // Mark join time
    joinSession(code);
    setTimeout(() => setIsAttemptingJoin(false), 10000);
  }, [joinSession]);

  useEffect(() => {
    if (isJoined || socketError) setIsAttemptingJoin(false);
  }, [isJoined, socketError]);

  // Auto-navigate on join - clear any old finishedSong
  useEffect(() => {
    if (isJoined && currentScreen === 'connect') {
      clearFinishedSong();
      setCurrentScreen('controller');
    }
  }, [isJoined, currentScreen, clearFinishedSong]);

  // Show result when song finishes - ignore if within 3s of joining (old data)
  useEffect(() => {
    if (finishedSong && isJoined && currentScreen !== 'connect') {
      const timeSinceJoin = Date.now() - joinedAtRef.current;
      // Ignore finishedSong events within 3 seconds of joining (likely old data)
      if (timeSinceJoin > 3000) {
        setResultData({ song: finishedSong.song, finalScore: finishedSong.finalScore });
        setCurrentScreen('result');
      }
    }
  }, [finishedSong, isJoined, currentScreen]);

  const handleNextFromResult = useCallback(() => {
    clearFinishedSong();
    setResultData(null);
    setCurrentScreen('controller');
  }, [clearFinishedSong]);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'connect':
        return (
          <ConnectScreen
            onConnect={handleConnect}
            isConnecting={isAttemptingJoin}
            error={socketError}
            initialCode={initialCode}
            isSocketConnected={isConnected}
          />
        );

      case 'controller':
        return (
          <ControllerScreen
            sessionCode={sessionCode}
            queue={queue}
            currentSong={currentSong}
            onSearch={handleSearch}
            onAddToQueue={addToQueue}
            onViewQueue={() => setCurrentScreen('queue')}
            onDisconnect={handleDisconnect}
            onPlay={requestPlay}
            onSkip={requestSkip}
          />
        );

      case 'queue':
        return (
          <MobileQueueScreen
            queue={queue}
            currentSong={currentSong}
            onBack={() => setCurrentScreen('controller')}
            onRemove={removeFromQueue}
          />
        );

      case 'result':
        return resultData ? (
          <SongResultScreen
            song={resultData.song}
            finalScore={resultData.finalScore}
            onNext={handleNextFromResult}
            autoNextDelay={30}
          />
        ) : null;

      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-tv-bg">
      {/* Reconnecting indicator */}
      {isReconnecting && isJoined && (
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-3 py-1.5 bg-yellow-500 text-white text-xs">
          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>Đang kết nối lại...</span>
        </div>
      )}
      {renderScreen()}
    </main>
  );
}

export default function MobileApp() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <MobileAppContent />
    </Suspense>
  );
}
