import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),
  // Puppeteer pulls in a deep tree of platform-specific code (Chromium
  // bindings, native .node loaders, post-install scripts). Marking it as a
  // server external package tells Next to require it at runtime instead
  // of bundling it. The dynamic import() in the PDF export route handles the rest.
  serverExternalPackages: ['puppeteer'],
};

export default nextConfig;
