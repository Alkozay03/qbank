/*  // Performance optimizations
  experimental: {
    optimizePackageImports: ['@prisma/client', 'lucide-react', 'clsx', 'tailwind-merge'],
    // Enable optimized loading
    optimizeServerReact: true,
    // Reduce bundle size
    webpackBuildWorker: true,
    // Exclude heavy packages from the main bundle
    serverComponentsExternalPackages: ['framer-motion', 'tesseract.js'],
  },{import('next').NextConfig} */
const nextConfig = {
  // Performance optimizations
  experimental: {
    optimizePackageImports: ['@prisma/client', 'lucide-react', 'framer-motion', 'clsx', 'tailwind-merge'],
    // Enable optimized loading
    optimizeServerReact: true,
    // Reduce bundle size
    webpackBuildWorker: true,
  },
  
  // Optimize compilation and bundles
  webpack: (config, { dev }) => {
    // Optimize resolution and caching
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };

    // Exclude heavy packages from client bundles
    config.externals = config.externals || [];
    if (typeof config.externals === 'object') {
      config.externals['framer-motion'] = 'framer-motion';
      config.externals['tesseract.js'] = 'tesseract.js';
    }

    // Production optimizations
    if (!dev) {
      // Minimize chunks and improve caching
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
            prisma: {
              test: /[\\/]node_modules[\\/]@prisma[\\/]/,
              name: 'prisma',
              chunks: 'all',
            },
          },
        },
      };
    }

    // Speed up builds with caching
    config.cache = {
      type: 'filesystem',
    };
    
    return config;
  },
  
  // Enable static optimization and caching
  output: 'standalone',
  
  // Reduce build time significantly
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  typescript: {
    ignoreBuildErrors: true,
  },

  // Image optimization
  images: {
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    formats: ['image/webp', 'image/avif'],
  },

  // Enable compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Reduce memory usage during compilation
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

export default nextConfig;