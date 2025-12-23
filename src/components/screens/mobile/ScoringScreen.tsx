'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { QueueItem } from '@/types/queue';

export interface ScoringScreenProps {
  currentSong: QueueItem;
  onSendScore: (score: { pitchAccuracy: number; timing: number; totalScore: number }) => void;
  onSendFeedback: (feedback: { currentPitch: number; targetPitch: number; accuracy: 'perfect' | 'good' | 'ok' | 'miss' }) => void;
  onBack: () => void;
}

export function ScoringScreen({ currentSong, onSendScore, onSendFeedback, onBack }: ScoringScreenProps) {
  const [isListening, setIsListening] = useState(false);
  const [micPermission, setMicPermission] = useState<'idle' | 'granted' | 'denied'>('idle');
  const [currentScore, setCurrentScore] = useState({ pitchAccuracy: 0, timing: 0, totalScore: 0 });
  const [feedback, setFeedback] = useState<'perfect' | 'good' | 'ok' | 'miss'>('miss');
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const samplesRef = useRef<number[]>([]);
  const isListeningRef = useRef(false);
  
  // Store callbacks in refs to avoid stale closures
  const onSendScoreRef = useRef(onSendScore);
  const onSendFeedbackRef = useRef(onSendFeedback);
  
  useEffect(() => {
    onSendScoreRef.current = onSendScore;
    onSendFeedbackRef.current = onSendFeedback;
  });

  // Analyze audio and detect pitch
  const startAnalysis = useCallback(() => {
    if (!analyserRef.current) return;
    
    const analyser = analyserRef.current;
    const bufferLength = analyser.fftSize;
    const dataArray = new Float32Array(bufferLength);
    
    const analyze = () => {
      if (!isListeningRef.current) return;
      
      analyser.getFloatTimeDomainData(dataArray);
      
      // Simple volume detection
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const volume = Math.sqrt(sum / bufferLength);
      
      // Determine accuracy based on volume (simplified scoring)
      let accuracy: 'perfect' | 'good' | 'ok' | 'miss' = 'miss';
      let pitchAccuracy = 0;
      
      if (volume > 0.1) {
        accuracy = 'perfect';
        pitchAccuracy = 85 + Math.random() * 15;
      } else if (volume > 0.05) {
        accuracy = 'good';
        pitchAccuracy = 65 + Math.random() * 20;
      } else if (volume > 0.02) {
        accuracy = 'ok';
        pitchAccuracy = 40 + Math.random() * 25;
      } else {
        pitchAccuracy = Math.random() * 40;
      }
      
      samplesRef.current.push(pitchAccuracy);
      
      // Keep only last 100 samples
      if (samplesRef.current.length > 100) {
        samplesRef.current = samplesRef.current.slice(-100);
      }
      
      // Calculate running average
      const avgPitch = samplesRef.current.reduce((a, b) => a + b, 0) / samplesRef.current.length;
      const timing = Math.min(100, (samplesRef.current.filter(s => s > 40).length / samplesRef.current.length) * 100);
      const totalScore = Math.round(avgPitch * 0.7 + timing * 0.3);
      
      setFeedback(accuracy);
      setCurrentScore({
        pitchAccuracy: Math.round(avgPitch),
        timing: Math.round(timing),
        totalScore,
      });
      
      // Send feedback to TV every frame
      onSendFeedbackRef.current({
        currentPitch: volume * 1000,
        targetPitch: 440,
        accuracy,
      });
      
      // Send score every 10 frames (~160ms at 60fps)
      if (samplesRef.current.length % 10 === 0) {
        onSendScoreRef.current({
          pitchAccuracy: Math.round(avgPitch),
          timing: Math.round(timing),
          totalScore,
        });
      }
      
      animationRef.current = requestAnimationFrame(analyze);
    };
    
    analyze();
  }, []);

  // Request mic permission
  const requestMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMicPermission('granted');
      
      // Setup audio analysis
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      // Set listening state and start analysis
      isListeningRef.current = true;
      setIsListening(true);
      startAnalysis();
    } catch (err) {
      console.error('Mic error:', err);
      setMicPermission('denied');
    }
  }, [startAnalysis]);

  // Cleanup
  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Auto-start mic when component mounts
  useEffect(() => {
    if (micPermission === 'idle') {
      requestMic();
    }
  }, [micPermission, requestMic]);

  const getFeedbackColor = () => {
    switch (feedback) {
      case 'perfect': return 'text-green-400';
      case 'good': return 'text-cyan-400';
      case 'ok': return 'text-yellow-400';
      default: return 'text-red-400';
    }
  };

  const getFeedbackText = () => {
    switch (feedback) {
      case 'perfect': return 'PERFECT!';
      case 'good': return 'GOOD!';
      case 'ok': return 'OK';
      default: return 'MISS';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="text-white p-2">
          ← Quay lại
        </button>
        <span className="text-white text-sm">Chấm điểm</span>
      </div>

      {/* Song info */}
      <div className="bg-white/10 rounded-xl p-4 mb-6">
        <p className="text-white font-medium truncate">{currentSong.song.title}</p>
        <p className="text-gray-400 text-sm">{currentSong.song.channelName}</p>
      </div>

      {/* Score display */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {micPermission === 'idle' && (
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Đang bật microphone...</p>
          </div>
        )}

        {micPermission === 'denied' && (
          <div className="text-center">
            <p className="text-red-400 mb-4">Không thể truy cập microphone</p>
            <p className="text-gray-500 text-sm mb-4">Vui lòng cấp quyền mic trong cài đặt trình duyệt</p>
            <button onClick={requestMic} className="px-6 py-3 bg-primary-500 text-white rounded-xl">
              Thử lại
            </button>
          </div>
        )}

        {micPermission === 'granted' && (
          <div className="text-center w-full">
            {/* Feedback */}
            <div className={`text-4xl font-bold mb-4 ${getFeedbackColor()}`}>
              {getFeedbackText()}
            </div>

            {/* Score */}
            <div className="text-8xl font-bold text-white mb-2">
              {currentScore.totalScore}
            </div>
            <p className="text-gray-400 mb-6">Điểm số</p>

            {/* Details */}
            <div className="grid grid-cols-2 gap-4 text-center max-w-xs mx-auto">
              <div className="bg-white/10 rounded-xl p-4">
                <p className="text-2xl font-bold text-white">{currentScore.pitchAccuracy}%</p>
                <p className="text-gray-400 text-sm">Cao độ</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <p className="text-2xl font-bold text-white">{currentScore.timing}%</p>
                <p className="text-gray-400 text-sm">Nhịp điệu</p>
              </div>
            </div>

            {/* Mic indicator */}
            <div className="mt-6 flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-green-400 text-xs">Đang chấm điểm</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ScoringScreen;
