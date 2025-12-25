'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { 
  HomeScreen, 
  SearchScreen, 
  QueueScreen, 
  PlayingScreen,
  SessionSummaryScreen 
} from '@/components/screens';
import { TVSongResultScreen } from '@/components/screens/TVSongResultScreen';
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

// Get score color based on grade - darker colors with stroke for visibility
function getScoreColor(score: number): { text: string; glow: string; stroke: string } {
  if (score >= 90) return { 
    text: 'text-yellow-500', 
    glow: 'drop-shadow-[0_0_30px_rgba(234,179,8,0.9)]',
    stroke: '[text-shadow:_-2px_-2px_0_#000,_2px_-2px_0_#000,_-2px_2px_0_#000,_2px_2px_0_#000,_0_0_20px_rgba(234,179,8,0.8)]'
  }; // S - Vàng đậm
  if (score >= 80) return { 
    text: 'text-emerald-500', 
    glow: 'drop-shadow-[0_0_30px_rgba(16,185,129,0.9)]',
    stroke: '[text-shadow:_-2px_-2px_0_#000,_2px_-2px_0_#000,_-2px_2px_0_#000,_2px_2px_0_#000,_0_0_20px_rgba(16,185,129,0.8)]'
  }; // A - Xanh lục đậm
  if (score >= 70) return { 
    text: 'text-cyan-500', 
    glow: 'drop-shadow-[0_0_30px_rgba(6,182,212,0.9)]',
    stroke: '[text-shadow:_-2px_-2px_0_#000,_2px_-2px_0_#000,_-2px_2px_0_#000,_2px_2px_0_#000,_0_0_20px_rgba(6,182,212,0.8)]'
  }; // B - Xanh dương đậm
  if (score >= 60) return { 
    text: 'text-blue-500', 
    glow: 'drop-shadow-[0_0_30px_rgba(59,130,246,0.9)]',
    stroke: '[text-shadow:_-2px_-2px_0_#000,_2px_-2px_0_#000,_-2px_2px_0_#000,_2px_2px_0_#000,_0_0_20px_rgba(59,130,246,0.8)]'
  }; // C - Xanh đậm
  if (score >= 50) return { 
    text: 'text-orange-500', 
    glow: 'drop-shadow-[0_0_30px_rgba(249,115,22,0.9)]',
    stroke: '[text-shadow:_-2px_-2px_0_#000,_2px_-2px_0_#000,_-2px_2px_0_#000,_2px_2px_0_#000,_0_0_20px_rgba(249,115,22,0.8)]'
  }; // D - Cam đậm
  return { 
    text: 'text-rose-600', 
    glow: 'drop-shadow-[0_0_30px_rgba(225,29,72,0.9)]',
    stroke: '[text-shadow:_-2px_-2px_0_#000,_2px_-2px_0_#000,_-2px_2px_0_#000,_2px_2px_0_#000,_0_0_20px_rgba(225,29,72,0.8)]'
  }; // F - Đỏ đậm
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
 * Animated score counter with rolling effect and sound
 */
function TVAnimatedScore({ target, duration = 2500, withSound = false }: { target: number; duration?: number; withSound?: boolean }) {
  const [current, setCurrent] = useState(0);
  const [isRolling, setIsRolling] = useState(true);
  const frameRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastTickRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    setIsRolling(true);
    const startTime = Date.now();
    
    // Create audio context for tick sound
    if (withSound) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      } catch {}
    }
    
    // Play tick sound
    const playTick = (pitch: number = 1) => {
      if (!audioContextRef.current || !withSound) return;
      try {
        const ctx = audioContextRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 800 * pitch; // Higher pitch as score increases
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.05);
      } catch {}
    };
    
    // Play final reveal sound
    const playReveal = () => {
      if (!audioContextRef.current || !withSound) return;
      try {
        const ctx = audioContextRef.current;
        const now = ctx.currentTime;
        
        // Triumphant chord
        [523.25, 659.25, 783.99].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.05);
          osc.stop(now + 0.5);
        });
      } catch {}
    };
    
    const animate = () => {
      if (!mountedRef.current) return;
      
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out with dramatic slowdown at end
      const eased = progress < 0.8 
        ? progress * 1.25 * (1 - Math.pow(1 - progress / 0.8, 2)) * 0.8
        : 0.8 + (1 - Math.pow(1 - (progress - 0.8) / 0.2, 3)) * 0.2;
      
      const newValue = Math.round(target * Math.min(eased * 1.25, 1));
      
      // Play tick sound every few points
      if (withSound && newValue !== current && newValue - lastTickRef.current >= 3) {
        lastTickRef.current = newValue;
        playTick(0.8 + (newValue / target) * 0.4); // Pitch increases with score
      }
      
      setCurrent(newValue);
      
      if (progress < 1 && mountedRef.current) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setIsRolling(false);
        if (withSound) playReveal();
      }
    };
    
    // Small delay before starting
    const startDelay = setTimeout(() => {
      frameRef.current = requestAnimationFrame(animate);
    }, 300);
    
    return () => {
      clearTimeout(startDelay);
      mountedRef.current = false;
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [target, duration, withSound]);

  return (
    <span className={isRolling ? 'animate-pulse' : ''}>
      {current}
    </span>
  );
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
 * Confetti particle component for high scores - OPTIMIZED for TV
 */
