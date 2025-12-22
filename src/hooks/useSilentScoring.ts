/**
 * Silent Scoring Hook
 * Records audio in background with real pitch detection using autocorrelation
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
  
  // If signal is too quiet, return 0
  if (rms < 0.01) return 0;
  
  // Autocorrelation
  const correlations = new Float32Array(MAX_SAMPLES);
  for (let lag = 0; lag < MAX_SAMPLES; lag++) {
    let sum = 0;
    for (let i = 0; i < MAX_SAMPLES; i++) {
      sum += buffer[i] * buffer[i + lag];
    }
    correlations[lag] = sum;
  }
  
  // Find the first peak after the initial decline
  // Skip the first few samples (too high frequency)
  const minLag = Math.floor(sampleRate / 1000); // ~1000Hz max
  const maxLag = Math.floor(sampleRate / 50);   // ~50Hz min
  
  let bestLag = 0;
  let bestCorr = 0;
  let foundPeak = false;
  
  for (let lag = minLag; lag < Math.min(maxLag, MAX_SAMPLES); lag++) {
    if (correlations[lag] > bestCorr) {
      bestCorr = correlations[lag];
      bestLag = lag;
      foundPeak = true;
    }
  }
  
  if (!foundPeak || bestLag === 0) return 0;
  
  // Parabolic interpolation for better accuracy
  const y1 = correlations[bestLag - 1] || 0;
  const y2 = correlations[bestLag];
  const y3 = correlations[bestLag + 1] || 0;
  const refinedLag = bestLag + (y3 - y1) / (2 * (2 * y2 - y1 - y3));
  
  const frequency = sampleRate / refinedLag;
  
  // Validate frequency is in human voice range (80Hz - 1000Hz)
  if (frequency < 80 || frequency > 1000) return 0;
  
  return frequency;
}

/**
 * Convert frequency to musical note and calculate stability
 */
function frequencyToNote(freq: number): { note: string; cents: number } {
  if (freq <= 0) return { note: '', cents: 0 };
  
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const A4 = 440;
  const semitones = 12 * Math.log2(freq / A4);
  const noteIndex = Math.round(semitones) + 9; // A4 is index 9
  const octave = Math.floor((noteIndex + 3) / 12) + 4;
  const noteName = noteNames[(noteIndex % 12 + 12) % 12];
  const cents = Math.round((semitones - Math.round(semitones)) * 100);
  
  return { note: `${noteName}${octave}`, cents };
}

/**
 * Calculate pitch stability score (how consistent the pitch is)
 */
function calculateStability(pitchHistory: number[]): number {
  if (pitchHistory.length < 5) return 0;
  
  // Filter out zeros (silence)
  const validPitches = pitchHistory.filter(p => p > 0);
  if (validPitches.length < 3) return 0;
  
  // Calculate variance in semitones
  const avgPitch = validPitches.reduce((a, b) => a + b, 0) / validPitches.length;
  let variance = 0;
  for (const pitch of validPitches) {
    const semitones = 12 * Math.log2(pitch / avgPitch);
    variance += semitones * semitones;
  }
  variance = Math.sqrt(variance / validPitches.length);
  
  // Convert variance to score (lower variance = higher score)
  // variance of 0 = 100, variance of 2 semitones = 0
  const score = Math.max(0, Math.min(100, 100 - variance * 50));
  return score;
}

export function useSilentScoring({ 
  isPlaying, 
  onScoreUpdate 
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
  
  // Scoring data
  const pitchHistoryRef = useRef<number[]>([]);
  const stabilityScoresRef = useRef<number[]>([]);
  const singingFramesRef = useRef(0);
  const totalFramesRef = useRef(0);

  // Keep callback ref updated
  useEffect(() => {
    onScoreUpdateRef.current = onScoreUpdate;
  });

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
      analyserRef.current.fftSize = 4096; // Larger for better pitch detection

      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      isRecordingRef.current = true;
      setIsRecording(true);
      setError(null);
      
      // Reset scoring data
      pitchHistoryRef.current = [];
      stabilityScoresRef.current = [];
      singingFramesRef.current = 0;
      totalFramesRef.current = 0;

      // Start analysis loop
      const analyser = analyserRef.current;
      const sampleRate = audioContextRef.current.sampleRate;
      const bufferLength = analyser.fftSize;
      const dataArray = new Float32Array(bufferLength);
      let frameCount = 0;

      const analyze = () => {
        if (!isRecordingRef.current) return;

        analyser.getFloatTimeDomainData(dataArray);
        totalFramesRef.current++;

        // Detect pitch
        const pitch = detectPitch(dataArray, sampleRate);
        
        if (pitch > 0) {
          // Voice detected
          singingFramesRef.current++;
          pitchHistoryRef.current.push(pitch);
          
          // Keep last 100 pitches for stability calculation
          if (pitchHistoryRef.current.length > 100) {
            pitchHistoryRef.current = pitchHistoryRef.current.slice(-100);
          }
          
          // Calculate stability every 10 frames
          if (pitchHistoryRef.current.length >= 10 && pitchHistoryRef.current.length % 10 === 0) {
            const stability = calculateStability(pitchHistoryRef.current.slice(-20));
            stabilityScoresRef.current.push(stability);
            
            // Keep last 50 stability scores
            if (stabilityScoresRef.current.length > 50) {
              stabilityScoresRef.current = stabilityScoresRef.current.slice(-50);
            }
          }
        }

        // Calculate scores
        frameCount++;
        if (frameCount % 10 === 0) { // Update every ~166ms
          const avgStability = stabilityScoresRef.current.length > 0
            ? stabilityScoresRef.current.reduce((a, b) => a + b, 0) / stabilityScoresRef.current.length
            : 0;
          
          // Timing = percentage of time singing (with minimum threshold)
          const singingRatio = totalFramesRef.current > 0 
            ? singingFramesRef.current / totalFramesRef.current 
            : 0;
          // Expect at least 30% singing, scale to 100
          const timing = Math.min(100, Math.round((singingRatio / 0.5) * 100));
          
          // Pitch accuracy = stability score (how consistent the pitch is)
          const pitchAccuracy = Math.round(avgStability);
          
          // Total score weighted
          const totalScore = Math.round(pitchAccuracy * 0.6 + timing * 0.4);

          const score = { pitchAccuracy, timing, totalScore };
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
  }, []);

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

    // Send final score
    const avgStability = stabilityScoresRef.current.length > 0
      ? stabilityScoresRef.current.reduce((a, b) => a + b, 0) / stabilityScoresRef.current.length
      : 0;
    
    const singingRatio = totalFramesRef.current > 0 
      ? singingFramesRef.current / totalFramesRef.current 
      : 0;
    const timing = Math.min(100, Math.round((singingRatio / 0.5) * 100));
    const pitchAccuracy = Math.round(avgStability);
    const totalScore = Math.round(pitchAccuracy * 0.6 + timing * 0.4);
    
    onScoreUpdateRef.current?.({ pitchAccuracy, timing, totalScore });
  }, []);

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
