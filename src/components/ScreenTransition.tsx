'use client';

import React, { useState, useEffect, useRef } from 'react';

/**
 * Transition types for screen changes
 */
export type TransitionType = 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'zoom' | 'none';

/**
 * Props for ScreenTransition component
 */
export interface ScreenTransitionProps {
  /** Content to render */
  children: React.ReactNode;
  /** Unique key to trigger transition on change */
  transitionKey: string;
  /** Type of transition animation */
  type?: TransitionType;
  /** Duration of transition in ms */
  duration?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get CSS classes for enter animation
 */
function getEnterClasses(type: TransitionType): string {
  switch (type) {
    case 'fade':
      return 'animate-fade-in';
    case 'slide-left':
      return 'animate-slide-in-left';
    case 'slide-right':
      return 'animate-slide-in-right';
    case 'slide-up':
      return 'animate-slide-in-up';
    case 'zoom':
      return 'animate-zoom-in';
    case 'none':
    default:
      return '';
  }
}

/**
 * Get CSS classes for exit animation
 */
function getExitClasses(type: TransitionType): string {
  switch (type) {
    case 'fade':
      return 'animate-fade-out';
    case 'slide-left':
      return 'animate-slide-out-left';
    case 'slide-right':
      return 'animate-slide-out-right';
    case 'slide-up':
      return 'animate-slide-out-down';
    case 'zoom':
      return 'animate-zoom-out';
    case 'none':
    default:
      return '';
  }
}

/**
 * ScreenTransition component - Animated screen transitions
 * 
 * Requirements: 6.2 - Smooth animations for transitions and interactions
 * 
 * Features:
 * - Multiple transition types (fade, slide, zoom)
 * - Configurable duration
 * - Smooth enter/exit animations
 * - Hardware-accelerated transforms
 */
export function ScreenTransition({
  children,
  transitionKey,
  type = 'fade',
  duration = 200,
  className = '',
}: ScreenTransitionProps) {
  const [displayedKey, setDisplayedKey] = useState(transitionKey);
  const [displayedChildren, setDisplayedChildren] = useState(children);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<'enter' | 'exit' | 'idle'>('idle');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (transitionKey !== displayedKey) {
      // Start exit animation
      setIsAnimating(true);
      setAnimationPhase('exit');

      // After exit animation, update content and start enter animation
      timeoutRef.current = setTimeout(() => {
        setDisplayedKey(transitionKey);
        setDisplayedChildren(children);
        setAnimationPhase('enter');

        // After enter animation, reset state
        timeoutRef.current = setTimeout(() => {
          setIsAnimating(false);
          setAnimationPhase('idle');
        }, duration);
      }, duration);
    } else {
      // Key hasn't changed, just update children
      setDisplayedChildren(children);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [transitionKey, displayedKey, children, duration]);

  // Get animation classes based on phase
  const animationClasses = (() => {
    if (type === 'none') return '';
    
    switch (animationPhase) {
      case 'enter':
        return getEnterClasses(type);
      case 'exit':
        return getExitClasses(type);
      default:
        return '';
    }
  })();

  return (
    <div
      className={`transform-gpu ${animationClasses} ${className}`}
      style={{ 
        animationDuration: `${duration}ms`,
        animationFillMode: 'both',
      }}
    >
      {displayedChildren}
    </div>
  );
}

export default ScreenTransition;
