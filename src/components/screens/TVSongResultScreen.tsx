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
    quotes: [
      'Giọng ca vàng đây rồi! 🎤✨',
      'Quá đỉnh! Đi thi The Voice được rồi! 🏆',
      'Siêu sao âm nhạc là đây! ⭐',
      'Huyền thoại! Mic cháy luôn! 🔥',
      'Perfect! Không còn gì để chê! 💯',
      'Ông/Bà hoàng karaoke đây rồi! 👑',
      'Hàng xóm đang gọi điện khen đấy! 📞',
      'Cháy hết mình luôn! Quá xịn! 🔥',
      'Giọng hát thiên thần! 😇',
      'Đỉnh của chóp! Không ai địch nổi! 🏔️',
    ]
  };
  if (score >= 80) return {
    grade: 'A', title: 'TUYỆT VỜI!', emoji: '🌟',
    gradient: 'from-emerald-300 via-green-400 to-teal-400',
    bgGradient: 'from-black via-emerald-950/50 to-black',
    textColor: 'text-emerald-300', glowColor: '#34d399',
    particles: ['🎉', '✨', '🎊', '💚'],
    quotes: [
      'Hay quá trời! Hát nữa đi! 🎵',
      'Giọng ngọt như mía lùi! 🍬',
      'Tuyệt vời! Cả xóm phải nghe! 🏠',
      'Pro singer đây rồi! 🎤',
      'Quá mượt! Nghe phê quá! 😎',
      'Chất lượng cao cấp đây! ✨',
      'Hát như ca sĩ chuyên nghiệp! 🌟',
      'Xuất sắc! Thêm bài nữa thôi! 🎶',
      'Giọng ca đỉnh cao! 🔝',
      'Nghe mà muốn hát theo luôn! 🎧',
    ]
  };
  if (score >= 70) return {
    grade: 'B', title: 'RẤT TỐT!', emoji: '✨',
    gradient: 'from-cyan-300 via-sky-400 to-blue-400',
    bgGradient: 'from-black via-sky-950/50 to-black',
    textColor: 'text-cyan-300', glowColor: '#22d3ee',
    particles: ['💎', '✨', '💙'],
    quotes: [
      'Ngon lành! Tiếp tục phát huy! 💪',
      'Hát hay đấy! Thêm bài nữa nào! 🎵',
      'Ổn áp! Cứ thế mà tiến! 🚀',
      'Được lắm! Có tiềm năng đó! ⭐',
      'Nice! Hát thêm vài bài nữa! 🎤',
      'Khá lắm! Sắp lên hạng A rồi! 📈',
      'Giọng ổn định ghê! 👍',
      'Cứ đà này là pro thôi! 💯',
      'Hát vậy là ngon rồi đó! 😊',
      'Tiến bộ rõ rệt luôn! 🌟',
    ]
  };
  if (score >= 60) return {
    grade: 'C', title: 'KHÁ TỐT', emoji: '👍',
    gradient: 'from-blue-300 via-indigo-400 to-violet-400',
    bgGradient: 'from-black via-indigo-950/50 to-black',
    textColor: 'text-blue-300', glowColor: '#60a5fa',
    particles: ['💜', '✨'],
    quotes: [
      'Tạm ổn! Luyện thêm tí nữa! 💪',
      'Được rồi! Cố thêm chút nữa! 🎯',
      'OK đó! Bài sau sẽ hay hơn! 📈',
      'Cũng được! Đừng bỏ cuộc! 🔥',
      'Không tệ! Tiếp tục cố gắng! ✊',
      'Ráng thêm xíu là lên B! 🚀',
      'Hát vui là chính mà! 😄',
      'Cứ thoải mái hát tiếp! 🎵',
      'Đang tiến bộ đó! 👏',
      'Bài sau chắc chắn hay hơn! 🌟',
    ]
  };
  if (score >= 50) return {
    grade: 'D', title: 'CỐ GẮNG THÊM', emoji: '💪',
    gradient: 'from-orange-300 via-amber-400 to-yellow-400',
    bgGradient: 'from-black via-orange-950/50 to-black',
    textColor: 'text-orange-300', glowColor: '#fb923c',
    particles: ['🔥', '💪'],
    quotes: [
      'Cố lên! Ai cũng từng như vậy! 💪',
      'Đừng nản! Hát nhiều sẽ hay! 🎤',
      'Thử bài khác xem sao! 🎵',
      'Luyện tập sẽ tiến bộ thôi! 📈',
      'Chill thôi! Vui là chính! 😎',
      'Hát karaoke mà, relax! 🍻',
      'Bài này khó, thử bài dễ hơn! 🎶',
      'Không sao! Hát cho vui mà! 😄',
      'Cứ hát đi, sẽ hay thôi! 🌟',
      'Đừng lo! Ai mới hát cũng vậy! 🤗',
    ]
  };
  return {
    grade: 'F', title: 'THỬ LẠI NHÉ', emoji: '🎤',
    gradient: 'from-rose-300 via-red-400 to-pink-400',
    bgGradient: 'from-black via-rose-950/50 to-black',
    textColor: 'text-rose-300', glowColor: '#fb7185',
    particles: ['❤️', '🎤'],
    quotes: [
      'Không sao! Vui là được! 😊',
      'Thử bài dễ hơn nha! 🎵',
      'Hát karaoke mà, chill thôi! 🍻',
      'Lần sau sẽ tốt hơn! 💪',
      'Đừng lo! Ai cũng có lúc vậy! 🤗',
      'Mic có vấn đề hay sao á? 🎤😅',
      'Bài này khó quá! Đổi bài đi! 🔄',
      'Hát cho vui thôi mà! 😄',
      'Cứ tự tin hát tiếp! ✊',
      'Quan trọng là vui vẻ! 🎉',
    ]
  };
}

function getRandomQuote(grade: GradeInfo): string {
  return grade.quotes[Math.floor(Math.random() * grade.quotes.length)];
}


// Effect types for random selection
type ScoreEffectType = 'lightBeam' | 'vortex' | 'shatter' | 'matrix' | 'explosion' | 'wave';

// Get random effect type
function getRandomEffect(): ScoreEffectType {
  const effects: ScoreEffectType[] = ['lightBeam', 'vortex', 'shatter', 'matrix', 'explosion', 'wave'];
  return effects[Math.floor(Math.random() * effects.length)];
}

// Neutral color for counting phase (before reveal)
const NEUTRAL_COLOR = '#FFFFFF';

