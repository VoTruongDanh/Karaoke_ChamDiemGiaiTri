/**
 * Audio Service for microphone input and Web Audio API
 * Requirements: 5.1 - Listen to microphone input
 * Requirements: 5.5 - Handle microphone access denial
 */

export type MicrophoneStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'error';

export interface AudioServiceState {
  status: MicrophoneStatus;
  errorMessage: string | null;
  audioContext: AudioContext | null;
  analyser: AnalyserNode | null;
  mediaStream: MediaStream | null;
}

/**
 * Audio Service class for managing microphone input
 */
export class AudioService {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private status: MicrophoneStatus = 'idle';
  private errorMessage: string | null = null;

  /**
   * Request microphone permission and setup audio context
   * @returns Promise resolving to true if permission granted
   */
  async requestMicrophoneAccess(): Promise<boolean> {
    this.status = 'requesting';
    this.errorMessage = null;
    
    console.log('[AudioService] ========================================');
    console.log('[AudioService] Requesting microphone access...');
    console.log('[AudioService] navigator.mediaDevices:', !!navigator.mediaDevices);
    console.log('[AudioService] getUserMedia:', !!(navigator.mediaDevices?.getUserMedia));

    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.status = 'error';
        this.errorMessage = 'Microphone access is not supported in this browser';
        console.error('[AudioService] getUserMedia not supported');
        return false;
      }

      // Check existing permissions first
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        console.log('[AudioService] Current permission state:', permissionStatus.state);
      } catch (e) {
        console.log('[AudioService] Cannot query permission (normal on some browsers)');
      }

      console.log('[AudioService] Calling getUserMedia with audio constraints...');
      
      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      
      console.log('[AudioService] Microphone access granted!');
      console.log('[AudioService] Stream tracks:', this.mediaStream.getTracks().map(t => ({ kind: t.kind, label: t.label, enabled: t.enabled })));

      // Create audio context
      this.audioContext = new AudioContext();
      
      // Create analyser node for frequency analysis
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;

      // Connect microphone to analyser
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.sourceNode.connect(this.analyser);

      this.status = 'granted';
      console.log('[AudioService] Audio setup complete, mic ready!');
      console.log('[AudioService] ========================================');
      return true;
    } catch (error) {
      console.error('[AudioService] ========================================');
      console.error('[AudioService] Microphone error:', error);
      console.error('[AudioService] Error name:', (error as Error).name);
      console.error('[AudioService] Error message:', (error as Error).message);
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          this.status = 'denied';
          this.errorMessage = 'Microphone access was denied. Scoring will be disabled.';
        } else if (error.name === 'NotFoundError') {
          this.status = 'error';
          this.errorMessage = 'No microphone found. Please connect a microphone.';
        } else {
          this.status = 'error';
          this.errorMessage = `Microphone error: ${error.message}`;
        }
      } else {
        this.status = 'error';
        this.errorMessage = 'An unexpected error occurred while accessing the microphone.';
      }
      return false;
    }
  }

  /**
   * Get the current audio analyser node
   */
  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  /**
   * Get the audio context
   */
  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  /**
   * Get current microphone status
   */
  getStatus(): MicrophoneStatus {
    return this.status;
  }

  /**
   * Get error message if any
   */
  getErrorMessage(): string | null {
    return this.errorMessage;
  }

  /**
   * Get the current state of the audio service
   */
  getState(): AudioServiceState {
    return {
      status: this.status,
      errorMessage: this.errorMessage,
      audioContext: this.audioContext,
      analyser: this.analyser,
      mediaStream: this.mediaStream,
    };
  }

  /**
   * Get time domain data from the analyser
   * @returns Float32Array of time domain data
   */
  getTimeDomainData(): Float32Array | null {
    if (!this.analyser) return null;
    
    const bufferLength = this.analyser.fftSize;
    const dataArray = new Float32Array(bufferLength);
    this.analyser.getFloatTimeDomainData(dataArray);
    return dataArray;
  }

  /**
   * Get frequency data from the analyser
   * @returns Float32Array of frequency data
   */
  getFrequencyData(): Float32Array | null {
    if (!this.analyser) return null;
    
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    this.analyser.getFloatFrequencyData(dataArray);
    return dataArray;
  }

  /**
   * Resume audio context if suspended (required for some browsers)
   */
  async resume(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Stop and cleanup all audio resources
   */
  stop(): void {
    // Stop all tracks in the media stream
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    // Disconnect source node
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.analyser = null;
    this.status = 'idle';
  }

  /**
   * Check if the audio service is ready for use
   */
  isReady(): boolean {
    return this.status === 'granted' && this.analyser !== null && this.audioContext !== null;
  }
}

// Singleton instance
let audioServiceInstance: AudioService | null = null;

/**
 * Get the singleton audio service instance
 */
export function getAudioService(): AudioService {
  if (!audioServiceInstance) {
    audioServiceInstance = new AudioService();
  }
  return audioServiceInstance;
}

/**
 * Reset the audio service instance (useful for testing)
 */
export function resetAudioService(): void {
  if (audioServiceInstance) {
    audioServiceInstance.stop();
    audioServiceInstance = null;
  }
}
