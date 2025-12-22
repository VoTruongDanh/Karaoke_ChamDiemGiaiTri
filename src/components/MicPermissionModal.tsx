'use client';

import React, { useState, useEffect } from 'react';

/**
 * Props for MicPermissionModal
 */
export interface MicPermissionModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when permission is granted */
  onGranted: () => void;
  /** Callback when permission is denied or skipped */
  onDenied: () => void;
  /** Callback to request permission */
  onRequestPermission: () => Promise<boolean>;
}

/**
 * Microphone icon
 */
function MicIcon() {
  return (
    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  );
}

/**
 * MicPermissionModal - Modal to request microphone permission for scoring
 */
export function MicPermissionModal({
  isOpen,
  onGranted,
  onDenied,
  onRequestPermission,
}: MicPermissionModalProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsRequesting(false);
      setError(null);
    }
  }, [isOpen]);

  const handleAllow = async () => {
    setIsRequesting(true);
    setError(null);
    
    try {
      const granted = await onRequestPermission();
      if (granted) {
        onGranted();
      } else {
        setError('Không thể truy cập microphone. Vui lòng cho phép trong cài đặt trình duyệt.');
      }
    } catch (err) {
      setError('Đã xảy ra lỗi khi yêu cầu quyền microphone.');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSkip = () => {
    onDenied();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-tv-card rounded-2xl p-8 max-w-md mx-4 shadow-2xl animate-scale-in">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-400">
            <MicIcon />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center text-slate-800 dark:text-white mb-3">
          Bật chấm điểm Karaoke?
        </h2>

        {/* Description */}
        <p className="text-center text-slate-600 dark:text-gray-400 mb-6">
          Cho phép truy cập microphone để chấm điểm giọng hát của bạn theo thời gian thực.
        </p>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleAllow}
            disabled={isRequesting}
            className="w-full py-4 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {isRequesting ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Đang yêu cầu quyền...</span>
              </>
            ) : (
              <>
                <MicIcon />
                <span>Cho phép Microphone</span>
              </>
            )}
          </button>
          
          <button
            onClick={handleSkip}
            disabled={isRequesting}
            className="w-full py-3 bg-slate-200 dark:bg-tv-surface hover:bg-slate-300 dark:hover:bg-tv-hover text-slate-700 dark:text-gray-300 font-medium rounded-xl transition-colors"
          >
            Bỏ qua, không chấm điểm
          </button>
        </div>

        {/* Note */}
        <p className="text-xs text-center text-slate-500 dark:text-gray-500 mt-4">
          Bạn có thể thay đổi quyền này trong cài đặt trình duyệt bất cứ lúc nào.
        </p>
      </div>
    </div>
  );
}

export default MicPermissionModal;
