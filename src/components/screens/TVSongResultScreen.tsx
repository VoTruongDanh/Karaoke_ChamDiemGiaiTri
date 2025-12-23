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
    grade: 'S', title: 'XUẤT SẮC!', emoji: '👑',
    gradient: 'from-yellow-300 via-amber-400 to-orange-400',
    bgGradient: 'from-black via-amber-950/50 to-black',
    textColor: 'text-yellow-300', glowColor: '#fbbf24',
    particles: ['⭐', '✨', '🌟', '💫', '👑', '🏆'],
    quotes: ['Giọng ca vàng đây rồi!', 'Quá đỉnh! Đi thi The Voice được rồi!', 'Siêu sao âm nhạc là đây!', 'Huyền thoại! Mic cháy luôn!', 'Perfect! Không còn gì để chê!']
  };
  if (score >= 80) return {
    grade: 'A', title: 'TUYỆT VỜI!', emoji: '🌟',
    gradient: 'from-emerald-300 via-green-400 to-teal-400',
    bgGradient: 'from-black via-emerald-950/50 to-black',
    textColor: 'text-emerald-300', glowColor: '#34d399',
    particles: ['🎉', '✨', '🎊', '💚'],
    quotes: ['Hay quá trời! Hát nữa đi!', 'Giọng ngọt như mía lùi!', 'Tuyệt vời! Cả xóm phải nghe!', 'Pro singer đây rồi!', 'Quá mượt! Nghe phê quá!']
  };
  if (score >= 70) return {
    grade: 'B', title: 'RẤT TỐT!', emoji: '✨',
    gradient: 'from-cyan-300 via-sky-400 to-blue-400',
    bgGradient: 'from-black via-sky-950/50 to-black',
    textColor: 'text-cyan-300', glowColor: '#22d3ee',
    particles: ['💎', '✨', '💙'],
    quotes: ['Ngon lành! Tiếp tục phát huy!', 'Hát hay đấy! Thêm bài nữa nào!', 'Ổn áp! Cứ thế mà tiến!', 'Được lắm! Có tiềm năng đó!', 'Nice! Hát thêm vài bài nữa!']
  };
  if (score >= 60) return {
    grade: 'C', title: 'KHÁ TỐT', emoji: '👍',
    gradient: 'from-blue-300 via-indigo-400 to-violet-400',
    bgGradient: 'from-black via-indigo-950/50 to-black',
    textColor: 'text-blue-300', glowColor: '#60a5fa',
    particles: ['💜', '✨'],
    quotes: ['Tạm ổn! Luyện thêm tí nữa!', 'Được rồi! Cố thêm chút nữa!', 'OK đó! Bài sau sẽ hay hơn!', 'Cũng được! Đừng bỏ cuộc!', 'Không tệ! Tiếp tục cố gắng!']
  };
  if (score >= 50) return {
    grade: 'D', title: 'CỐ GẮNG THÊM', emoji: '💪',
    gradient: 'from-orange-300 via-amber-400 to-yellow-400',
    bgGradient: 'from-black via-orange-950/50 to-black',
    textColor: 'text-orange-300', glowColor: '#fb923c',
    particles: ['🔥', '💪'],
    quotes: ['Cố lên! Ai cũng từng như vậy!', 'Đừng nản! Hát nhiều sẽ hay!', 'Thử bài khác xem sao!', 'Luyện tập sẽ tiến bộ thôi!', 'Chill thôi! Vui là chính!']
  };
  return {
    grade: 'F', title: 'THỬ LẠI NHÉ', emoji: '🎤',
    gradient: 'from-rose-300 via-red-400 to-pink-400',
    bgGradient: 'from-black via-rose-950/50 to-black',
    textColor: 'text-rose-300', glowColor: '#fb7185',
    particles: ['❤️', '🎤'],
    quotes: ['Không sao! Vui là được!', 'Thử bài dễ hơn nha!', 'Hát karaoke mà, chill thôi!', 'Lần sau sẽ tốt hơn!', 'Đừng lo! Ai cũng có lúc vậy!']
  };
}

function getRandomQuote(grade: GradeInfo): string {
  return grade.quotes[Math.floor(Math.random() * grade.quotes.length)];
}


