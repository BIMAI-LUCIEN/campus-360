import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),
  serverExternalPackages: ['puppeteer'],
  experimental: {},
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
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
