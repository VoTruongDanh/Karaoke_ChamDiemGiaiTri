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


// ============ ANIMATED SCORE WITH DRAMATIC EFFECT ============
function AnimatedScoreDramatic({ target, onComplete }: { target: number; onComplete?: () => void }) {
  const [current, setCurrent] = useState(0);
  const [phase, setPhase] = useState<'wait' | 'fast' | 'slow' | 'done'>('wait');
  const audioRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    try { audioRef.current = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch {}
    
    const t1 = setTimeout(() => setPhase('fast'), 500);
    return () => { clearTimeout(t1); audioRef.current?.close().catch(() => {}); };
  }, []);

  useEffect(() => {
    if (phase === 'wait') return;
    
    const playTick = (freq: number, vol: number) => {
      if (!audioRef.current) return;
      try {
        const ctx = audioRef.current;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = freq;
        g.gain.setValueAtTime(vol, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        o.connect(g); g.connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + 0.05);
      } catch {}
    };

    const playFanfare = () => {
      if (!audioRef.current) return;
      const ctx = audioRef.current;
      const notes = [523, 659, 784, 1047];
      notes.forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.1);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.5);
        o.connect(g); g.connect(ctx.destination);
        o.start(ctx.currentTime + i * 0.1);
        o.stop(ctx.currentTime + i * 0.1 + 0.5);
      });
    };

    if (phase === 'fast') {
      const fastTarget = Math.floor(target * 0.8);
      let val = 0;
      const interval = setInterval(() => {
        val += Math.ceil(target / 20);
        if (val >= fastTarget) {
          val = fastTarget;
          clearInterval(interval);
          setPhase('slow');
        }
        setCurrent(val);
        playTick(400 + (val / target) * 400, 0.05);
      }, 50);
      return () => clearInterval(interval);
    }

    if (phase === 'slow') {
      let val = Math.floor(target * 0.8);
      const interval = setInterval(() => {
        val += 1;
        setCurrent(val);
        playTick(600 + (val / target) * 500, 0.08);
        if (val >= target) {
          clearInterval(interval);
          setPhase('done');
          playFanfare();
          onComplete?.();
        }
      }, 120);
      return () => clearInterval(interval);
    }
  }, [phase, target, onComplete]);

  return <>{current}</>;
}