// ============ CINEMATIC SCORE REVEAL - Multiple High-end Effects ============
function CinematicScoreReveal({ target, onComplete, glowColor }: { 
  target: number; 
  onComplete?: () => void; 
  glowColor?: string;
  isHighScore?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [displayValue, setDisplayValue] = useState(0);
  const [phase, setPhase] = useState<'hidden' | 'intro' | 'counting' | 'impact' | 'glow'>('hidden');
  const [effectType] = useState<ScoreEffectType>(() => getRandomEffect());
  const audioRef = useRef<AudioContext | null>(null);
  const onCompleteRef = useRef(onComplete);
  const hasCompletedRef = useRef(false);
  const animationFrameRef = useRef<number>(0);
  
  onCompleteRef.current = onComplete;

  // Use neutral color during counting, reveal actual color on impact/glow
  const finalColor = glowColor || '#FFD700';
  const isRevealed = phase === 'impact' || phase === 'glow';
  const color = isRevealed ? finalColor : NEUTRAL_COLOR;
  
  const isHigh = target >= 80;
  const isSRank = target >= 90;

  // Initialize audio
  useEffect(() => {
    try { 
      audioRef.current = new (window.AudioContext || (window as any).webkitAudioContext)(); 
    } catch {}
    return () => { 
      audioRef.current?.close().catch(() => {}); 
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // Sound effects
  const playSound = useCallback((type: 'tick' | 'boom' | 'fanfare' | 'shimmer') => {
    if (!audioRef.current || audioRef.current.state === 'closed') return;
    const ctx = audioRef.current;
    try {
      if (type === 'tick') {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = 800 + Math.random() * 600;
        g.gain.setValueAtTime(0.08, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
        o.connect(g); g.connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + 0.04);
      } else if (type === 'boom') {
        // Epic impact
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(180, ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(25, ctx.currentTime + 0.6);
        g.gain.setValueAtTime(0.7, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
        o.connect(g); g.connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + 0.7);
      } else if (type === 'fanfare') {
        const notes = isSRank ? [523, 659, 784, 1047, 1319, 1568] : isHigh ? [523, 659, 784, 1047] : [523, 659, 784];
        notes.forEach((f, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'sine'; 
          o.frequency.value = f;
          g.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.08);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.5);
          o.connect(g); g.connect(ctx.destination);
          o.start(ctx.currentTime + i * 0.08);
          o.stop(ctx.currentTime + i * 0.08 + 0.5);
        });
      } else if (type === 'shimmer') {
        // Magical shimmer sound
        for (let i = 0; i < 5; i++) {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'sine';
          o.frequency.value = 2000 + i * 500 + Math.random() * 200;
          g.gain.setValueAtTime(0.03, ctx.currentTime + i * 0.05);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.05 + 0.2);
          o.connect(g); g.connect(ctx.destination);
          o.start(ctx.currentTime + i * 0.05);
          o.stop(ctx.currentTime + i * 0.05 + 0.2);
        }
      }
    } catch {}
  }, [isHigh, isSRank]);

  // Canvas particle effects - different for each effect type
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || (phase !== 'intro' && phase !== 'impact' && phase !== 'glow')) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Use neutral colors for intro, final colors for impact
    const introColors = ['#FFFFFF', '#E0E0E0', '#C0C0C0', '#A0A0A0'];
    const impactColors = [finalColor, finalColor, '#FFFFFF', finalColor];
    const colors = phase === 'intro' ? introColors : impactColors;
    
    interface Particle {
      x: number; y: number; vx: number; vy: number;
      size: number; color: string; life: number; maxLife: number;
      type: string; rotation?: number; delay?: number;
    }
    
    const particles: Particle[] = [];
    
    // Create particles based on effect type
    if (phase === 'intro') {
      if (effectType === 'vortex') {
        for (let i = 0; i < 60; i++) {
          const angle = (i / 60) * Math.PI * 6;
          const dist = 150 - (i / 60) * 140;
          particles.push({ x: centerX + Math.cos(angle) * dist, y: centerY + Math.sin(angle) * dist, vx: 0, vy: 0, size: 3 + Math.random() * 3, color: colors[i % colors.length], life: 1, maxLife: 60, type: 'vortex', rotation: angle, delay: i * 0.5 });
        }
      } else if (effectType === 'matrix') {
        for (let i = 0; i < 30; i++) {
          particles.push({ x: centerX - 100 + Math.random() * 200, y: -20 - Math.random() * 100, vx: 0, vy: 3 + Math.random() * 4, size: 12 + Math.random() * 8, color: color, life: 1, maxLife: 80, type: 'matrix', delay: Math.random() * 30 });
        }
      } else if (effectType === 'shatter') {
        for (let i = 0; i < 25; i++) {
          const angle = Math.random() * Math.PI * 2;
          particles.push({ x: centerX, y: centerY, vx: Math.cos(angle) * (2 + Math.random() * 6), vy: Math.sin(angle) * (2 + Math.random() * 6), size: 15 + Math.random() * 20, color: colors[Math.floor(Math.random() * 3)], life: 1, maxLife: 50, type: 'shatter', rotation: Math.random() * Math.PI * 2 });
        }
      } else if (effectType === 'wave') {
        for (let i = 0; i < 5; i++) {
          particles.push({ x: centerX, y: centerY, vx: 0, vy: 0, size: 10, color: i % 2 === 0 ? color : '#FFFFFF', life: 1, maxLife: 60, type: 'wave', delay: i * 8 });
        }
      }
    }
    
    if (phase === 'impact') {
      for (let i = 0; i < 50; i++) {
        const angle = (Math.PI * 2 * i) / 50 + Math.random() * 0.3;
        const speed = 5 + Math.random() * 12;
        particles.push({ x: centerX, y: centerY, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, size: 2 + Math.random() * 5, color: colors[Math.floor(Math.random() * colors.length)], life: 1, maxLife: 70 + Math.random() * 30, type: 'spark' });
      }
      if (effectType === 'explosion') {
        for (let i = 0; i < 30; i++) {
          const angle = Math.random() * Math.PI * 2;
          particles.push({ x: centerX, y: centerY, vx: Math.cos(angle) * (3 + Math.random() * 5), vy: Math.sin(angle) * (3 + Math.random() * 5) - 3, size: 15 + Math.random() * 20, color: ['#FF4500', '#FF6B00', '#FFD700', '#FFFFFF'][Math.floor(Math.random() * 4)], life: 1, maxLife: 60, type: 'fire' });
        }
      }
      for (let i = 0; i < 3; i++) {
        particles.push({ x: centerX, y: centerY, vx: 0, vy: 0, size: 20 + i * 25, color: i === 0 ? '#FFFFFF' : color, life: 1, maxLife: 45 + i * 10, type: 'ring' });
      }
      if (isHigh) {
        for (let i = 0; i < 10; i++) {
          const angle = (Math.PI * 2 * i) / 10;
          particles.push({ x: centerX, y: centerY, vx: Math.cos(angle) * (3 + Math.random() * 3), vy: Math.sin(angle) * (3 + Math.random() * 3) - 2, size: 12 + Math.random() * 10, color: finalColor, life: 1, maxLife: 90, type: 'star', rotation: 0 });
        }
      }
    }
    
    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, rect.width, rect.height);
      let hasAlive = false;
      
      particles.forEach(p => {
        const effectiveFrame = frame - (p.delay || 0);
        if (effectiveFrame < 0) { hasAlive = true; return; }
        p.life = Math.max(0, 1 - effectiveFrame / p.maxLife);
        if (p.life <= 0) return;
        hasAlive = true;
        ctx.globalAlpha = p.life;
        
        if (p.type === 'vortex') {
          const progress = effectiveFrame / p.maxLife;
          p.x = centerX + Math.cos((p.rotation || 0) + progress * Math.PI * 4) * ((1 - progress) * 150);
          p.y = centerY + Math.sin((p.rotation || 0) + progress * Math.PI * 4) * ((1 - progress) * 150);
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.5 + p.life * 0.5), 0, Math.PI * 2);
          ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 10; ctx.fill();
        } else if (p.type === 'matrix') {
          p.y += p.vy;
          ctx.font = `${p.size}px monospace`; ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 15;
          ctx.fillText(String.fromCharCode(0x30A0 + Math.random() * 96), p.x, p.y);
        } else if (p.type === 'shatter') {
          p.x += p.vx; p.y += p.vy; p.vy += 0.3; p.rotation = (p.rotation || 0) + 0.1;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rotation); ctx.fillStyle = p.color; ctx.globalAlpha = p.life * 0.8;
          ctx.beginPath(); ctx.moveTo(0, -p.size / 2); ctx.lineTo(p.size / 3, p.size / 2); ctx.lineTo(-p.size / 3, p.size / 2); ctx.closePath(); ctx.fill(); ctx.restore();
        } else if (p.type === 'wave') {
          p.size += 4; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.strokeStyle = p.color; ctx.lineWidth = 3 * p.life; ctx.stroke();
        } else if (p.type === 'ring') {
          p.size += 5; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.strokeStyle = p.color; ctx.lineWidth = 4 * p.life; ctx.globalAlpha = p.life * 0.7; ctx.stroke();
        } else if (p.type === 'spark') {
          p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.vx *= 0.98;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 4, p.y - p.vy * 4); ctx.strokeStyle = p.color; ctx.lineWidth = p.size * p.life; ctx.lineCap = 'round'; ctx.stroke();
        } else if (p.type === 'fire') {
          p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.vx *= 0.97; p.size *= 0.98;
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          gradient.addColorStop(0, '#FFFFFF'); gradient.addColorStop(0.3, p.color); gradient.addColorStop(1, 'transparent');
          ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        } else if (p.type === 'star') {
          p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.rotation = (p.rotation || 0) + 0.05;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rotation); ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 15;
          ctx.beginPath(); const size = p.size * p.life;
          for (let i = 0; i < 8; i++) { const r = i % 2 === 0 ? size : size / 3; const angle = (i * Math.PI) / 4; if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r); else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r); }
          ctx.closePath(); ctx.fill(); ctx.restore();
        }
      });
      
      ctx.globalAlpha = 1; ctx.shadowBlur = 0; frame++;
      if (frame < 150 && hasAlive) animationFrameRef.current = requestAnimationFrame(animate);
    };
    animate();
  }, [phase, color, finalColor, isHigh, effectType]);

  // Main animation sequence
  useEffect(() => {
    if (hasCompletedRef.current) return;
    let cancelled = false;
    
    const runAnimation = async () => {
      await new Promise(r => setTimeout(r, 300));
      if (cancelled) return;
      setPhase('intro');
      playSound('shimmer');
      
      await new Promise(r => setTimeout(r, 1000));
      if (cancelled) return;
      setPhase('counting');
      
      const fastTarget = Math.floor(target * 0.5);
      for (let val = 0; val <= fastTarget; val += Math.ceil(target / 12)) {
        if (cancelled) return;
        setDisplayValue(Math.min(val, fastTarget));
        await new Promise(r => setTimeout(r, 70));
      }
      
      const medTarget = Math.floor(target * 0.8);
      for (let val = fastTarget; val <= medTarget; val += Math.ceil(target / 20)) {
        if (cancelled) return;
        setDisplayValue(Math.min(val, medTarget));
        playSound('tick');
        await new Promise(r => setTimeout(r, 100));
      }
      
      for (let val = medTarget; val <= target; val++) {
        if (cancelled) return;
        setDisplayValue(val);
        playSound('tick');
        await new Promise(r => setTimeout(r, 180));
      }
      
      await new Promise(r => setTimeout(r, 400));
      if (cancelled) return;
      setPhase('impact');
      playSound('boom');
      
      await new Promise(r => setTimeout(r, 600));
      if (cancelled) return;
      hasCompletedRef.current = true;
      setPhase('glow');
      playSound('fanfare');
      onCompleteRef.current?.();
    };
    
    runAnimation();
    return () => { cancelled = true; };
  }, [target, playSound]);

  const digits = displayValue.toString().split('');
  const isImpact = phase === 'impact';
  const isGlow = phase === 'glow';
  const isVisible = phase !== 'hidden';

  return (
    <div className="relative inline-block">
      <canvas ref={canvasRef} className="absolute -inset-20 pointer-events-none z-30"
        style={{ width: 'calc(100% + 160px)', height: 'calc(100% + 160px)' }} />
      
      {/* Effect-specific intro visuals */}
      {phase === 'intro' && effectType === 'lightBeam' && (
        <>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-40 -z-10 animate-light-beam-vertical"
            style={{ background: `linear-gradient(to bottom, transparent, ${color}, transparent)`, boxShadow: `0 0 30px 10px ${color}` }} />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-1 -z-10 animate-light-beam-horizontal"
            style={{ background: `linear-gradient(to right, transparent, ${color}, transparent)`, boxShadow: `0 0 30px 10px ${color}` }} />
        </>
      )}
      {phase === 'intro' && effectType === 'vortex' && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 -z-10 animate-spin rounded-full"
          style={{ background: `conic-gradient(from 0deg, transparent, ${color}, transparent, ${color}, transparent)`, filter: 'blur(8px)' }} />
      )}
      {phase === 'intro' && effectType === 'wave' && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 -z-10 animate-ping"
          style={{ backgroundColor: color, borderRadius: '50%', boxShadow: `0 0 40px 20px ${color}` }} />
      )}
      {phase === 'intro' && effectType === 'explosion' && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 -z-10 animate-pulse"
          style={{ background: `radial-gradient(circle, ${color} 0%, transparent 70%)`, filter: 'blur(10px)' }} />
      )}
      
      {(isImpact || isGlow) && (
        <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full -z-10 ${isGlow ? 'animate-pulse-glow' : 'animate-expand-glow'}`}
          style={{ width: 200, height: 200, background: `radial-gradient(circle, ${color}40 0%, transparent 70%)`, boxShadow: `0 0 60px 30px ${color}30` }} />
      )}
      
      <div className={`relative z-10 flex items-baseline justify-center transition-all
        ${phase === 'hidden' ? 'opacity-0 scale-0' : ''}
        ${phase === 'intro' ? 'opacity-0 scale-50' : ''}
        ${phase === 'counting' ? 'opacity-100 scale-100' : ''}
        ${isImpact ? 'opacity-100 scale-125 duration-200' : ''}
        ${isGlow ? 'opacity-100 scale-110 duration-500' : ''}`}>
        {isVisible && digits.map((digit, i) => (
          <span key={i}
            className={`inline-block font-black tabular-nums transition-transform ${isImpact ? 'animate-digit-impact' : ''} ${isGlow ? 'animate-digit-glow' : ''}`}
            style={{
              fontSize: isImpact || isGlow ? '110px' : '90px',
              color: '#FFFFFF',
              textShadow: isImpact || isGlow
                ? `0 0 20px ${color}, 0 0 40px ${color}, 0 0 60px ${color}, 0 0 100px ${color}, 0 6px 0 rgba(0,0,0,0.5)`
                : `0 0 10px ${color}, 0 4px 0 rgba(0,0,0,0.4)`,
              animationDelay: `${i * 0.05}s`,
              letterSpacing: '0.02em',
            }}>
            {digit}
          </span>
        ))}
      </div>
      
      {isImpact && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full animate-flash-burst pointer-events-none z-20"
          style={{ width: 300, height: 300, background: 'radial-gradient(circle, white 0%, transparent 70%)' }} />
      )}
      
      {isGlow && isHigh && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20">
          {[...Array(isSRank ? 16 : 10)].map((_, i) => (
            <div key={i} className="absolute animate-orbit-sparkle"
              style={{ '--orbit-angle': `${(360 / (isSRank ? 16 : 10)) * i}deg`, '--orbit-radius': `${70 + (i % 3) * 15}px`, '--orbit-duration': `${3 + (i % 2)}s`, animationDelay: `${i * 0.1}s` } as React.CSSProperties}>
              <div className="w-2 h-2 rounded-full animate-twinkle"
                style={{ backgroundColor: i % 3 === 0 ? finalColor : i % 3 === 1 ? finalColor : '#FFFFFF', boxShadow: `0 0 8px 2px ${finalColor}` }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Legacy component wrapper for compatibility
function AnimatedScoreDramatic({ target, onComplete, glowColor }: { target: number; onComplete?: () => void; glowColor?: string }) {
  return (
    <CinematicScoreReveal 
      target={target} 
      onComplete={onComplete} 
      glowColor={glowColor}
      isHighScore={target >= 80}
    />
  );
}

// ============ SCORE IMPACT RING - Ring expanding on score reveal ============
function ScoreImpactRing({ color }: { color: string }) {
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="absolute rounded-full animate-score-impact-ring"
          style={{
            width: '100%',
            height: '100%',
            border: `3px solid ${color}`,
            boxShadow: `0 0 20px ${color}`,
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}

// ============ SCORE PARTICLE BURST - Particles exploding from score ============
function ScoreParticleBurst({ color }: { color: string }) {
  const particles = useMemo(() => {
    const colors = [color, '#FFD700', '#FFFFFF', '#FF6B6B', '#4ECDC4'];
    return [...Array(24)].map((_, i) => ({
      id: i,
      angle: (i * 15) * (Math.PI / 180),
      distance: 60 + Math.random() * 80,
      size: 4 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.2,
    }));
  }, [color]);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute left-1/2 top-1/2 rounded-full animate-score-particle-burst"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 10px ${p.color}, 0 0 20px ${p.color}`,
            '--burst-x': `${Math.cos(p.angle) * p.distance}px`,
            '--burst-y': `${Math.sin(p.angle) * p.distance}px`,
            animationDelay: `${p.delay}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}


// ============ EPIC PARTICLE EXPLOSION - Canvas-based for performance ============
function EpicParticleExplosion({ show, color }: { show: boolean; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!show || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const particles: Array<{
      x: number; y: number; vx: number; vy: number;
      size: number; color: string; life: number; maxLife: number;
      type: 'circle' | 'star' | 'spark' | 'ring';
      rotation: number; rotationSpeed: number;
    }> = [];
    
    const colors = [color, '#FFD700', '#FF6B6B', '#4ECDC4', '#A855F7', '#FFFFFF', '#FF1493', '#00FF7F'];
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Create massive explosion particles
    for (let wave = 0; wave < 4; wave++) {
      const waveDelay = wave * 5;
      for (let i = 0; i < 60; i++) {
        const angle = (Math.PI * 2 * i) / 60 + Math.random() * 0.3;
        const speed = (10 + Math.random() * 20) * (1 - wave * 0.15);
        particles.push({
          x: centerX,
          y: centerY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 4 + Math.random() * 10,
          color: colors[Math.floor(Math.random() * colors.length)],
          life: 1,
          maxLife: 80 + Math.random() * 50 + waveDelay,
          type: ['circle', 'star', 'spark', 'ring'][Math.floor(Math.random() * 4)] as any,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.3,
        });
      }
    }
    
    // Add special golden particles
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 5 + Math.random() * 15;
      particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 5,
        size: 6 + Math.random() * 8,
        color: '#FFD700',
        life: 1,
        maxLife: 100 + Math.random() * 40,
        type: 'star',
        rotation: 0,
        rotationSpeed: 0.1,
      });
    }
    
    // Add expanding rings
    for (let ring = 0; ring < 5; ring++) {
      for (let i = 0; i < 50; i++) {
        const angle = (Math.PI * 2 * i) / 50;
        const speed = 4 + ring * 3;
        particles.push({
          x: centerX,
          y: centerY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 3,
          color: ring % 2 === 0 ? color : '#FFFFFF',
          life: 1,
          maxLife: 60 + ring * 15,
          type: 'ring',
          rotation: 0,
          rotationSpeed: 0,
        });
      }
    }
    
    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      let hasAlive = false;
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12; // gravity
        p.vx *= 0.985; // friction
        p.rotation += p.rotationSpeed;
        p.life = Math.max(0, 1 - frame / p.maxLife);
        
        if (p.life <= 0) return;
        hasAlive = true;
        
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 15;
        
        const size = p.size * p.life;
        
        if (p.type === 'star') {
          // Draw 4-point star
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const r = i % 2 === 0 ? size : size / 3;
            const angle = (i * Math.PI) / 4;
            if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
            else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
          }
          ctx.closePath();
          ctx.fill();
        } else if (p.type === 'spark') {
          // Draw spark with trail
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-p.vx * 4, -p.vy * 4);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = size / 2;
          ctx.lineCap = 'round';
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'ring') {
          // Draw ring particle
          ctx.beginPath();
          ctx.arc(0, 0, size, 0, Math.PI * 2);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          // Draw glowing circle
          const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
          gradient.addColorStop(0, '#FFFFFF');
          gradient.addColorStop(0.3, p.color);
          gradient.addColorStop(1, 'transparent');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(0, 0, size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });
      
      frame++;
      if (frame < 150 && hasAlive) requestAnimationFrame(animate);
    };
    
    animate();
  }, [show, color]);

  if (!show) return null;
  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-30" />;
}

// ============ FIREWORK CANVAS - Beautiful fireworks as background ============
function FireworkCanvas({ show, intensity = 'high' }: { show: boolean; intensity?: 'low' | 'medium' | 'high' }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  
  useEffect(() => {
    if (!show || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    interface Particle {
      x: number; y: number; vx: number; vy: number;
      life: number; color: string; size: number;
      type: 'normal' | 'sparkle';
    }
    
    interface Firework {
      x: number; y: number; targetY: number; vy: number;
      color: string; exploded: boolean;
      particles: Particle[];
    }
    
    const fireworks: Firework[] = [];
    
    const colors = [
      '#FFD700', '#FF6B6B', '#4ECDC4', '#A855F7', '#F472B6', 
      '#22D3EE', '#10B981', '#FF4500', '#00FF7F'
    ];
    const maxFireworks = intensity === 'high' ? 8 : intensity === 'medium' ? 5 : 3;
    const spawnRate = intensity === 'high' ? 40 : intensity === 'medium' ? 60 : 90;
    
    const createFirework = () => {
      if (fireworks.length < maxFireworks) {
        fireworks.push({
          x: Math.random() * canvas.width * 0.7 + canvas.width * 0.15,
          y: canvas.height + 10,
          targetY: Math.random() * canvas.height * 0.4 + canvas.height * 0.1,
          vy: -12 - Math.random() * 5,
          color: colors[Math.floor(Math.random() * colors.length)],
          exploded: false,
          particles: [],
        });
      }
    };
    
    const createExplosion = (fw: Firework) => {
      const particleCount = 80;
      const baseColor = fw.color;
      
      // Main burst
      for (let j = 0; j < particleCount; j++) {
        const angle = (Math.PI * 2 * j) / particleCount + Math.random() * 0.2;
        const speed = 3 + Math.random() * 6;
        fw.particles.push({
          x: fw.x, y: fw.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          color: Math.random() > 0.2 ? baseColor : '#FFFFFF',
          size: 2 + Math.random() * 3,
          type: Math.random() > 0.8 ? 'sparkle' : 'normal',
        });
      }
      
      // Inner ring
      for (let j = 0; j < 20; j++) {
        const angle = (Math.PI * 2 * j) / 20;
        fw.particles.push({
          x: fw.x, y: fw.y,
          vx: Math.cos(angle) * 2,
          vy: Math.sin(angle) * 2,
          life: 1,
          color: '#FFFFFF',
          size: 3,
          type: 'sparkle',
        });
      }
    };
    
    let frame = 0;
    const animate = () => {
      // Fade effect for trails
      ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      if (frame % spawnRate === 0) createFirework();
      
      for (let i = fireworks.length - 1; i >= 0; i--) {
        const fw = fireworks[i];
        
        if (!fw.exploded) {
          fw.y += fw.vy;
          fw.vy += 0.2;
          
          // Draw rising rocket with glow
          ctx.beginPath();
          ctx.arc(fw.x, fw.y, 3, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.shadowColor = fw.color;
          ctx.shadowBlur = 15;
          ctx.fill();
          
          // Simple trail
          ctx.beginPath();
          ctx.moveTo(fw.x, fw.y);
          ctx.lineTo(fw.x, fw.y + 15);
          ctx.strokeStyle = fw.color + '80';
          ctx.lineWidth = 2;
          ctx.stroke();
          
          if (fw.y <= fw.targetY || fw.vy >= 0) {
            fw.exploded = true;
            createExplosion(fw);
          }
        } else {
          let hasAlive = false;
          fw.particles.forEach((p) => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.08;
            p.vx *= 0.98;
            p.life -= 0.018;
            
            if (p.life > 0) {
              hasAlive = true;
              
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
              ctx.fillStyle = p.color;
              ctx.globalAlpha = p.life * 0.9;
              ctx.shadowColor = p.color;
              ctx.shadowBlur = p.type === 'sparkle' ? 15 : 8;
              ctx.fill();
              ctx.globalAlpha = 1;
            }
          });
          
          if (!hasAlive) {
            fireworks.splice(i, 1);
          }
        }
      }
      
      ctx.shadowBlur = 0;
      frame++;
      animationRef.current = requestAnimationFrame(animate);
    };
    
    // Start with a couple fireworks
    createFirework();
    const fireworkTimer = setTimeout(createFirework, 300);
    animate();
    
    return () => {
      clearTimeout(fireworkTimer);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [show, intensity]);

  if (!show) return null;
  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }} />;
}

// ============ SPOTLIGHT BEAMS - Beautiful stage spotlights ============
function SpotlightBeams({ color }: { color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const beams = [
      { x: canvas.width * 0.15, phase: 0, speed: 0.015, color: color },
      { x: canvas.width * 0.35, phase: Math.PI * 0.5, speed: 0.02, color: '#FFD700' },
      { x: canvas.width * 0.65, phase: Math.PI, speed: 0.018, color: color },
      { x: canvas.width * 0.85, phase: Math.PI * 1.5, speed: 0.022, color: '#FF6B6B' },
    ];
    
    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      beams.forEach(beam => {
        const swing = Math.sin(frame * beam.speed + beam.phase) * 0.4;
        const angle = Math.PI / 2 + swing;
        
        // Create gradient for beam
        const gradient = ctx.createLinearGradient(
          beam.x, 0,
          beam.x + Math.cos(angle) * canvas.height,
          Math.sin(angle) * canvas.height
        );
        gradient.addColorStop(0, beam.color + 'AA');
        gradient.addColorStop(0.3, beam.color + '40');
        gradient.addColorStop(1, 'transparent');
        
        ctx.save();
        ctx.globalAlpha = 0.5;
        
        // Draw cone
        ctx.beginPath();
        ctx.moveTo(beam.x - 15, 0);
        ctx.lineTo(beam.x + 15, 0);
        const endX = beam.x + Math.cos(angle) * canvas.height * 1.2;
        const endY = Math.sin(angle) * canvas.height * 1.2;
        ctx.lineTo(endX + 150, endY);
        ctx.lineTo(endX - 150, endY);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Light source glow
        ctx.beginPath();
        ctx.arc(beam.x, 5, 12, 0, Math.PI * 2);
        ctx.fillStyle = beam.color;
        ctx.shadowColor = beam.color;
        ctx.shadowBlur = 25;
        ctx.globalAlpha = 0.9;
        ctx.fill();
        
        ctx.restore();
      });
      
      frame++;
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [color]);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 2 }} />;
}

// ============ GLOWING ORBS - Floating light orbs ============
function GlowingOrbs({ color, count = 8 }: { color: string; count?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const colors = [color, '#FFD700', '#FF6B6B', '#4ECDC4', '#A855F7'];
    
    const orbs = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: canvas.height + 50 + Math.random() * 100,
      vx: (Math.random() - 0.5) * 0.8,
      vy: -1 - Math.random() * 1.5,
      size: 15 + Math.random() * 25,
      color: colors[Math.floor(Math.random() * colors.length)],
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: 0.03 + Math.random() * 0.02,
    }));
    
    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      orbs.forEach(orb => {
        orb.x += orb.vx + Math.sin(frame * 0.02 + orb.pulse) * 0.5;
        orb.y += orb.vy;
        orb.pulse += orb.pulseSpeed;
        
        // Reset if off screen
        if (orb.y < -100) {
          orb.y = canvas.height + 50;
          orb.x = Math.random() * canvas.width;
        }
        
        const pulseSize = orb.size * (0.8 + Math.sin(orb.pulse) * 0.2);
        
        // Outer glow
        const gradient = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, pulseSize * 2);
        gradient.addColorStop(0, orb.color + '60');
        gradient.addColorStop(0.5, orb.color + '20');
        gradient.addColorStop(1, 'transparent');
        
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, pulseSize * 2, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Inner bright core
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, pulseSize * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = orb.color;
        ctx.shadowBlur = 20;
        ctx.fill();
        ctx.shadowBlur = 0;
      });
      
      frame++;
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [color, count]);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 3 }} />;
}

// ============ SCORE PULSE RINGS - Pulsing rings around score area ============
function ScorePulseRings({ show, color }: { show: boolean; color: string }) {
  if (!show) return null;
  
  return (
    <div className="absolute right-[20%] top-1/2 -translate-y-1/2 pointer-events-none">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full animate-score-pulse-ring"
          style={{
            width: '200px',
            height: '200px',
            border: `3px solid ${color}`,
            boxShadow: `0 0 20px ${color}, inset 0 0 20px ${color}40`,
            animationDelay: `${i * 0.4}s`,
          }}
        />
      ))}
    </div>
  );
}

// ============ MEGA CELEBRATION - Ultimate effect for high scores ============
function MegaCelebration({ show, grade }: { show: boolean; grade: GradeInfo }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!show || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Flying emojis
    const emojis: Array<{
      emoji: string; x: number; y: number; vx: number; vy: number;
      size: number; rotation: number; rotationSpeed: number; life: number;
    }> = [];
    
    // Spotlight beams
    const beams: Array<{
      x: number; angle: number; width: number; color: string; speed: number;
    }> = [];
    
    // Create flying emojis
    for (let i = 0; i < 25; i++) {
      emojis.push({
        emoji: grade.particles[i % grade.particles.length],
        x: Math.random() * canvas.width,
        y: canvas.height + 50 + Math.random() * 200,
        vx: (Math.random() - 0.5) * 4,
        vy: -8 - Math.random() * 8,
        size: 30 + Math.random() * 40,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        life: 1,
      });
    }
    
    // Create spotlight beams
    for (let i = 0; i < 6; i++) {
      beams.push({
        x: (canvas.width / 7) * (i + 1),
        angle: -Math.PI / 2 + (Math.random() - 0.5) * 0.5,
        width: 80 + Math.random() * 60,
        color: grade.glowColor,
        speed: 0.01 + Math.random() * 0.02,
      });
    }
    
    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw spotlight beams
      beams.forEach(beam => {
        beam.angle += Math.sin(frame * beam.speed) * 0.02;
        
        const gradient = ctx.createLinearGradient(
          beam.x, 0,
          beam.x + Math.cos(beam.angle) * 600, Math.sin(beam.angle) * 600
        );
        gradient.addColorStop(0, beam.color + '80');
        gradient.addColorStop(0.5, beam.color + '40');
        gradient.addColorStop(1, 'transparent');
        
        ctx.save();
        ctx.translate(beam.x, 0);
        ctx.rotate(beam.angle + Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(-beam.width / 2, 0);
        ctx.lineTo(beam.width / 2, 0);
        ctx.lineTo(beam.width * 2, 800);
        ctx.lineTo(-beam.width * 2, 800);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.globalAlpha = 0.4;
        ctx.fill();
        ctx.restore();
      });
      
      ctx.globalAlpha = 1;
      
      // Draw flying emojis
      emojis.forEach((e, i) => {
        e.x += e.vx;
        e.y += e.vy;
        e.vy += 0.05; // slight gravity
        e.rotation += e.rotationSpeed;
        e.life -= 0.005;
        
        if (e.y < -100 || e.life <= 0) {
          // Reset emoji
          e.x = Math.random() * canvas.width;
          e.y = canvas.height + 50;
          e.vy = -8 - Math.random() * 8;
          e.life = 1;
        }
        
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.rotation);
        ctx.globalAlpha = Math.min(1, e.life * 2);
        ctx.font = `${e.size}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(e.emoji, 0, 0);
        ctx.restore();
      });
      
      frame++;
      if (frame < 300) requestAnimationFrame(animate);
    };
    
    animate();
  }, [show, grade]);

  if (!show) return null;
  return (
    <>
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-20" />
      {/* Screen shake effect via CSS */}
      <div className="absolute inset-0 animate-screen-shake pointer-events-none" />
    </>
  );
}

