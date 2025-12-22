'use client';

import React, { useEffect, useId, useCallback, useRef } from 'react';
import { useNavigationContext } from './NavigationGrid';
import type { FocusableElement } from '@/types/navigation';

/**
 * Props for FocusableButton component
 */
export interface FocusableButtonProps {
  /** Row position in the navigation grid */
  row: number;
  /** Column position in the navigation grid */
  col: number;
  /** Callback when button is selected */
  onSelect: () => void;
  /** Button content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Whether this button should auto-focus on mount */
  autoFocus?: boolean;
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'ghost';
  /** Button size - all sizes meet TV minimum touch target requirements */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Icon to display before text */
  icon?: React.ReactNode;
  /** Aria label for accessibility */
  ariaLabel?: string;
}

/**
 * Size configurations for TV-optimized buttons
 * Requirements: 1.1 - Large, focusable buttons (minimum 48px touch target)
 * Requirements: 6.4 - Large fonts for TV viewing distance (min 24px)
 * 
 * All sizes use TV-optimized spacing and font sizes from Tailwind config
 */
const SIZE_CLASSES = {
  sm: 'min-h-[56px] min-w-[140px] px-tv-3 py-tv-2 text-tv-xs',
  md: 'min-h-[64px] min-w-[180px] px-tv-4 py-tv-2 text-tv-sm',
  lg: 'min-h-[72px] min-w-[220px] px-tv-5 py-tv-3 text-tv-base',
  xl: 'min-h-[88px] min-w-[280px] px-tv-6 py-tv-3 text-tv-lg',
};

/**
 * Variant configurations for button styles
 * Requirements: 6.1 - Dark theme with vibrant accent colors
 */
const VARIANT_CLASSES = {
  primary: {
    base: 'bg-primary-600 text-white border-[3px] border-primary-500',
    focused: 'bg-primary-500 border-primary-300',
    disabled: 'bg-primary-900/50 text-primary-400 border-primary-900',
  },
  secondary: {
    base: 'bg-white dark:bg-tv-card text-slate-800 dark:text-white border-[3px] border-slate-200 dark:border-tv-border',
    focused: 'bg-slate-50 dark:bg-tv-hover border-primary-400',
    disabled: 'bg-slate-100 dark:bg-tv-surface/50 text-slate-400 dark:text-gray-500 border-slate-200 dark:border-tv-border/50',
  },
  ghost: {
    base: 'bg-transparent text-slate-700 dark:text-white border-[3px] border-transparent',
    focused: 'bg-slate-100 dark:bg-white/10 border-primary-400',
    disabled: 'text-slate-400 dark:text-gray-600 border-transparent',
  },
};

/**
 * FocusableButton component - TV-optimized button with focus states
 * 
 * Requirements: 1.1 - Large, focusable buttons with clear visual focus states
 * Requirements: 1.3 - Prominent highlight border and scale animation on focus
 * 
 * Features:
 * - Large touch targets (minimum 56px height)
 * - TV-optimized font sizes (minimum 24px)
 * - Scale animation on focus (1.05x)
 * - Prominent focus ring with glow effect
 * - Pulsing animation for focused state
 * - Smooth transitions for all state changes
 */
export function FocusableButton({
  row,
  col,
  onSelect,
  children,
  className = '',
  autoFocus = false,
  variant = 'primary',
  size = 'lg',
  disabled = false,
  icon,
  ariaLabel,
}: FocusableButtonProps) {
  const id = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const navigation = useNavigationContext();
  const isFocused = navigation.currentFocus.row === row && navigation.currentFocus.col === col;

  // Memoize the onSelect handler to prevent unnecessary re-registrations
  const handleSelect = useCallback(() => {
    if (!disabled) {
      onSelect();
    }
  }, [disabled, onSelect]);

  // Store handleSelect in ref to avoid re-registration
  const handleSelectRef = useRef(handleSelect);
  handleSelectRef.current = handleSelect;

  // Register element on mount - only re-register when position changes
  useEffect(() => {
    const element: FocusableElement = {
      id,
      row,
      col,
      onSelect: () => handleSelectRef.current(),
    };
    navigation.registerElement(element);

    return () => {
      navigation.unregisterElement(id);
    };
  }, [id, row, col, navigation.registerElement, navigation.unregisterElement]);

  // Handle auto-focus separately
  useEffect(() => {
    if (autoFocus) {
      navigation.setFocus(row, col);
    }
  }, [autoFocus, row, col, navigation.setFocus]);

  // Scroll into view and focus DOM element when focused
  useEffect(() => {
    if (isFocused && buttonRef.current) {
      buttonRef.current.focus({ preventScroll: false });
      buttonRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isFocused]);

  const variantStyles = VARIANT_CLASSES[variant];
  const sizeStyles = SIZE_CLASSES[size];

  // Build class names based on state
  // Requirements: 1.3 - Prominent highlight border and scale animation on focus
  const buttonClasses = [
    // Base styles
    'inline-flex items-center justify-center gap-tv-2',
    'font-semibold rounded-tv-lg',
    'cursor-pointer select-none',
    // Smooth transitions for all properties
    'transition-all duration-200 ease-out',
    'transform-gpu', // Hardware acceleration for smooth animations
    // Size (includes TV-optimized padding and font sizes)
    sizeStyles,
    // Variant base styles
    variantStyles.base,
    // Focus state styles (Requirements: 1.3 - scale animation and prominent highlight)
    isFocused && !disabled && variantStyles.focused,
    isFocused && !disabled && [
      'scale-105', // Scale animation on focus
      'shadow-tv-focus', // Prominent glow shadow
      'ring-tv ring-primary-400', // Focus ring
      'animate-focus-pulse', // Pulsing animation for visibility
      'z-10', // Ensure focused button is above siblings
    ].join(' '),
    // Disabled state
    disabled && variantStyles.disabled,
    disabled && 'cursor-not-allowed opacity-60',
    // Custom classes
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      ref={buttonRef}
      type="button"
      role="gridcell"
      aria-selected={isFocused}
      aria-disabled={disabled}
      aria-label={ariaLabel}
      data-focused={isFocused}
      data-row={row}
      data-col={col}
      disabled={disabled}
      className={buttonClasses}
      onClick={handleSelect}
      tabIndex={isFocused ? 0 : -1}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  );
}

export default FocusableButton;