// ============ MEGA CELEBRATION - Ultimate effect for high scores ============
function MegaCelebration({ show, grade }: { show: boolean; grade: GradeInfo }) {
  if (!show) return null;
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Screen shake effect via CSS */}
      <div className="absolute inset-0 animate-screen-shake" />
      
      {/* Radial burst lines */}
      <div className="absolute inset-0 flex items-center justify-center">
        {[...Array(24)].map((_, i) => (
          <div key={i} className="absolute w-2 h-[50vh] origin-bottom animate-burst-line"
            style={{ 
              background: `linear-gradient(to top, ${grade.glowColor}, transparent)`,
              transform: `rotate(${i * 15}deg)`,
              animationDelay: `${i * 0.02}s`,
            }} />
        ))}
      </div>
      
      {/* Flying emojis */}
      {[...Array(20)].map((_, i) => (
        <div key={i} className="absolute animate-fly-emoji"
          style={{ 
            left: `${Math.random() * 100}%`,
            bottom: '-50px',
            fontSize: `${30 + Math.random() * 30}px`,
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${2 + Math.random() * 2}s`,
          }}>
          {grade.particles[i % grade.particles.length]}
        </div>
      ))}
      
      {/* Spotlight beams */}
      <div className="absolute top-0 left-1/4 w-32 h-full animate-spotlight-beam"
        style={{ background: `linear-gradient(180deg, ${grade.glowColor}60 0%, transparent 100%)`, transform: 'skewX(-15deg)' }} />
      <div className="absolute top-0 right-1/4 w-32 h-full animate-spotlight-beam"
        style={{ background: `linear-gradient(180deg, ${grade.glowColor}60 0%, transparent 100%)`, transform: 'skewX(15deg)', animationDelay: '0.3s' }} />
    </div>
  );
}

// ============ STAGE LIGHTS - Concert-style moving lights ============
function StageLights({ color }: { color: string }) {
  const lights = useMemo(() => [
    { x: 5, delay: 0 }, { x: 20, delay: 0.2 }, { x: 35, delay: 0.4 }, { x: 50, delay: 0.6 }, 
    { x: 65, delay: 0.8 }, { x: 80, delay: 1.0 }, { x: 95, delay: 1.2 }
  ], []);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {lights.map((l, i) => (
        <div key={i} className="absolute top-0" style={{ left: `${l.x}%`, transform: 'translateX(-50%)' }}>
          <div className="w-[250px] h-[700px] animate-stage-light-sweep origin-top"
            style={{ background: `linear-gradient(180deg, ${color} 0%, ${color}80 15%, ${color}40 40%, transparent 100%)`,
              clipPath: 'polygon(30% 0%, 70% 0%, 100% 100%, 0% 100%)', animationDelay: `${l.delay}s`, opacity: 0.6 }} />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full animate-pulse"
            style={{ backgroundColor: color, boxShadow: `0 0 40px ${color}, 0 0 80px ${color}` }} />
        </div>
      ))}
    </div>
  );
}

// ============ ROTATING LIGHT RAYS - Epic background ============
function RotatingRays({ color }: { color: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
      <div className="relative w-[1500px] h-[1500px] animate-spin-slow">
        {[...Array(24)].map((_, i) => (
          <div key={i} className="absolute left-1/2 top-1/2 w-4 h-[750px] origin-bottom -translate-x-1/2"
            style={{ background: `linear-gradient(to top, ${color}60, ${color}20, transparent)`, transform: `rotate(${i * 15}deg)`, opacity: 0.5 }} />
        ))}
      </div>
    </div>
  );
}

// ============ NEON BORDER - Glowing frame ============
function NeonBorder({ color, isHigh }: { color: string; isHigh: boolean }) {
  if (!isHigh) return null;
  return (
    <>
      <div className="absolute inset-3 rounded-3xl pointer-events-none animate-neon-pulse"
        style={{ border: `5px solid ${color}`, boxShadow: `0 0 40px ${color}, 0 0 80px ${color}, 0 0 120px ${color}, inset 0 0 40px ${color}40` }} />
      {/* Corner accents */}
      <div className="absolute top-2 left-2 w-20 h-20 border-t-4 border-l-4 rounded-tl-2xl" style={{ borderColor: color, boxShadow: `0 0 30px ${color}` }} />
      <div className="absolute top-2 right-2 w-20 h-20 border-t-4 border-r-4 rounded-tr-2xl" style={{ borderColor: color, boxShadow: `0 0 30px ${color}` }} />
      <div className="absolute bottom-2 left-2 w-20 h-20 border-b-4 border-l-4 rounded-bl-2xl" style={{ borderColor: color, boxShadow: `0 0 30px ${color}` }} />
      <div className="absolute bottom-2 right-2 w-20 h-20 border-b-4 border-r-4 rounded-br-2xl" style={{ borderColor: color, boxShadow: `0 0 30px ${color}` }} />
    </>
  );
}

// ============ MEGA FLASH - Screen flash effect ============
function MegaFlash({ show, color }: { show: boolean; color: string }) {
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (show) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 500);
      return () => clearTimeout(t);
    }
  }, [show]);
  if (!flash) return null;
  return <div className="absolute inset-0 z-40 animate-mega-flash pointer-events-none" style={{ backgroundColor: color }} />;
}

// ============ ELECTRIC ARCS - Lightning effects ============
function ElectricArcs({ show, color }: { show: boolean; color: string }) {
  if (!show) return null;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(6)].map((_, i) => (
        <svg key={i} className="absolute animate-electric-arc" style={{ left: `${10 + i * 15}%`, top: '10%', animationDelay: `${i * 0.3}s` }}
          width="100" height="300" viewBox="0 0 100 300">
          <path d={`M50,0 L${30 + Math.random() * 40},50 L${20 + Math.random() * 60},100 L${30 + Math.random() * 40},150 L${20 + Math.random() * 60},200 L50,300`}
            stroke={color} strokeWidth="3" fill="none" style={{ filter: `drop-shadow(0 0 10px ${color}) drop-shadow(0 0 20px ${color})` }} />
        </svg>
      ))}
    </div>
  );
}

// ============ AMBIENT GLOW - Soft background orbs ============
function AmbientGlow({ color }: { color: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-0 left-1/4 w-[700px] h-[700px] rounded-full blur-[200px] opacity-60 animate-pulse-slow"
        style={{ backgroundColor: color }} />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] rounded-full blur-[180px] opacity-55 animate-pulse-slow"
        style={{ backgroundColor: color, animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full blur-[250px] opacity-45"
        style={{ backgroundColor: color }} />
    </div>
  );
}

// ============ CONFETTI RAIN - Continuous celebration ============
function ConfettiRain({ show, colors }: { show: boolean; colors: string[] }) {
  const particles = useMemo(() => [...Array(80)].map((_, i) => ({
    id: i, x: Math.random() * 100, delay: Math.random() * 4, dur: 2.5 + Math.random() * 2,
    size: 10 + Math.random() * 15, color: colors[i % colors.length], rotation: Math.random() * 360,
    type: ['square', 'circle', 'ribbon'][i % 3],
  })), [colors]);

  if (!show) return null;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <div key={p.id} className="absolute animate-confetti-fall"
          style={{ left: `${p.x}%`, top: '-40px', animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s` }}>
          <div style={{ width: p.type === 'ribbon' ? p.size * 0.3 : p.size, height: p.type === 'ribbon' ? p.size * 2 : p.size, 
            backgroundColor: p.color, transform: `rotate(${p.rotation}deg)`,
            borderRadius: p.type === 'circle' ? '50%' : '3px', boxShadow: `0 0 10px ${p.color}` }} />
        </div>
      ))}
    </div>
  );
}

