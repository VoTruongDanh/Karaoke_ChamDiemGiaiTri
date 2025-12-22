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
        width: 200,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      })
        .then((dataUrl) => setQrDataUrl(dataUrl))
        .catch((err) => console.error('QR Code error:', err));
    }
  }, [code]);

  return (
    <div className="flex flex-col items-center">
      <div className="bg-white p-tv-2 rounded-tv-lg mb-tv-2 shadow-lg">
        {qrDataUrl ? (
          <img src={qrDataUrl} alt="QR Code" className="w-40 h-40" />
        ) : (
          <div className="w-40 h-40 flex items-center justify-center bg-gray-100">
            <span className="text-gray-400 text-sm">Đang tạo QR...</span>
          </div>
        )}
      </div>
      <p className="text-tv-xs text-secondary mb-tv-1">Quét mã QR hoặc nhập mã</p>
      <p className="text-tv-3xl font-bold text-primary-500 tracking-[0.3em]">{code}</p>
      {mobileUrl && (
        <p className="text-tv-xs text-secondary mt-tv-1 break-all max-w-[200px] text-center">
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
    <NavigationGrid className="min-h-screen bg-tv-bg p-tv-4">
      <div className="max-w-6xl mx-auto">
        {/* Header - Compact */}
        <header className="flex items-center justify-between mb-tv-4">
          <div className="flex items-center gap-tv-2">
            <span className="text-tv-2xl">🎤</span>
            <h1 className="text-tv-xl font-bold text-primary-500">Karaoke</h1>
          </div>
          <div className="flex items-center gap-tv-2">
            {waitingCount > 0 && (
              <span className="text-tv-xs bg-primary-600 text-white px-tv-2 py-tv-1 rounded-full">
                {waitingCount} bài
              </span>
            )}
            <ThemeToggle />
          </div>
        </header>

        {/* Main grid - 2 columns */}
        <div className="grid grid-cols-12 gap-tv-4">
          {/* Left - QR Code */}
          <div className="col-span-5">
            <div className="tv-card h-full flex flex-col items-center justify-center">
              <QRCodeDisplay code={sessionCode} />
            </div>
          </div>

          {/* Right - Actions & Now Playing */}
          <div className="col-span-7 flex flex-col gap-tv-3">
            {/* Play Now - Big button when queue has songs */}
            {waitingCount > 0 && !currentSong && onPlayNow && (
              <button
                onClick={onPlayNow}
                className="py-tv-4 bg-accent-green hover:bg-green-600 text-white text-tv-xl font-bold rounded-tv-lg flex items-center justify-center gap-tv-2 transition-colors"
              >
                <PlayIcon />
                Phát ngay
              </button>
            )}

            {/* Now Playing */}
            <NowPlayingPreview currentSong={currentSong} onSelect={onNowPlayingSelect} />

            {/* Quick actions - Horizontal */}
            <div className="flex gap-tv-2">
              <FocusableButton
                row={0}
                col={0}
                onSelect={onSearchSelect}
                variant="primary"
                size="lg"
                icon={<SearchIcon />}
                autoFocus
                className="flex-1"
              >
                Tìm kiếm
              </FocusableButton>
              
              <FocusableButton
                row={0}
                col={1}
                onSelect={onQueueSelect}
                variant="secondary"
                size="lg"
                icon={<QueueIcon />}
                className="flex-1"
              >
                Hàng đợi {waitingCount > 0 && `(${waitingCount})`}
              </FocusableButton>
            </div>

            {/* Queue preview - Compact */}
            {waitingCount > 0 && (
              <div className="tv-card">
                <p className="text-tv-xs text-secondary mb-tv-2">Tiếp theo</p>
                <div className="flex gap-tv-2 overflow-x-auto hide-scrollbar">
                  {queueItems
                    .filter(item => item.status === 'waiting')
                    .slice(0, 5)
                    .map((item) => (
                      <div key={item.id} className="flex-shrink-0 w-28">
                        <LazyImage 
                          src={item.song.thumbnail} 
                          alt={item.song.title}
                          className="w-28 h-16 rounded-tv mb-1"
                          width={112}
                          height={64}
                        />
                        <p className="text-tv-xs truncate">{item.song.title}</p>
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