// ============ STAGE LIGHTS - Concert-style moving lights ============
function StageLights({ color }: { color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    interface Light {
      x: number; baseAngle: number; swingSpeed: number;
      color: string; width: number; intensity: number;
    }
    
    const lights: Light[] = [];
    const colors = [color, '#FF6B6B', '#4ECDC4', '#FFD700', '#A855F7', '#F472B6', '#22D3EE'];
    
    // Create stage lights
    for (let i = 0; i < 8; i++) {
      lights.push({
        x: (canvas.width / 9) * (i + 1),
        baseAngle: Math.PI / 2,
        swingSpeed: 0.02 + Math.random() * 0.02,
        color: colors[i % colors.length],
        width: 100 + Math.random() * 80,
        intensity: 0.3 + Math.random() * 0.3,
      });
    }
    
    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      lights.forEach((light, i) => {
        const angle = light.baseAngle + Math.sin(frame * light.swingSpeed + i * 0.5) * 0.6;
        const length = canvas.height * 1.2;
        
        const endX = light.x + Math.cos(angle) * length;
        const endY = Math.sin(angle) * length;
        
        // Create cone gradient
        const gradient = ctx.createLinearGradient(light.x, 0, endX, endY);
        gradient.addColorStop(0, light.color + 'CC');
        gradient.addColorStop(0.3, light.color + '60');
        gradient.addColorStop(0.7, light.color + '20');
        gradient.addColorStop(1, 'transparent');
        
        // Draw light cone
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(light.x - 20, 0);
        ctx.lineTo(light.x + 20, 0);
        ctx.lineTo(endX + light.width, endY);
        ctx.lineTo(endX - light.width, endY);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.globalAlpha = light.intensity * (0.6 + Math.sin(frame * 0.05 + i) * 0.4);
        ctx.fill();
        
        // Draw light source
        ctx.beginPath();
        ctx.arc(light.x, 10, 15, 0, Math.PI * 2);
        ctx.fillStyle = light.color;
        ctx.shadowColor = light.color;
        ctx.shadowBlur = 30;
        ctx.globalAlpha = 0.9;
        ctx.fill();
        ctx.restore();
      });
      
      frame++;
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [color]);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 2 }} />;
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  
  useEffect(() => {
    if (!show || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    interface Star {
      x: number; y: number; vx: number; vy: number;
      size: number; life: number; maxLife: number;
      color: string; trail: Array<{x: number; y: number}>;
    }
    
    const stars: Star[] = [];
    const colors = ['#FFFFFF', '#FFD700', '#87CEEB', '#FF69B4', '#00FF7F'];
    
    const createStar = () => {
      const startX = Math.random() * canvas.width * 0.3;
      const startY = Math.random() * canvas.height * 0.4;
      const speed = 15 + Math.random() * 10;
      const angle = Math.PI / 4 + (Math.random() - 0.5) * 0.3;
      
      stars.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3,
        life: 1,
        maxLife: 60 + Math.random() * 40,
        color: colors[Math.floor(Math.random() * colors.length)],
        trail: [],
      });
    };
    
    let frame = 0;
    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      if (frame % 25 === 0 && stars.length < 8) {
        createStar();
      }
      
      for (let i = stars.length - 1; i >= 0; i--) {
        const star = stars[i];
        
        // Store trail
        star.trail.push({x: star.x, y: star.y});
        if (star.trail.length > 30) star.trail.shift();
        
        star.x += star.vx;
        star.y += star.vy;
        star.life = Math.max(0, 1 - frame / star.maxLife);
        
        // Draw trail with gradient
        if (star.trail.length > 1) {
          const gradient = ctx.createLinearGradient(
            star.trail[0].x, star.trail[0].y,
            star.x, star.y
          );
          gradient.addColorStop(0, 'transparent');
          gradient.addColorStop(0.5, star.color + '60');
          gradient.addColorStop(1, star.color);
          
          ctx.beginPath();
          ctx.moveTo(star.trail[0].x, star.trail[0].y);
          for (let t = 1; t < star.trail.length; t++) {
            ctx.lineTo(star.trail[t].x, star.trail[t].y);
          }
          ctx.lineTo(star.x, star.y);
          ctx.strokeStyle = gradient;
          ctx.lineWidth = star.size;
          ctx.lineCap = 'round';
          ctx.stroke();
        }
        
        // Draw star head with glow
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = star.color;
        ctx.shadowBlur = 20;
        ctx.fill();
        
        // Remove if off screen or dead
        if (star.x > canvas.width + 50 || star.y > canvas.height + 50 || star.life <= 0) {
          stars.splice(i, 1);
        }
      }
      
      ctx.shadowBlur = 0;
      frame++;
      animationRef.current = requestAnimationFrame(animate);
    };
    
    createStar();
    createStar();
    animate();
    
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [show]);

  if (!show) return null;
  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 4 }} />;
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
  const count = intensity === 'high' ? 30 : intensity === 'normal' ? 20 : 12;
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    interface Laser {
      y: number; speed: number; width: number; color: string;
      direction: 1 | -1; opacity: number;
    }
    
    const lasers: Laser[] = [];
    const colors = [color, '#FF6B6B', '#4ECDC4', '#FFD700', '#A855F7', '#22D3EE'];
    
    // Create initial lasers
    for (let i = 0; i < 12; i++) {
      lasers.push({
        y: (canvas.height / 12) * i + Math.random() * 50,
        speed: 8 + Math.random() * 12,
        width: 2 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        direction: Math.random() > 0.5 ? 1 : -1,
        opacity: 0.4 + Math.random() * 0.4,
      });
    }
    
    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      lasers.forEach((laser, i) => {
        const x = laser.direction === 1 
          ? ((frame * laser.speed) % (canvas.width + 400)) - 200
          : canvas.width - ((frame * laser.speed) % (canvas.width + 400)) + 200;
        
        // Draw laser beam with glow
        const gradient = ctx.createLinearGradient(
          laser.direction === 1 ? x - 200 : x + 200, laser.y,
          x, laser.y
        );
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.3, laser.color + '60');
        gradient.addColorStop(0.5, laser.color);
        gradient.addColorStop(0.7, laser.color + '60');
        gradient.addColorStop(1, 'transparent');
        
        ctx.beginPath();
        ctx.moveTo(laser.direction === 1 ? x - 300 : x + 300, laser.y);
        ctx.lineTo(x, laser.y);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = laser.width;
        ctx.lineCap = 'round';
        ctx.globalAlpha = laser.opacity * (0.5 + Math.sin(frame * 0.1 + i) * 0.5);
        ctx.shadowColor = laser.color;
        ctx.shadowBlur = 20;
        ctx.stroke();
        
        // Draw bright head
        ctx.beginPath();
        ctx.arc(x, laser.y, laser.width * 2, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.globalAlpha = laser.opacity;
        ctx.fill();
      });
      
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      frame++;
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [color]);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 3 }} />;
}

