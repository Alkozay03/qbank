/** @type {import('next').NextConfig} */
const nextConfig = {
  // AGGRESSIVE performance optimizations for ultra-fast loading
  experimental: {
    // Only optimize essential packages, exclude heavy ones completely
    optimizePackageImports: ['@prisma/client', 'lucide-react', 'clsx', 'tailwind-merge'],
    optimizeServerReact: true,
    webpackBuildWorker: true,
  },
  
  // Speed up dev mode with Turbopack (Next.js 15 format)
  // Removed custom rules to fix TypeScript loader issues
  
  // Tell Next.js NOT to externalize Prisma - bundle it completely
  serverExternalPackages: [],

  // Basic optimizations only
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Force Prisma to be bundled, not externalized
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        // Remove any Prisma externalization
        config.externals = config.externals.filter((external) => {
          if (typeof external === 'string') {
            return !external.includes('@prisma') && !external.includes('.prisma');
          }
          return true;
        });
      }
    }
    
    // Basic client-side optimizations
    if (!dev) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: -10,
            chunks: 'all',
          },
        },
      };
    }
    
    return config;
  },
  
  // Runtime optimizations
  poweredByHeader: false,
  
  // Security headers to help with Google Safe Browsing
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  
  // Skip build checks for speed
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // Image optimizations
  images: {
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    formats: ['image/webp'],
  },

  // Remove console logs in production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Memory optimization
  onDemandEntries: {
    maxInactiveAge: 15 * 1000, // 15 seconds
    pagesBufferLength: 1, // Minimal buffer
  },
};

export default nextConfig;
