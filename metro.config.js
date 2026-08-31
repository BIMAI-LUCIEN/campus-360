const { getDefaultConfig } = require('expo/metro-config');
const http = require('http');

const config = getDefaultConfig(__dirname);

config.resolver.blockList = [
  /admin-app[\/\\]\.next[\/\\].*/,
  /admin-app[\/\\].*\.sqlite.*/,
  /mobile-api[\/\\]\.next[\/\\].*/,
];

// Dev-only reverse proxy: when Metro is reached through a tunnel (ngrok),
// the client only has one reachable port (8081). Forward /api and /auth
// traffic to the local admin-app dev server (port 3001) so auth + mobile
// API calls work over the tunnel too. See src/features/auth/betterAuth.ts
// getDevBackendUrl(), which points at the current origin when the detected
// host isn't a plain LAN IPv4 (i.e. a tunnel hostname).
const DEV_BACKEND_PORT = 3001;
const originalEnhanceMiddleware = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (metroMiddleware, metroServer) => {
  const withOriginal = originalEnhanceMiddleware
    ? originalEnhanceMiddleware(metroMiddleware, metroServer)
    : metroMiddleware;

  return (req, res, next) => {
    if (req.url && (req.url.startsWith('/api/') || req.url.startsWith('/auth/'))) {
      const proxyReq = http.request(
        {
          host: 'localhost',
          port: DEV_BACKEND_PORT,
          path: req.url,
          method: req.method,
          headers: { ...req.headers, host: `localhost:${DEV_BACKEND_PORT}` },
        },
        (proxyRes) => {
          res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
          proxyRes.pipe(res, { end: true });
        },
      );
      proxyReq.on('error', (err) => {
        console.error('[metro-proxy] backend unreachable:', err.message);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Backend indisponible (proxy Metro).' }));
      });
      req.pipe(proxyReq, { end: true });
      return;
    }
    return withOriginal(req, res, next);
  };
};

module.exports = config;
