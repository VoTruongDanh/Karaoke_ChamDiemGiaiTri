/**
 * Silent Scoring Hook
 * Records audio in background with real pitch detection using autocorrelation
 * Optimized: Only counts singing segments, ignores instrumental parts
 */

import { useEffect, useRef, useCallback, useState } from 'react';

interface ScoreData {
  pitchAccuracy: number;
  timing: number;
  totalScore: number;
}

interface UseSilentScoringProps {
  /** Whether a song is currently playing */
  isPlaying: boolean;
  /** Callback to send score updates */
  onScoreUpdate?: (score: ScoreData) => void;
  /** Song ID for tracking previous scores */
  songId?: string;
  /** Song duration in seconds */
  songDuration?: number;
}

interface UseSilentScoringReturn {
  /** Current accumulated score */
  currentScore: ScoreData;
  /** Whether mic is active */
  isRecording: boolean;
  /** Any error message */
  error: string | null;
  /** Manually reconnect mic */
  reconnectMic: () => void;
}

/**
 * Autocorrelation-based pitch detection
 * Returns frequency in Hz, or 0 if no clear pitch detected
 */
function detectPitch(buffer: Float32Array, sampleRate: number): number {
  const SIZE = buffer.length;
  const MAX_SAMPLES = Math.floor(SIZE / 2);
  
  // Calculate RMS to check if there's enough signal
  let rms = 0;
  for (let i = 0; i < SIZE; i++) {
    rms += buffer[i] * buffer[i];
  }
  rms = Math.sqrt(rms / SIZE);
  
  // Need signal for voice detection (lowered threshold)
  if (rms < 0.015) return 0;
  
  // Autocorrelation
  const correlations = new Float32Array(MAX_SAMPLES);
  for (let lag = 0; lag < MAX_SAMPLES; lag++) {
    let sum = 0;
    for (let i = 0; i < MAX_SAMPLES; i++) {
      sum += buffer[i] * buffer[i + lag];
    }
    correlations[lag] = sum;
  }
  
  // Normalize by first correlation value
  const norm = correlations[0];
  if (norm === 0) return 0;
  for (let i = 0; i < MAX_SAMPLES; i++) {
    correlations[i] /= norm;
  }
  
  // Find the first peak after the initial decline
  // Human voice range: 85Hz (bass) to 500Hz (soprano)
  const minLag = Math.floor(sampleRate / 500); // ~500Hz max
  const maxLag = Math.floor(sampleRate / 85);  // ~85Hz min
  
  // Find where correlation drops below threshold first
  let foundDip = false;
  for (let lag = 1; lag < minLag && lag < MAX_SAMPLES; lag++) {
    if (correlations[lag] < 0.5) {
      foundDip = true;
      break;
    }
  }
  if (!foundDip) return 0; // No clear periodicity
  
  let bestLag = 0;
  let bestCorr = 0.5; // Minimum correlation threshold for voice
  
  for (let lag = minLag; lag < Math.min(maxLag, MAX_SAMPLES); lag++) {
    if (correlations[lag] > bestCorr) {
      bestCorr = correlations[lag];
      bestLag = lag;
    }
  }
  
  if (bestLag === 0) return 0;
  
  // Parabolic interpolation for better accuracy
  const y1 = correlations[bestLag - 1] || 0;
  const y2 = correlations[bestLag];
  const y3 = correlations[bestLag + 1] || 0;
  
  const denom = 2 * y2 - y1 - y3;
  if (Math.abs(denom) < 0.0001) return sampleRate / bestLag;
  
  const refinedLag = bestLag + (y3 - y1) / (2 * denom);
  
  const frequency = sampleRate / refinedLag;
  
  // Strict human voice range (85Hz - 500Hz)
  if (frequency < 85 || frequency > 500) return 0;
  
  return frequency;
}

/**
 * Calculate pitch stability score (how consistent the pitch is)
 * More generous scoring
 */
