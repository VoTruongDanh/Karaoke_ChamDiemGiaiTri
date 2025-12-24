'use client';

import React, { useEffect, useState } from 'react';
import { FocusableButton } from './FocusableButton';

/**
 * Sun icon for light mode
 */
function SunIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

/**
 * Moon icon for dark mode
 */
function MoonIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  );
}

interface ThemeToggleProps {
  row?: number;
  col?: number;
}

/**
 * ThemeToggle component - Toggle between light and dark mode
 * Supports d-pad navigation when row/col props are provided
 */
export function ThemeToggle({ row, col }: ThemeToggleProps) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('karaoke-theme');
    if (savedTheme === 'dark') {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Toggle theme
  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    
    if (newIsDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('karaoke-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('karaoke-theme', 'light');
    }
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="p-2 rounded-lg bg-tv-card border border-tv-border opacity-50">
        <div className="w-6 h-6" />
      </div>
    );
  }

  // If row/col provided, use FocusableButton for d-pad navigation
  if (row !== undefined && col !== undefined) {
    return (
      <FocusableButton
        row={row}
        col={col}
        onSelect={toggleTheme}
        variant="ghost"
        className="!p-2 !min-w-0 !min-h-0"
        aria-label={isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
      >
        {isDark ? <SunIcon /> : <MoonIcon />}
      </FocusableButton>
    );
  }

  // Fallback to regular button
  return (
    <button
      onClick={toggleTheme}
      tabIndex={0}
      className="p-2 rounded-lg bg-white/10 dark:bg-tv-card border border-slate-200 dark:border-tv-border hover:bg-slate-100 dark:hover:bg-tv-hover transition-all focus:outline-none focus:ring-2 focus:ring-primary-400/60 focus:scale-105"
      aria-label={isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
      title={isDark ? 'Chế độ sáng' : 'Chế độ tối'}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleTheme();
        }
      }}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

export default ThemeToggle;
