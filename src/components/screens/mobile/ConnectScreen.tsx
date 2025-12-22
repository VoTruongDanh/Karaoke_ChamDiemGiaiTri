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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-tv-bg dark:to-tv-surface flex flex-col">
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
          <div className="text-center mb-8">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
              Nhập mã kết nối
            </h2>
            <p className="text-slate-500 dark:text-gray-400 text-sm">
              Nhập mã 4 số hiển thị trên TV
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Single code input */}
            <div className="relative mb-6">
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={code}
                onChange={handleCodeChange}
                placeholder="0000"
                className="w-full h-20 text-center text-4xl font-bold tracking-[0.5em] bg-white dark:bg-tv-card border-2 border-slate-200 dark:border-tv-border rounded-2xl focus:border-primary-500 focus:ring-4 focus:ring-primary-500/20 transition-all text-slate-800 dark:text-white placeholder-slate-300 dark:placeholder-gray-600"
                autoFocus
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
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Progress indicator */}
            <div className="flex justify-center gap-2 mb-6">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    code.length > i
                      ? 'bg-primary-500'
                      : 'bg-slate-200 dark:bg-tv-border'
                  }`}
                />
              ))}
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl text-red-600 dark:text-red-400 text-center text-sm">
                {error}
              </div>
            )}

            {/* Socket connection status */}
            {!isSocketConnected && !error && (
              <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/30 rounded-xl text-yellow-600 dark:text-yellow-400 text-center text-sm">
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Đang kết nối đến server...</span>
                </div>
              </div>
            )}

            {/* Connect button */}
            <button
              type="submit"
              disabled={code.length !== 4 || isConnecting}
              className="w-full py-4 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed rounded-xl font-semibold text-white transition-colors flex items-center justify-center gap-2"
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
      <footer className="p-6 text-center">
        <div className="bg-slate-100 dark:bg-tv-card rounded-xl p-4">
          <p className="text-slate-600 dark:text-gray-400 text-sm mb-2">
            💡 Mẹo: Quét mã QR trên TV để kết nối tự động
          </p>
          <p className="text-slate-500 dark:text-gray-500 text-xs">
            Mở camera điện thoại và quét mã QR hiển thị trên TV
          </p>
        </div>
      </footer>
    </div>
  );
}

export default ConnectScreen;
