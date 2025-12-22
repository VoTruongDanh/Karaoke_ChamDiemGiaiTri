'use client';

import React from 'react';
import { NavigationGrid } from '@/components/NavigationGrid';
import { FocusableButton } from '@/components/FocusableButton';
import type { SessionSummary, CompletedSongRecord } from '@/types/session';

/**
 * Props for SessionSummaryScreen component
 */
export interface SessionSummaryScreenProps {
  /** Session summary data */
  summary: SessionSummary;
  /** Callback when user wants to start a new session */
  onNewSession: () => void;
  /** Callback when user wants to go back to home */
  onBack: () => void;
}

/**
 * Trophy icon component
 */
function TrophyIcon() {
  return (
    <svg className="w-12 h-12 text-accent-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}

/**
 * Music note icon component
 */
function MusicIcon() {
  return (
    <svg className="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
    </svg>
  );
}

/**
 * Format duration from milliseconds to readable string
 */
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours} giờ ${minutes} phút`;
  }
  return `${minutes} phút`;
}

/**
 * Format song duration from seconds to mm:ss
 */
function formatSongDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}


/**
 * Completed song item component
 */
function CompletedSongItem({ 
  record, 
  index,
  isHighest 
}: { 
  record: CompletedSongRecord; 
  index: number;
  isHighest: boolean;
}) {
  return (
    <div className={`flex items-center gap-tv-3 p-tv-3 rounded-tv-lg ${isHighest ? 'bg-accent-yellow/10 border border-accent-yellow/30' : 'bg-tv-card'}`}>
      <span className="text-tv-lg font-bold text-gray-500 w-8">{index + 1}</span>
      
      <img 
        src={record.queueItem.song.thumbnail} 
        alt={record.queueItem.song.title}
        className="w-16 h-12 object-cover rounded"
      />
      
      <div className="flex-1 min-w-0">
        <p className="text-tv-sm font-semibold truncate">{record.queueItem.song.title}</p>
        <p className="text-tv-xs text-gray-400">
          {record.queueItem.addedBy} • {formatSongDuration(record.queueItem.song.duration)}
        </p>
      </div>
      
      {record.score ? (
        <div className="text-right">
          <p className={`text-tv-lg font-bold ${isHighest ? 'text-accent-yellow' : 'text-primary-400'}`}>
            {record.score.totalScore}
          </p>
          <p className="text-tv-xs text-gray-500">điểm</p>
        </div>
      ) : (
        <div className="text-right">
          <p className="text-tv-sm text-gray-500">Không chấm điểm</p>
        </div>
      )}
      
      {isHighest && (
        <div className="ml-2">
          <TrophyIcon />
        </div>
      )}
    </div>
  );
}

/**
 * SessionSummaryScreen component - Displays session summary at the end
 * 
 * Requirements: 7.4 - WHEN the session ends, THE Karaoke_Web_App SHALL display a summary of songs sung and scores
 * 
 * Features:
 * - Total songs sung
 * - List of completed songs with scores
 * - Session duration
 * - Average and highest scores
 */
export function SessionSummaryScreen({
  summary,
  onNewSession,
  onBack,
}: SessionSummaryScreenProps) {
  const { totalSongs, completedSongs, duration, averageScore, highestScore } = summary;

  return (
    <NavigationGrid className="min-h-screen bg-tv-bg p-tv-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-tv-6">
          <h1 className="text-tv-3xl font-bold mb-tv-2">🎤 Kết thúc phiên hát</h1>
          <p className="text-tv-sm text-gray-400">Cảm ơn bạn đã sử dụng Karaoke TV!</p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-tv-4 mb-tv-6">
          {/* Total songs */}
          <div className="tv-card text-center">
            <MusicIcon />
            <p className="text-tv-3xl font-bold text-primary-400 mt-tv-2">{totalSongs}</p>
            <p className="text-tv-xs text-gray-400">Bài hát đã hát</p>
          </div>

          {/* Duration */}
          <div className="tv-card text-center">
            <svg className="w-8 h-8 text-accent-cyan mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-tv-3xl font-bold text-accent-cyan mt-tv-2">{formatDuration(duration)}</p>
            <p className="text-tv-xs text-gray-400">Thời gian hát</p>
          </div>

          {/* Average score */}
          <div className="tv-card text-center">
            <svg className="w-8 h-8 text-accent-green mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-tv-3xl font-bold text-accent-green mt-tv-2">
              {averageScore !== null ? averageScore : '-'}
            </p>
            <p className="text-tv-xs text-gray-400">Điểm trung bình</p>
          </div>
        </div>

        {/* Highest score highlight */}
        {highestScore && (
          <div className="tv-card mb-tv-6 bg-gradient-to-r from-accent-yellow/10 to-transparent border border-accent-yellow/30">
            <div className="flex items-center gap-tv-4">
              <TrophyIcon />
              <div className="flex-1">
                <p className="text-tv-xs text-accent-yellow uppercase tracking-wide">Điểm cao nhất</p>
                <p className="text-tv-lg font-bold">{highestScore.queueItem.song.title}</p>
                <p className="text-tv-xs text-gray-400">Hát bởi: {highestScore.queueItem.addedBy}</p>
              </div>
              <div className="text-right">
                <p className="text-tv-3xl font-bold text-accent-yellow">{highestScore.score?.totalScore}</p>
                <p className="text-tv-xs text-gray-400">điểm</p>
              </div>
            </div>
          </div>
        )}

        {/* Song list */}
        {completedSongs.length > 0 && (
          <div className="mb-tv-6">
            <h2 className="text-tv-lg font-semibold mb-tv-3">Danh sách bài hát</h2>
            <div className="space-y-tv-2 max-h-96 overflow-y-auto">
              {completedSongs.map((record, index) => (
                <CompletedSongItem
                  key={record.queueItem.id}
                  record={record}
                  index={index}
                  isHighest={highestScore?.queueItem.id === record.queueItem.id}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {completedSongs.length === 0 && (
          <div className="tv-card text-center py-tv-6 mb-tv-6">
            <p className="text-tv-lg text-gray-400">Chưa có bài hát nào được hát</p>
            <p className="text-tv-sm text-gray-500 mt-tv-2">Hãy thêm bài hát vào hàng đợi và bắt đầu hát!</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-center gap-tv-4">
          <FocusableButton
            row={0}
            col={0}
            onSelect={onNewSession}
            variant="primary"
            size="lg"
            autoFocus
          >
            Phiên mới
          </FocusableButton>
          
          <FocusableButton
            row={0}
            col={1}
            onSelect={onBack}
            variant="secondary"
            size="lg"
          >
            Quay lại
          </FocusableButton>
        </div>
      </div>
    </NavigationGrid>
  );
}

export default SessionSummaryScreen;
