import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),
  // Puppeteer pulls in a deep tree of platform-specific code (Chromium
  // bindings, native .node loaders, post-install scripts). Letting webpack
  // trace it on Vercel causes the `finishWithoutResolve` / "module not
  // found" webpack error during page data collection because those native
  // files are absent from the serverless image. Marking it as a server
  // external package tells Next to `require` it at runtime instead of
  // bundling it. Routes that need it use a dynamic `import()`.
  serverExternalPackages: ['puppeteer'],
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
  async rewrites() {
    const mobileApiUrl = process.env.NEXT_PUBLIC_MOBILE_API_URL || 'http://localhost:3002';
    return [
      {
        source: '/api/mobile/:path*',
        destination: `${mobileApiUrl}/api/mobile/:path*`,
      },
    ];
  },
};

export default nextConfig;
