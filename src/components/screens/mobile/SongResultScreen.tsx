'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { QueueItem } from '@/types/queue';
import type { ScoreData } from '@/types/score';

export interface SongResultScreenProps {
  song: QueueItem;
  finalScore: ScoreData | null;
  onNext: () => void;
  autoNextDelay?: number;
}

interface GradeInfo {
  grade: string;
  title: string;
  emoji: string;
  gradient: string;
  glow: string;
  textGradient: string;
}

function getScoreGrade(score: number): GradeInfo {
  if (score >= 90) return { 
    grade: 'S', 
    title: 'Xuất sắc!', 
    emoji: '👑',
    gradient: 'from-yellow-400 via-amber-500 to-orange-500',
    glow: 'shadow-[0_0_60px_rgba(251,191,36,0.5)]',
    textGradient: 'from-yellow-300 to-amber-500'
  };
  if (score >= 80) return { 
    grade: 'A', 
    title: 'Tuyệt vời!', 
    emoji: '🌟',
    gradient: 'from-emerald-400 via-green-500 to-teal-500',
    glow: 'shadow-[0_0_50px_rgba(34,197,94,0.4)]',
    textGradient: 'from-emerald-300 to-green-500'
  };
  if (score >= 70) return { 
    grade: 'B', 
    title: 'Rất tốt!', 
    emoji: '✨',
    gradient: 'from-cyan-400 via-sky-500 to-blue-500',
    glow: 'shadow-[0_0_40px_rgba(6,182,212,0.4)]',
    textGradient: 'from-cyan-300 to-sky-500'
  };
  if (score >= 60) return { 
    grade: 'C', 
    title: 'Khá tốt', 
    emoji: '👍',
    gradient: 'from-blue-400 via-indigo-500 to-violet-500',
    glow: 'shadow-[0_0_35px_rgba(99,102,241,0.4)]',
    textGradient: 'from-blue-300 to-indigo-500'
  };
  if (score >= 50) return { 
    grade: 'D', 
    title: 'Cố gắng thêm', 
    emoji: '💪',
    gradient: 'from-orange-400 via-amber-500 to-yellow-500',
    glow: 'shadow-[0_0_30px_rgba(249,115,22,0.4)]',
    textGradient: 'from-orange-300 to-amber-500'
  };
  return { 
    grade: 'F', 
    title: 'Thử lại nhé', 
    emoji: '🎤',
    gradient: 'from-rose-400 via-red-500 to-pink-500',
    glow: 'shadow-[0_0_30px_rgba(244,63,94,0.4)]',
    textGradient: 'from-rose-300 to-red-500'
  };
}

/**
 * Animated score counter with proper cleanup
 */
function AnimatedScore({ target, duration = 1500 }: { target: number; duration?: number }) {
  const [current, setCurrent] = useState(0);
  const frameRef = React.useRef<number | null>(null);
  const mountedRef = React.useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const startTime = Date.now();
    
    const animate = () => {
      if (!mountedRef.current) return;
      
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
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
 * Stat card component
 */
function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="flex-1 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 border border-slate-200/50 dark:border-slate-700/50 shadow-lg">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold text-slate-800 dark:text-white">
        <AnimatedScore target={value} duration={1200} />
        <span className="text-lg text-slate-400">%</span>
      </p>
    </div>
  );
}

/**
 * Mobile Song Result Screen - Premium design with thumbnail
 */
export function SongResultScreen({ 
  song, 
  finalScore, 
  onNext, 
  autoNextDelay = 20 
}: SongResultScreenProps) {
  const [countdown, setCountdown] = useState(autoNextDelay);
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

  const handleNext = useCallback(() => onNext(), [onNext]);
  const gradeInfo = finalScore ? getScoreGrade(finalScore.totalScore) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex flex-col relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br from-purple-400/20 to-pink-400/20 dark:from-purple-500/10 dark:to-pink-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-gradient-to-tr from-blue-400/20 to-cyan-400/20 dark:from-blue-500/10 dark:to-cyan-500/10 rounded-full blur-3xl" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 relative z-10">
        {/* Thumbnail with gradient border */}
        <div className={`mb-6 transition-all duration-1000 ${showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
          <div className={`relative p-1 rounded-2xl bg-gradient-to-br ${gradeInfo?.gradient || 'from-purple-500 to-pink-500'} ${gradeInfo?.glow || ''}`}>
            <img 
              src={song.song.thumbnail} 
              alt="" 
              className="w-48 h-48 rounded-xl object-cover"
            />
            {/* Grade badge overlay */}
            {gradeInfo && (
              <div className={`absolute -bottom-3 -right-3 w-14 h-14 rounded-full bg-gradient-to-br ${gradeInfo.gradient} flex items-center justify-center shadow-xl border-4 border-white dark:border-slate-900`}>
                <span className="text-2xl font-black text-white">{gradeInfo.grade}</span>
              </div>
            )}
          </div>
        </div>

        {/* Song title */}
        <div className={`text-center mb-4 transition-all duration-700 delay-200 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Hoàn thành</p>
          <p className="font-semibold text-slate-800 dark:text-white text-lg max-w-xs truncate">{song.song.title}</p>
        </div>

        {finalScore && gradeInfo ? (
          <div className="text-center w-full max-w-sm">
            {/* Title */}
            <h2 className={`text-2xl font-bold mb-4 bg-gradient-to-r ${gradeInfo.textGradient} bg-clip-text text-transparent transition-all duration-700 delay-400 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
              {gradeInfo.title} {gradeInfo.emoji}
            </h2>

            {/* Score display */}
            <div className={`mb-6 transition-all duration-700 delay-600 ${showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50 shadow-xl">
                <span className={`text-7xl font-black bg-gradient-to-br ${gradeInfo.textGradient} bg-clip-text text-transparent`}>
                  <AnimatedScore target={finalScore.totalScore} />
                </span>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">điểm</p>
              </div>
            </div>

            {/* Stats */}
            <div className={`flex gap-3 transition-all duration-700 delay-800 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <StatCard label="Cao độ" value={finalScore.pitchAccuracy} icon="🎵" />
              <StatCard label="Nhịp điệu" value={finalScore.timing} icon="🥁" />
            </div>
          </div>
        ) : (
          <div className={`text-center transition-all duration-700 delay-400 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Hoàn thành!</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2">Bài hát đã kết thúc</p>
          </div>
        )}
      </div>

      {/* Bottom action */}
      <div className={`relative z-10 p-4 transition-all duration-700 delay-1000 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <button
          onClick={handleNext}
          className="w-full py-4 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-purple-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
        >
          <span>Tiếp tục</span>
          <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">{countdown}s</span>
        </button>
      </div>
    </div>
  );
}

export default SongResultScreen;
