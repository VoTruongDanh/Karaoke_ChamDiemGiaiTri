'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { NavigationDirection, FocusableElement } from '@/types/navigation';

/**
 * Configuration for the TV navigation hook
 */
export interface TVNavigationConfig {
  /** Initial focus position */
  initialFocus?: { row: number; col: number };
  /** Callback when focus changes */
  onFocusChange?: (element: FocusableElement | null) => void;
  /** Whether navigation is enabled */
  enabled?: boolean;
}

/**
 * Return type for useTVNavigation hook
 */
export interface TVNavigationResult {
  /** Current focus position */
  currentFocus: { row: number; col: number };
  /** Currently focused element */
  focusedElement: FocusableElement | null;
  /** Move focus in a direction */
  moveFocus: (direction: NavigationDirection) => void;
  /** Select the currently focused element */
  selectCurrent: () => void;
  /** Set focus to a specific position */
  setFocus: (row: number, col: number) => void;
  /** Register an element in the grid */
  registerElement: (element: FocusableElement) => void;
  /** Unregister an element from the grid */
  unregisterElement: (id: string) => void;
  /** Get all registered elements */
  getElements: () => FocusableElement[][];
}

/**
 * Key codes for TV remote navigation
 * Requirements: 1.4 - Support only 5 keys: Up, Down, Left, Right, Enter
 * Also supports TV-specific key codes from various manufacturers
 */
const KEY_MAP: Record<string, NavigationDirection | 'select'> = {
  // Standard keyboard
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  Enter: 'select',
  ' ': 'select', // Space bar
  Tab: 'right', // Tab moves right
  
  // Samsung/LG TV remote codes
  '38': 'up',    // Up
  '40': 'down',  // Down
  '37': 'left',  // Left
  '39': 'right', // Right
  '13': 'select', // Enter/OK
  '9': 'right',  // Tab
  
  // Some TV browsers use these
  'Up': 'up',
  'Down': 'down',
  'Left': 'left',
  'Right': 'right',
  'Select': 'select',
  'Ok': 'select',
};

/**
 * Hook for TV remote navigation with keyboard event handling
 * Requirements: 1.2 - Grid pattern navigation
 * Requirements: 1.4 - Support only Up, Down, Left, Right, Enter keys
 */
