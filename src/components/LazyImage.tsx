'use client';

import React, { useState, useEffect, useRef } from 'react';

/**
 * Props for LazyImage component
 */
export interface LazyImageProps {
  /** Image source URL */
  src: string;
  /** Alt text for accessibility */
  alt: string;
  /** CSS class name */
  className?: string;
  /** Placeholder color or image */
  placeholder?: string;
  /** Width for aspect ratio */
  width?: number;
  /** Height for aspect ratio */
  height?: number;
  /** Loading priority - eager loads immediately */
  priority?: boolean;
  /** Callback when image loads */
  onLoad?: () => void;
  /** Callback when image fails to load */
  onError?: () => void;
}

/**
 * Default placeholder - a subtle gradient
 */
const DEFAULT_PLACEHOLDER = 'linear-gradient(135deg, #1e293b 0%, #334155 100%)';

/**
 * LazyImage component - Lazy loads images with intersection observer
 * 
 * Requirements: 8.5 - Use lazy loading for images
 * 
 * Features:
 * - Uses IntersectionObserver for lazy loading
 * - Shows placeholder while loading
 * - Smooth fade-in animation on load
 * - Fallback for failed images
 * - Priority loading option for above-the-fold images
 */
export function LazyImage({
  src,
  alt,
  className = '',
  placeholder = DEFAULT_PLACEHOLDER,
  width,
  height,
  priority = false,
  onLoad,
  onError,
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Set up intersection observer for lazy loading
  useEffect(() => {
    if (priority || isInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '100px', // Start loading 100px before entering viewport
        threshold: 0,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [priority, isInView]);

  // Handle image load
  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
    onLoad?.();
  };

  // Handle image error
  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
    onError?.();
  };

  // Calculate aspect ratio style
  const aspectRatioStyle = width && height
    ? { aspectRatio: `${width} / ${height}` }
    : {};

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        ...aspectRatioStyle,
        background: !isLoaded ? placeholder : undefined,
      }}
    >
      {/* Placeholder shimmer effect */}
      {!isLoaded && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-tv-surface">
          <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}

      {/* Actual image */}
      {isInView && !hasError && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className={`
            w-full h-full object-cover
            transition-opacity duration-300
            ${isLoaded ? 'opacity-100' : 'opacity-0'}
          `}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
        />
      )}
    </div>
  );
}

export default LazyImage;
