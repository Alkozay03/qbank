/** @type {import('next').NextConfig} */
const nextConfig = {
  // AGGRESSIVE performance optimizations for ultra-fast loading
  experimental: {
    // Only optimize essential packages, exclude heavy ones completely
    optimizePackageImports: ['@prisma/client', 'lucide-react', 'clsx', 'tailwind-merge'],
    optimizeServerReact: true,
    webpackBuildWorker: true,
    // Exclude ALL heavy packages from bundles
    serverComponentsExternalPackages: ['framer-motion', 'tesseract.js', 'sharp', 'pdf-parse'],
  },
  
  // Ultra-aggressive webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // COMPLETELY exclude heavy packages
    config.resolve.alias = {
      ...config.resolve.alias,
      'framer-motion': false,
      'tesseract.js': false,
    };

    // Client-side optimizations
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        'framer-motion': false,
      };
    }

    // Production bundle size optimizations
    if (!dev) {
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 0,
        maxSize: 200000, // 200kb max chunks
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

    // Aggressive caching for speed
    config.cache = {
      type: 'filesystem',
      maxMemoryGenerations: 1,
    };
    
    return config;
  },
  
  // Runtime optimizations
  output: 'standalone',
  poweredByHeader: false,
  
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
