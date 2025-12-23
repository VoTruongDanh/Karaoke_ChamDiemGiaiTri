'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { NavigationGrid } from '@/components/NavigationGrid';
import { FocusableButton } from '@/components/FocusableButton';
import { LazyImage } from '@/components/LazyImage';
import type { QueueItem } from '@/types/queue';
import type { ScoreData } from '@/types/score';
import type { Song } from '@/types/song';

interface GradeInfo {
  grade: string;
  title: string;
  emoji: string;
  gradient: string;
  bgGradient: string;
  textColor: string;
  glowColor: string;
  particles: string[];
  quotes: string[];
}

function getScoreGrade(score: number): GradeInfo {
  if (score >= 90) return {
    grade: 'S', title: 'XUAT SAC!', emoji: '👑',
    gradient: 'from-yellow-400 via-amber-500 to-orange-500',
    bgGradient: 'from-yellow-100 via-amber-50 to-orange-100 dark:from-yellow-900/30 dark:via-amber-900/20 dark:to-orange-900/30',
    textColor: 'text-amber-600 dark:text-yellow-400', glowColor: 'rgba(234,179,8,0.8)',
    particles: ['⭐', '✨', '🌟', '💫', '👑', '🏆'],
    quotes: [
      'Giong ca vang day roi! 🎤✨',
      'Qua dinh! Di thi The Voice duoc roi! 🌟',
      'Sieu sao am nhac la day! 👑',
      'Huyen thoai! Mic chay luon! 🔥',
      'Perfect! Khong con gi de che! 💯',
    ]
  };
  if (score >= 80) return {
    grade: 'A', title: 'TUYET VOI!', emoji: '🌟',
    gradient: 'from-emerald-400 via-green-500 to-teal-500',
    bgGradient: 'from-emerald-100 via-green-50 to-teal-100 dark:from-emerald-900/30 dark:via-green-900/20 dark:to-teal-900/30',
    textColor: 'text-emerald-700 dark:text-emerald-400', glowColor: 'rgba(16,185,129,0.8)',
    particles: ['🎉', '✨', '🎊', '💚'],
    quotes: [
      'Hay qua troi! Hat nua di! 🎶',
      'Giong ngot nhu mia lui! 🍬',
      'Tuyệt vời! Cả xóm phải nghe! 📢',
      'Pro singer đây rồi! 🎤',
      'Quá mượt! Nghe phê quá! 😍',
    ]
  };
  if (score >= 70) return {
    grade: 'B', title: 'RẤT TỐT!', emoji: '✨',
    gradient: 'from-cyan-400 via-sky-500 to-blue-500',
    bgGradient: 'from-cyan-100 via-sky-50 to-blue-100 dark:from-cyan-900/30 dark:via-sky-900/20 dark:to-blue-900/30',
    textColor: 'text-sky-700 dark:text-cyan-400', glowColor: 'rgba(6,182,212,0.8)',
    particles: ['💎', '✨', '💙'],
    quotes: [
      'Ngon lành! Tiếp tục phát huy! 💪',
      'Hát hay đấy! Thêm bài nữa nào! 🎵',
      'Ổn áp! Cứ thế mà tiến! 🚀',
      'Được lắm! Có tiềm năng đó! ⭐',
      'Nice! Hát thêm vài bài nữa! 🎤',
    ]
  };
  if (score >= 60) return {
    grade: 'C', title: 'KHÁ TỐT', emoji: '👍',
    gradient: 'from-blue-400 via-indigo-500 to-violet-500',
    bgGradient: 'from-blue-100 via-indigo-50 to-violet-100 dark:from-blue-900/30 dark:via-indigo-900/20 dark:to-violet-900/30',
    textColor: 'text-indigo-700 dark:text-blue-400', glowColor: 'rgba(59,130,246,0.8)',
    particles: ['💜', '✨'],
    quotes: [
      'Tạm ổn! Luyện thêm tí nữa! 📚',
      'Được rồi! Cố thêm chút nữa! 💪',
      'OK đó! Bài sau sẽ hay hơn! 🎯',
      'Cũng được! Đừng bỏ cuộc! 🌈',
      'Không tệ! Tiếp tục cố gắng! 🎵',
    ]
  };
  if (score >= 50) return {
    grade: 'D', title: 'CỐ GẮNG THÊM', emoji: '💪',
    gradient: 'from-orange-400 via-amber-500 to-yellow-500',
    bgGradient: 'from-orange-100 via-amber-50 to-yellow-100 dark:from-orange-900/30 dark:via-amber-900/20 dark:to-yellow-900/30',
    textColor: 'text-orange-700 dark:text-orange-400', glowColor: 'rgba(249,115,22,0.8)',
    particles: ['🔥', '💪'],
    quotes: [
      'Cố lên! Ai cũng từng như vậy! 💪',
      'Đừng nản! Hát nhiều sẽ hay! 🎤',
      'Thử bài khác xem sao! 🎵',
      'Luyện tập sẽ tiến bộ thôi! 📈',
      'Chill thôi! Vui là chính! 😄',
    ]
  };
  return {
    grade: 'F', title: 'THỬ LẠI NHÉ', emoji: '🎤',
    gradient: 'from-rose-400 via-red-500 to-pink-500',
    bgGradient: 'from-rose-100 via-red-50 to-pink-100 dark:from-rose-900/30 dark:via-red-900/20 dark:to-pink-900/30',
    textColor: 'text-rose-700 dark:text-rose-400', glowColor: 'rgba(225,29,72,0.8)',
    particles: ['❤️', '🎤'],
    quotes: [
      'Không sao! Vui là được! 😊',
      'Thử bài dễ hơn nha! 🎵',
      'Hát karaoke mà, chill thôi! 🍻',
      'Lần sau sẽ tốt hơn! 🌟',
      'Đừng lo! Ai cũng có lúc vậy! 💕',
    ]
  };
}

