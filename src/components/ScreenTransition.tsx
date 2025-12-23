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
 * ScreenTransition component - Simplified animated screen transitions
 * Only animates on enter, no exit animation to avoid removeChild issues
 */
export function ScreenTransition({
  children,
  transitionKey,
  type = 'fade',
  duration = 200,
  className = '',
}: ScreenTransitionProps) {
  const [animationClass, setAnimationClass] = useState('');
  const prevKeyRef = useRef(transitionKey);

  useEffect(() => {
    if (transitionKey !== prevKeyRef.current) {
      // Trigger enter animation on key change
      setAnimationClass(getEnterClasses(type));
      prevKeyRef.current = transitionKey;
      
      // Remove animation class after it completes
      const timer = setTimeout(() => {
        setAnimationClass('');
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [transitionKey, type, duration]);

  return (
    <div
      key={transitionKey}
      className={`transform-gpu ${animationClass} ${className}`}
      style={{ 
        animationDuration: `${duration}ms`,
        animationFillMode: 'both',
      }}
    >
      {children}
    </div>
  );
}

export default ScreenTransition;
