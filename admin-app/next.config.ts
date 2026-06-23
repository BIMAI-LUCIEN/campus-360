import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
};

export default nextConfig;
