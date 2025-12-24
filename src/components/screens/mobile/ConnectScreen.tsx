'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Props for ConnectScreen component
 */
export interface ConnectScreenProps {
  /** Callback when successfully connected to a session */
  onConnect: (sessionCode: string) => void;
  /** Whether connection is in progress */
  isConnecting?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Initial code from URL */
  initialCode?: string;
  /** Whether socket is connected to server */
  isSocketConnected?: boolean;
}

/**
 * QR Scanner component using device camera
 */
function QRScanner({ onScan, onClose }: { onScan: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        
        if (!mounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setIsScanning(true);
        }
      } catch (err) {
        if (mounted) {
          setError('Không thể truy cập camera. Vui lòng cấp quyền camera.');
        }
      }
    };

    startCamera();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Scan for QR code
  useEffect(() => {
    if (!isScanning) return;

    const scanQR = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        animationRef.current = requestAnimationFrame(scanQR);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      // Try to use BarcodeDetector API if available
      if ('BarcodeDetector' in window) {
        try {
          const barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
          const barcodes = await barcodeDetector.detect(canvas);
          
          if (barcodes.length > 0) {
            const url = barcodes[0].rawValue;
            // Extract code from URL like https://...?code=1234
            const match = url.match(/[?&]code=(\d{4})/);
            if (match) {
              onScan(match[1]);
              return;
            }
          }
        } catch {}
      }

      animationRef.current = requestAnimationFrame(scanQR);
    };

    animationRef.current = requestAnimationFrame(scanQR);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isScanning, onScan]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50">
        <h2 className="text-white font-semibold">Quét mã QR</h2>
        <button
          onClick={onClose}
          className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Camera view */}
      <div className="flex-1 relative">
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="text-center text-white">
              <svg className="w-16 h-16 mx-auto mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="mb-4">{error}</p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              muted
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Scan overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-64 relative">
                {/* Corner markers */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />
                
                {/* Scan line animation */}
                <div className="absolute inset-x-0 top-0 h-0.5 bg-primary-500 animate-scan" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Instructions */}
      <div className="p-4 bg-black/50 text-center">
        <p className="text-white text-sm">
          Hướng camera vào mã QR trên TV
        </p>
      </div>
    </div>
  );
}

/**
 * ConnectScreen component - Mobile controller connection screen
 * Simple code input - 4 digits
 */
export function ConnectScreen({
  onConnect,
  isConnecting = false,
  error = null,
  initialCode = '',
  isSocketConnected = true,
}: ConnectScreenProps) {
  const [code, setCode] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasAutoConnectedRef = useRef(false);

  // Auto-connect if initial code provided (only once)
  useEffect(() => {
    if (initialCode && !hasAutoConnectedRef.current) {
      // Extract code - could be 4 digits or from URL
      const cleanCode = initialCode.replace(/[^0-9]/g, '').substring(0, 4);
      if (cleanCode.length === 4) {
        hasAutoConnectedRef.current = true;
        setCode(cleanCode);
        // Small delay to let UI render first
        setTimeout(() => onConnect(cleanCode), 100);
      }
    }
  }, [initialCode, onConnect]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle code input change
  const handleCodeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '').substring(0, 4);
    setCode(value);
  }, []);

  // Handle form submit
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (code.length === 4 && !isConnecting) {
      onConnect(code);
    }
  }, [code, isConnecting, onConnect]);

  // Clear code
  const handleClear = useCallback(() => {
    setCode('');
    hasAutoConnectedRef.current = false;
    inputRef.current?.focus();
  }, []);

  // Handle QR scan result
  const handleQRScan = useCallback((scannedCode: string) => {
    setShowScanner(false);
    setCode(scannedCode);
    // Auto connect after scan
    setTimeout(() => onConnect(scannedCode), 300);
  }, [onConnect]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-tv-bg dark:to-tv-surface flex flex-col">
      {/* QR Scanner Modal */}
      {showScanner && (
        <QRScanner
          onScan={handleQRScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Header */}
      <header className="p-6 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <h1 className="text-2xl font-bold text-primary-600 dark:text-primary-400">Karaoke</h1>
        </div>
        <p className="text-slate-500 dark:text-gray-400">Điều khiển từ điện thoại</p>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Instructions */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
              Kết nối với TV
            </h2>
            <p className="text-slate-500 dark:text-gray-400 text-sm">
              Quét mã QR hoặc nhập mã 4 số trên TV
            </p>
          </div>

          {/* QR Scan Button */}
          <button
            type="button"
            onClick={() => setShowScanner(true)}
            disabled={isConnecting}
            className="w-full mb-4 py-4 bg-rose-500 hover:bg-rose-600 disabled:bg-slate-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed rounded-xl font-semibold text-white transition-colors flex items-center justify-center gap-3"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            <span>Quét mã QR</span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 h-px bg-slate-200 dark:bg-tv-border" />
            <span className="text-slate-400 dark:text-gray-500 text-sm">hoặc</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-tv-border" />
          </div>

          <form onSubmit={handleSubmit}>
            {/* Single code input */}
            <div className="relative mb-4">
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={code}
                onChange={handleCodeChange}
                placeholder="0000"
                className="w-full h-16 text-center text-3xl font-bold tracking-[0.5em] bg-white dark:bg-tv-card border-2 border-slate-200 dark:border-tv-border rounded-xl focus:border-primary-500 focus:ring-4 focus:ring-primary-500/20 transition-all text-slate-800 dark:text-white placeholder-slate-300 dark:placeholder-gray-600"
                disabled={isConnecting}
                autoComplete="off"
              />
              
              {/* Clear button */}
              {code.length > 0 && !isConnecting && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Progress indicator */}
            <div className="flex justify-center gap-2 mb-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    code.length > i
                      ? 'bg-primary-500'
                      : 'bg-slate-200 dark:bg-tv-border'
                  }`}
                />
              ))}
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl text-red-600 dark:text-red-400 text-center text-sm">
                {error}
              </div>
            )}

            {/* Socket connection status */}
            {!isSocketConnected && !error && (
              <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/30 rounded-xl text-yellow-600 dark:text-yellow-400 text-center text-sm">
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Đang kết nối server...</span>
                </div>
              </div>
            )}

            {/* Connect button */}
            <button
              type="submit"
              disabled={code.length !== 4 || isConnecting}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed rounded-xl font-semibold text-white transition-colors flex items-center justify-center gap-2"
            >
              {isConnecting ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Đang kết nối...</span>
                </>
              ) : (
                <span>Kết nối</span>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center">
        <p className="text-slate-400 dark:text-gray-500 text-xs">
          Mở ứng dụng Karaoke trên TV để lấy mã kết nối
        </p>
      </footer>
    </div>
  );
}

export default ConnectScreen;