// ============ FIREWORK BURSTS - Continuous fireworks ============
function FireworkBursts({ show, color }: { show: boolean; color: string }) {
  const [bursts, setBursts] = useState<Array<{ id: number; x: number; y: number; color: string; size: number }>>([]);
  
  useEffect(() => {
    if (!show) return;
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#A855F7', '#F472B6', '#22D3EE', '#10B981'];
    let id = 0;
    const timers: NodeJS.Timeout[] = [];
    
    const addBurst = () => {
      setBursts(prev => {
        const newBurst = { id: id++, x: 10 + Math.random() * 80, y: 8 + Math.random() * 45,
          color: colors[Math.floor(Math.random() * colors.length)], size: 80 + Math.random() * 60 };
        return [...prev.slice(-8), newBurst];
      });
    };
    
    addBurst();
    timers.push(setTimeout(addBurst, 150));
    timers.push(setTimeout(addBurst, 300));
    timers.push(setTimeout(addBurst, 500));
    const interval = setInterval(addBurst, 600);
    return () => {
      timers.forEach(t => clearTimeout(t));
      clearInterval(interval);
    };
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  
  useEffect(() => {
    if (!show || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    interface GoldParticle {
      x: number; y: number; vy: number; vx: number;
      size: number; rotation: number; rotationSpeed: number;
      shimmer: number;
    }
    
    const particles: GoldParticle[] = [];
    
    // Create golden particles - reduced count
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -50 - Math.random() * 300,
        vy: 2 + Math.random() * 3,
        vx: (Math.random() - 0.5) * 1,
        size: 8 + Math.random() * 12,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.08,
        shimmer: Math.random() * Math.PI * 2,
      });
    }
    
    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(p => {
        p.y += p.vy;
        p.x += p.vx + Math.sin(frame * 0.02 + p.shimmer) * 0.3;
        p.rotation += p.rotationSpeed;
        p.shimmer += 0.08;
        
        // Reset if off screen
        if (p.y > canvas.height + 50) {
          p.y = -30;
          p.x = Math.random() * canvas.width;
        }
        
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        
        const shimmerIntensity = 0.6 + Math.sin(p.shimmer) * 0.4;
        ctx.globalAlpha = shimmerIntensity;
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 10;
        
        // Draw 4-point star
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const r = i % 2 === 0 ? p.size : p.size / 3;
          const angle = (i * Math.PI) / 4;
          if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
          else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
      });
      
      frame++;
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [show]);

  if (!show) return null;
  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 6 }} />;
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

