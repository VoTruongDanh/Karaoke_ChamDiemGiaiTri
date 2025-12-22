'use client';

import dynamic from 'next/dynamic';
import React from 'react';

/**
 * Loading spinner component for lazy-loaded screens
 */
function ScreenLoader() {
  return (
    <div className="min-h-screen bg-tv-bg flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-12 h-12 border-4 border-primary-400 border-t-transparent rounded-full mb-4" />
        <p className="text-tv-sm text-gray-400">Đang tải...</p>
      </div>
    </div>
  );
}

/**
 * Lazy-loaded SearchScreen
 * Requirements: 8.5 - Code splitting for screens
 */
export const LazySearchScreen = dynamic(
  () => import('./SearchScreen').then(mod => ({ default: mod.SearchScreen })),
  {
    loading: () => <ScreenLoader />,
    ssr: false,
  }
);

/**
 * Lazy-loaded QueueScreen
 * Requirements: 8.5 - Code splitting for screens
 */
export const LazyQueueScreen = dynamic(
  () => import('./QueueScreen').then(mod => ({ default: mod.QueueScreen })),
  {
    loading: () => <ScreenLoader />,
    ssr: false,
  }
);

/**
 * Lazy-loaded PlayingScreen
 * Requirements: 8.5 - Code splitting for screens
 */
export const LazyPlayingScreen = dynamic(
  () => import('./PlayingScreen').then(mod => ({ default: mod.PlayingScreen })),
  {
    loading: () => <ScreenLoader />,
    ssr: false,
  }
);

/**
 * Lazy-loaded SessionSummaryScreen
 * Requirements: 8.5 - Code splitting for screens
 */
export const LazySessionSummaryScreen = dynamic(
  () => import('./SessionSummaryScreen').then(mod => ({ default: mod.SessionSummaryScreen })),
  {
    loading: () => <ScreenLoader />,
    ssr: false,
  }
);
