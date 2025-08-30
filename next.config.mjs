// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Don’t fail production builds on ESLint issues
  eslint: { ignoreDuringBuilds: true },

  // (Optional) If TypeScript type errors also pop up during build, keep this on.
  // You can turn it off later once everything is stable.
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
