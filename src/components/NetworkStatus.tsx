'use client';

import React, { useState, useEffect, useCallback } from 'react';

/**
 * Network status types
 */
export type NetworkStatusType = 'connected' | 'connecting' | 'reconnecting' | 'error' | 'offline';

/**
 * Props for NetworkStatus component
 */
export interface NetworkStatusProps {
  /** Whether the socket is connected */
  isConnected: boolean;
  /** Whether we're attempting to reconnect */
  isReconnecting: boolean;
  /** Error message if any */
  error: string | null;
  /** Callback to retry connection */
  onRetry?: () => void;
  /** Auto-dismiss error after ms (0 = never) */
  autoDismissError?: number;
}

/**
 * Get status type from props
 */
function getStatusType(props: NetworkStatusProps): NetworkStatusType {
  if (props.error) return 'error';
  if (props.isReconnecting) return 'reconnecting';
  if (!props.isConnected) return 'connecting';
  return 'connected';
}

/**
 * Spinner icon component
 */
function SpinnerIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

/**
 * Warning icon component
 */
function WarningIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

/**
 * Check icon component
 */
function CheckIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

/**
 * Wifi off icon component
 */
function WifiOffIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
    </svg>
  );
}

/**
 * NetworkStatus component - Shows connection status with appropriate styling
 * 
 * Requirements: 8.3 - Handle network interruptions gracefully
 * 
 * Features:
 * - Shows connecting/reconnecting status with spinner
 * - Shows error messages with retry option
 * - Auto-dismisses errors after timeout
 * - Smooth animations for status changes
 */
export function NetworkStatus({
  isConnected,
  isReconnecting,
  error,
  onRetry,
  autoDismissError = 5000,
}: NetworkStatusProps) {
  const [dismissed, setDismissed] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [wasDisconnected, setWasDisconnected] = useState(false);

  const status = getStatusType({ isConnected, isReconnecting, error, onRetry });

  // Track disconnection state for showing success message
  useEffect(() => {
    if (!isConnected || isReconnecting) {
      setWasDisconnected(true);
      setDismissed(false);
    } else if (wasDisconnected && isConnected && !isReconnecting) {
      // Just reconnected - show success briefly
      setShowSuccess(true);
      const timer = setTimeout(() => {
        setShowSuccess(false);
        setWasDisconnected(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isConnected, isReconnecting, wasDisconnected]);

  // Auto-dismiss error
  useEffect(() => {
    if (error && autoDismissError > 0) {
      const timer = setTimeout(() => setDismissed(true), autoDismissError);
      return () => clearTimeout(timer);
    }
  }, [error, autoDismissError]);

  // Reset dismissed when error changes
  useEffect(() => {
    if (error) setDismissed(false);
  }, [error]);

  const handleRetry = useCallback(() => {
    setDismissed(false);
    onRetry?.();
  }, [onRetry]);

  // Don't show anything if connected and no recent reconnection
  if (status === 'connected' && !showSuccess) {
    return null;
  }

  // Don't show dismissed errors
  if (status === 'error' && dismissed) {
    return null;
  }

  // Render based on status
  const renderContent = () => {
    switch (status) {
      case 'connecting':
        return (
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-600/90 rounded-lg text-sm animate-fade-in">
            <SpinnerIcon />
            <span>Đang kết nối...</span>
          </div>
        );

      case 'reconnecting':
        return (
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-600/90 rounded-lg text-sm animate-fade-in">
            <SpinnerIcon />
            <span>Đang kết nối lại...</span>
          </div>
        );

      case 'error':
        return (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-600/90 rounded-lg text-sm animate-fade-in">
            <WarningIcon />
            <span>{error}</span>
            {onRetry && (
              <button
                onClick={handleRetry}
                className="ml-2 px-2 py-1 bg-white/20 hover:bg-white/30 rounded text-xs transition-colors"
              >
                Thử lại
              </button>
            )}
            <button
              onClick={() => setDismissed(true)}
              className="ml-1 p-1 hover:bg-white/20 rounded transition-colors"
              aria-label="Đóng"
            >
              ×
            </button>
          </div>
        );

      case 'connected':
        if (showSuccess) {
          return (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-600/90 rounded-lg text-sm animate-fade-in">
              <CheckIcon />
              <span>Đã kết nối lại</span>
            </div>
          );
        }
        return null;

      default:
        return null;
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      {renderContent()}
    </div>
  );
}

export default NetworkStatus;
