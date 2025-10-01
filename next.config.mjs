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
  turbopack: {
    rules: {
      // Optimize common file types
      '*.tsx': ['typescript'],
      '*.ts': ['typescript'],
    }
  },
  
  // Clean and simple - no AI-related exclusions needed
  serverExternalPackages: [],
  
  // Basic optimizations only
  webpack: (config, { dev }) => {
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
