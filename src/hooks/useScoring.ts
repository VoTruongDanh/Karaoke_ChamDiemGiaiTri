/**
 * React hook for karaoke scoring functionality
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { ScoreData, RealTimeFeedback } from '../types/score';
import { ScoringService, getScoringService, ScoringState } from '../services/scoringService';
import { MicrophoneStatus } from '../services/audioService';

export interface UseScoringReturn {
  /** Current scoring state */
  state: ScoringState;
  /** Microphone permission status */
  microphoneStatus: MicrophoneStatus;
  /** Initialize and request microphone access */
  initialize: () => Promise<boolean>;
  /** Start scoring for a song */
  startScoring: () => void;
  /** Stop scoring and get final score */
  stopScoring: () => ScoreData;
  /** Current real-time feedback */
  feedback: RealTimeFeedback | null;
  /** Final score after stopping */
  finalScore: ScoreData | null;
  /** Whether scoring is currently active */
  isScoring: boolean;
  /** Whether microphone is ready */
  isMicrophoneReady: boolean;
  /** Error message if any */
  errorMessage: string | null;
  /** Cleanup resources */
  cleanup: () => void;
}

/**
 * Hook for managing karaoke scoring
 */
export function useScoring(): UseScoringReturn {
  const scoringServiceRef = useRef<ScoringService | null>(null);
  
  const [state, setState] = useState<ScoringState>({
    isScoring: false,
    currentScore: null,
    realTimeFeedback: null,
    microphoneEnabled: false,
    errorMessage: null,
  });
  
  const [microphoneStatus, setMicrophoneStatus] = useState<MicrophoneStatus>('idle');
  const [feedback, setFeedback] = useState<RealTimeFeedback | null>(null);
  const [finalScore, setFinalScore] = useState<ScoreData | null>(null);

  // Initialize scoring service
  useEffect(() => {
    scoringServiceRef.current = getScoringService();
    
    // Set up feedback callback - use throttling to prevent too many updates
    let lastUpdate = 0;
    const THROTTLE_MS = 200; // Update at most every 200ms
    
    scoringServiceRef.current.setFeedbackCallback((newFeedback) => {
      const now = Date.now();
      if (now - lastUpdate >= THROTTLE_MS) {
        lastUpdate = now;
        setFeedback(newFeedback);
      }
    });

    return () => {
      if (scoringServiceRef.current) {
        scoringServiceRef.current.cleanup();
      }
    };
  }, []);

  /**
   * Initialize microphone access
   */
  const initialize = useCallback(async (): Promise<boolean> => {
    if (!scoringServiceRef.current) return false;
    
    setMicrophoneStatus('requesting');
    
    const granted = await scoringServiceRef.current.initialize();
    
    const status = scoringServiceRef.current.getMicrophoneStatus();
    setMicrophoneStatus(status);
    
    setState(prev => ({
      ...prev,
      microphoneEnabled: granted,
      errorMessage: scoringServiceRef.current?.getErrorMessage() || null,
    }));
    
    return granted;
  }, []);

  /**
   * Start scoring
   */
  const startScoring = useCallback((): void => {
    if (!scoringServiceRef.current) return;
    
    scoringServiceRef.current.startScoring();
    setFinalScore(null);
    setFeedback(null);
    
    setState(prev => ({
      ...prev,
      isScoring: true,
      currentScore: null,
    }));
  }, []);

  /**
   * Stop scoring and get final score
   */
  const stopScoring = useCallback((): ScoreData => {
    if (!scoringServiceRef.current) {
      return { pitchAccuracy: 0, timing: 0, totalScore: 0 };
    }
    
    const score = scoringServiceRef.current.stopScoring();
    setFinalScore(score);
    setFeedback(null);
    
    setState(prev => ({
      ...prev,
      isScoring: false,
      currentScore: score,
      realTimeFeedback: null,
    }));
    
    return score;
  }, []);

  /**
   * Cleanup resources
   */
  const cleanup = useCallback((): void => {
    if (scoringServiceRef.current) {
      scoringServiceRef.current.cleanup();
    }
    
    setState({
      isScoring: false,
      currentScore: null,
      realTimeFeedback: null,
      microphoneEnabled: false,
      errorMessage: null,
    });
    
    setMicrophoneStatus('idle');
    setFeedback(null);
    setFinalScore(null);
  }, []);

  return {
    state,
    microphoneStatus,
    initialize,
    startScoring,
    stopScoring,
    feedback,
    finalScore,
    isScoring: state.isScoring,
    isMicrophoneReady: state.microphoneEnabled,
    errorMessage: state.errorMessage,
    cleanup,
  };
}
