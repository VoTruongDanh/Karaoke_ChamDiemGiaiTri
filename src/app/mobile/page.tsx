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
const SESSION_STORAGE_KEY = 'karaoke_session_code';

console.log('[Mobile] YouTube API Key:', YOUTUBE_API_KEY ? 'present (will try YouTube first)' : 'not set (using Invidious)');

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
  // Track if we've attempted auto-reconnect
  const autoReconnectAttemptedRef = useRef(false);
  
  const songLibrary = useMemo<SongLibrary>(() => {
    // Always create songLibrary - will use Invidious as fallback if no API key
    console.log('[Mobile] Creating songLibrary, API key:', YOUTUBE_API_KEY ? 'present' : 'using Invidious');
    return createSongLibrary(YOUTUBE_API_KEY || undefined);
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
    // Clear saved session on manual disconnect
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {}
    disconnect();
    joinedAtRef.current = 0;
    setCurrentScreen('connect');
  }, [disconnect]);

  const handleSearch = useCallback(async (query: string, pageToken?: string): Promise<{ songs: Song[]; nextPageToken?: string }> => {
    console.log('[Mobile] handleSearch called:', query);
    try {
      const result = await songLibrary.search(query, pageToken);
      console.log('[Mobile] Search result:', result.songs.length, 'songs');
      return result;
    } catch (error) {
      console.error('[Mobile] Search failed:', error);
      return { songs: [], nextPageToken: undefined };
    }
  }, [songLibrary]);

  const handleGetSuggestions = useCallback(async (videoIds: string[]): Promise<Song[]> => {
    if (videoIds.length > 0) {
      try {
        return await songLibrary.getSuggestions(videoIds, 6);
      } catch {
        return [];
      }
    }
    return [];
  }, [songLibrary]);

  const sessionCode = session?.code || '';
  const [isAttemptingJoin, setIsAttemptingJoin] = useState(false);
  const lastTriedCodeRef = useRef<string>('');
  const originalSavedCodeRef = useRef<string>('');

  // Get saved code from localStorage (only read once on mount)
  useEffect(() => {
    try {
      originalSavedCodeRef.current = localStorage.getItem(SESSION_STORAGE_KEY) || '';
      console.log('[Mobile] Original saved code:', originalSavedCodeRef.current);
    } catch {}
  }, []);

  const handleConnect = useCallback((code: string) => {
    setIsAttemptingJoin(true);
    joinedAtRef.current = Date.now();
    lastTriedCodeRef.current = code;
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, code);
    } catch {}
    joinSession(code);
  }, [joinSession]);

  // Auto-reconnect on page load
  useEffect(() => {
    if (!isConnected) return;
    if (isJoined) return;
    if (autoReconnectAttemptedRef.current) return;
    
    // Try URL code first, then original saved code
    const codeToUse = initialCode || originalSavedCodeRef.current;
    
    console.log('[Mobile] Auto-reconnect:', { initialCode, savedCode: originalSavedCodeRef.current, codeToUse });
    
    if (codeToUse) {
      autoReconnectAttemptedRef.current = true;
      handleConnect(codeToUse);
    }
  }, [initialCode, isConnected, isJoined, handleConnect]);

  // Handle join result - retry with saved code if URL code fails
  useEffect(() => {
    if (isJoined) {
      setIsAttemptingJoin(false);
      return;
    }
    
    if (socketError && isAttemptingJoin) {
      setIsAttemptingJoin(false);
      const lastTried = lastTriedCodeRef.current;
      const originalSaved = originalSavedCodeRef.current;
      
      console.log('[Mobile] Join failed:', { lastTried, originalSaved, initialCode });
      
      // If URL code failed and we have a different original saved code, try it
      if (lastTried === initialCode && originalSaved && originalSaved !== initialCode) {
        console.log('[Mobile] URL code failed, trying original saved code:', originalSaved);
        setTimeout(() => {
          handleConnect(originalSaved);
        }, 500);
      }
    }
  }, [isJoined, socketError, isAttemptingJoin, initialCode, handleConnect]);

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
            onGetSuggestions={handleGetSuggestions}
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