export function useTVNavigation(config: TVNavigationConfig = {}): TVNavigationResult {
  const { initialFocus = { row: 0, col: 0 }, onFocusChange, enabled = true } = config;

  const [currentFocus, setCurrentFocus] = useState(initialFocus);
  const elementsRef = useRef<Map<string, FocusableElement>>(new Map());
  const gridRef = useRef<FocusableElement[][]>([]);

  /**
   * Rebuild the grid from registered elements
   */
  const rebuildGrid = useCallback(() => {
    const elements = Array.from(elementsRef.current.values());
    if (elements.length === 0) {
      gridRef.current = [];
      return;
    }

    // Find grid dimensions
    const maxRow = Math.max(...elements.map((e) => e.row));
    const maxCol = Math.max(...elements.map((e) => e.col));

    // Build 2D grid
    const grid: FocusableElement[][] = [];
    for (let r = 0; r <= maxRow; r++) {
      grid[r] = [];
      for (let c = 0; c <= maxCol; c++) {
        const element = elements.find((e) => e.row === r && e.col === c);
        if (element) {
          grid[r][c] = element;
        }
      }
    }
    gridRef.current = grid;
  }, []);

  /**
   * Register an element in the navigation grid
   */
  const registerElement = useCallback(
    (element: FocusableElement) => {
      elementsRef.current.set(element.id, element);
      rebuildGrid();
    },
    [rebuildGrid]
  );

  /**
   * Unregister an element from the navigation grid
   */
  const unregisterElement = useCallback(
    (id: string) => {
      elementsRef.current.delete(id);
      rebuildGrid();
    },
    [rebuildGrid]
  );

  /**
   * Get the currently focused element
   */
  const getFocusedElement = useCallback((): FocusableElement | null => {
    const grid = gridRef.current;
    if (!grid[currentFocus.row]) return null;
    return grid[currentFocus.row][currentFocus.col] || null;
  }, [currentFocus]);

  /**
   * Find the next valid position in a direction
   * Supports skipping empty rows when moving vertically
   */
  const findNextPosition = useCallback(
    (
      direction: NavigationDirection,
      fromRow: number,
      fromCol: number
    ): { row: number; col: number } | null => {
      const grid = gridRef.current;
      if (grid.length === 0) return null;

      let newRow = fromRow;
      let newCol = fromCol;

      switch (direction) {
        case 'up':
          newRow = fromRow - 1;
          break;
        case 'down':
          newRow = fromRow + 1;
          break;
        case 'left':
          newCol = fromCol - 1;
          break;
        case 'right':
          newCol = fromCol + 1;
          break;
      }

      // For vertical movement, skip empty rows
      if (direction === 'up' || direction === 'down') {
        const step = direction === 'up' ? -1 : 1;
        let targetRow = newRow;
        
        // Search for next row with elements (max 10 rows to prevent infinite loop)
        for (let i = 0; i < 10; i++) {
          if (targetRow < 0 || targetRow >= grid.length) return null;
          
          const row = grid[targetRow];
          if (row && row.some(el => el !== undefined)) {
            // Found a row with elements, find nearest column
            let nearestCol = -1;
            let minDistance = Infinity;

            for (let c = 0; c < row.length; c++) {
              if (row[c]) {
                const distance = Math.abs(c - fromCol);
                if (distance < minDistance) {
                  minDistance = distance;
                  nearestCol = c;
                }
              }
            }

            if (nearestCol >= 0) {
              return { row: targetRow, col: nearestCol };
            }
          }
          
          targetRow += step;
        }
        
        return null;
      }

      // Horizontal movement - check bounds
      if (newCol < 0) return null;
      if (!grid[newRow]) return null;

      // Find the element at the new position
      if (grid[newRow][newCol]) {
        return { row: newRow, col: newCol };
      }

      return null;
    },
    []
  );

  /**
   * Move focus in a direction
   * Requirements: 1.2 - Move focus between elements in logical grid pattern
   */
  const moveFocus = useCallback(
    (direction: NavigationDirection) => {
      const nextPos = findNextPosition(direction, currentFocus.row, currentFocus.col);
      if (nextPos) {
        setCurrentFocus(nextPos);
      }
    },
    [currentFocus, findNextPosition]
  );

  /**
   * Select the currently focused element
   */
  const selectCurrent = useCallback(() => {
    const element = getFocusedElement();
    if (element?.onSelect) {
      element.onSelect();
    }
  }, [getFocusedElement]);

  /**
   * Set focus to a specific position
   */
  const setFocus = useCallback((row: number, col: number) => {
    setCurrentFocus({ row, col });
  }, []);

  /**
   * Get all registered elements as a 2D grid
   */
  const getElements = useCallback((): FocusableElement[][] => {
    return gridRef.current;
  }, []);

  /**
   * Handle keyboard events
   * Requirements: 1.4 - Support only Up, Down, Left, Right, Enter keys
   */
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Try key first, then keyCode for older TV browsers
      const action = KEY_MAP[event.key] || KEY_MAP[String(event.keyCode)];
      
      if (!action) return; // Ignore unsupported keys

      // Handle Shift+Tab as left
      if (event.key === 'Tab' && event.shiftKey) {
        const nextPos = findNextPosition('left', currentFocus.row, currentFocus.col);
        if (nextPos) {
          event.preventDefault();
          event.stopPropagation();
          setCurrentFocus(nextPos);
        }
        return;
      }

      if (action === 'select') {
        const element = getFocusedElement();
        if (element) {
          event.preventDefault();
          event.stopPropagation();
          selectCurrent();
        }
      } else {
        const nextPos = findNextPosition(action, currentFocus.row, currentFocus.col);
        if (nextPos) {
          event.preventDefault();
          event.stopPropagation();
          moveFocus(action);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [enabled, moveFocus, selectCurrent, currentFocus, findNextPosition, getFocusedElement]);

  /**
   * Notify on focus change
   */
  const prevFocusRef = useRef<{ row: number; col: number } | null>(null);
  
  useEffect(() => {
    // Only call onFocusChange if focus actually changed
    if (
      onFocusChange &&
      (prevFocusRef.current?.row !== currentFocus.row ||
        prevFocusRef.current?.col !== currentFocus.col)
    ) {
      prevFocusRef.current = currentFocus;
      onFocusChange(getFocusedElement());
    }
  }, [currentFocus]); // Remove onFocusChange and getFocusedElement from deps

  return {
    currentFocus,
    focusedElement: getFocusedElement(),
    moveFocus,
    selectCurrent,
    setFocus,
    registerElement,
    unregisterElement,
    getElements,
  };
}

export default useTVNavigation;