function Confetti({ show, intensity = 10 }: { show: boolean; intensity?: number }) {
  // Reduced particle count for TV performance
  const particles = useMemo(() => 
    [...Array(intensity)].map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 3 + Math.random() * 1.5,
      color: ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6bd6', '#a855f7'][i % 6],
    })), [intensity]
  );
  
  if (!show) return null;
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute w-2 h-2 rounded-full animate-confetti"
          style={{
            left: `${p.left}%`,
            top: '-20px',
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Firework burst effect - simplified for TV performance
 */
function Fireworks({ show }: { show: boolean }) {
  // Reduced positions for TV
  const positions = useMemo(() => [
    { x: 30, y: 30 },
    { x: 70, y: 35 },
  ], []);
  
  if (!show) return null;
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {positions.map((pos, idx) => (
        <div
          key={idx}
          className="absolute"
          style={{ 
            left: `${pos.x}%`, 
            top: `${pos.y}%`,
            animationDelay: `${idx * 0.6}s`,
          }}
        >
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full animate-firework"
              style={{
                backgroundColor: ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff'][i % 4],
                transform: `rotate(${i * 60}deg) translateY(-8px)`,
                animationDelay: `${idx * 0.6 + i * 0.04}s`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Rising stars effect - reduced for TV
 */
function RisingStars({ show }: { show: boolean }) {
  const stars = useMemo(() => 
    [...Array(4)].map((_, i) => ({
      id: i,
      left: 15 + i * 20,
      delay: i * 0.5,
      duration: 3.5 + (i % 2),
      emoji: ['⭐', '✨', '🌟'][i % 3],
    })), []
  );
  
  if (!show) return null;
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {stars.map((s) => (
        <div
          key={s.id}
          className="absolute text-xl animate-rise-star"
          style={{
            left: `${s.left}%`,
            bottom: '-30px',
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
          }}
        >
          {s.emoji}
        </div>
      ))}
    </div>
  );
}

/**
 * Floating music notes - reduced for TV
 */
function FloatingNotes({ show }: { show: boolean }) {
  const notes = useMemo(() => 
    [...Array(4)].map((_, i) => ({
      id: i,
      left: 15 + i * 20,
      top: 25 + (i % 2) * 30,
      delay: i * 0.6,
      duration: 4.5,
      emoji: ['🎵', '🎶'][i % 2],
    })), []
  );
  
  if (!show) return null;
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {notes.map((n) => (
        <div
          key={n.id}
          className="absolute text-2xl animate-float-note opacity-50"
          style={{
            left: `${n.left}%`,
            top: `${n.top}%`,
            animationDelay: `${n.delay}s`,
            animationDuration: `${n.duration}s`,
          }}
        >
          {n.emoji}
        </div>
      ))}
    </div>
  );
}

/**
 * Sparkle effect for medium scores - reduced for TV
 */
function Sparkles({ show }: { show: boolean }) {
  const sparkles = useMemo(() => 
    [...Array(6)].map((_, i) => ({
      id: i,
      left: 15 + (i % 3) * 30,
      top: 20 + Math.floor(i / 3) * 40,
      delay: i * 0.2,
      duration: 1.8,
    })), []
  );
  
  if (!show) return null;
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {sparkles.map((s) => (
        <div
          key={s.id}
          className="absolute w-1 h-1 bg-white rounded-full animate-sparkle"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Floating hearts for encouragement (low scores) - reduced for TV
 */
function FloatingHearts({ show }: { show: boolean }) {
  const hearts = useMemo(() => 
    [...Array(3)].map((_, i) => ({
      id: i,
      left: 25 + i * 25,
      delay: i * 0.5,
    })), []
  );
  
  if (!show) return null;
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {hearts.map((h) => (
        <div
          key={h.id}
          className="absolute text-xl animate-float-up"
          style={{
            left: `${h.left}%`,
            bottom: '-30px',
            animationDelay: `${h.delay}s`,
            animationDuration: '4.5s',
          }}
        >
          💪
        </div>
      ))}
    </div>
  );
}

/**
 * Shooting stars effect for high scores - reduced for TV
 */
function ShootingStars({ show }: { show: boolean }) {
  const stars = useMemo(() => 
    [...Array(3)].map((_, i) => ({
      id: i,
      top: 15 + i * 25,
      delay: i * 1,
    })), []
  );
  
  if (!show) return null;
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {stars.map((s) => (
        <div
          key={s.id}
          className="absolute left-0 animate-shooting-star"
          style={{
            top: `${s.top}%`,
            animationDelay: `${s.delay}s`,
          }}
        >
          <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-white to-yellow-300 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/**
 * Pulse rings around score
 */
function PulseRings({ show, color = 'yellow' }: { show: boolean; color?: string }) {
  const rings = useMemo(() => [0, 0.5, 1], []);
  
  if (!show) return null;
  
  const colorClass = {
    yellow: 'border-yellow-400/50',
    green: 'border-emerald-400/50',
    blue: 'border-cyan-400/50',
    rose: 'border-rose-400/50',
  }[color] || 'border-yellow-400/50';
  
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {rings.map((delay, i) => (
        <div
          key={i}
          className={`absolute w-32 h-32 rounded-full border-4 ${colorClass} animate-pulse-ring`}
          style={{ animationDelay: `${delay}s` }}
        />
      ))}
    </div>
  );
}

/**
 * Floating bubbles effect - reduced for TV
 */
function FloatingBubbles({ show }: { show: boolean }) {
  const bubbles = useMemo(() => 
    [...Array(5)].map((_, i) => ({
      id: i,
      left: 10 + i * 18,
      size: 10 + (i % 3) * 5,
      delay: i * 0.5,
      duration: 3.5 + (i % 2),
    })), []
  );
  
  if (!show) return null;
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {bubbles.map((b) => (
        <div
          key={b.id}
          className="absolute rounded-full bg-gradient-to-br from-white/20 to-white/5 animate-float-bubble"
          style={{
            left: `${b.left}%`,
            bottom: '-50px',
            width: `${b.size}px`,
            height: `${b.size}px`,
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Spiral particles effect - reduced for TV
 */
function SpiralParticles({ show }: { show: boolean }) {
  const particles = useMemo(() => 
    [...Array(6)].map((_, i) => ({
      id: i,
      delay: i * 0.3,
      color: ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff'][i % 4],
    })), []
  );
  
  if (!show) return null;
  
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute w-2 h-2 rounded-full animate-spiral"
          style={{
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            transform: `rotate(${p.id * 60}deg)`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Twinkling stars background - reduced for TV
 */
function TwinklingStars({ show }: { show: boolean }) {
  const stars = useMemo(() => 
    [...Array(6)].map((_, i) => ({
      id: i,
      left: 15 + (i * 14),
      top: 15 + ((i * 25) % 70),
      size: 2 + (i % 2),
      delay: i * 0.3,
    })), []
  );
  
  if (!show) return null;
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {stars.map((s) => (
        <div
          key={s.id}
          className="absolute rounded-full bg-white animate-twinkle"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Rotating glow ring effect - simplified for TV
 */
function RotatingGlow({ show, color = 'yellow' }: { show: boolean; color?: string }) {
  if (!show) return null;
  
  const gradientColors = {
    yellow: 'from-yellow-400 via-orange-500 to-yellow-400',
    green: 'from-emerald-400 via-teal-500 to-emerald-400',
    blue: 'from-cyan-400 via-blue-500 to-cyan-400',
    rose: 'from-rose-400 via-pink-500 to-rose-400',
  }[color] || 'from-yellow-400 via-orange-500 to-yellow-400';
  
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className={`w-[400px] h-[400px] rounded-full bg-gradient-to-r ${gradientColors} opacity-15 blur-3xl`} />
    </div>
  );
}

/**
 * Emoji rain effect - reduced for TV
 */
function EmojiRain({ show, emojis = ['🎉', '🎊', '✨'] }: { show: boolean; emojis?: string[] }) {
  const items = useMemo(() => 
    [...Array(6)].map((_, i) => ({
      id: i,
      left: i * 16,
      delay: i * 0.4,
      duration: 3.5 + (i % 2),
      emoji: emojis[i % emojis.length],
      size: 18 + (i % 2) * 6,
    })), [emojis]
  );
  
  if (!show) return null;
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {items.map((item) => (
        <div
          key={item.id}
          className="absolute animate-confetti"
          style={{
            left: `${item.left}%`,
            top: '-30px',
            fontSize: `${item.size}px`,
            animationDelay: `${item.delay}s`,
            animationDuration: `${item.duration}s`,
          }}
        >
          {item.emoji}
        </div>
      ))}
    </div>
  );
}

/**
 * Wave text effect for title
 */
function WaveText({ text, show }: { text: string; show: boolean }) {
  if (!show) return <span>{text}</span>;
  
  return (
    <span className="inline-flex">
      {text.split('').map((char, i) => (
        <span
          key={i}
          className="animate-wave inline-block"
          style={{ animationDelay: `${i * 0.05}s` }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </span>
  );
}

function TVAppContent() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [completedSongs, setCompletedSongs] = useState<CompletedSongRecord[]>([]);
  const sessionStartTime = useRef<Date>(new Date());
  // Store result data locally so it persists
  const [resultData, setResultData] = useState<{ song: QueueItem; finalScore: ScoreData | null } | null>(null);
  // Back button protection - require double press
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const backPressTimeRef = useRef<number>(0);
  // Preview mode for testing result screen
  const [previewScore, setPreviewScore] = useState<number | null>(null);
  // Hidden button click counter - need 6 clicks without moving mouse
  const hiddenClickRef = useRef<{ count: number; lastTime: number; lastX: number; lastY: number }>({ count: 0, lastTime: 0, lastX: 0, lastY: 0 });
  // External pause control from mobile
  const [externalPause, setExternalPause] = useState(false);
  
  const { addToast } = useToast();
  
  const songLibrary = useMemo<SongLibrary>(() => {
    // Always create songLibrary - will use API proxy if no YouTube API key
    return createSongLibrary(YOUTUBE_API_KEY || undefined);
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
  
  // Track all scores for averaging (filter out 0s which are mic errors)
  // Only store when score changes to avoid spam of same value
  const scoreHistoryRef = useRef<number[]>([]);
  const lastScoreRef = useRef<number>(0);
  
  // Update score history when mobileScore changes (only if different from last)
  useEffect(() => {
    if (mobileScore && mobileScore.totalScore > 0) {
      // Only add if different from last score
      if (mobileScore.totalScore !== lastScoreRef.current) {
        scoreHistoryRef.current.push(mobileScore.totalScore);
        lastScoreRef.current = mobileScore.totalScore;
      }
    }
  }, [mobileScore]);
  
  // Reset score history when song changes
  useEffect(() => {
    if (currentSong) {
      scoreHistoryRef.current = [];
      lastScoreRef.current = 0;
    }
  }, [currentSong?.id]);

  // Back button protection - prevent accidental browser navigation
  useEffect(() => {
    // Push a dummy state to prevent immediate back navigation
    window.history.pushState({ karaoke: true }, '', window.location.href);
    
    const handlePopState = (e: PopStateEvent) => {
      const now = Date.now();
      const timeSinceLastPress = now - backPressTimeRef.current;
      
      // Always push state back to prevent navigation
      window.history.pushState({ karaoke: true }, '', window.location.href);
      
      if (currentScreen === 'home') {
        if (timeSinceLastPress < 2000 && backPressTimeRef.current > 0) {
          // Second press within 2s - actually allow exit
          setShowBackConfirm(false);
          window.history.go(-2); // Go back past our dummy state
          return;
        } else {
          // First press - show warning
          backPressTimeRef.current = now;
          setShowBackConfirm(true);
          addToast({ type: 'warning', message: 'Nhấn Back lần nữa để thoát', duration: 2000 });
          setTimeout(() => setShowBackConfirm(false), 2000);
        }
      } else if (currentScreen !== 'playing' && currentScreen !== 'result') {
        // Navigate to home instead of browser back
        setCurrentScreen('home');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Backspace, Escape, GoBack, BrowserBack (common back keys on TV remotes)
      if (e.key === 'Backspace' || e.key === 'Escape' || e.key === 'GoBack' || e.key === 'BrowserBack' || e.keyCode === 461 || e.keyCode === 10009) {
        e.preventDefault();
        e.stopPropagation();
        
        const now = Date.now();
        const timeSinceLastPress = now - backPressTimeRef.current;
        
        if (currentScreen === 'home') {
          if (timeSinceLastPress < 2000 && backPressTimeRef.current > 0) {
            // Second press - allow exit
            setShowBackConfirm(false);
            window.history.go(-2);
            return;
          } else {
            // First press - show warning
            backPressTimeRef.current = now;
            setShowBackConfirm(true);
            addToast({ type: 'warning', message: 'Nhấn Back lần nữa để thoát', duration: 2000 });
            setTimeout(() => setShowBackConfirm(false), 2000);
          }
        } else if (currentScreen !== 'playing' && currentScreen !== 'result') {
          setCurrentScreen('home');
        }
      }
    };

    // Prevent accidental page close
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (currentScreen === 'playing' || queueItems.length > 0) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentScreen, addToast, queueItems.length]);

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
          addToast({ type: 'info', message: `Đang phát: ${next.song.title}`, duration: 3000 });
          // Additional delay for state to propagate
          setTimeout(() => setCurrentScreen('playing'), 50);
        }
      }, 300);
    }
    
    prevQueueLengthRef.current = currentTotal;
  }, [queueItems, queueStore, notifySongStarted, addToast, currentScreen]);

  const navigateTo = useCallback((screen: Screen) => setCurrentScreen(screen), []);
  const goBack = useCallback(() => setCurrentScreen('home'), []);

  const handleSongSelect = useCallback((song: Song) => {
    queueStore.add(song, 'TV User');
  }, [queueStore]);

  // TV Priority: Play song immediately (skip queue)
  const handlePlayNow = useCallback((song: Song) => {
    // Add to queue and immediately start playing
    const queueItem = queueStore.add(song, 'TV User');
    if (queueItem) {
      queueStore.setItemStatus(queueItem.id, 'playing');
      notifySongStarted(queueItem);
      setExternalPause(false);
      addToast({ type: 'info', message: `Đang phát: ${song.title}`, duration: 3000 });
      // Small delay to ensure state is updated before screen change
      setTimeout(() => setCurrentScreen('playing'), 50);
    }
  }, [queueStore, notifySongStarted, addToast]);

  const handleSearch = useCallback(async (query: string, continuation?: string | null): Promise<{ songs: Song[], continuation?: string | null }> => {
    if (!continuation) {
      setRecentSearches(prev => [query, ...prev.filter(s => s !== query)].slice(0, 10));
    }
    
    try {
      const result = await songLibrary.search(query, continuation || undefined);
      return { 
        songs: result.songs, 
        continuation: result.nextPageToken || null 
      };
    } catch (err) {
      console.error('[TV] Search error:', err);
      return { songs: [], continuation: null };
    }
  }, [songLibrary]);

  const handleSongEnd = useCallback((score?: ScoreData, videoProgress?: number) => {
    const current = queueStore.getCurrent();
    
    // Calculate average score from history (excluding 0s which are mic errors)
    const validScores = scoreHistoryRef.current.filter(s => s > 0);
    let averageScore: number | undefined;
    
    if (validScores.length > 0) {
      averageScore = Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length);
      console.log(`[TV] Score history: [${validScores.join(', ')}], average: ${averageScore}`);
    }
    
    // Use average score if available, otherwise fall back to last score
    let finalScore = score || (averageScore !== undefined ? { 
      ...mobileScoreRef.current!, 
      totalScore: averageScore 
    } : mobileScoreRef.current) || undefined;
    
    // Apply duration multiplier based on video progress
    // < 10% watched: 20% score (severe penalty)
    // 10-30% watched: 50% score
    // 30-55% watched: 100% score
    // > 55% watched: 110% score (bonus)
    if (finalScore && videoProgress !== undefined) {
      const progressPercent = videoProgress * 100;
      let multiplier = 1.0;
      
      if (progressPercent < 10) {
        multiplier = 0.2;
        console.log(`[TV] Duration severe penalty: ${progressPercent.toFixed(1)}% watched, 0.2x multiplier`);
      } else if (progressPercent < 30) {
        multiplier = 0.5;
        console.log(`[TV] Duration penalty: ${progressPercent.toFixed(1)}% watched, 0.5x multiplier`);
      } else if (progressPercent > 55) {
        multiplier = 1.1;
        console.log(`[TV] Duration bonus: ${progressPercent.toFixed(1)}% watched, 1.1x multiplier`);
      }
      
      if (multiplier !== 1.0) {
        finalScore = {
          ...finalScore,
          totalScore: Math.min(100, Math.round(finalScore.totalScore * multiplier)),
        };
        console.log(`[TV] Final score after multiplier: ${finalScore.totalScore}`);
      }
    }
    
    if (current) {
      queueStore.setItemStatus(current.id, 'completed');
      notifySongEnded(current.id, finalScore);
      setCompletedSongs(prev => [...prev, {
        queueItem: current,
        score: finalScore || null,
        completedAt: new Date(),
      }]);
    }
    
    // Reset score history for next song
    scoreHistoryRef.current = [];
    lastScoreRef.current = 0;
  }, [queueStore, notifySongEnded]);

  // handleSkip is called from mobile command - we don't know exact progress
  // So we pass undefined to skip the duration multiplier
  const handleSkip = useCallback(() => handleSongEnd(undefined, undefined), [handleSongEnd]);

  const handleStartPlaying = useCallback(() => {
    const next = queueStore.getNext();
    if (!next) {
      addToast({ type: 'warning', message: 'Chưa có bài hát trong hàng đợi', duration: 2000 });
      return;
    }
    queueStore.setItemStatus(next.id, 'playing');
    notifySongStarted(next);
    setExternalPause(false); // Reset pause state when starting new song
    
    setTimeout(() => setCurrentScreen('playing'), 100);
  }, [queueStore, notifySongStarted, addToast]);

  // Handle playback commands from mobile - must be after handleStartPlaying and handleSkip are defined
  useEffect(() => {
    onPlaybackCommand((command) => {
      if (command === 'play') {
        setExternalPause(false);
        handleStartPlaying();
      } else if (command === 'pause') {
        setExternalPause(true);
      } else if (command === 'skip') {
        handleSkip();
      }
    });
  }, [onPlaybackCommand, handleStartPlaying, handleSkip]);

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
      // Only set if not already showing this song's result
      setResultData(prev => {
        if (prev?.song.id === finishedSong.song.id) {
          return prev; // Don't update if same song
        }
        return { song: finishedSong.song, finalScore: finishedSong.finalScore };
      });
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
      // Small delay to ensure state is updated
      setTimeout(() => setCurrentScreen('playing'), 50);
    } else {
      setCurrentScreen('home');
    }
  }, [clearFinishedSong, queueStore, notifySongStarted]);

  const sessionCode = session?.code || '----';

  // Mock song for preview
  const previewSong: QueueItem = useMemo(() => ({
    id: 'preview-1',
    song: {
      youtubeId: 'dQw4w9WgXcQ',
      title: 'Bài hát demo để xem thử hiệu ứng điểm số - Karaoke Version',
      thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      channelName: 'Demo Channel',
      duration: 213,
    },
    addedBy: 'Preview',
    addedAt: new Date(),
    status: 'completed',
  }), []);

  // Handle preview score change with keyboard
  useEffect(() => {
    if (previewScore === null) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setPreviewScore(prev => Math.min((prev || 0) + 10, 100));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setPreviewScore(prev => Math.max((prev || 0) - 10, 0));
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setPreviewScore(null);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewScore]);

  const renderScreen = () => {
    // Preview mode - show result screen with adjustable score
    if (previewScore !== null) {
      return (
        <div className="relative">
          <TVSongResultScreen
            song={previewSong}
            finalScore={{
              totalScore: previewScore,
              pitchAccuracy: Math.round(previewScore * 0.9 + Math.random() * 10),
              timing: Math.round(previewScore * 0.95 + Math.random() * 5),
            }}
            onNext={() => setPreviewScore(null)}
            hasNextSong={false}
            onSearch={() => { setPreviewScore(null); navigateTo('search'); }}
            onHome={() => { setPreviewScore(null); navigateTo('home'); }}
          />
          {/* Preview controls overlay */}
          <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-sm rounded-xl p-4 z-50">
            <p className="text-yellow-400 text-sm font-bold mb-2">🔧 CHẾ ĐỘ XEM THỬ</p>
            <p className="text-white text-lg font-bold mb-1">Điểm: {previewScore}</p>
            <p className="text-gray-400 text-xs">↑↓ thay đổi điểm</p>
            <p className="text-gray-400 text-xs">ESC để thoát</p>
            <div className="flex gap-2 mt-3 flex-wrap">
              {[95, 85, 75, 65, 45, 25].map(score => (
                <button
                  key={score}
                  onClick={() => setPreviewScore(score)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                    previewScore === score 
                      ? 'bg-primary-500 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {score}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

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
            onPlaySongNow={handlePlayNow}
            onGetSuggestions={songLibrary ? (videoIds, maxResults = 12) => songLibrary.getSuggestions(videoIds, maxResults) : undefined}
            onAddToQueue={handleSongSelect}
            lastPlayedVideoId={completedSongs.length > 0 ? completedSongs[completedSongs.length - 1].queueItem.song.youtubeId : undefined}
          />
        );

      case 'search':
        return (
          <SearchScreen
            onSongSelect={handleSongSelect}
            onPlayNow={handlePlayNow}
            onBack={goBack}
            onSearch={handleSearch}
            recentSearches={recentSearches}
            onGetSuggestions={songLibrary ? (videoIds, maxResults = 12) => songLibrary.getSuggestions(videoIds, maxResults) : undefined}
            lastPlayedVideoId={completedSongs.length > 0 ? completedSongs[completedSongs.length - 1].queueItem.song.youtubeId : undefined}
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
            onError={handleYouTubeError}
            externalPause={externalPause}
            onPlayStateChange={(playing) => setExternalPause(!playing)}
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
            key={resultData.song.id}
            song={resultData.song}
            finalScore={resultData.finalScore}
            onNext={handleNextFromResult}
            hasNextSong={queueStore.getNext() !== null}
            onGetSuggestions={songLibrary ? (videoIds, maxResults = 6) => songLibrary.getSuggestions(videoIds, maxResults) : undefined}
            onAddToQueue={handleSongSelect}
            onPlayNow={(song) => { clearFinishedSong(); setResultData(null); handlePlayNow(song); }}
            onSearch={() => { clearFinishedSong(); setResultData(null); navigateTo('search'); }}
            onHome={() => { clearFinishedSong(); setResultData(null); navigateTo('home'); }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen bg-tv-bg relative">
      <NetworkStatus
        isConnected={isConnected}
        isReconnecting={isReconnecting}
        error={socketError}
        onRetry={createSession}
      />
      <ScreenTransition transitionKey={previewScore !== null ? `preview-${previewScore}` : currentScreen} type="fade" duration={200}>
        {renderScreen()}
      </ScreenTransition>
      
      {/* Hidden link to preview result screen - click 6 times rapidly without moving mouse */}
      {currentScreen === 'home' && previewScore === null && (
        <div
          onClick={(e) => {
            const now = Date.now();
            const ref = hiddenClickRef.current;
            const timeDiff = now - ref.lastTime;
            const posDiff = Math.abs(e.clientX - ref.lastX) + Math.abs(e.clientY - ref.lastY);
            
            // Reset if too slow (>500ms) or mouse moved (>5px)
            if (timeDiff > 500 || posDiff > 5) {
              ref.count = 1;
            } else {
              ref.count++;
            }
            
            ref.lastTime = now;
            ref.lastX = e.clientX;
            ref.lastY = e.clientY;
            
            // Need 6 rapid clicks without moving
            if (ref.count >= 6) {
              ref.count = 0;
              setPreviewScore(85);
            }
          }}
          className="fixed bottom-0 left-0 w-16 h-16 z-[9999] cursor-default"
          style={{ pointerEvents: 'auto' }}
        />
      )}
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
