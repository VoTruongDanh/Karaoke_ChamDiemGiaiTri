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
}

interface UseSilentScoringReturn {
  /** Current accumulated score */
  currentScore: ScoreData;
  /** Whether mic is active */
  isRecording: boolean;
  /** Any error message */
  error: string | null;
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
  
  // Scoring data - segment based
  const currentSegmentRef = useRef<number[]>([]); // Current singing segment pitches
  const segmentsRef = useRef<SingingSegment[]>([]); // Completed segments
  const silenceCountRef = useRef(0); // Consecutive silent frames
  const frameCountRef = useRef(0);
  const segmentStartRef = useRef(0);
  
  // Constants
  const SILENCE_THRESHOLD = 15; // Frames of silence to end a segment (~250ms)
  const MIN_SEGMENT_LENGTH = 10; // Minimum frames for valid segment (~166ms)

  // Keep callback ref updated
  useEffect(() => {
    onScoreUpdateRef.current = onScoreUpdate;
  });
  
  // Load previous score on mount
  useEffect(() => {
    previousScoreRef.current = getPreviousScore();
    isFirstScoreRef.current = previousScoreRef.current === null;
  }, [songId]);

  // Calculate score from segments only (ignores instrumental parts)
  const calculateSegmentScore = useCallback(() => {
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
    // pitchAccuracy and timing both contribute equally
    const rawTotalScore = Math.round((pitchAccuracy + timing) / 2);
    
    // Apply score smoothing based on previous score
    const totalScore = applyScoreSmoothing(rawTotalScore, previousScoreRef.current);
    
    return { pitchAccuracy, timing, totalScore };
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    if (isRecordingRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      streamRef.current = stream;

      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 4096;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      isRecordingRef.current = true;
      setIsRecording(true);
      setError(null);
      
      // Reset scoring data
      currentSegmentRef.current = [];
      segmentsRef.current = [];
      silenceCountRef.current = 0;
      frameCountRef.current = 0;
      segmentStartRef.current = 0;

      // Start analysis loop
      const analyser = analyserRef.current;
      const sampleRate = audioContextRef.current.sampleRate;
      const bufferLength = analyser.fftSize;
      const dataArray = new Float32Array(bufferLength);

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
    } catch (err) {
      console.error('[Silent Scoring] Mic error:', err);
      setError('Không thể truy cập microphone');
      setIsRecording(false);
    }
  }, [calculateSegmentScore]);

  // Stop recording
  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;
    setIsRecording(false);

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Calculate and send final score
    const finalScore = calculateSegmentScore();
    setCurrentScore(finalScore);
    onScoreUpdateRef.current?.(finalScore);
    
    // Save score for next time (only if there was actual singing)
    if (finalScore.totalScore > 0) {
      saveScore(finalScore.totalScore);
      previousScoreRef.current = finalScore.totalScore;
      isFirstScoreRef.current = false;
    }
  }, [calculateSegmentScore]);

  // Auto start/stop based on isPlaying
  useEffect(() => {
    if (isPlaying && !isRecordingRef.current) {
      startRecording();
    } else if (!isPlaying && isRecordingRef.current) {
      stopRecording();
    }
  }, [isPlaying, startRecording, stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  return {
    currentScore,
    isRecording,
    error,
  };
}

export default useSilentScoring;