function calculateStability(pitchHistory: number[]): number {
  if (pitchHistory.length < 3) return 70; // Default good score for short segments
  
  // Filter out zeros (silence)
  const validPitches = pitchHistory.filter(p => p > 0);
  if (validPitches.length < 2) return 70;
  
  // Calculate variance in semitones
  const avgPitch = validPitches.reduce((a, b) => a + b, 0) / validPitches.length;
  let variance = 0;
  for (const pitch of validPitches) {
    const semitones = 12 * Math.log2(pitch / avgPitch);
    variance += semitones * semitones;
  }
  variance = Math.sqrt(variance / validPitches.length);
  
  // Convert variance to score - much more generous
  // variance of 0 = 100, variance of 5 semitones = 50
  // Most singing has variance of 1-3 semitones which should score 70-90
  const score = Math.max(50, Math.min(100, 100 - variance * 10));
  return score;
}

// Singing segment detection
interface SingingSegment {
  startFrame: number;
  endFrame: number;
  pitches: number[];
  stability: number;
}

// Score history storage key
const SCORE_HISTORY_KEY = 'karaoke_score_history';
const MIN_SCORE_CHANGE = 5; // Minimum score change required from previous score

/**
 * Get previous score for a song from localStorage
 */
function getPreviousScore(): number | null {
  try {
    const stored = localStorage.getItem(SCORE_HISTORY_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      return data.lastScore ?? null;
    }
  } catch {}
  return null;
}

/**
 * Save score to localStorage
 */
function saveScore(score: number): void {
  try {
    localStorage.setItem(SCORE_HISTORY_KEY, JSON.stringify({
      lastScore: score,
      timestamp: Date.now(),
    }));
  } catch {}
}

/**
 * Apply score smoothing rule:
 * - First time: use raw score
 * - From 2nd time: 
 *   - If difference >= 5: use raw score
 *   - If difference < 5: adjust to previous ± 5
 * 
 * Example:
 * - Previous: 65, Raw: 72 (diff=7 >= 5) → Result: 72
 * - Previous: 65, Raw: 68 (diff=3 < 5) → Result: 70 (65+5)
 * - Previous: 65, Raw: 62 (diff=-3 < 5) → Result: 60 (65-5)
 */
function applyScoreSmoothing(rawScore: number, previousScore: number | null): number {
  // First time - use raw score directly
  if (previousScore === null) {
    return rawScore;
  }
  
  const diff = rawScore - previousScore;
  
  // If difference >= MIN_SCORE_CHANGE, use raw score
  if (Math.abs(diff) >= MIN_SCORE_CHANGE) {
    return rawScore;
  }
  
  // If difference < MIN_SCORE_CHANGE, adjust to previous ± MIN_SCORE_CHANGE
  if (diff > 0) {
    // Trying to go higher but not enough - bump to previous + 5
    return Math.min(100, previousScore + MIN_SCORE_CHANGE);
  } else if (diff < 0) {
    // Trying to go lower but not enough - drop to previous - 5
    return Math.max(0, previousScore - MIN_SCORE_CHANGE);
  }
  
  // Exactly same score - keep it
  return previousScore;
}