// ============ ANIMATED SCORE - Smooth counting with sound ============
function AnimatedScore({ target, duration = 2000, onComplete }: { target: number; duration?: number; onComplete?: () => void }) {
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
        o.frequency.value = 400 + p * 600;
        g.gain.setValueAtTime(0.06, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.025);
        o.connect(g); g.connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + 0.025);
      } catch {}
    };

    const final = () => {
      if (!audioRef.current) return;
      try {
        const ctx = audioRef.current;
        const notes = [523, 659, 784, 880, 1047];
        notes.forEach((f, i) => {
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
      const eased = 1 - Math.pow(1 - prog, 4); // Quartic ease-out
      const val = Math.round(target * eased);
      if (val - lastTick.current >= 2) { lastTick.current = val; tick(val / target); }
      setCurrent(val);
      if (prog < 1) frameRef.current = requestAnimationFrame(anim);
      else { setDone(true); final(); onComplete?.(); }
    };

    const t = setTimeout(() => { frameRef.current = requestAnimationFrame(anim); }, 600);
    return () => { clearTimeout(t); if (frameRef.current) cancelAnimationFrame(frameRef.current); audioRef.current?.close().catch(() => {}); };
  }, [target, duration, onComplete]);

  return <span className={done ? 'animate-score-pop' : ''}>{current}</span>;
}


// ============ CINEMATIC SPOTLIGHT - Dramatic light effect ============
function CinematicSpotlight({ color }: { color: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Main spotlight from top - brighter */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[900px] opacity-40"
        style={{
          background: `conic-gradient(from 180deg at 50% 0%, transparent 25%, ${color}50 50%, transparent 75%)`,
          animation: 'spotlightSweep 5s ease-in-out infinite',
        }}
      />
      {/* Side spotlights - brighter */}
      <div 
        className="absolute top-0 left-0 w-[500px] h-[700px] opacity-30"
        style={{
          background: `conic-gradient(from 135deg at 0% 0%, transparent 35%, ${color}40 55%, transparent 75%)`,
          animation: 'spotlightSweep 7s ease-in-out infinite reverse',
        }}
      />
      <div 
        className="absolute top-0 right-0 w-[500px] h-[700px] opacity-30"
        style={{
          background: `conic-gradient(from 225deg at 100% 0%, transparent 35%, ${color}40 55%, transparent 75%)`,
          animation: 'spotlightSweep 6s ease-in-out infinite',
        }}
      />
    </div>
  );
}