// Get random quote from grade
function getRandomQuote(grade: GradeInfo): string {
  return grade.quotes[Math.floor(Math.random() * grade.quotes.length)];
}


function AnimatedScore({ target, duration = 2500, onComplete }: { target: number; duration?: number; onComplete?: () => void }) {
  const [current, setCurrent] = useState(0);
  const [done, setDone] = useState(false);
  const frameRef = useRef<number | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const lastTick = useRef(0);

  useEffect(() => {
    const start = Date.now();
    try { audioRef.current = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch {}

    const tick = (p: number) => {
      if (!audioRef.current) return;
      try {
        const ctx = audioRef.current;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = 600 + p * 400;
        g.gain.setValueAtTime(0.075, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
        o.connect(g); g.connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + 0.03);
      } catch {}
    };

    const final = () => {
      if (!audioRef.current) return;
      try {
        const ctx = audioRef.current;
        [523, 659, 784, 1047].forEach((f, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'sine'; o.frequency.value = f;
          g.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.08);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.4);
          o.connect(g); g.connect(ctx.destination);
          o.start(ctx.currentTime + i * 0.08);
          o.stop(ctx.currentTime + i * 0.08 + 0.4);
        });
      } catch {}
    };

    const anim = () => {
      const elapsed = Date.now() - start;
      const prog = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - prog, 3);
      const val = Math.round(target * eased);
      if (val - lastTick.current >= 2) { lastTick.current = val; tick(val / target); }
      setCurrent(val);
      if (prog < 1) frameRef.current = requestAnimationFrame(anim);
      else { setDone(true); final(); onComplete?.(); }
    };

    const t = setTimeout(() => { frameRef.current = requestAnimationFrame(anim); }, 400);
    return () => { clearTimeout(t); if (frameRef.current) cancelAnimationFrame(frameRef.current); audioRef.current?.close().catch(() => {}); };
  }, [target, duration, onComplete]);

  return <span className={done ? '' : 'animate-pulse'}>{current}</span>;
}

// Animated crown for high scores
function AnimatedCrown({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-4xl animate-crown-drop z-20">
      👑
    </div>
  );
}