// ============ SHOCKWAVE EFFECT - Expanding ring ============
function ShockwaveEffect({ show, color }: { show: boolean; color: string }) {
  if (!show) return null;
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-25">
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i} className="absolute rounded-full animate-shockwave"
          style={{ 
            border: `${4 - i * 0.5}px solid ${color}`,
            boxShadow: `0 0 ${30 - i * 5}px ${color}, inset 0 0 ${20 - i * 3}px ${color}40`,
            animationDelay: `${i * 0.15}s`,
          }} />
      ))}
    </div>
  );
}

// ============ LIGHT BURST - Radial light rays ============
function LightBurst({ show, color }: { show: boolean; color: string }) {
  if (!show) return null;
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-15">
      <div className="relative w-full h-full">
        {[...Array(36)].map((_, i) => (
          <div key={i} className="absolute left-1/2 top-1/2 origin-bottom animate-light-ray"
            style={{
              width: '4px',
              height: '50vh',
              background: `linear-gradient(to top, ${color}80, ${color}40, transparent)`,
              transform: `translate(-50%, -100%) rotate(${i * 10}deg)`,
              animationDelay: `${i * 0.02}s`,
            }} />
        ))}
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
  /** Play song immediately (TV priority) */
  onPlayNow?: (song: Song) => void;
  onSearch?: () => void;
  onHome?: () => void;
}