// ============ SHOOTING STARS - Dramatic streaks ============
function ShootingStars({ show }: { show: boolean }) {
  const stars = useMemo(() => [...Array(8)].map((_, i) => ({
    id: i, top: 5 + Math.random() * 50, delay: i * 0.8 + Math.random() * 0.3, size: 30 + Math.random() * 20,
  })), []);

  if (!show) return null;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map(s => (
        <div key={s.id} className="absolute left-0 animate-shooting-star" style={{ top: `${s.top}%`, animationDelay: `${s.delay}s` }}>
          <div className="bg-gradient-to-r from-transparent via-white to-yellow-200 rounded-full"
            style={{ width: `${s.size * 4}px`, height: '3px', boxShadow: '0 0 30px #fff, 0 0 60px #ffd700' }} />
        </div>
      ))}
    </div>
  );
}

// ============ PULSING CIRCLES - Rhythmic effect ============
function PulsingCircles({ color }: { color: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="absolute rounded-full border-2 animate-pulse-circle"
          style={{ width: `${200 + i * 150}px`, height: `${200 + i * 150}px`, borderColor: color, 
            animationDelay: `${i * 0.3}s`, opacity: 0.3 }} />
      ))}
    </div>
  );
}

// ============ SPARKLE FIELD - Twinkling stars ============
function SparkleField({ intensity = 'normal' }: { intensity?: 'low' | 'normal' | 'high' }) {
  const count = intensity === 'high' ? 60 : intensity === 'normal' ? 35 : 20;
  const stars = useMemo(() => [...Array(count)].map((_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100,
    size: 2 + Math.random() * 5, dur: 0.8 + Math.random() * 1.5, delay: Math.random() * 3,
  })), [count]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map(s => (
        <div key={s.id} className="absolute rounded-full bg-white animate-twinkle"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: `${s.size}px`, height: `${s.size}px`,
            animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s`, boxShadow: '0 0 10px 3px #fff' }} />
      ))}
    </div>
  );
}

// ============ DISCO BALL EFFECT - Party vibes ============
function DiscoBallEffect({ show, color }: { show: boolean; color: string }) {
  const beams = useMemo(() => [...Array(24)].map((_, i) => ({
    id: i, angle: i * 15, color: ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6bd6', '#a855f7'][i % 6],
  })), []);

  if (!show) return null;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Disco ball */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-200 to-gray-400 animate-spin-slow shadow-2xl"
          style={{ boxShadow: `0 0 40px ${color}` }}>
          {[...Array(16)].map((_, i) => (
            <div key={i} className="absolute w-2 h-2 bg-white/90 rounded-sm"
              style={{ top: `${25 + Math.sin(i * 22.5 * Math.PI / 180) * 20}%`, left: `${25 + Math.cos(i * 22.5 * Math.PI / 180) * 20}%` }} />
          ))}
        </div>
      </div>
      {/* Light beams */}
      {beams.map(b => (
        <div key={b.id} className="absolute top-12 left-1/2 w-1 h-[500px] origin-top animate-disco-beam"
          style={{ background: `linear-gradient(to bottom, ${b.color}80, transparent)`, transform: `rotate(${b.angle}deg)`,
            animationDelay: `${b.id * 0.05}s`, opacity: 0.4 }} />
      ))}
    </div>
  );
}

// ============ LASER BEAMS - Epic light beams ============
function LaserBeams({ color }: { color: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="absolute h-1.5 animate-laser"
          style={{ background: `linear-gradient(90deg, transparent, ${color}, ${color}, transparent)`,
            top: `${8 + i * 10}%`, left: '-100%', width: '200%', animationDelay: `${i * 0.2}s`,
            boxShadow: `0 0 30px ${color}, 0 0 60px ${color}`, opacity: 0.8 }} />
      ))}
    </div>
  );
}

// ============ FIREWORK BURSTS - Continuous fireworks ============
function FireworkBursts({ show, color }: { show: boolean; color: string }) {
  const [bursts, setBursts] = useState<Array<{ id: number; x: number; y: number; color: string; size: number }>>([]);
  
  useEffect(() => {
    if (!show) return;
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#A855F7', '#F472B6', '#22D3EE', '#10B981'];
    let id = 0;
    
    const addBurst = () => {
      setBursts(prev => {
        const newBurst = { id: id++, x: 10 + Math.random() * 80, y: 8 + Math.random() * 45,
          color: colors[Math.floor(Math.random() * colors.length)], size: 80 + Math.random() * 60 };
        return [...prev.slice(-8), newBurst];
      });
    };
    
    addBurst(); setTimeout(addBurst, 150); setTimeout(addBurst, 300); setTimeout(addBurst, 500);
    const interval = setInterval(addBurst, 600);
    return () => clearInterval(interval);
  }, [show]);

  if (!show) return null;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {bursts.map(burst => (
        <div key={burst.id} className="absolute" style={{ left: `${burst.x}%`, top: `${burst.y}%` }}>
          {[...Array(20)].map((_, i) => {
            const angle = (i * 18) * (Math.PI / 180);
            return (
              <div key={i} className="absolute w-3 h-3 rounded-full animate-firework-particle"
                style={{ backgroundColor: burst.color, boxShadow: `0 0 12px ${burst.color}, 0 0 24px ${burst.color}`,
                  '--tx': `${Math.cos(angle) * burst.size}px`, '--ty': `${Math.sin(angle) * burst.size}px` } as React.CSSProperties} />
            );
          })}
          <div className="absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 rounded-full animate-firework-center"
            style={{ backgroundColor: burst.color, boxShadow: `0 0 40px ${burst.color}, 0 0 80px ${burst.color}` }} />
        </div>
      ))}
    </div>
  );
}


// ============ GOLDEN RAIN - For S rank only ============
function GoldenRain({ show }: { show: boolean }) {
  const particles = useMemo(() => [...Array(50)].map((_, i) => ({
    id: i, x: Math.random() * 100, delay: Math.random() * 2.5, dur: 2 + Math.random() * 1.5,
    size: 12 + Math.random() * 18, rotation: Math.random() * 360, wobble: Math.random() * 20 - 10,
  })), []);

  if (!show) return null;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <div key={p.id} className="absolute animate-golden-fall"
          style={{ left: `${p.x}%`, top: '-50px', animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, '--wobble': `${p.wobble}px` } as React.CSSProperties}>
          <svg viewBox="0 0 24 24" fill="none" style={{ width: p.size, height: p.size, transform: `rotate(${p.rotation}deg)`, filter: 'drop-shadow(0 0 10px #FFD700) drop-shadow(0 0 20px #FFD700)' }}>
            <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" fill="#FFD700" />
          </svg>
        </div>
      ))}
    </div>
  );
}

// ============ TROPHY ANIMATION - Spinning trophy for S rank ============
function SpinningTrophy({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="absolute top-6 right-6 z-20 animate-trophy-entrance">
      <div className="relative">
        <span className="text-6xl animate-trophy-spin filter drop-shadow-[0_0_30px_rgba(255,215,0,1)]">🏆</span>
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-xl animate-bounce">⭐</div>
        <div className="absolute top-1/2 -left-4 text-lg animate-twinkle">✨</div>
        <div className="absolute top-1/2 -right-4 text-lg animate-twinkle" style={{ animationDelay: '0.5s' }}>✨</div>
      </div>
    </div>
  );
}

// ============ FLOATING CROWN - S rank special ============
function FloatingCrown({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-20 animate-crown-entrance">
      <div className="relative">
        <span className="text-6xl filter drop-shadow-[0_0_40px_rgba(255,215,0,1)] drop-shadow-[0_0_80px_rgba(255,215,0,0.8)] animate-crown-float">👑</span>
        <div className="absolute -top-2 -left-4 text-xl animate-twinkle">✨</div>
        <div className="absolute -top-2 -right-4 text-xl animate-twinkle" style={{ animationDelay: '0.3s' }}>✨</div>
        <div className="absolute top-1 left-1/2 -translate-x-1/2 -translate-y-6 text-lg animate-twinkle" style={{ animationDelay: '0.6s' }}>⭐</div>
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
      <div className="absolute w-64 h-64 rounded-full animate-score-flash"
        style={{ background: `radial-gradient(circle, ${color} 0%, ${color}80 30%, transparent 70%)` }} />
      {/* Expanding rings - more dramatic */}
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i} className="absolute w-32 h-32 rounded-full border-4 animate-wave-expand"
          style={{ borderColor: color, animationDelay: `${i * 0.1}s`, opacity: 0.8 }} />
      ))}
      {/* Particle burst */}
      {[...Array(16)].map((_, i) => {
        const angle = (i * 22.5) * (Math.PI / 180);
        return (
          <div key={i} className="absolute w-4 h-4 rounded-full animate-burst-particle"
            style={{ backgroundColor: color, boxShadow: `0 0 15px ${color}`,
              '--tx': `${Math.cos(angle) * 200}px`, '--ty': `${Math.sin(angle) * 200}px` } as React.CSSProperties} />
        );
      })}
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
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold text-white flex items-center gap-1.5">
          <span className="text-base">{icon}</span>{label}
        </span>
        <span className="text-base font-black text-white">{value}</span>
      </div>
      <div className="h-2 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
        <div className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${w}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)`,
            boxShadow: `0 0 15px ${color}` }} />
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
          {/* Background effects - always on */}
          <AmbientGlow color={grade.glowColor} />
          <SparkleField intensity={isHigh ? 'high' : 'normal'} />
          <RotatingRays color={grade.glowColor} />
          <PulsingCircles color={grade.glowColor} />
          
          {/* Floating particles */}
          <FloatingParticles particles={grade.particles} count={isHigh ? 25 : 15} />
          
          {/* High score effects (80+) */}
          {isHigh && <StageLights color={grade.glowColor} />}
          {isHigh && <LaserBeams color={grade.glowColor} />}
          {isHigh && <NeonBorder color={grade.glowColor} isHigh={isHigh} />}
          {isHigh && <FireworkBursts show={isRevealed} color={grade.glowColor} />}
          {isHigh && <ShootingStars show={isRevealed} />}
          {isHigh && <ConfettiRain show={isRevealed} colors={['#FFD700', '#FF6B6B', '#4ECDC4', '#A855F7', '#F472B6', '#22D3EE']} />}
          {isHigh && <ElectricArcs show={isRevealed} color={grade.glowColor} />}
          
          {/* S Rank special effects (90+) */}
          {isSRank && <GoldenRain show={isRevealed} />}
          {isSRank && <DiscoBallEffect show={isRevealed} color={grade.glowColor} />}
          {isSRank && <SpinningTrophy show={isRevealed} />}
          
          {/* Score reveal effects */}
          <MegaFlash show={isRevealed} color={grade.glowColor} />
          <ScoreBurst show={isRevealed} color={grade.glowColor} />
          {isHigh && <MegaCelebration show={isRevealed} grade={grade} />}
        </>
      )}

      {/* Main content */}
      <div className={`relative z-10 h-full flex flex-col p-6 transition-all duration-700 ${phase !== 'enter' ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
        <div className="flex items-center gap-8 flex-1">
          
          {/* Thumbnail with glow */}
          <div className="flex-shrink-0 relative">
            {grade && (
              <div className="absolute inset-0 rounded-2xl blur-[50px] opacity-60 animate-pulse-slow"
                style={{ backgroundColor: grade.glowColor, transform: 'scale(1.2)' }} />
            )}
            <div className={`relative p-1.5 rounded-2xl bg-gradient-to-br ${grade?.gradient || 'from-purple-500 to-pink-500'} shadow-2xl`}
              style={{ boxShadow: grade ? `0 0 50px ${grade.glowColor}` : undefined }}>
              <img src={song.song.thumbnail} alt="" className="w-72 h-40 rounded-xl object-cover" />
              {/* Grade badge */}
              {grade && (
                <div className={`absolute -bottom-4 -right-4 w-16 h-16 rounded-full bg-gradient-to-br ${grade.gradient} 
                  flex items-center justify-center shadow-2xl border-4 border-black z-20
                  ${isRevealed && isHigh ? 'animate-bounce' : ''}`}
                  style={{ boxShadow: `0 0 30px ${grade.glowColor}, 0 0 60px ${grade.glowColor}50` }}>
                  <span className="text-2xl font-black text-white drop-shadow-lg">{grade.grade}</span>
                </div>
              )}
            </div>
          </div>


          {/* Score and info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white/80 mb-1 flex items-center gap-2 font-medium">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_#4ade80]" />Hoàn thành
            </p>
            <h2 className="text-xl font-bold text-white line-clamp-2 mb-3 drop-shadow-lg">{song.song.title}</h2>

            {finalScore && grade ? (
              <>
                {/* Title with emoji */}
                <h1 className={`text-xl font-black mb-3 bg-gradient-to-r ${grade.gradient} bg-clip-text text-transparent flex items-center gap-2 drop-shadow-lg`}
                  style={{ filter: `drop-shadow(0 0 15px ${grade.glowColor})` }}>
                  <span className={`text-2xl ${isRevealed && isHigh ? 'animate-bounce' : ''}`}>{grade.emoji}</span>
                  <span>{grade.title}</span>
                </h1>

                {/* Score display */}
                <div className="relative mb-5">
                  <FloatingCrown show={isRevealed && isSRank} />
                  
                  <div className={`flex items-baseline gap-3 ${isRevealed && isSRank ? 'animate-victory-dance' : ''}`}>
                    <span className={`font-black ${isRevealed ? 'animate-score-celebrate' : ''}`}
                      style={{ 
                        fontSize: isSRank ? '100px' : '85px',
                        color: '#FFFFFF',
                        textShadow: `
                          0 0 15px ${grade.glowColor},
                          0 0 30px ${grade.glowColor},
                          0 0 60px ${grade.glowColor},
                          0 0 100px ${grade.glowColor},
                          0 5px 0 rgba(0,0,0,0.5)
                        `,
                        lineHeight: 1,
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        fontWeight: 900,
                      }}>
                      <AnimatedScoreDramatic target={finalScore.totalScore} onComplete={() => { setPhase('revealed'); fireConfetti(); }} />
                    </span>
                    <span className="text-2xl text-white font-bold" style={{ textShadow: '0 3px 15px rgba(0,0,0,0.8)' }}>điểm</span>
                  </div>
                  
                  {/* Grade badge */}
                  <div className={`mt-4 transition-all duration-500 ${isRevealed ? 'opacity-100 animate-zoom-in-bounce' : 'opacity-0'}`}>
                    <span className={`inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r ${grade.gradient} 
                      text-white font-black shadow-2xl text-base border-2 border-white/30 ${isRevealed && isHigh ? 'animate-electric-pulse' : ''}`}
                      style={{ boxShadow: `0 0 30px ${grade.glowColor}, 0 0 60px ${grade.glowColor}50` }}>
                      <span className="text-xl">{grade.emoji}</span> Hạng {grade.grade}
                    </span>
                  </div>
                  
                  {/* Quote */}
                  <div className={`mt-3 transition-all duration-700 delay-300 ${isRevealed ? 'opacity-100' : 'opacity-0'}`}>
                    <p className={`text-base text-white font-medium ${isRevealed && isSRank ? 'animate-rainbow' : ''}`}
                      style={{ textShadow: '0 2px 15px rgba(0,0,0,0.8)' }}>
                      "{quote}"
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-2 mb-5 max-w-xs">
                  <StatBar label="Giọng hát" value={finalScore.pitchAccuracy} icon="🎤" color="#10b981" delay={2500} />
                  <StatBar label="Cảm xúc" value={finalScore.timing} icon="💖" color="#ec4899" delay={2900} />
                </div>
              </>
            ) : (
              <div className="mb-5">
                <h1 className="text-xl font-bold text-white mb-2">Hoàn thành!</h1>
                <p className="text-white/70">Bài hát đã kết thúc</p>
              </div>
            )}

            {/* Next button */}
            <FocusableButton row={0} col={0} onSelect={onNext} autoFocus variant="primary"
              className={`!px-6 !py-3 !text-base !font-bold !rounded-xl ${isHigh ? `!bg-gradient-to-r ${grade?.gradient}` : ''}`}>
              {hasNextSong ? 'Bài tiếp theo →' : 'Về trang chủ →'}
            </FocusableButton>
          </div>
        </div>

        
        {/* Suggestions section */}
        {showSuggestions && suggestions.length > 0 && onAddToQueue && (
          <div className="mt-4 bg-black/50 backdrop-blur-xl rounded-xl p-4 animate-fade-in border border-white/20">
            <p className="text-sm text-white mb-3 font-bold">🎵 Hát tiếp bài này</p>
            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
              {suggestions.slice(0, 6).map((s, index) => {
                const isAdded = addedIds.has(s.youtubeId);
                return (
                  <FocusableButton key={s.youtubeId} row={1} col={index}
                    onSelect={() => !isAdded && handleAddSuggestion(s)} variant="ghost"
                    className={`!p-0 !min-h-0 !min-w-0 flex-shrink-0 w-36 text-left !rounded-lg ${isAdded ? 'ring-2 ring-green-400' : ''}`}>
                    <div className="w-full">
                      <div className="relative">
                        <LazyImage src={s.thumbnail} alt={s.title} className="w-36 h-20 rounded-lg object-cover" width={144} height={80} />
                        {isAdded ? (
                          <div className="absolute inset-0 bg-green-500/70 rounded-lg flex items-center justify-center">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        ) : (
                          <div className="absolute top-1 right-1 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center shadow-lg">
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
