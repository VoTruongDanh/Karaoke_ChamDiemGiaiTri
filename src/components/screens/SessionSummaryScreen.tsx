'use client';

import React from 'react';
import { NavigationGrid } from '@/components/NavigationGrid';
import { FocusableButton } from '@/components/FocusableButton';
import type { SessionSummary, CompletedSongRecord } from '@/types/session';

export interface SessionSummaryScreenProps {
  summary: SessionSummary;
  onNewSession: () => void;
  onBack: () => void;
}

function TrophyIcon() {
  return (
    <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C9.38 2 7.25 4.13 7.25 6.75c0 1.16.42 2.22 1.11 3.05L7 11.16V13h10v-1.84l-1.36-1.36c.69-.83 1.11-1.89 1.11-3.05C16.75 4.13 14.62 2 12 2zm0 2c1.52 0 2.75 1.23 2.75 2.75S13.52 9.5 12 9.5 9.25 8.27 9.25 6.75 10.48 4 12 4zM7 14v2h10v-2H7zm2 3v3h6v-3H9z"/>
    </svg>
  );
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h${minutes}p`;
  return `${minutes}p`;
}

function SongItem({ record, index, isHighest }: { 
  record: CompletedSongRecord; 
  index: number;
  isHighest: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 p-1 rounded ${isHighest ? 'bg-yellow-500/10' : ''}`}>
      <span className="text-[10px] text-gray-500 w-3">{index + 1}</span>
      <img src={record.queueItem.song.thumbnail} alt="" className="w-8 h-5 object-cover rounded" />
      <p className="flex-1 text-[11px] truncate">{record.queueItem.song.title}</p>
      <p className={`text-xs font-medium ${isHighest ? 'text-yellow-400' : 'text-primary-400'}`}>
        {record.score?.totalScore ?? '--'}
      </p>
      {isHighest && <TrophyIcon />}
    </div>
  );
}

export function SessionSummaryScreen({ summary, onNewSession, onBack }: SessionSummaryScreenProps) {
  const { totalSongs, completedSongs, duration, averageScore, highestScore } = summary;

  return (
    <NavigationGrid className="h-screen bg-tv-bg p-4 flex flex-col">
      {/* Header */}
      <div className="text-center mb-3">
        <p className="text-base font-semibold">🎤 Kết thúc phiên hát</p>
      </div>

      {/* Stats */}
      <div className="flex justify-center gap-4 mb-3">
        <div className="text-center">
          <p className="text-lg font-bold text-primary-400">{totalSongs}</p>
          <p className="text-[10px] text-gray-500">Bài hát</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-cyan-400">{formatDuration(duration)}</p>
          <p className="text-[10px] text-gray-500">Thời gian</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-green-400">{averageScore ?? '--'}</p>
          <p className="text-[10px] text-gray-500">TB điểm</p>
        </div>
      </div>

      {/* Highest score */}
      {highestScore?.score && (
        <div className="bg-yellow-500/10 rounded-lg p-2 mb-3 mx-auto max-w-sm w-full">
          <div className="flex items-center gap-2">
            <TrophyIcon />
            <p className="flex-1 text-xs truncate">{highestScore.queueItem.song.title}</p>
            <p className="text-base font-bold text-yellow-400">{highestScore.score.totalScore}</p>
          </div>
        </div>
      )}

      {/* Song list */}
      {completedSongs.length > 0 && (
        <div className="flex-1 min-h-0 mx-auto max-w-sm w-full mb-3">
          <p className="text-[10px] text-gray-500 mb-1">Danh sách</p>
          <div className="bg-white/5 rounded-lg p-1 max-h-28 overflow-y-auto">
            {completedSongs.map((record, index) => (
              <SongItem
                key={record.queueItem.id}
                record={record}
                index={index}
                isHighest={highestScore?.queueItem.id === record.queueItem.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="flex justify-center gap-2">
        <FocusableButton row={0} col={0} onSelect={onNewSession} variant="primary" size="sm" autoFocus>
          Hát tiếp
        </FocusableButton>
        <FocusableButton row={0} col={1} onSelect={onBack} variant="secondary" size="sm">
          Trang chủ
        </FocusableButton>
      </div>
    </NavigationGrid>
  );
}

export default SessionSummaryScreen;
