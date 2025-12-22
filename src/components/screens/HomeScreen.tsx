'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { NavigationGrid } from '@/components/NavigationGrid';
import { FocusableButton } from '@/components/FocusableButton';
import { LazyImage } from '@/components/LazyImage';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useQueueStore } from '@/stores/queueStore';
import type { QueueItem } from '@/types/queue';

export interface HomeScreenProps {
  sessionCode: string;
  onSearchSelect: () => void;
  onQueueSelect: () => void;
  onPopularSelect: () => void;
  onNowPlayingSelect?: () => void;
  onSummarySelect?: () => void;
  onPlayNow?: () => void;
}

function SearchIcon() {
  return (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function QueueIcon() {
  return (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function MusicIcon() {
  return (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
    </svg>
  );
}

function QRCodeDisplay({ code }: { code: string }) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [mobileUrl, setMobileUrl] = useState<string>('');

  useEffect(() => {
    if (code && code !== '----') {
      const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      const protocol = typeof window !== 'undefined' ? window.location.protocol : 'https:';
      const port = typeof window !== 'undefined' ? window.location.port : '3000';
      const url = `${protocol}//${hostname}:${port}/mobile?code=${code}`;
      setMobileUrl(url);
      
      QRCode.toDataURL(url, {
        width: 280,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      })
        .then((dataUrl) => setQrDataUrl(dataUrl))
        .catch((err) => console.error('QR Code error:', err));
    }
  }, [code]);

  return (
    <div className="flex flex-col items-center text-center">
      <div className="bg-white p-3 rounded-xl mb-4 shadow-lg">
        {qrDataUrl ? (
          <img src={qrDataUrl} alt="QR Code" className="w-52 h-52" />
        ) : (
          <div className="w-52 h-52 flex items-center justify-center bg-gray-100">
            <span className="text-gray-400 text-base">Đang tạo...</span>
          </div>
        )}
      </div>
      <p className="text-base text-gray-400 mb-1">Quét QR hoặc nhập mã</p>
      <p className="text-5xl font-bold text-primary-500 tracking-widest mb-2">{code}</p>
      {mobileUrl && (
        <p className="text-sm text-gray-500 break-all leading-tight max-w-[220px]">
          {mobileUrl}
        </p>
      )}
    </div>
  );
}

function NowPlayingPreview({ 
  currentSong, 
  onSelect 
}: { 
  currentSong: QueueItem | null;
  onSelect?: () => void;
}) {
  if (!currentSong) {
    return (
      <div className="tv-card flex items-center gap-tv-3 opacity-50">
        <div className="w-24 h-24 bg-tv-surface rounded-tv flex items-center justify-center">
          <MusicIcon />
        </div>
        <div>
          <p className="text-tv-xs text-secondary">Đang phát</p>
          <p className="text-tv-sm text-secondary">Chưa có bài hát</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="tv-card flex items-center gap-tv-3 cursor-pointer hover:bg-tv-hover transition-colors"
      onClick={onSelect}
    >
      <LazyImage 
        src={currentSong.song.thumbnail} 
        alt={currentSong.song.title}
        className="w-24 h-24 rounded-tv"
        width={120}
        height={90}
        priority
      />
      <div className="flex-1 min-w-0">
        <p className="text-tv-xs text-primary-500">Đang phát</p>
        <p className="text-tv-sm font-semibold truncate">{currentSong.song.title}</p>
        <p className="text-tv-xs text-secondary truncate">{currentSong.song.channelName}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 bg-accent-green rounded-full animate-pulse" />
        <span className="text-tv-xs text-accent-green">LIVE</span>
      </div>
    </div>
  );
}

export function HomeScreen({
  sessionCode,
  onSearchSelect,
  onQueueSelect,
  onNowPlayingSelect,
  onPlayNow,
}: HomeScreenProps) {
  const currentSong = useQueueStore((state) => state.getCurrent());
  const queueItems = useQueueStore((state) => state.items);
  const waitingCount = queueItems.filter(item => item.status === 'waiting').length;

  return (
    <NavigationGrid className="min-h-screen bg-tv-bg p-6 lg:p-8">
      <div className="max-w-6xl mx-auto h-full">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-3xl lg:text-4xl font-bold text-primary-500">Karaoke</h1>
          <div className="flex items-center gap-3">
            {waitingCount > 0 && (
              <span className="text-base bg-primary-600 text-white px-3 py-1 rounded-full whitespace-nowrap">
                {waitingCount} bài
              </span>
            )}
            <ThemeToggle />
          </div>
        </header>

        {/* Main content */}
        <div className="flex gap-6 lg:gap-8 items-start">
          {/* Left - QR Code */}
          <div className="bg-white/5 dark:bg-white/5 backdrop-blur rounded-2xl p-4 flex-shrink-0">
            <QRCodeDisplay code={sessionCode} />
          </div>

          {/* Right - Main content */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            {/* Now Playing - Top */}
            <div className="bg-white/5 dark:bg-white/5 backdrop-blur rounded-2xl p-4">
              <p className="text-base text-gray-400 mb-2">Đang phát</p>
              {currentSong ? (
                <div 
                  className="flex items-center gap-4 cursor-pointer"
                  onClick={onNowPlayingSelect}
                >
                  <LazyImage 
                    src={currentSong.song.thumbnail} 
                    alt={currentSong.song.title}
                    className="w-32 h-20 lg:w-36 lg:h-24 rounded-lg object-cover flex-shrink-0"
                    width={144}
                    height={96}
                    priority
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xl lg:text-2xl font-semibold truncate">{currentSong.song.title}</p>
                    <p className="text-lg text-gray-400 truncate">{currentSong.song.channelName}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-base text-green-500 font-medium">LIVE</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4 opacity-50">
                  <div className="w-32 h-20 lg:w-36 lg:h-24 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MusicIcon />
                  </div>
                  <p className="text-lg text-gray-400">Chưa có bài hát</p>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <FocusableButton
                row={0}
                col={0}
                onSelect={onSearchSelect}
                variant="primary"
                size="md"
                icon={<SearchIcon />}
                autoFocus
                className="flex-1 !whitespace-nowrap !text-sm"
              >
                <span className="whitespace-nowrap text-sm">Tìm kiếm</span>
              </FocusableButton>
              
              <FocusableButton
                row={0}
                col={1}
                onSelect={onQueueSelect}
                variant="secondary"
                size="md"
                icon={<QueueIcon />}
                className="flex-1 !whitespace-nowrap !text-sm"
              >
                <span className="whitespace-nowrap text-sm">Hàng đợi {waitingCount > 0 && `(${waitingCount})`}</span>
              </FocusableButton>
            </div>

            {/* Play Now button */}
            {waitingCount > 0 && !currentSong && onPlayNow && (
              <button
                onClick={onPlayNow}
                className="w-full py-4 bg-green-500 hover:bg-green-600 text-white text-xl font-bold rounded-xl flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
              >
                <PlayIcon />
                Phát ngay ({waitingCount} bài)
              </button>
            )}

            {/* Queue preview */}
            {waitingCount > 0 && (
              <div className="bg-white/5 dark:bg-white/5 backdrop-blur rounded-2xl p-4">
                <p className="text-base text-gray-400 mb-3">Tiếp theo</p>
                <div className="flex gap-3 overflow-x-auto hide-scrollbar">
                  {queueItems
                    .filter(item => item.status === 'waiting')
                    .slice(0, 6)
                    .map((item) => (
                      <div key={item.id} className="flex-shrink-0 w-32 lg:w-36">
                        <LazyImage 
                          src={item.song.thumbnail} 
                          alt={item.song.title}
                          className="w-32 h-20 lg:w-36 lg:h-24 rounded-lg mb-1 object-cover"
                          width={144}
                          height={96}
                        />
                        <p className="text-base truncate">{item.song.title}</p>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </NavigationGrid>
  );
}

export default HomeScreen;
