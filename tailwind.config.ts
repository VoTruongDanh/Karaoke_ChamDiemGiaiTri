import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // TV-friendly color palette
      colors: {
        // Primary colors - vibrant for dark backgrounds
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        // Accent colors for karaoke highlights
        accent: {
          pink: '#ec4899',
          purple: '#a855f7',
          cyan: '#06b6d4',
          yellow: '#eab308',
          green: '#22c55e',
        },
        // Dark theme background colors
        tv: {
          bg: 'var(--tv-bg)',
          surface: 'var(--tv-surface)',
          card: 'var(--tv-card)',
          border: 'var(--tv-border)',
          hover: 'var(--tv-hover)',
          text: 'var(--tv-text)',
          'text-secondary': 'var(--tv-text-secondary)',
        },
      },
      // TV-optimized font sizes (minimum 24px for readability)
      fontSize: {
        'tv-xs': ['24px', { lineHeight: '32px' }],
        'tv-sm': ['28px', { lineHeight: '36px' }],
        'tv-base': ['32px', { lineHeight: '40px' }],
        'tv-lg': ['36px', { lineHeight: '44px' }],
        'tv-xl': ['42px', { lineHeight: '52px' }],
        'tv-2xl': ['48px', { lineHeight: '56px' }],
        'tv-3xl': ['60px', { lineHeight: '72px' }],
        'tv-4xl': ['72px', { lineHeight: '84px' }],
      },
      // TV-friendly spacing
      spacing: {
        'tv-1': '8px',
        'tv-2': '16px',
        'tv-3': '24px',
        'tv-4': '32px',
        'tv-5': '40px',
        'tv-6': '48px',
        'tv-8': '64px',
        'tv-10': '80px',
        'tv-12': '96px',
      },
      // Focus ring for TV navigation
      ringWidth: {
        'tv': '4px',
      },
      // Animation for focus states
      animation: {
        'focus-pulse': 'focus-pulse 2s ease-in-out infinite',
        'scale-in': 'scale-in 0.2s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
      },
      keyframes: {
        'focus-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 4px rgba(14, 165, 233, 0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(14, 165, 233, 0.2)' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      // Border radius for TV-friendly buttons
      borderRadius: {
        'tv': '12px',
        'tv-lg': '16px',
        'tv-xl': '24px',
      },
      // Box shadow for focus states
      boxShadow: {
        'tv-focus': '0 0 0 4px rgba(14, 165, 233, 0.5), 0 0 20px rgba(14, 165, 233, 0.3)',
        'tv-glow': '0 0 30px rgba(14, 165, 233, 0.4)',
      },
    },
  },
  plugins: [],
};

export default config;