// ============ AMBIENT GLOW - Soft background orbs ============
function AmbientGlow({ color }: { color: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[150px] opacity-40 animate-pulse-slow"
        style={{ backgroundColor: color }} />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full blur-[120px] opacity-35 animate-pulse-slow"
        style={{ backgroundColor: color, animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[180px] opacity-30"
        style={{ backgroundColor: color }} />
    </div>
  );
}

// ============ SPARKLE FIELD - Twinkling stars ============
function SparkleField({ intensity = 'normal' }: { intensity?: 'low' | 'normal' | 'high' }) {
  const count = intensity === 'high' ? 50 : intensity === 'normal' ? 30 : 20;
  const stars = useMemo(() => [...Array(count)].map((_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100,
    size: 2 + Math.random() * 4, dur: 1 + Math.random() * 2, delay: Math.random() * 3,
  })), [count]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map(s => (
        <div key={s.id} className="absolute rounded-full bg-white animate-twinkle"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: `${s.size}px`, height: `${s.size}px`,
            animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s`, boxShadow: '0 0 8px 2px #fff' }} />
      ))}
    </div>
  );
}

// ============ LASER BEAMS - Epic light beams ============
function LaserBeams({ color }: { color: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="absolute h-1 animate-laser"
          style={{
            background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
            top: `${10 + i * 12}%`,
            left: '-100%',
            width: '200%',
            animationDelay: `${i * 0.25}s`,
            boxShadow: `0 0 30px ${color}, 0 0 60px ${color}`,
            opacity: 0.7,
          }}
        />
      ))}
    </div>
  );
}

// ============ FIREWORK BURSTS - Continuous fireworks ============
function FireworkBursts({ show, color }: { show: boolean; color: string }) {
  const [bursts, setBursts] = useState<Array<{ id: number; x: number; y: number; color: string }>>([]);
  
  useEffect(() => {
    if (!show) return;
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#A855F7', '#F472B6', '#22D3EE'];
    let id = 0;
    
    const addBurst = () => {
      setBursts(prev => {
        const newBurst = { id: id++, x: 15 + Math.random() * 70, y: 10 + Math.random() * 40, color: colors[Math.floor(Math.random() * colors.length)] };
        return [...prev.slice(-6), newBurst];
      });
    };
    
    addBurst();
    setTimeout(addBurst, 200);
    setTimeout(addBurst, 400);
    const interval = setInterval(addBurst, 800);
    return () => clearInterval(interval);
  }, [show]);

  if (!show) return null;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {bursts.map(burst => (
        <div key={burst.id} className="absolute" style={{ left: `${burst.x}%`, top: `${burst.y}%` }}>
          {[...Array(16)].map((_, i) => {
            const angle = (i * 22.5) * (Math.PI / 180);
            return (
              <div key={i} className="absolute w-3 h-3 rounded-full animate-firework-particle"
                style={{ backgroundColor: burst.color, boxShadow: `0 0 10px ${burst.color}`,
                  '--tx': `${Math.cos(angle) * 100}px`, '--ty': `${Math.sin(angle) * 100}px` } as React.CSSProperties} />
            );
          })}
          <div className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 rounded-full animate-firework-center"
            style={{ backgroundColor: burst.color, boxShadow: `0 0 30px ${burst.color}, 0 0 60px ${burst.color}` }} />
        </div>
      ))}
    </div>
  );
}


// ============ GOLDEN RAIN - For S rank only ============
function GoldenRain({ show }: { show: boolean }) {
  const particles = useMemo(() => [...Array(40)].map((_, i) => ({
    id: i, x: Math.random() * 100, delay: Math.random() * 3, dur: 2.5 + Math.random() * 2,
    size: 10 + Math.random() * 15, rotation: Math.random() * 360,
  })), []);

  if (!show) return null;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <div key={p.id} className="absolute animate-glitter-fall"
          style={{ left: `${p.x}%`, top: '-40px', animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s` }}>
          <svg viewBox="0 0 24 24" fill="none" style={{ width: p.size, height: p.size, transform: `rotate(${p.rotation}deg)`, filter: 'drop-shadow(0 0 8px #FFD700)' }}>
            <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" fill="#FFD700" />
          </svg>
        </div>
      ))}
    </div>
  );
}

// ============ FLOATING CROWN - S rank special ============
function FloatingCrown({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="absolute -top-20 left-1/2 -translate-x-1/2 z-20 animate-crown-bounce">
      <div className="relative">
        <span className="text-7xl filter drop-shadow-[0_0_40px_rgba(255,215,0,1)] drop-shadow-[0_0_80px_rgba(255,215,0,0.8)]">👑</span>
        <div className="absolute -top-3 -left-4 text-2xl animate-twinkle">✨</div>
        <div className="absolute -top-3 -right-4 text-2xl animate-twinkle" style={{ animationDelay: '0.3s' }}>✨</div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-8 text-xl animate-twinkle" style={{ animationDelay: '0.6s' }}>⭐</div>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-lg animate-twinkle" style={{ animationDelay: '0.9s' }}>💫</div>
      </div>
    </div>
  );
}

// ============ SCORE BURST - Explosion when score reveals ============
function ScoreBurst({ show, color }: { show: boolean; color: string }) {
  if (!show) return null;
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      {/* Central flash - bigger */}
      <div className="absolute w-48 h-48 rounded-full animate-score-flash"
        style={{ background: `radial-gradient(circle, ${color} 0%, transparent 70%)` }} />
      {/* Expanding rings - more */}
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="absolute w-24 h-24 rounded-full border-4 animate-wave-expand"
          style={{ borderColor: color, animationDelay: `${i * 0.12}s`, opacity: 0.7 }} />
      ))}
    </div>
  );
}

