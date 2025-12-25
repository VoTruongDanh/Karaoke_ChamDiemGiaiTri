'use client';

import { useEffect, useRef, useCallback } from 'react';

interface UseBackButtonOptions {
  /** Callback when back is pressed - return true to allow default behavior */
  onBack?: () => boolean | void;
  /** Whether to show exit confirmation (only for root screens) */
  showExitConfirm?: boolean;
  /** Callback to show toast message */
  onShowToast?: (message: string) => void;
}

/**
 * Hook to handle back button press on TV remotes
 * Catches: Escape, Backspace, GoBack, BrowserBack, keyCode 461/10009
 */
export function useBackButton(options: UseBackButtonOptions = {}) {
  const { onBack, showExitConfirm = false, onShowToast } = options;
  const backPressTimeRef = useRef<number>(0);
  const onBackRef = useRef(onBack);
  
  // Keep ref updated
  useEffect(() => {
    onBackRef.current = onBack;
  });

  const handleBack = useCallback((e: KeyboardEvent | PopStateEvent) => {
    // Check if it's a back key
    if (e instanceof KeyboardEvent) {
      const isBackKey = 
        e.key === 'Escape' || 
        e.key === 'Backspace' || 
        e.key === 'GoBack' || 
        e.key === 'BrowserBack' ||
        e.keyCode === 461 || // LG TV
        e.keyCode === 10009 || // Samsung TV
        e.keyCode === 8; // Backspace
      
      if (!isBackKey) return;
    }

    e.preventDefault();
    if (e instanceof KeyboardEvent) {
      e.stopPropagation();
    }

    // If exit confirmation is enabled (root screen)
    if (showExitConfirm) {
      const now = Date.now();
      const timeSinceLastPress = now - backPressTimeRef.current;
      
      if (timeSinceLastPress < 2000 && backPressTimeRef.current > 0) {
        // Second press within 2s - allow exit
        window.history.go(-2);
        return;
      } else {
        // First press - show warning
        backPressTimeRef.current = now;
        onShowToast?.('Nhấn Back lần nữa để thoát');
        return;
      }
    }

    // Call onBack callback
    if (onBackRef.current) {
      const result = onBackRef.current();
      if (result === true) {
        // Allow default behavior
        return;
      }
    }
  }, [showExitConfirm, onShowToast]);

  useEffect(() => {
    // Push dummy state to prevent immediate back navigation
    window.history.pushState({ app: true }, '', window.location.href);

    const handleKeyDown = (e: KeyboardEvent) => {
      handleBack(e);
    };

    const handlePopState = (e: PopStateEvent) => {
      // Re-push state to prevent navigation
      window.history.pushState({ app: true }, '', window.location.href);
      handleBack(e);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [handleBack]);
}

export default useBackButton;
