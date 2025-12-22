'use client';

import React, { createContext, useContext, useEffect, useId, useMemo, useRef } from 'react';
import { useTVNavigation, type TVNavigationConfig, type TVNavigationResult } from '@/hooks/useTVNavigation';
import type { FocusableElement } from '@/types/navigation';

/**
 * Context for sharing navigation state across components
 */
const NavigationContext = createContext<TVNavigationResult | null>(null);

/**
 * Hook to access navigation context
 */
export function useNavigationContext(): TVNavigationResult {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigationContext must be used within a NavigationGrid');
  }
  return context;
}

/**
 * Props for NavigationGrid component
 */
export interface NavigationGridProps {
  /** Child components */
  children: React.ReactNode;
  /** Navigation configuration */
  config?: TVNavigationConfig;
  /** Additional CSS classes */
  className?: string;
}

/**
 * NavigationGrid component - Container for TV navigation
 * Requirements: 1.2 - Grid pattern navigation
 * Requirements: 1.4 - Support only Up, Down, Left, Right, Enter keys
 */
export function NavigationGrid({ children, config, className }: NavigationGridProps) {
  const navigation = useTVNavigation(config);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => navigation, [
    navigation.currentFocus.row,
    navigation.currentFocus.col,
    navigation.registerElement,
    navigation.unregisterElement,
    navigation.setFocus,
    navigation.moveFocus,
    navigation.selectCurrent,
  ]);

  return (
    <NavigationContext.Provider value={contextValue}>
      <div className={className} role="grid" aria-label="TV Navigation Grid">
        {children}
      </div>
    </NavigationContext.Provider>
  );
}

/**
 * Props for NavigationItem component
 */
export interface NavigationItemProps {
  /** Row position in the grid */
  row: number;
  /** Column position in the grid */
  col: number;
  /** Callback when item is selected */
  onSelect: () => void;
  /** Child components */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Whether this item should auto-focus on mount */
  autoFocus?: boolean;
}

/**
 * NavigationItem component - A focusable item in the navigation grid
 * Requirements: 1.2 - Grid pattern navigation
 */
export function NavigationItem({
  row,
  col,
  onSelect,
  children,
  className = '',
  autoFocus = false,
}: NavigationItemProps) {
  const id = useId();
  const navigation = useNavigationContext();
  const isFocused = navigation.currentFocus.row === row && navigation.currentFocus.col === col;
  
  // Store onSelect in ref to avoid re-registration
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Register element on mount - only re-register when position changes
  useEffect(() => {
    const element: FocusableElement = {
      id,
      row,
      col,
      onSelect: () => onSelectRef.current(),
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

  return (
    <div
      role="gridcell"
      aria-selected={isFocused}
      data-focused={isFocused}
      data-row={row}
      data-col={col}
      className={className}
    >
      {typeof children === 'function'
        ? (children as (isFocused: boolean) => React.ReactNode)(isFocused)
        : children}
    </div>
  );
}

export default NavigationGrid;