// ============ FLOATING PARTICLES - Emoji particles ============
function FloatingParticles({ particles, count }: { particles: string[]; count: number }) {
  const items = useMemo(() => [...Array(count)].map((_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100,
    size: 20 + Math.random() * 16, dur: 5 + Math.random() * 4, delay: Math.random() * 3,
    emoji: particles[i % particles.length],
  })), [particles, count]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {items.map(p => (
        <div key={p.id} className="absolute animate-float-particle opacity-60"
          style={{ left: `${p.x}%`, top: `${p.y}%`, fontSize: `${p.size}px`,
            animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s` }}>
          {p.emoji}
        </div>
      ))}
    </div>
  );
}


// ============ STAT BAR - Animated progress bar ============
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
      <div className="flex items-center justify-between mb-2">
        <span className="text-base font-semibold text-white flex items-center gap-2">
          <span className="text-xl">{icon}</span>{label}
        </span>
        <span className="text-xl font-black text-white">{value}</span>
      </div>
      <div className="h-3 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
        <div className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${w}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)`,
            boxShadow: `0 0 20px ${color}` }} />
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
  const [phase, setPhase] = useState<'enter' | 'counting' | 'revealed'>('enter');
  const confettiDone = useRef(false);
  
  // Suggestions state
  const [suggestions, setSuggestions] = useState<Song[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [showSuggestions, setShowSuggestions] = useState(false);

  const grade = finalScore ? getScoreGrade(finalScore.totalScore) : null;
  const quote = useMemo(() => grade ? getRandomQuote(grade) : '', [grade]);
  const isHigh = finalScore ? finalScore.totalScore >= 80 : false;
  const isSRank = finalScore ? finalScore.totalScore >= 90 : false;

  
  // Load suggestions
  useEffect(() => {
    if (!onGetSuggestions) return;
    setIsLoadingSuggestions(true);
    onGetSuggestions([song.song.youtubeId], 6)
      .then(results => setSuggestions(results.filter(s => s.youtubeId !== song.song.youtubeId)))
      .catch(() => setSuggestions([]))
      .finally(() => setIsLoadingSuggestions(false));
  }, [song.song.youtubeId, onGetSuggestions]);
  
  const handleAddSuggestion = useCallback((s: Song) => {
    if (!onAddToQueue) return;
    onAddToQueue(s);
    setAddedIds(prev => new Set(prev).add(s.youtubeId));
  }, [onAddToQueue]);

  // Fire confetti celebration
  const fireConfetti = useCallback(() => {
    if (!canvasRef.current || confettiDone.current) return;
    confettiDone.current = true;
    const c = confetti.create(canvasRef.current, { resize: true, useWorker: true });

    if (isHigh) {
      // Epic celebration for high scores
      const end = Date.now() + 4000;
      const frame = () => {
        c({ particleCount: 2, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors: ['#ffd700', '#ff6b6b', '#4d96ff', '#6bcb77', '#ff6bd6'] });
        c({ particleCount: 2, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors: ['#ffd700', '#ff6b6b', '#4d96ff', '#6bcb77', '#ff6bd6'] });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();

      // Firework bursts
      setTimeout(() => c({ particleCount: 80, spread: 100, origin: { x: 0.5, y: 0.5 }, startVelocity: 45, colors: ['#ffd700', '#ff6b6b'] }), 100);
      setTimeout(() => c({ particleCount: 60, spread: 80, origin: { x: 0.3, y: 0.4 }, startVelocity: 35 }), 600);
      setTimeout(() => c({ particleCount: 60, spread: 80, origin: { x: 0.7, y: 0.4 }, startVelocity: 35 }), 1000);
      setTimeout(() => c({ particleCount: 100, spread: 120, origin: { x: 0.5, y: 0.6 }, startVelocity: 50, shapes: ['star'], colors: ['#ffd700', '#ffec8b'] }), 1500);
      setTimeout(() => c({ particleCount: 80, spread: 360, origin: { x: 0.5, y: 0.5 }, startVelocity: 40 }), 2200);
      if (isSRank) {
        setTimeout(() => c({ particleCount: 120, spread: 360, origin: { x: 0.5, y: 0.5 }, startVelocity: 55, gravity: 0.6, colors: ['#ffd700', '#ffec8b', '#fff'] }), 3000);
      }
    } else if (finalScore && finalScore.totalScore >= 60) {
      c({ particleCount: 50, spread: 60, origin: { x: 0.5, y: 0.6 }, colors: ['#6bcb77', '#4d96ff'] });
      setTimeout(() => c({ particleCount: 40, spread: 50, origin: { x: 0.5, y: 0.5 } }), 400);
    }
  }, [isHigh, isSRank, finalScore]);

  // Resize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const handleResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // Phase transitions
  useEffect(() => {
    const t = setTimeout(() => setPhase('counting'), 300);
    return () => clearTimeout(t);
  }, []);

  const onScoreComplete = useCallback(() => {
    setPhase('revealed');
    fireConfetti();
  }, [fireConfetti]);


  // Keyboard navigation
  useEffect(() => {
    const h = (e: KeyboardEvent) => { 
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNext(); }
      if (e.key === 'ArrowDown' && suggestions.length > 0 && !showSuggestions) {
        e.preventDefault();
        setShowSuggestions(true);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onNext, suggestions.length, showSuggestions]);

  const isRevealed = phase === 'revealed';

  return (
    <NavigationGrid className={`h-screen w-screen relative overflow-hidden bg-gradient-to-br ${grade?.bgGradient || 'from-slate-900 to-slate-800'}`}>
      {/* Confetti canvas */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50" style={{ width: '100vw', height: '100vh' }} />
      
      {grade && (
        <>
          {/* Background effects */}
          <AmbientGlow color={grade.glowColor} />
          <SparkleField intensity={isHigh ? 'high' : 'normal'} />
          <CinematicSpotlight color={grade.glowColor} />
          
          {/* Floating particles */}
          <FloatingParticles particles={grade.particles} count={isHigh ? 18 : 10} />
          
          {/* High score effects (80+) */}
          {isHigh && <LaserBeams color={grade.glowColor} />}
          {isHigh && <FireworkBursts show={isRevealed} color={grade.glowColor} />}
          
          {/* S Rank special effects (90+) */}
          {isSRank && <GoldenRain show={isRevealed} />}
          
          {/* Score reveal burst */}
          <ScoreBurst show={isRevealed} color={grade.glowColor} />
        </>
      )}

      {/* Main content */}
      <div className={`relative z-10 h-full flex flex-col p-8 transition-all duration-700 ${phase !== 'enter' ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
        <div className="flex items-center gap-10 flex-1">
          
          {/* Thumbnail with glow */}
          <div className="flex-shrink-0 relative">
            {grade && (
              <div className="absolute inset-0 rounded-3xl blur-[60px] opacity-60 animate-pulse-slow"
                style={{ backgroundColor: grade.glowColor, transform: 'scale(1.3)' }} />
            )}
            <div className={`relative p-2 rounded-3xl bg-gradient-to-br ${grade?.gradient || 'from-purple-500 to-pink-500'} shadow-2xl`}
              style={{ boxShadow: grade ? `0 0 60px ${grade.glowColor}` : undefined }}>
              <img src={song.song.thumbnail} alt="" className="w-96 h-56 rounded-2xl object-cover" />
              {/* Grade badge */}
              {grade && (
                <div className={`absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br ${grade.gradient} 
                  flex items-center justify-center shadow-2xl border-4 border-black z-20
                  ${isRevealed && isHigh ? 'animate-bounce' : ''}`}
                  style={{ boxShadow: `0 0 40px ${grade.glowColor}, 0 0 80px ${grade.glowColor}50` }}>
                  <span className="text-4xl font-black text-white drop-shadow-lg">{grade.grade}</span>
                </div>
              )}
            </div>
          </div>


          {/* Score and info */}
          <div className="flex-1 min-w-0">
            <p className="text-base text-white/80 mb-2 flex items-center gap-2 font-medium">
              <span className="w-3 h-3 rounded-full bg-green-400 animate-pulse shadow-[0_0_10px_#4ade80]" />Hoàn thành
            </p>
            <h2 className="text-3xl font-bold text-white line-clamp-2 mb-5 drop-shadow-lg">{song.song.title}</h2>

            {finalScore && grade ? (
              <>
                {/* Title with emoji */}
                <h1 className={`text-3xl font-black mb-5 bg-gradient-to-r ${grade.gradient} bg-clip-text text-transparent flex items-center gap-3 drop-shadow-lg`}
                  style={{ filter: `drop-shadow(0 0 20px ${grade.glowColor})` }}>
                  <span className={`text-4xl ${isRevealed && isHigh ? 'animate-bounce' : ''}`}>{grade.emoji}</span>
                  <span>{grade.title}</span>
                </h1>

                {/* Score display */}
                <div className="relative mb-8">
                  <FloatingCrown show={isRevealed && isSRank} />
                  <div className={`flex items-baseline gap-4 ${isRevealed && isSRank ? 'animate-victory-dance' : ''}`}>
                    <span className={`font-black text-white ${isRevealed && isSRank ? 'animate-mega-glow' : ''}`}
                      style={{ 
                        fontSize: isSRank ? '120px' : '100px',
                        textShadow: `0 0 60px ${grade.glowColor}, 0 0 120px ${grade.glowColor}, 0 4px 0 rgba(0,0,0,0.3)`,
                        lineHeight: 1,
                        WebkitTextStroke: `2px ${grade.glowColor}`,
                      }}>
                      <AnimatedScore target={finalScore.totalScore} onComplete={onScoreComplete} />
                    </span>
                    <span className="text-2xl text-white font-bold drop-shadow-lg">điểm</span>
                  </div>
                  
                  {/* Grade badge */}
                  <div className={`mt-5 transition-all duration-500 ${isRevealed ? 'opacity-100 animate-zoom-in-bounce' : 'opacity-0'}`}>
                    <span className={`inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r ${grade.gradient} 
                      text-white font-black shadow-2xl text-xl ${isRevealed && isHigh ? 'animate-electric-pulse' : ''}`}
                      style={{ boxShadow: `0 0 40px ${grade.glowColor}, 0 0 80px ${grade.glowColor}50` }}>
                      <span className="text-3xl">{grade.emoji}</span> Hạng {grade.grade}
                    </span>
                  </div>
                  
                  {/* Quote */}
                  <div className={`mt-5 transition-all duration-700 delay-300 ${isRevealed ? 'opacity-100' : 'opacity-0'}`}>
                    <p className={`text-xl text-white font-medium ${isRevealed && isSRank ? 'animate-rainbow' : ''}`}
                      style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                      "{quote}"
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-4 mb-8 max-w-md">
                  <StatBar label="Giọng hát" value={finalScore.pitchAccuracy} icon="🎤" color="#10b981" delay={2500} />
                  <StatBar label="Cảm xúc" value={finalScore.timing} icon="💖" color="#ec4899" delay={2900} />
                </div>
              </>
            ) : (
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-3">Hoàn thành!</h1>
                <p className="text-white/70 text-lg">Bài hát đã kết thúc</p>
              </div>
            )}

            {/* Next button */}
            <FocusableButton row={0} col={0} onSelect={onNext} autoFocus variant="primary"
              className={`!px-10 !py-5 !text-xl !font-bold !rounded-2xl ${isHigh ? `!bg-gradient-to-r ${grade?.gradient}` : ''}`}>
              {hasNextSong ? 'Bài tiếp theo →' : 'Về trang chủ →'}
            </FocusableButton>
          </div>
        </div>

        
        {/* Suggestions section */}
        {showSuggestions && suggestions.length > 0 && onAddToQueue && (
          <div className="mt-6 bg-black/50 backdrop-blur-xl rounded-2xl p-6 animate-fade-in border border-white/20">
            <p className="text-base text-white mb-4 font-bold">🎵 Hát tiếp bài này</p>
            <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
              {suggestions.slice(0, 6).map((s, index) => {
                const isAdded = addedIds.has(s.youtubeId);
                return (
                  <FocusableButton key={s.youtubeId} row={1} col={index}
                    onSelect={() => !isAdded && handleAddSuggestion(s)} variant="ghost"
                    className={`!p-0 !min-h-0 !min-w-0 flex-shrink-0 w-48 text-left !rounded-xl ${isAdded ? 'ring-2 ring-green-400' : ''}`}>
                    <div className="w-full">
                      <div className="relative">
                        <LazyImage src={s.thumbnail} alt={s.title} className="w-48 h-28 rounded-xl object-cover" width={192} height={112} />
                        {isAdded ? (
                          <div className="absolute inset-0 bg-green-500/70 rounded-xl flex items-center justify-center">
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        ) : (
                          <div className="absolute top-2 right-2 w-7 h-7 bg-primary-500 rounded-full flex items-center justify-center shadow-lg">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <p className="text-sm font-semibold line-clamp-2 mt-2 text-white">{s.title}</p>
                    </div>
                  </FocusableButton>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Hint to show suggestions */}
        {!showSuggestions && suggestions.length > 0 && (
          <div className="mt-6 text-center">
            <p className="text-base text-white/80">
              <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 rounded-full border border-white/20 font-medium">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                Ấn xuống để xem gợi ý
              </span>
            </p>
          </div>
        )}
        
        {isLoadingSuggestions && (
          <div className="mt-6 flex items-center justify-center gap-3">
            <div className="w-6 h-6 border-3 border-white/50 border-t-white rounded-full animate-spin" />
            <span className="text-base text-white font-medium">Đang tải gợi ý...</span>
          </div>
        )}
      </div>
    </NavigationGrid>
  );
}

export default TVSongResultScreen;
