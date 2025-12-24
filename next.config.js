/** @type {import('next').NextConfig} */
const nextConfig = {
  // TV Optimization settings
  // Disable strict mode to prevent double rendering of animations
  reactStrictMode: false,
  
  // Optimize for TV browsers (typically Chromium-based)
  compiler: {
    // Remove console logs in production for better performance
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Image optimization for TV displays
  images: {
    // YouTube thumbnail domains
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
    ],
    // Optimize for TV resolutions
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Experimental features for better TV performance
  experimental: {
    // Optimize package imports
    optimizePackageImports: ['zustand', 'socket.io-client'],
  },
  
  // Headers for TV browser compatibility
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
