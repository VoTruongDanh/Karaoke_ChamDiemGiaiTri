'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import type { QueueItem } from '@/types/queue';
import type { ScoreData } from '@/types/score';

interface GradeInfo {
  grade: string;
  title: string;
  emoji: string;
  gradient: string;
  bgGradient: string;
  textColor: string;
  glowColor: string;
  particles: string[];
}

function getScoreGrade(score: number): GradeInfo {
  if (score >= 90) return {
    grade: 'S', title: 'XUẤT SẮC!', emoji: '👑',
    gradient: 'from-yellow-400 via-amber-500 to-orange-500',
    bgGradient: 'from-yellow-100 via-amber-50 to-orange-100 dark:from-yellow-900/30 dark:via-amber-900/20 dark:to-orange-900/30',
    textColor: 'text-yellow-500', glowColor: 'rgba(234,179,8,0.8)',
    particles: ['⭐', '✨', '🌟', '💫', '👑', '🏆']
  };
  if (score >= 80) return {
    grade: 'A', title: 'TUYỆT VỜI!', emoji: '🌟',
    gradient: 'from-emerald-400 via-green-500 to-teal-500',
    bgGradient: 'from-emerald-100 via-green-50 to-teal-100 dark:from-emerald-900/30 dark:via-green-900/20 dark:to-teal-900/30',
    textColor: 'text-emerald-600', glowColor: 'rgba(16,185,129,0.8)',
    particles: ['🎉', '✨', '🎊', '💚']
  };
  if (score >= 70) return {
    grade: 'B', title: 'RẤT TỐT!', emoji: '✨',
    gradient: 'from-cyan-400 via-sky-500 to-blue-500',
    bgGradient: 'from-cyan-100 via-sky-50 to-blue-100 dark:from-cyan-900/30 dark:via-sky-900/20 dark:to-blue-900/30',
    textColor: 'text-cyan-600', glowColor: 'rgba(6,182,212,0.8)',
    particles: ['💎', '✨', '💙']
  };
  if (score >= 60) return {
    grade: 'C', title: 'KHÁ TỐT', emoji: '👍',
    gradient: 'from-blue-400 via-indigo-500 to-violet-500',
    bgGradient: 'from-blue-100 via-indigo-50 to-violet-100 dark:from-blue-900/30 dark:via-indigo-900/20 dark:to-violet-900/30',
    textColor: 'text-blue-600', glowColor: 'rgba(59,130,246,0.8)',
    particles: ['💜', '✨']
  };
  if (score >= 50) return {
    grade: 'D', title: 'CỐ GẮNG THÊM', emoji: '💪',
    gradient: 'from-orange-400 via-amber-500 to-yellow-500',
    bgGradient: 'from-orange-100 via-amber-50 to-yellow-100 dark:from-orange-900/30 dark:via-amber-900/20 dark:to-yellow-900/30',
    textColor: 'text-orange-600', glowColor: 'rgba(249,115,22,0.8)',
    particles: ['🔥', '💪']
  };
  return {
    grade: 'F', title: 'THỬ LẠI NHÉ', emoji: '🎤',
    gradient: 'from-rose-400 via-red-500 to-pink-500',
    bgGradient: 'from-rose-100 via-red-50 to-pink-100 dark:from-rose-900/30 dark:via-red-900/20 dark:to-pink-900/30',
    textColor: 'text-rose-600', glowColor: 'rgba(225,29,72,0.8)',
    particles: ['❤️', '🎤']
  };
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
        g.gain.setValueAtTime(0.05, ctx.currentTime);
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
          g.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.08);
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
}