export function useSilentScoring({ 
  isPlaying, 
  onScoreUpdate,
  songId,
  songDuration,
}: UseSilentScoringProps): UseSilentScoringReturn {
  const [currentScore, setCurrentScore] = useState<ScoreData>({ 
    pitchAccuracy: 0, 
    timing: 0, 
    totalScore: 0 
  });
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const isRecordingRef = useRef(false);
  const onScoreUpdateRef = useRef(onScoreUpdate);
  
  // Previous score tracking
  const previousScoreRef = useRef<number | null>(null);
  const isFirstScoreRef = useRef(true);
  
  // Time tracking for duration multiplier
  const startTimeRef = useRef<number>(0);
  const songDurationRef = useRef<number>(0);
  
  // Scoring data - segment based
  const currentSegmentRef = useRef<number[]>([]); // Current singing segment pitches
  const segmentsRef = useRef<SingingSegment[]>([]); // Completed segments
  const silenceCountRef = useRef(0); // Consecutive silent frames
  const frameCountRef = useRef(0);
  const segmentStartRef = useRef(0);
  
  // Constants
  const SILENCE_THRESHOLD = 15; // Frames of silence to end a segment (~250ms)
  const MIN_SEGMENT_LENGTH = 10; // Minimum frames for valid segment (~166ms)
  
  // Reconnect tracking
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const RECONNECT_DELAY = 2000; // 2 seconds base delay
  
  // Track if mic stream is still active
  const checkMicActiveRef = useRef<NodeJS.Timeout | null>(null);
  
  // Wake lock to prevent screen sleep and keep mic active
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  
  // Keep-alive audio to prevent browser from suspending
  const keepAliveAudioRef = useRef<HTMLAudioElement | null>(null);

  // Keep callback ref updated
  useEffect(() => {
    onScoreUpdateRef.current = onScoreUpdate;
  });
  
  // Update song duration when prop changes
  useEffect(() => {
    if (songDuration && songDuration > 0) {
      songDurationRef.current = songDuration;
      console.log(`[Silent Scoring] Song duration updated: ${songDuration}s`);
    }
  }, [songDuration]);
  
  // Load previous score on mount
  useEffect(() => {
    previousScoreRef.current = getPreviousScore();
    isFirstScoreRef.current = previousScoreRef.current === null;
  }, [songId]);
  
  // Request wake lock to keep screen on and prevent mic suspension
  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator && !wakeLockRef.current) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        console.log('[Silent Scoring] Wake lock acquired');
        
        wakeLockRef.current?.addEventListener('release', () => {
          console.log('[Silent Scoring] Wake lock released');
          wakeLockRef.current = null;
          // Try to re-acquire when visibility changes back
        });
      }
    } catch (err) {
      console.log('[Silent Scoring] Wake lock not available:', err);
    }
  }, []);
  
  // Release wake lock
  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        console.log('[Silent Scoring] Wake lock released manually');
      } catch {}
    }
  }, []);
  
  // Create silent audio to keep audio context alive
  const startKeepAlive = useCallback(() => {
    if (keepAliveAudioRef.current) return;
    
    try {
      // Create a silent audio element that loops
      // This helps keep the audio context active on some browsers
      const audio = new Audio();
      // Silent WAV data URL (very short silent audio)
      audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      audio.loop = true;
      audio.volume = 0.01; // Nearly silent
      audio.play().catch(() => {});
      keepAliveAudioRef.current = audio;
      console.log('[Silent Scoring] Keep-alive audio started');
    } catch {}
  }, []);
  
  // Stop keep-alive audio
  const stopKeepAlive = useCallback(() => {
    if (keepAliveAudioRef.current) {
      keepAliveAudioRef.current.pause();
      keepAliveAudioRef.current = null;
      console.log('[Silent Scoring] Keep-alive audio stopped');
    }
  }, []);

  // Calculate duration multiplier based on actual singing time vs song duration
  // Uses the MINIMUM of:
  // 1. Singing frames ratio (how much user actually sang)
  // 2. Wall clock time ratio (how long the session lasted)
  // This prevents cheating by either:
  // - Singing a lot then skipping (wall clock is short)
  // - Letting video play without singing then skipping (singing frames is low)
  const calculateDurationMultiplier = useCallback((): number => {
    const duration = songDurationRef.current;
    console.log(`[Silent Scoring] calculateDurationMultiplier - songDuration: ${duration}`);
    
    if (!duration || duration <= 0) {
      console.log(`[Silent Scoring] No duration, returning 1.0x`);
      return 1.0; // No duration info, no multiplier
    }
    
    // Method 1: Wall clock time
    const elapsedSeconds = (Date.now() - startTimeRef.current) / 1000;
    const wallClockPercent = (elapsedSeconds / duration) * 100;
    
    // Method 2: Singing frames
    const expectedFrames = duration * 60; // ~60fps
    const segments = segmentsRef.current;
    const currentSegment = currentSegmentRef.current;
    let totalSingingFrames = 0;
    for (const seg of segments) {
      totalSingingFrames += seg.pitches.length;
    }
    totalSingingFrames += currentSegment.length;
    const singingPercent = (totalSingingFrames / expectedFrames) * 100;
    
    // Use the MINIMUM to prevent cheating
    const percentSung = Math.min(wallClockPercent, singingPercent);
    
    console.log(`[Silent Scoring] Wall clock: ${wallClockPercent.toFixed(1)}%, Singing: ${singingPercent.toFixed(1)}%, Using: ${percentSung.toFixed(1)}%`);
    
    if (percentSung < 30) {
      console.log(`[Silent Scoring] < 30%, applying 0.5x penalty`);
      return 0.5; // Less than 30% - half score
    } else if (percentSung <= 55) {
      console.log(`[Silent Scoring] 30-55%, no multiplier`);
      return 1.0; // 30-55% - normal score
    } else {
      console.log(`[Silent Scoring] > 55%, applying 1.1x bonus`);
      return 1.1; // More than 55% - bonus 10%
    }
  }, []);

  // Calculate score from segments only (ignores instrumental parts)
  // Note: Duration multiplier is now applied on TV side based on video progress
  const calculateSegmentScore = useCallback((isFinalScore: boolean = false) => {
    const segments = segmentsRef.current;
    const currentSegment = currentSegmentRef.current;
    
    // Include current segment if long enough
    const allSegments = [...segments];
    if (currentSegment.length >= MIN_SEGMENT_LENGTH) {
      const stability = calculateStability(currentSegment);
      allSegments.push({
        startFrame: segmentStartRef.current,
        endFrame: frameCountRef.current,
        pitches: [...currentSegment],
        stability,
      });
    }
    
    if (allSegments.length === 0) {
      return { pitchAccuracy: 0, timing: 0, totalScore: 0 };
    }
    
    // Pitch accuracy = weighted average of segment stabilities
    // Weight by segment length (longer segments count more)
    let totalWeight = 0;
    let weightedStability = 0;
    let totalSingingFrames = 0;
    
    for (const seg of allSegments) {
      const weight = seg.pitches.length;
      totalWeight += weight;
      weightedStability += seg.stability * weight;
      totalSingingFrames += seg.pitches.length;
    }
    
    // Pitch accuracy - boost minimum to 50 if singing detected
    const pitchAccuracy = totalWeight > 0 
      ? Math.max(50, Math.round(weightedStability / totalWeight))
      : 0;
    
    // Timing = based on singing consistency within segments
    // (how much of each segment has valid pitch)
    let validPitchCount = 0;
    for (const seg of allSegments) {
      validPitchCount += seg.pitches.filter(p => p > 0).length;
    }
    const timing = totalSingingFrames > 0
      ? Math.round((validPitchCount / totalSingingFrames) * 100)
      : 0;
    
    // Total score - balanced formula
    let rawTotalScore = Math.round((pitchAccuracy + timing) / 2);
    
    // Apply smoothing for final score (compare with previous song)
    if (isFinalScore) {
      const previousSongScore = previousScoreRef.current;
      const smoothedScore = applyScoreSmoothing(rawTotalScore, previousSongScore);
      console.log(`[Silent Scoring] Final - Raw: ${rawTotalScore}, PrevSong: ${previousSongScore}, Smoothed: ${smoothedScore}`);
      return { pitchAccuracy, timing, totalScore: smoothedScore };
    }
    
    return { pitchAccuracy, timing, totalScore: rawTotalScore };
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    if (isRecordingRef.current) return;

    try {
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.log('[Silent Scoring] getUserMedia not available - scoring disabled');
        setError(null); // Don't show error, just disable silently
        return;
      }
      
      // Small delay to allow other mic users (like SpeechRecognition) to fully release
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Request mic with minimal constraints for better WebView compatibility
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true // Simplified - let browser choose best settings
      });
      streamRef.current = stream;

      audioContextRef.current = new AudioContext();
      
      // Resume audio context if suspended (mobile browsers)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 4096;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      isRecordingRef.current = true;
      setIsRecording(true);
      setError(null);
      reconnectAttemptsRef.current = 0; // Reset reconnect attempts on success
      
      // Request wake lock to keep screen on
      requestWakeLock();
      
      // Start keep-alive audio
      startKeepAlive();
      
      // Reset scoring data
      currentSegmentRef.current = [];
      segmentsRef.current = [];
      silenceCountRef.current = 0;
      frameCountRef.current = 0;
      segmentStartRef.current = 0;
      
      // Track start time and song duration for multiplier
      startTimeRef.current = Date.now();
      songDurationRef.current = songDuration || 0;

      // Start analysis loop
      const analyser = analyserRef.current;
      const sampleRate = audioContextRef.current.sampleRate;
      const bufferLength = analyser.fftSize;
      const dataArray = new Float32Array(bufferLength);
      
      // Periodic check to ensure audio context is active
      checkMicActiveRef.current = setInterval(() => {
        if (!isRecordingRef.current) return;
        
        // Only check and resume audio context if suspended
        // Don't check track state as it can be unreliable on some devices
        if (audioContextRef.current?.state === 'suspended') {
          console.log('[Silent Scoring] Audio context suspended - resuming');
          audioContextRef.current.resume().catch(() => {});
        }
      }, 5000); // Check every 5 seconds

      const analyze = () => {
        if (!isRecordingRef.current) return;

        analyser.getFloatTimeDomainData(dataArray);
        frameCountRef.current++;

        // Detect pitch
        const pitch = detectPitch(dataArray, sampleRate);
        
        if (pitch > 0) {
          // Voice detected - add to current segment
          if (currentSegmentRef.current.length === 0) {
            segmentStartRef.current = frameCountRef.current;
          }
          currentSegmentRef.current.push(pitch);
          silenceCountRef.current = 0;
        } else {
          // Silence
          silenceCountRef.current++;
          
          // End segment if enough silence
          if (silenceCountRef.current >= SILENCE_THRESHOLD && currentSegmentRef.current.length > 0) {
            // Save segment if long enough
            if (currentSegmentRef.current.length >= MIN_SEGMENT_LENGTH) {
              const stability = calculateStability(currentSegmentRef.current);
              segmentsRef.current.push({
                startFrame: segmentStartRef.current,
                endFrame: frameCountRef.current - SILENCE_THRESHOLD,
                pitches: [...currentSegmentRef.current],
                stability,
              });
            }
            currentSegmentRef.current = [];
          }
        }

        // Update score every 15 frames (~250ms)
        if (frameCountRef.current % 15 === 0) {
          const score = calculateSegmentScore();
          setCurrentScore(score);
          onScoreUpdateRef.current?.(score);
        }

        animationRef.current = requestAnimationFrame(analyze);
      };

      analyze();
      console.log('[Silent Scoring] Mic started successfully');
    } catch (err: any) {
      const errorMessage = err?.message || err?.name || 'Unknown error';
      console.error('[Silent Scoring] Mic error:', errorMessage, err);
      
      setIsRecording(false);
      
      // Check if this is a WebView/permission issue that won't be fixed by retrying
      const isPermanentError = 
        errorMessage.includes('Permission') || 
        errorMessage.includes('NotAllowed') ||
        errorMessage.includes('NotSupported') ||
        errorMessage.includes('SecurityError');
      
      if (isPermanentError) {
        // Don't retry, don't show error - just disable scoring silently
        console.log('[Silent Scoring] Permanent error, disabling scoring');
        reconnectAttemptsRef.current = 999; // Prevent further retries
        setError(null);
        return;
      }
      
      // For temporary errors, try to reconnect (limited attempts)
      if (isPlaying && reconnectAttemptsRef.current < 2) {
        scheduleReconnect();
      } else {
        // Give up silently after 2 attempts
        setError(null);
      }
    }
  }, [calculateSegmentScore, isPlaying]);
  
  // Handle mic disconnection
  const handleMicDisconnect = useCallback(() => {
    console.log('[Silent Scoring] Handling mic disconnect');
    
    // Clean up current resources
    if (checkMicActiveRef.current) {
      clearInterval(checkMicActiveRef.current);
      checkMicActiveRef.current = null;
    }
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    
    isRecordingRef.current = false;
    setIsRecording(false);
    
    // Schedule reconnect if still playing
    if (isPlaying) {
      scheduleReconnect();
    }
  }, [isPlaying]);
  
  // Schedule reconnect attempt
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }
    
    reconnectAttemptsRef.current++;
    
    // Stop trying after 3 attempts - mic likely not available (WebView, permissions, etc.)
    if (reconnectAttemptsRef.current > 3) {
      console.log('[Silent Scoring] Max reconnect attempts reached, mic not available');
      setError(null); // Clear error message - don't spam user
      return;
    }
    
    console.log(`[Silent Scoring] Scheduling reconnect attempt ${reconnectAttemptsRef.current}`);
    setError(`Đang kết nối mic... (${reconnectAttemptsRef.current}/3)`);
    
    // Exponential backoff: 2s, 4s, 8s
    const delay = Math.min(RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current - 1), 8000);
    
    reconnectTimerRef.current = setTimeout(() => {
      if (isPlaying && !isRecordingRef.current) {
        startRecording();
      }
    }, delay);
  }, [isPlaying, startRecording]);
  
  // Manual reconnect function
  const reconnectMic = useCallback(() => {
    console.log('[Silent Scoring] Manual reconnect requested');
    reconnectAttemptsRef.current = 0; // Reset attempts
    setError(null);
    
    // Stop current recording if any
    if (isRecordingRef.current) {
      handleMicDisconnect();
    }
    
    // Start fresh
    if (isPlaying) {
      startRecording();
    }
  }, [isPlaying, startRecording, handleMicDisconnect]);

  // Stop recording
  const stopRecording = useCallback(() => {
    console.log('[Silent Scoring] stopRecording called');
    isRecordingRef.current = false;
    setIsRecording(false);
    
    // Clear timers
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (checkMicActiveRef.current) {
      clearInterval(checkMicActiveRef.current);
      checkMicActiveRef.current = null;
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    
    // Release wake lock and stop keep-alive
    releaseWakeLock();
    stopKeepAlive();

    // Calculate and send final score WITH duration multiplier applied
    const finalScore = calculateSegmentScore(true);
    console.log('[Silent Scoring] Final score calculated:', finalScore);
    setCurrentScore(finalScore);
    
    // Send final score immediately - this is the important one with multiplier
    onScoreUpdateRef.current?.(finalScore);
    
    // Save score for next time (only if there was actual singing)
    if (finalScore.totalScore > 0) {
      saveScore(finalScore.totalScore);
      previousScoreRef.current = finalScore.totalScore;
      isFirstScoreRef.current = false;
    }
  }, [calculateSegmentScore, releaseWakeLock, stopKeepAlive]);

  // Auto start/stop based on isPlaying
  useEffect(() => {
    if (isPlaying && !isRecordingRef.current) {
      startRecording();
    } else if (!isPlaying && isRecordingRef.current) {
      stopRecording();
    }
  }, [isPlaying, startRecording, stopRecording]);
  
  // Handle visibility change - re-acquire wake lock and reconnect mic when screen turns back on
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isPlaying) {
        console.log('[Silent Scoring] Page visible again, checking mic...');
        // Re-acquire wake lock
        requestWakeLock();
        
        // Check if mic is still active, reconnect if not
        const track = streamRef.current?.getAudioTracks()[0];
        if (!track || track.readyState === 'ended' || !track.enabled) {
          console.log('[Silent Scoring] Mic lost while hidden, reconnecting...');
          if (!isRecordingRef.current) {
            startRecording();
          }
        }
        
        // Resume audio context if suspended
        if (audioContextRef.current?.state === 'suspended') {
          audioContextRef.current.resume().catch(() => {});
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isPlaying, requestWakeLock, startRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (checkMicActiveRef.current) {
        clearInterval(checkMicActiveRef.current);
      }
      releaseWakeLock();
      stopKeepAlive();
      stopRecording();
    };
  }, [stopRecording, releaseWakeLock, stopKeepAlive]);

  return {
    currentScore,
    isRecording,
    error,
    reconnectMic,
  };
}

export default useSilentScoring;
