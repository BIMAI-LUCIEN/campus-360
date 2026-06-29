import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  // Note: serverActions was disabled as part of build-time optimization.
  // The admin dashboard does not yet use any Next.js Server Actions
  // (forms post to /api/* routes directly), so removing the experimental
  // flag avoids the extra type-checking pass that adds ~10s to the build.
  experimental: {},
  // Build-time optimizations
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  // Skip Next.js telemetry during builds (Vercel collects its own)
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
};

export default nextConfig;