function ParticleField({ particles, count }: { particles: string[]; count: number }) {
  const items = useMemo(() => [...Array(count)].map((_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100,
    size: 16 + Math.random() * 16, dur: 4 + Math.random() * 4, delay: Math.random() * 3,
    emoji: particles[i % particles.length],
  })), [particles, count]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {items.map(p => (
        <div key={p.id} className="absolute animate-float-particle opacity-70"
          style={{ left: `${p.x}%`, top: `${p.y}%`, fontSize: `${p.size}px`, animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s` }}>
          {p.emoji}
        </div>
      ))}
    </div>
  );
}

// Rising bubbles from bottom
function RisingBubbles({ color, count }: { color: string; count: number }) {
  const bubbles = useMemo(() => [...Array(count)].map((_, i) => ({
    id: i, x: 5 + (i * 100 / count), size: 8 + Math.random() * 20, dur: 4 + Math.random() * 4, delay: Math.random() * 3,
  })), [count]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {bubbles.map(b => (
        <div key={b.id} className="absolute bottom-0 rounded-full animate-rise-bubble"
          style={{ left: `${b.x}%`, width: `${b.size}px`, height: `${b.size}px`, backgroundColor: color, opacity: 0.3, animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s` }} />
      ))}
    </div>
  );
}