export function TVSongResultScreen({ song, finalScore, onNext, hasNextSong, onGetSuggestions, onAddToQueue, onPlayNow, onSearch, onHome }: Props) {
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
  
  // TV Priority: Play song immediately when selected from suggestions
  const handleAddSuggestion = useCallback((s: Song) => {
    // If onPlayNow is provided, play immediately (TV priority)
    if (onPlayNow) {
      onPlayNow(s);
      return;
    }
    // Fallback to adding to queue
    if (!onAddToQueue) return;
    onAddToQueue(s);
    setAddedIds(prev => new Set(prev).add(s.youtubeId));
  }, [onPlayNow, onAddToQueue]);

  // Fire confetti celebration
  const confettiInstanceRef = useRef<confetti.CreateTypes | null>(null);
  
  const fireConfetti = useCallback(() => {
    if (!canvasRef.current || confettiDone.current) return;
    confettiDone.current = true;
    
    // Create confetti instance only once, without useWorker to avoid canvas transfer issues
    if (!confettiInstanceRef.current) {
      confettiInstanceRef.current = confetti.create(canvasRef.current, { resize: true, useWorker: false });
    }
    const c = confettiInstanceRef.current;
    const timers: NodeJS.Timeout[] = [];

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
      timers.push(setTimeout(() => c({ particleCount: 80, spread: 100, origin: { x: 0.5, y: 0.5 }, startVelocity: 45, colors: ['#ffd700', '#ff6b6b'] }), 100));
      timers.push(setTimeout(() => c({ particleCount: 60, spread: 80, origin: { x: 0.3, y: 0.4 }, startVelocity: 35 }), 600));
      timers.push(setTimeout(() => c({ particleCount: 60, spread: 80, origin: { x: 0.7, y: 0.4 }, startVelocity: 35 }), 1000));
      timers.push(setTimeout(() => c({ particleCount: 100, spread: 120, origin: { x: 0.5, y: 0.6 }, startVelocity: 50, shapes: ['star'], colors: ['#ffd700', '#ffec8b'] }), 1500));
      timers.push(setTimeout(() => c({ particleCount: 80, spread: 360, origin: { x: 0.5, y: 0.5 }, startVelocity: 40 }), 2200));
      if (isSRank) {
        timers.push(setTimeout(() => c({ particleCount: 120, spread: 360, origin: { x: 0.5, y: 0.5 }, startVelocity: 55, gravity: 0.6, colors: ['#ffd700', '#ffec8b', '#fff'] }), 3000));
      }
    } else if (finalScore && finalScore.totalScore >= 60) {
      c({ particleCount: 50, spread: 60, origin: { x: 0.5, y: 0.6 }, colors: ['#6bcb77', '#4d96ff'] });
      timers.push(setTimeout(() => c({ particleCount: 40, spread: 50, origin: { x: 0.5, y: 0.5 } }), 400));
    }
    
    return () => {
      timers.forEach(t => clearTimeout(t));
    };
  }, [isHigh, isSRank, finalScore]);

  // Setup canvas size once on mount (no resize listener to avoid offscreen canvas issues)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
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
  
  // Neutral color for suspense - only show grade color after reveal
  const NEUTRAL_GLOW = '#94a3b8'; // slate-400
  const currentGlowColor = isRevealed ? (grade?.glowColor || NEUTRAL_GLOW) : NEUTRAL_GLOW;
  const currentGradient = isRevealed ? (grade?.gradient || 'from-slate-400 to-slate-500') : 'from-slate-400 to-slate-500';

  return (
    <NavigationGrid className="h-screen w-screen relative overflow-hidden bg-black">
      {/* Confetti canvas */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50" style={{ width: '100vw', height: '100vh' }} />
      
      {grade && (
        <>
          {/* Background effects - subtle ambient */}
          <AmbientGlow color={currentGlowColor} />
          <SparkleField intensity={isHigh ? 'normal' : 'low'} />
          
          {/* Spotlight beams for high scores - only after reveal */}
          {isHigh && isRevealed && <SpotlightBeams color={currentGlowColor} />}
          
          {/* Glowing orbs floating up - only after reveal */}
          {isHigh && isRevealed && <GlowingOrbs color={currentGlowColor} count={isSRank ? 10 : 6} />}
          
          {/* Firework background - main effect for high scores - only after reveal */}
          {isHigh && isRevealed && <FireworkCanvas show={true} intensity={isSRank ? 'high' : 'medium'} />}
          
          {/* Neon border for high scores - only after reveal */}
          {isHigh && isRevealed && <NeonBorder color={currentGlowColor} isHigh={isHigh} />}
          
          {/* S Rank special - golden rain and trophy */}
          {isSRank && <GoldenRain show={isRevealed} />}
          {isSRank && <SpinningTrophy show={isRevealed} />}
          
          {/* Score reveal effects */}
          <ScorePulseRings show={isRevealed && isHigh} color={currentGlowColor} />
          <ShockwaveEffect show={isRevealed} color={currentGlowColor} />
          <MegaFlash show={isRevealed} color={currentGlowColor} />
        </>
      )}

      {/* Main content */}
      <div className={`relative z-10 h-full flex flex-col p-6 transition-all duration-700 ${phase !== 'enter' ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
        <div className="flex items-center gap-8 flex-1">
          
          {/* Thumbnail with glow */}
          <div className="flex-shrink-0 relative">
            {grade && (
              <div className={`absolute inset-0 rounded-2xl blur-[50px] opacity-60 animate-pulse-slow transition-colors duration-1000`}
                style={{ backgroundColor: currentGlowColor, transform: 'scale(1.2)' }} />
            )}
            <div className={`relative p-1.5 rounded-2xl bg-gradient-to-br ${currentGradient} shadow-2xl transition-all duration-1000`}
              style={{ boxShadow: `0 0 50px ${currentGlowColor}` }}>
              <img src={song.song.thumbnail} alt="" className="w-72 h-40 rounded-xl object-cover" />
              {/* Grade badge */}
              {grade && (
                <div className={`absolute -bottom-4 -right-4 w-16 h-16 rounded-full bg-gradient-to-br ${currentGradient} 
                  flex items-center justify-center shadow-2xl border-4 border-black z-20 transition-all duration-1000
                  ${isRevealed && isHigh ? 'animate-bounce' : ''}`}
                  style={{ boxShadow: `0 0 30px ${currentGlowColor}, 0 0 60px ${currentGlowColor}50` }}>
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
                <h1 className={`text-xl font-black mb-3 bg-gradient-to-r ${currentGradient} bg-clip-text text-transparent flex items-center gap-2 drop-shadow-lg transition-all duration-1000`}
                  style={{ filter: `drop-shadow(0 0 15px ${currentGlowColor})` }}>
                  <span className={`text-2xl ${isRevealed && isHigh ? 'animate-bounce' : ''}`}>{grade.emoji}</span>
                  <span>{grade.title}</span>
                </h1>

                {/* Score display */}
                <div className="relative mb-5">
                  <FloatingCrown show={isRevealed && isSRank} />
                  
                  <div className={`flex items-baseline gap-3 ${isRevealed && isSRank ? 'animate-victory-dance' : ''}`}>
                    <span className={`font-black ${isRevealed ? 'animate-score-celebrate' : ''}`}
                      style={{ 
                        fontSize: isSRank ? '90px' : '80px',
                        color: '#FFFFFF',
                        textShadow: `
                          0 0 15px ${currentGlowColor},
                          0 0 30px ${currentGlowColor},
                          0 0 60px ${currentGlowColor},
                          0 0 100px ${currentGlowColor},
                          0 5px 0 rgba(0,0,0,0.5)
                        `,
                        lineHeight: 1,
                        letterSpacing: '0.05em',
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        fontWeight: 900,
                      }}>
                      <AnimatedScoreDramatic 
                        key={`score-${finalScore.totalScore}`}
                        target={finalScore.totalScore} 
                        glowColor={currentGlowColor} 
                        onComplete={() => { setPhase('revealed'); fireConfetti(); }} 
                      />
                    </span>
                    <span className="text-2xl text-white font-bold" style={{ textShadow: '0 3px 15px rgba(0,0,0,0.8)' }}>điểm</span>
                  </div>
                  
                  {/* Grade badge */}
                  <div className={`mt-4 transition-all duration-500 ${isRevealed ? 'opacity-100 animate-zoom-in-bounce' : 'opacity-0'}`}>
                    <span className={`inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r ${currentGradient} 
                      text-white font-black shadow-2xl text-base border-2 border-white/30 transition-all duration-1000 ${isRevealed && isHigh ? 'animate-electric-pulse' : ''}`}
                      style={{ boxShadow: `0 0 30px ${currentGlowColor}, 0 0 60px ${currentGlowColor}50` }}>
                      <span className="text-xl">{grade.emoji}</span> Hạng {grade.grade}
                    </span>
                  </div>
                  
                  {/* Quote */}
                  <div className={`mt-3 transition-all duration-700 delay-300 ${isRevealed ? 'opacity-100' : 'opacity-0'}`}>
                    <p className={`text-base text-white font-medium ${isRevealed && isSRank ? 'animate-rainbow' : ''}`}
                      style={{ textShadow: '0 2px 15px rgba(0,0,0,0.8)' }}>
                      &ldquo;{quote}&rdquo;
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

            {/* Navigation buttons - dynamic based on queue */}
            <div className="flex gap-4">
              <FocusableButton row={0} col={0} onSelect={onSearch || onNext} autoFocus={!hasNextSong} variant="primary"
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>}
                className={`!px-6 !py-3 !text-base !font-bold !rounded-xl transition-all duration-1000 ${isHigh && isRevealed ? `!bg-gradient-to-r ${currentGradient}` : ''}`}>
                Tìm kiếm
              </FocusableButton>
              {hasNextSong ? (
                <FocusableButton row={0} col={1} onSelect={onNext} autoFocus variant="secondary"
                  icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>}
                  className="!px-6 !py-3 !text-base !font-bold !rounded-xl">
                  Bài tiếp theo
                </FocusableButton>
              ) : (
                <FocusableButton row={0} col={1} onSelect={onHome || onNext} variant="secondary"
                  icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>}
                  className="!px-6 !py-3 !text-base !font-bold !rounded-xl">
                  Về trang chủ
                </FocusableButton>
              )}
            </div>
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
