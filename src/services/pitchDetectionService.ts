/**
 * Pitch Detection Service using pitchfinder library
 * Requirements: 5.2 - Analyze pitch accuracy and timing
 */

import PitchFinder from 'pitchfinder';
import { AudioService } from './audioService';

export interface PitchResult {
  /** Detected frequency in Hz, or null if no pitch detected */
  frequency: number | null;
  /** Confidence level of the detection (0-1) */
  confidence: number;
  /** Timestamp of the detection */
  timestamp: number;
}

export interface PitchAnalysis {
  /** Current detected pitch */
  currentPitch: PitchResult;
  /** Whether a valid pitch was detected */
  hasPitch: boolean;
  /** The note name (e.g., "A4", "C#5") */
  noteName: string | null;
  /** Cents deviation from the nearest note (-50 to +50) */
  centsDeviation: number;
}

// Note frequencies for pitch-to-note conversion (A4 = 440Hz)
const A4_FREQUENCY = 440;
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Pitch Detection Service class
 */
export class PitchDetectionService {
  private audioService: AudioService;
  private detector: ((buffer: Float32Array) => number | null) | null = null;
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;
  private onPitchDetected: ((analysis: PitchAnalysis) => void) | null = null;

  constructor(audioService: AudioService) {
    this.audioService = audioService;
  }

  /**
   * Initialize the pitch detector
   */
  initialize(): void {
    // Use YIN algorithm for better accuracy with voice
    this.detector = PitchFinder.YIN({
      sampleRate: this.audioService.getAudioContext()?.sampleRate || 44100,
    });
  }

  /**
   * Convert frequency to note name and octave
   * @param frequency Frequency in Hz
   * @returns Note name with octave (e.g., "A4")
   */
  frequencyToNote(frequency: number): { noteName: string; octave: number; cents: number } {
    // Calculate semitones from A4
    const semitones = 12 * Math.log2(frequency / A4_FREQUENCY);
    const roundedSemitones = Math.round(semitones);
    
    // Calculate cents deviation
    const cents = Math.round((semitones - roundedSemitones) * 100);
    
    // Calculate note index and octave
    // A4 is at index 9 (0-indexed from C)
    const noteIndex = ((roundedSemitones % 12) + 12 + 9) % 12;
    const octave = 4 + Math.floor((roundedSemitones + 9) / 12);
    
    return {
      noteName: NOTE_NAMES[noteIndex],
      octave,
      cents,
    };
  }

  /**
   * Detect pitch from current audio buffer
   * @returns PitchAnalysis object
   */
  detectPitch(): PitchAnalysis {
    const timeDomainData = this.audioService.getTimeDomainData();
    
    if (!timeDomainData || !this.detector) {
      return {
        currentPitch: { frequency: null, confidence: 0, timestamp: Date.now() },
        hasPitch: false,
        noteName: null,
        centsDeviation: 0,
      };
    }

    // Detect pitch using pitchfinder
    const frequency = this.detector(timeDomainData);
    
    // Calculate confidence based on signal strength
    const rms = this.calculateRMS(timeDomainData);
    const confidence = Math.min(rms * 10, 1); // Normalize to 0-1
    
    const currentPitch: PitchResult = {
      frequency: frequency && frequency > 50 && frequency < 2000 ? frequency : null,
      confidence,
      timestamp: Date.now(),
    };

    if (currentPitch.frequency && confidence > 0.1) {
      const noteInfo = this.frequencyToNote(currentPitch.frequency);
      return {
        currentPitch,
        hasPitch: true,
        noteName: `${noteInfo.noteName}${noteInfo.octave}`,
        centsDeviation: noteInfo.cents,
      };
    }

    return {
      currentPitch,
      hasPitch: false,
      noteName: null,
      centsDeviation: 0,
    };
  }

  /**
   * Calculate RMS (Root Mean Square) of audio signal
   * Used to determine signal strength/confidence
   */
  private calculateRMS(buffer: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    return Math.sqrt(sum / buffer.length);
  }

  /**
   * Start continuous pitch detection
   * @param callback Function to call with each pitch analysis
   */
  start(callback: (analysis: PitchAnalysis) => void): void {
    if (this.isRunning) return;
    
    this.initialize();
    this.isRunning = true;
    this.onPitchDetected = callback;
    
    const detect = () => {
      if (!this.isRunning) return;
      
      const analysis = this.detectPitch();
      if (this.onPitchDetected) {
        this.onPitchDetected(analysis);
      }
      
      this.animationFrameId = requestAnimationFrame(detect);
    };
    
    detect();
  }

  /**
   * Stop pitch detection
   */
  stop(): void {
    this.isRunning = false;
    this.onPitchDetected = null;
    
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Check if pitch detection is currently running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Calculate pitch accuracy between detected and target pitch
   * @param detectedFreq Detected frequency in Hz
   * @param targetFreq Target frequency in Hz
   * @returns Accuracy percentage (0-100)
   */
  calculatePitchAccuracy(detectedFreq: number | null, targetFreq: number): number {
    if (detectedFreq === null || targetFreq <= 0) {
      return 0;
    }

    // Calculate cents difference
    const centsDiff = Math.abs(1200 * Math.log2(detectedFreq / targetFreq));
    
    // Convert to accuracy (100 cents = 1 semitone)
    // Perfect = 0 cents, 50 cents = half semitone (still good), 100+ cents = poor
    if (centsDiff <= 10) return 100; // Perfect
    if (centsDiff <= 25) return 90;  // Excellent
    if (centsDiff <= 50) return 75;  // Good
    if (centsDiff <= 100) return 50; // OK
    if (centsDiff <= 200) return 25; // Poor
    return 0; // Miss
  }
}

// Factory function to create pitch detection service
export function createPitchDetectionService(audioService: AudioService): PitchDetectionService {
  return new PitchDetectionService(audioService);
}