// Sparkle stars
function SparkleStars({ count }: { count: number }) {
  const stars = useMemo(() => [...Array(count)].map((_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100, size: 2 + Math.random() * 4, dur: 1 + Math.random() * 2, delay: Math.random() * 2,
  })), [count]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map(s => (
        <div key={s.id} className="absolute rounded-full bg-white animate-twinkle"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: `${s.size}px`, height: `${s.size}px`, animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s` }} />
      ))}
    </div>
  );
}

// Shooting stars
function ShootingStars({ count }: { count: number }) {
  const stars = useMemo(() => [...Array(count)].map((_, i) => ({
    id: i, top: 10 + Math.random() * 40, delay: i * 1.5 + Math.random(),
  })), [count]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map(s => (
        <div key={s.id} className="absolute left-0 animate-shooting-star" style={{ top: `${s.top}%`, animationDelay: `${s.delay}s` }}>
          <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-white to-yellow-200 rounded-full" />
        </div>
      ))}
    </div>
  );
}

// Floating music notes
function FloatingNotes({ count }: { count: number }) {
  const notes = useMemo(() => [...Array(count)].map((_, i) => ({
    id: i, x: Math.random() * 100, y: 60 + Math.random() * 30, dur: 3 + Math.random() * 3, delay: Math.random() * 2,
    note: ['🎵', '🎶', '♪', '♫'][i % 4],
  })), [count]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {notes.map(n => (
        <div key={n.id} className="absolute text-2xl animate-float-up opacity-50"
          style={{ left: `${n.x}%`, top: `${n.y}%`, animationDuration: `${n.dur}s`, animationDelay: `${n.delay}s` }}>
          {n.note}
        </div>
      ))}
    </div>
  );
}

function GlowOrbs({ color, count }: { color: string; count: number }) {
  const orbs = useMemo(() => [...Array(count)].map((_, i) => ({
    id: i, x: 15 + i * 25, y: 25 + (i % 2) * 50, size: 150 + i * 80, delay: i * 0.5,
  })), [count]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {orbs.map(o => (
        <div key={o.id} className="absolute rounded-full blur-[80px] animate-pulse-slow"
          style={{ left: `${o.x}%`, top: `${o.y}%`, width: `${o.size}px`, height: `${o.size}px`, backgroundColor: color, transform: 'translate(-50%, -50%)', animationDelay: `${o.delay}s` }} />
      ))}
    </div>
  );
}

function StatBar({ label, value, icon, color, delay }: { label: string; value: number; icon: string; color: string; delay: number }) {
  const [show, setShow] = useState(false);
  const [w, setW] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setShow(true), delay);
    const t2 = setTimeout(() => setW(value), delay + 200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [delay, value]);

  return (
    <div className={`transition-all duration-500 ${show ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
          <span className="text-base">{icon}</span>{label}
        </span>
        <span className="text-xl font-bold text-slate-800 dark:text-white">{value}</span>
      </div>
      <div className="h-3 bg-slate-200/60 dark:bg-slate-700/60 rounded-full overflow-hidden backdrop-blur-sm">
        <div className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${w}%`, background: `linear-gradient(90deg, ${color}, ${color}dd)`, boxShadow: `0 0 12px ${color}80` }} />
      </div>
    </div>
  );
}


interface Props {
  song: QueueItem;
  finalScore: ScoreData | null;
  onNext: () => void;
  hasNextSong: boolean;
  onGetSuggestions?: (videoIds: string[], maxResults?: number) => Promise<Song[]>;
  onAddToQueue?: (song: Song) => void;
}

export function TVSongResultScreen({ song, finalScore, onNext, hasNextSong, onGetSuggestions, onAddToQueue }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [show, setShow] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const confettiDone = useRef(false);
  
  // Suggestions state
  const [suggestions, setSuggestions] = useState<Song[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [showSuggestions, setShowSuggestions] = useState(false); // Only show when pressing down

  const grade = finalScore ? getScoreGrade(finalScore.totalScore) : null;
  const quote = useMemo(() => grade ? getRandomQuote(grade) : '', [grade]);
  const isHigh = finalScore ? finalScore.totalScore >= 80 : false;
  const isMed = finalScore ? finalScore.totalScore >= 60 && finalScore.totalScore < 80 : false;
  
  // Load suggestions based on current song
  useEffect(() => {
    if (!onGetSuggestions) return;
    
    setIsLoadingSuggestions(true);
    onGetSuggestions([song.song.youtubeId], 6)
      .then(results => {
        setSuggestions(results.filter(s => s.youtubeId !== song.song.youtubeId));
      })
      .catch(() => setSuggestions([]))
      .finally(() => setIsLoadingSuggestions(false));
  }, [song.song.youtubeId, onGetSuggestions]);
  
  const handleAddSuggestion = useCallback((s: Song) => {
    if (!onAddToQueue) return;
    onAddToQueue(s);
    setAddedIds(prev => new Set(prev).add(s.youtubeId));
  }, [onAddToQueue]);

  const fireConfetti = useCallback(() => {
    if (!canvasRef.current || confettiDone.current) return;
    confettiDone.current = true;
    const c = confetti.create(canvasRef.current, { resize: true, useWorker: true });

    if (isHigh) {
      // Continuous side confetti
      const end = Date.now() + 5000;
      const frame = () => {
        c({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.6 }, colors: ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6bd6'] });
        c({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.6 }, colors: ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6bd6'] });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();

      // Multiple firework bursts
      setTimeout(() => c({ particleCount: 100, spread: 120, origin: { x: 0.5, y: 0.5 }, startVelocity: 45, colors: ['#ffd700', '#ff6b6b', '#4d96ff'] }), 200);
      setTimeout(() => c({ particleCount: 80, spread: 100, origin: { x: 0.25, y: 0.35 }, startVelocity: 40, colors: ['#6bcb77', '#ffd93d'] }), 800);
      setTimeout(() => c({ particleCount: 80, spread: 100, origin: { x: 0.75, y: 0.35 }, startVelocity: 40, colors: ['#ff6bd6', '#4d96ff'] }), 1200);
      setTimeout(() => c({ particleCount: 60, spread: 80, origin: { x: 0.5, y: 0.7 }, startVelocity: 35 }), 1600);
      setTimeout(() => c({ particleCount: 50, spread: 360, origin: { x: 0.5, y: 0.4 }, shapes: ['star'], colors: ['#ffd700', '#ffec8b'], gravity: 0.5, startVelocity: 30 }), 2000);
      setTimeout(() => c({ particleCount: 70, spread: 100, origin: { x: 0.3, y: 0.5 }, startVelocity: 38 }), 2500);
      setTimeout(() => c({ particleCount: 70, spread: 100, origin: { x: 0.7, y: 0.5 }, startVelocity: 38 }), 3000);
      setTimeout(() => c({ particleCount: 100, spread: 180, origin: { x: 0.5, y: 0.6 }, startVelocity: 50, colors: ['#ffd700', '#ff6b6b', '#6bcb77', '#4d96ff', '#ff6bd6'] }), 3500);
      // Final big burst
      setTimeout(() => c({ particleCount: 150, spread: 360, origin: { x: 0.5, y: 0.5 }, startVelocity: 55, gravity: 0.8, colors: ['#ffd700', '#ff6b6b', '#6bcb77', '#4d96ff', '#ff6bd6', '#a855f7'] }), 4200);
    } else if (isMed) {
      c({ particleCount: 60, spread: 70, origin: { x: 0.5, y: 0.6 }, colors: ['#6bcb77', '#4d96ff', '#ffd93d'] });
      setTimeout(() => c({ particleCount: 40, spread: 60, origin: { x: 0.5, y: 0.5 } }), 500);
      setTimeout(() => c({ particleCount: 50, spread: 80, origin: { x: 0.5, y: 0.55 } }), 1000);
    }
  }, [isHigh, isMed]);

  // Resize canvas to full screen
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      const handleResize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  useEffect(() => { const t = setTimeout(() => setShow(true), 150); return () => clearTimeout(t); }, []);

  const onComplete = useCallback(() => { setRevealed(true); fireConfetti(); }, [fireConfetti]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { 
      if (e.key === 'Enter' || e.key === ' ') { 
        e.preventDefault(); 
        onNext(); 
      }
      // Show suggestions when pressing down
      if (e.key === 'ArrowDown' && suggestions.length > 0 && !showSuggestions) {
        e.preventDefault();
        setShowSuggestions(true);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onNext, suggestions.length, showSuggestions]);

  return (
    <NavigationGrid className={`h-screen w-screen relative overflow-hidden bg-gradient-to-br ${grade?.bgGradient || 'from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800'}`}>
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50 w-full h-full" style={{ width: '100vw', height: '100vh' }} />
      
      {grade && (
        <>
          <GlowOrbs color={grade.glowColor} count={isHigh ? 5 : 3} />
          <ParticleField particles={grade.particles} count={isHigh ? 30 : 15} />
          <RisingBubbles color={grade.glowColor} count={isHigh ? 20 : 10} />
          <SparkleStars count={isHigh ? 30 : 15} />
          <FloatingNotes count={isHigh ? 12 : 6} />
          {isHigh && <ShootingStars count={4} />}
        </>
      )}

      <div className={`relative z-10 h-full flex flex-col p-6 transition-all duration-500 ${show ? 'opacity-100' : 'opacity-0'}`}>
        {/* Main content */}
        <div className="flex items-center gap-8 flex-1">
          
          {/* Thumbnail */}
          <div className="flex-shrink-0 relative">
            {grade && <div className="absolute inset-0 rounded-2xl blur-2xl opacity-40 animate-pulse" style={{ backgroundColor: grade.glowColor, transform: 'scale(1.15)' }} />}
            <div className={`relative p-1.5 rounded-2xl bg-gradient-to-br ${grade?.gradient || 'from-purple-500 to-pink-500'}`}>
              <img src={song.song.thumbnail} alt="" className="w-72 h-40 rounded-xl object-cover relative z-10" />
              {grade && (
                <div className={`absolute -bottom-4 -right-4 w-16 h-16 rounded-full bg-gradient-to-br ${grade.gradient} flex items-center justify-center shadow-2xl border-4 border-white dark:border-slate-900 z-20 ${revealed && isHigh ? 'animate-bounce' : ''}`}>
                  <span className="text-2xl font-black text-white drop-shadow-lg">{grade.grade}</span>
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />Hoàn thành
            </p>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white line-clamp-2 mb-3">{song.song.title}</h2>

            {finalScore && grade ? (
              <>
                <h1 className={`text-xl font-bold mb-3 bg-gradient-to-r ${grade.gradient} bg-clip-text text-transparent flex items-center gap-2`}>
                  <span className={revealed && isHigh ? 'animate-bounce' : ''}>{grade.emoji}</span>
                  <span>{grade.title}</span>
                </h1>

                <div className="relative mb-4">
                  <AnimatedCrown show={revealed && isHigh} />
                  <div className="flex items-baseline gap-2">
                    <span className={`text-6xl font-black ${grade.textColor}`}
                      style={{ textShadow: `-2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff, 2px 2px 0 #fff, 0 0 20px ${grade.glowColor}` }}>
                      <AnimatedScore target={finalScore.totalScore} onComplete={onComplete} />
                    </span>
                    <span className="text-lg text-slate-600 dark:text-slate-300 font-semibold">điểm</span>
                  </div>
                  
                  <div className={`mt-2 transition-all duration-500 ${revealed ? 'opacity-100' : 'opacity-0'}`}>
                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r ${grade.gradient} text-white font-bold shadow-lg text-sm`}>
                      <span>{grade.emoji}</span> Hạng {grade.grade}
                    </span>
                  </div>
                  
                  <div className={`mt-3 transition-all duration-700 delay-500 ${revealed ? 'opacity-100' : 'opacity-0'}`}>
                    <p className="text-base text-slate-600 dark:text-slate-300 italic">"{quote}"</p>
                  </div>
                </div>

                <div className="space-y-2 mb-4 max-w-xs">
                  <StatBar label="Giọng hát" value={finalScore.pitchAccuracy} icon="🎤" color="#10b981" delay={2800} />
                  <StatBar label="Cảm xúc" value={finalScore.timing} icon="💖" color="#ec4899" delay={3200} />
                </div>
              </>
            ) : (
              <div className="mb-4">
                <h1 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Hoàn thành! 🎵</h1>
                <p className="text-slate-500 dark:text-slate-400">Bài hát đã kết thúc</p>
              </div>
            )}

            <FocusableButton
              row={0}
              col={0}
              onSelect={onNext}
              autoFocus
              variant="primary"
              className={`!px-6 !py-3 !text-base ${isHigh ? `!bg-gradient-to-r ${grade?.gradient}` : ''}`}
            >
              {hasNextSong ? 'Bài tiếp theo →' : 'Về trang chủ →'}
            </FocusableButton>
          </div>
        </div>
        
        {/* Suggestions section - only show when pressing down */}
        {showSuggestions && suggestions.length > 0 && onAddToQueue && (
          <div className="mt-4 bg-black/20 backdrop-blur rounded-xl p-4 animate-fade-in">
            <p className="text-sm text-gray-300 mb-3">🎵 Hát tiếp bài này</p>
            <div className="flex gap-3 overflow-x-auto hide-scrollbar p-2">
              {suggestions.slice(0, 6).map((s, index) => {
                const isAdded = addedIds.has(s.youtubeId);
                return (
                  <FocusableButton
                    key={s.youtubeId}
                    row={1}
                    col={index}
                    onSelect={() => !isAdded && handleAddSuggestion(s)}
                    variant="ghost"
                    className={`!p-0 !min-h-0 !min-w-0 flex-shrink-0 w-40 text-left !rounded-lg ${isAdded ? 'ring-2 ring-green-500' : ''}`}
                  >
                    <div className="w-full">
                      <div className="relative">
                        <LazyImage 
                          src={s.thumbnail} 
                          alt={s.title}
                          className="w-40 h-24 rounded-lg object-cover"
                          width={160}
                          height={96}
                        />
                        {isAdded ? (
                          <div className="absolute inset-0 bg-green-500/50 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        ) : (
                          <div className="absolute top-1 right-1 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-medium line-clamp-2 mt-1 text-white">{s.title}</p>
                    </div>
                  </FocusableButton>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Hint to show suggestions */}
        {!showSuggestions && suggestions.length > 0 && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-400">
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                Ấn xuống để xem gợi ý
              </span>
            </p>
          </div>
        )}
        
        {isLoadingSuggestions && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-300">Đang tải gợi ý...</span>
          </div>
        )}
      </div>
    </NavigationGrid>
  );
}

export default TVSongResultScreen;
