/**
 * Accuracy level for real-time feedback
 */
export type AccuracyLevel = 'perfect' | 'good' | 'ok' | 'miss';

/**
 * Score data after completing a song
 * Requirements: 5.3 - Score from 0 to 100
 */
export interface ScoreData {
  /** Pitch accuracy score (0-100) */
  pitchAccuracy: number;
  /** Timing accuracy score (0-100) */
  timing: number;
  /** Total combined score (0-100) */
  totalScore: number;
}

/**
 * Real-time feedback during singing
 * Requirements: 5.4 - Real-time feedback with visual indicators
 */
export interface RealTimeFeedback {
  /** Current detected pitch frequency */
  currentPitch: number;
  /** Target pitch frequency for the current note */
  targetPitch: number;
  /** Accuracy level for visual feedback */
  accuracy: AccuracyLevel;
}

/**
 * Scoring system interface
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */
export interface ScoringSystem {
  /**
   * Start scoring for a new song
   */
  startScoring(): void;
  
  /**
   * Stop scoring and get final score
   * @returns The final score data
   */
  stopScoring(): ScoreData;
  
  /**
   * Get current real-time feedback
   * @returns Current feedback data
   */
  getRealTimeFeedback(): RealTimeFeedback;
  
  /**
   * Callback for feedback updates
   */
  onFeedbackUpdate: (feedback: RealTimeFeedback) => void;
}
