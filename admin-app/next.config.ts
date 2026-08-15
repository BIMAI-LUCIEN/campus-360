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
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS' },
          {
            key: 'Access-Control-Allow-Headers',
            value:
              'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, Expo-Origin, x-client-info, apikey',
          },
        ],
      },
    ];
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
