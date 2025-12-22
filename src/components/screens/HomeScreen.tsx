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
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function QueueIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function MusicIcon() {
  return (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        width: 336,
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
          <img src={qrDataUrl} alt="QR Code" className="w-[252px] h-[252px]" />
        ) : (
          <div className="w-[252px] h-[252px] flex items-center justify-center bg-gray-100">
            <span className="text-gray-400 text-base">Đang tạo...</span>
          </div>
        )}
      </div>
      <p className="text-base text-gray-400 mb-1">Quét QR hoặc nhập mã</p>
      <p className="text-5xl font-bold text-primary-500 tracking-widest mb-2">{code}</p>
      {mobileUrl && (
        <p className="text-xs text-gray-500 break-all leading-tight max-w-[252px]">
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
            {/* Now Playing - Top - 2 rows layout like search results */}
            {currentSong ? (
              <FocusableButton
                row={0}
                col={2}
                onSelect={onNowPlayingSelect || (() => {})}
                variant="ghost"
                className="!p-0 !min-h-0 !min-w-0 w-full text-left !overflow-hidden"
              >
                <div className="bg-white/5 backdrop-blur rounded-2xl p-4 w-full overflow-hidden">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                    <p className="text-base text-green-500 font-medium">Đang phát</p>
                  </div>
                  {/* 2 rows: image on top, text below */}
                  <div className="flex flex-col">
                    <LazyImage 
                      src={currentSong.song.thumbnail} 
                      alt={currentSong.song.title}
                      className="w-full h-40 lg:h-48 rounded-xl object-cover mb-3"
                      width={400}
                      height={225}
                      priority
                    />
                    <div className="overflow-hidden">
                      <p className="text-xl lg:text-2xl font-semibold truncate mb-1">{currentSong.song.title}</p>
                      <p className="text-base lg:text-lg text-gray-400 truncate">{currentSong.song.channelName}</p>
                    </div>
                  </div>
                </div>
              </FocusableButton>
            ) : (
              <div className="bg-white/5 backdrop-blur rounded-2xl p-4">
                <p className="text-base text-gray-400 mb-3">Đang phát</p>
                <div className="flex flex-col items-center opacity-50 py-6">
                  <div className="w-24 h-24 bg-gray-700 rounded-xl flex items-center justify-center mb-3">
                    <MusicIcon />
                  </div>
                  <p className="text-lg text-gray-400">Chưa có bài hát</p>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-4">
              <FocusableButton
                row={1}
                col={0}
                onSelect={onSearchSelect}
                variant="primary"
                size="md"
                icon={<SearchIcon />}
                autoFocus
                className="flex-1 !whitespace-nowrap"
              >
                Tìm kiếm
              </FocusableButton>
              
              <FocusableButton
                row={1}
                col={1}
                onSelect={onQueueSelect}
                variant="secondary"
                size="md"
                icon={<QueueIcon />}
                className="flex-1 !whitespace-nowrap"
              >
                Hàng đợi {waitingCount > 0 && `(${waitingCount})`}
              </FocusableButton>
            </div>

            {/* Play Now button */}
            {waitingCount > 0 && !currentSong && onPlayNow && (
              <FocusableButton
                row={2}
                col={0}
                onSelect={onPlayNow}
                variant="primary"
                size="md"
                icon={<PlayIcon />}
                className="w-full !bg-green-500 hover:!bg-green-600"
              >
                Phát ngay ({waitingCount} bài)
              </FocusableButton>
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
