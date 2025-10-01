import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fix for chunk loading errors
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
  
  // Experimental features to improve performance
  experimental: {
    optimizePackageImports: ['@prisma/client'],
  },
  
  // Improve chunk splitting
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  }
};

export default nextConfig;
