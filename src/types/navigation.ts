/**
 * Navigation direction for TV remote
 */
export type NavigationDirection = 'up' | 'down' | 'left' | 'right';

/**
 * Focusable element in the TV navigation grid
 * Requirements: 1.2 - Grid pattern navigation
 */
export interface FocusableElement {
  /** Unique identifier for the element */
  id: string;
  /** Row position in the grid */
  row: number;
  /** Column position in the grid */
  col: number;
  /** Callback when element is selected */
  onSelect: () => void;
}

/**
 * Navigation grid for TV remote control
 * Requirements: 1.2, 1.4 - Support only 5 keys: Up, Down, Left, Right, Enter
 */
export interface NavigationGrid {
  /** 2D array of focusable elements */
  elements: FocusableElement[][];
  /** Current focus position */
  currentFocus: { row: number; col: number };
  
  /**
   * Move focus in a direction
   * @param direction - The direction to move
   */
  moveFocus(direction: NavigationDirection): void;
  
  /**
   * Select the currently focused element
   */
  selectCurrent(): void;
}

/**
 * TV App screen types
 */
export type TVScreen = 'home' | 'search' | 'queue' | 'playing';

/**
 * TV App state for client-side
 */
export interface TVAppState {
  // Session
  session: import('./session').Session | null;
  isConnected: boolean;
  
  // Navigation
  currentScreen: TVScreen;
  focusedElement: string | null;
  
  // Queue
  queue: import('./queue').QueueItem[];
  currentSong: import('./queue').QueueItem | null;
  
  // Scoring
  isScoring: boolean;
  currentScore: import('./score').ScoreData | null;
  realTimeFeedback: import('./score').RealTimeFeedback | null;
  
  // Search
  searchQuery: string;
  searchResults: import('./song').Song[];
  isSearching: boolean;
}

/**
 * Mobile controller state
 */
export interface MobileState {
  // Connection
  sessionCode: string;
  isConnected: boolean;
  
  // Search
  searchQuery: string;
  searchResults: import('./song').Song[];
  
  // Queue view
  queue: import('./queue').QueueItem[];
  currentSong: import('./queue').QueueItem | null;
}
