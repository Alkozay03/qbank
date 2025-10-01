/** @type {import('next').NextConfig} */
const nextConfig = {
  // AGGRESSIVE performance optimizations for ultra-fast loading
  experimental: {
    // Only optimize essential packages, exclude heavy ones completely
    optimizePackageImports: ['@prisma/client', 'lucide-react', 'clsx', 'tailwind-merge'],
    optimizeServerReact: true,
    webpackBuildWorker: true,
    // Enable faster dev mode
    turbo: true,
  },
  
  // Speed up dev mode with Turbopack (Next.js 15 format)
  turbopack: {
    rules: {
      // Optimize common file types
      '*.tsx': ['typescript'],
      '*.ts': ['typescript'],
    }
  },
  
  // Move serverComponentsExternalPackages to root level
  serverExternalPackages: [
    'framer-motion', 
    'tesseract.js', 
    'sharp', 
    'pdf-parse',
    'canvas',
    '@paddlejs-models/ocr',
    'opencv.js',
    'ultralytics',
    'torch',
    'tensorflow'
  ],
  
  // Ultra-aggressive webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // COMPLETELY exclude ALL AI/ML/OCR packages and directories
    config.resolve.alias = {
      ...config.resolve.alias,
      'framer-motion': false,
      'tesseract.js': false,
      'pdf-parse': false,
      '@paddlejs-models/ocr': false,
      'opencv.js': false,
      'canvas': false,
      'sharp': false,
      'ultralytics': false,
      'torch': false,
      'tensorflow': false,
      'ai-question-extractor': false,
      // Exclude entire AI directory
      '../ai-question-extractor': false,
      '../../ai-question-extractor': false,
    };

    // Client-side optimizations
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        child_process: false,
        'framer-motion': false,
        'pdf-parse': false,
        canvas: false,
      };

      // Exclude heavy packages from client bundle
      config.externals = config.externals || [];
      config.externals.push(
        'pdf-parse',
        'tesseract.js',
        'framer-motion',
        'canvas',
        'sharp',
        '@paddlejs-models/ocr',
        'opencv.js',
        'ultralytics',
        'torch',
        'tensorflow',
        'numpy',
        'pandas',
        'matplotlib',
        'pillow',
        'cv2',
        // Block entire AI directory
        /ai-question-extractor/,
        /python/,
        /\.py$/
      );
    }

    // Production bundle size optimizations
    if (!dev) {
      // Completely ignore AI directory in webpack
      config.module = config.module || {};
      config.module.rules = config.module.rules || [];
      config.module.rules.push({
        test: /ai-question-extractor/,
        use: 'ignore-loader'
      });

      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 0,
        maxSize: 150000, // 150kb max chunks
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

    // Development mode optimizations
    if (dev) {
      // Speed up development builds
      config.optimization.removeAvailableModules = false;
      config.optimization.removeEmptyChunks = false;
      config.optimization.splitChunks = false;
      
      // Reduce TypeScript checking in dev
      config.resolve.alias = {
        ...config.resolve.alias,
        // Use faster alternatives in dev
        '@prisma/client/edge': '@prisma/client',
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