export function TVSongResultScreen({ song, finalScore, onNext, hasNextSong }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [show, setShow] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const confettiDone = useRef(false);

  const grade = finalScore ? getScoreGrade(finalScore.totalScore) : null;
  const isHigh = finalScore ? finalScore.totalScore >= 80 : false;
  const isMed = finalScore ? finalScore.totalScore >= 60 && finalScore.totalScore < 80 : false;

  const fireConfetti = useCallback(() => {
    if (!canvasRef.current || confettiDone.current) return;
    confettiDone.current = true;
    const c = confetti.create(canvasRef.current, { resize: true, useWorker: true });

    if (isHigh) {
      const end = Date.now() + 3500;
      const frame = () => {
        c({ particleCount: 2, angle: 60, spread: 50, origin: { x: 0, y: 0.7 }, colors: ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff'] });
        c({ particleCount: 2, angle: 120, spread: 50, origin: { x: 1, y: 0.7 }, colors: ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff'] });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
      setTimeout(() => c({ particleCount: 80, spread: 100, origin: { x: 0.5, y: 0.5 }, startVelocity: 40 }), 300);
      setTimeout(() => c({ particleCount: 60, spread: 80, origin: { x: 0.3, y: 0.4 }, startVelocity: 35 }), 1000);
      setTimeout(() => c({ particleCount: 60, spread: 80, origin: { x: 0.7, y: 0.4 }, startVelocity: 35 }), 1600);
      setTimeout(() => c({ particleCount: 40, spread: 360, origin: { x: 0.5, y: 0.35 }, shapes: ['star'], colors: ['#ffd700'], gravity: 0.6 }), 2200);
    } else if (isMed) {
      c({ particleCount: 50, spread: 60, origin: { x: 0.5, y: 0.6 } });
      setTimeout(() => c({ particleCount: 30, spread: 50, origin: { x: 0.5, y: 0.5 } }), 600);
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
    const h = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNext(); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onNext]);

  return (
    <div className={`h-screen w-screen relative overflow-hidden bg-gradient-to-br ${grade?.bgGradient || 'from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800'}`}>
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50 w-full h-full" style={{ width: '100vw', height: '100vh' }} />
      
      {grade && (
        <>
          <GlowOrbs color={grade.glowColor} count={isHigh ? 4 : 2} />
          <ParticleField particles={grade.particles} count={isHigh ? 25 : 12} />
        </>
      )}

      <div className={`relative z-10 h-full flex items-center justify-center p-8 transition-all duration-500 ${show ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center gap-10 max-w-4xl w-full">
          
          {/* Thumbnail */}
          <div className="flex-shrink-0 relative">
            {grade && <div className="absolute inset-0 rounded-2xl blur-2xl opacity-40 animate-pulse" style={{ backgroundColor: grade.glowColor, transform: 'scale(1.15)' }} />}
            <div className={`relative p-1.5 rounded-2xl bg-gradient-to-br ${grade?.gradient || 'from-purple-500 to-pink-500'}`}>
              <img src={song.song.thumbnail} alt="" className="w-80 h-44 rounded-xl object-cover relative z-10" />
              {grade && (
                <div className={`absolute -bottom-4 -right-4 w-[72px] h-[72px] rounded-full bg-gradient-to-br ${grade.gradient} flex items-center justify-center shadow-2xl border-4 border-white dark:border-slate-900 z-20 ${revealed && isHigh ? 'animate-bounce' : ''}`}>
                  <span className="text-3xl font-black text-white drop-shadow-lg">{grade.grade}</span>
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />Hoàn thành
            </p>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white line-clamp-2 mb-4">{song.song.title}</h2>

            {finalScore && grade ? (
              <>
                <h1 className={`text-2xl font-bold mb-4 bg-gradient-to-r ${grade.gradient} bg-clip-text text-transparent flex items-center gap-2`}>
                  <span className={revealed && isHigh ? 'animate-bounce' : ''}>{grade.emoji}</span>
                  {grade.title}
                </h1>

                <div className="flex items-baseline gap-3 mb-6">
                  <span className={`text-8xl font-black ${grade.textColor}`}
                    style={{ textShadow: `-2px -2px 0 rgba(0,0,0,0.4), 2px -2px 0 rgba(0,0,0,0.4), -2px 2px 0 rgba(0,0,0,0.4), 2px 2px 0 rgba(0,0,0,0.4), 0 0 30px ${grade.glowColor}` }}>
                    <AnimatedScore target={finalScore.totalScore} onComplete={onComplete} />
                  </span>
                  <span className="text-2xl text-slate-500 dark:text-slate-400 font-semibold">điểm</span>
                </div>

                <div className="space-y-4 mb-6 max-w-sm">
                  <StatBar label="Cao độ" value={finalScore.pitchAccuracy} icon="🎵" color="#10b981" delay={2600} />
                  <StatBar label="Nhịp điệu" value={finalScore.timing} icon="🥁" color="#3b82f6" delay={3000} />
                </div>
              </>
            ) : (
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Hoàn thành! 🎵</h1>
                <p className="text-slate-500 dark:text-slate-400">Bài hát đã kết thúc</p>
              </div>
            )}

            <button onClick={onNext} autoFocus
              className={`px-8 py-4 rounded-xl text-lg font-bold transition-all focus:outline-none focus:ring-4 focus:scale-105 shadow-xl ${
                isHigh ? `bg-gradient-to-r ${grade?.gradient} text-white hover:shadow-2xl focus:ring-yellow-300` : 'bg-primary-500 hover:bg-primary-600 text-white focus:ring-primary-300'
              }`}>
              {hasNextSong ? 'Bài tiếp theo →' : 'Về trang chủ →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TVSongResultScreen;
