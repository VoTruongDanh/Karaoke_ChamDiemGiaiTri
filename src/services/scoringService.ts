/**
 * Scoring Service for karaoke performance evaluation
 * Requirements: 5.3 - Calculate final score 0-100
 * Requirements: 5.4 - Real-time feedback generation
 */

import { ScoreData, RealTimeFeedback, AccuracyLevel } from '../types/score';
import { AudioService, getAudioService } from './audioService';
import { PitchDetectionService, PitchAnalysis, createPitchDetectionService } from './pitchDetectionService';

export interface ScoringState {
  isScoring: boolean;
  currentScore: ScoreData | null;
  realTimeFeedback: RealTimeFeedback | null;
  microphoneEnabled: boolean;
  errorMessage: string | null;
}

interface PitchSample {
  timestamp: number;
  detectedPitch: number | null;
  targetPitch: number;
  accuracy: number;
}

/**
 * Scoring Service class for managing karaoke scoring
 */
export class ScoringService {
  private audioService: AudioService;
  private pitchDetectionService: PitchDetectionService;
  private isScoring: boolean = false;
  private pitchSamples: PitchSample[] = [];
  private startTime: number = 0;
  private currentFeedback: RealTimeFeedback | null = null;
  private onFeedbackUpdate: ((feedback: RealTimeFeedback) => void) | null = null;
  
  // Target pitch for scoring (can be set based on song data)
  // For now, we use a reference pitch that represents "in tune" singing
  private targetPitch: number = 440; // A4 as default reference

  constructor(audioService?: AudioService) {
    this.audioService = audioService || getAudioService();
    this.pitchDetectionService = createPitchDetectionService(this.audioService);
  }

  /**
   * Initialize the scoring system and request microphone access
   * @returns Promise resolving to true if microphone access granted
   */
  async initialize(): Promise<boolean> {
    const granted = await this.audioService.requestMicrophoneAccess();
    return granted;
  }

  /**
   * Set the callback for real-time feedback updates
   * @param callback Function to call with feedback updates
   */
  setFeedbackCallback(callback: (feedback: RealTimeFeedback) => void): void {
    this.onFeedbackUpdate = callback;
  }

  /**
   * Set the target pitch for scoring
   * @param frequency Target frequency in Hz
   */
  setTargetPitch(frequency: number): void {
    this.targetPitch = frequency;
  }

  /**
   * Start scoring for a new song
   */
  startScoring(): void {
    if (this.isScoring) return;
    if (!this.audioService.isReady()) {
      console.warn('Audio service not ready. Cannot start scoring.');
      return;
    }

    this.isScoring = true;
    this.pitchSamples = [];
    this.startTime = Date.now();
    this.currentFeedback = null;

    // Resume audio context if needed
    this.audioService.resume();

    // Start pitch detection
    this.pitchDetectionService.start((analysis: PitchAnalysis) => {
      this.processPitchAnalysis(analysis);
    });
  }

  /**
   * Process pitch analysis and generate feedback
   */
  private processPitchAnalysis(analysis: PitchAnalysis): void {
    const timestamp = Date.now() - this.startTime;
    const detectedPitch = analysis.currentPitch.frequency;
    
    // Calculate accuracy for this sample
    const accuracy = this.pitchDetectionService.calculatePitchAccuracy(
      detectedPitch,
      this.targetPitch
    );

    // Store sample for final score calculation
    this.pitchSamples.push({
      timestamp,
      detectedPitch,
      targetPitch: this.targetPitch,
      accuracy,
    });

    // Generate real-time feedback
    const feedback = this.generateFeedback(detectedPitch, accuracy);
    this.currentFeedback = feedback;

    // Notify callback
    if (this.onFeedbackUpdate) {
      this.onFeedbackUpdate(feedback);
    }
  }

  /**
   * Generate real-time feedback based on pitch analysis
   */
  private generateFeedback(detectedPitch: number | null, accuracy: number): RealTimeFeedback {
    return {
      currentPitch: detectedPitch || 0,
      targetPitch: this.targetPitch,
      accuracy: this.accuracyToLevel(accuracy),
    };
  }

  /**
   * Convert accuracy percentage to AccuracyLevel
   */
  private accuracyToLevel(accuracy: number): AccuracyLevel {
    if (accuracy >= 90) return 'perfect';
    if (accuracy >= 70) return 'good';
    if (accuracy >= 40) return 'ok';
    return 'miss';
  }

  /**
   * Stop scoring and calculate final score
   * @returns The final score data
   */
  stopScoring(): ScoreData {
    this.pitchDetectionService.stop();
    this.isScoring = false;

    return this.calculateFinalScore();
  }

  /**
   * Calculate the final score from collected samples
   * Requirements: 5.3 - Score from 0 to 100
   */
  private calculateFinalScore(): ScoreData {
    if (this.pitchSamples.length === 0) {
      return {
        pitchAccuracy: 0,
        timing: 0,
        totalScore: 0,
      };
    }

    // Calculate pitch accuracy (average of all samples)
    const validSamples = this.pitchSamples.filter(s => s.detectedPitch !== null);
    const pitchAccuracy = validSamples.length > 0
      ? validSamples.reduce((sum, s) => sum + s.accuracy, 0) / validSamples.length
      : 0;

    // Calculate timing score based on consistency of singing
    // (percentage of time with valid pitch detected)
    const timing = (validSamples.length / this.pitchSamples.length) * 100;

    // Calculate total score (weighted average)
    // Pitch accuracy: 70%, Timing: 30%
    const totalScore = Math.round((pitchAccuracy * 0.7) + (timing * 0.3));

    // Ensure score is within 0-100 range
    return {
      pitchAccuracy: Math.max(0, Math.min(100, Math.round(pitchAccuracy))),
      timing: Math.max(0, Math.min(100, Math.round(timing))),
      totalScore: Math.max(0, Math.min(100, totalScore)),
    };
  }

  /**
   * Get current real-time feedback
   * @returns Current feedback data or null if not scoring
   */
  getRealTimeFeedback(): RealTimeFeedback | null {
    return this.currentFeedback;
  }

  /**
   * Check if scoring is currently active
   */
  isScoringActive(): boolean {
    return this.isScoring;
  }

  /**
   * Get the current state of the scoring service
   */
  getState(): ScoringState {
    return {
      isScoring: this.isScoring,
      currentScore: this.isScoring ? null : this.calculateFinalScore(),
      realTimeFeedback: this.currentFeedback,
      microphoneEnabled: this.audioService.isReady(),
      errorMessage: this.audioService.getErrorMessage(),
    };
  }

  /**
   * Get microphone status
   */
  getMicrophoneStatus() {
    return this.audioService.getStatus();
  }

  /**
   * Get error message if any
   */
  getErrorMessage(): string | null {
    return this.audioService.getErrorMessage();
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.pitchDetectionService.stop();
    this.audioService.stop();
    this.isScoring = false;
    this.pitchSamples = [];
    this.currentFeedback = null;
  }
}

// Singleton instance
let scoringServiceInstance: ScoringService | null = null;

/**
 * Get the singleton scoring service instance
 */
export function getScoringService(): ScoringService {
  if (!scoringServiceInstance) {
    scoringServiceInstance = new ScoringService();
  }
  return scoringServiceInstance;
}

/**
 * Reset the scoring service instance (useful for testing)
 */
export function resetScoringService(): void {
  if (scoringServiceInstance) {
    scoringServiceInstance.cleanup();
    scoringServiceInstance = null;
  }
}
