// Legacy Tailwind config kept alongside the Tailwind v4 @theme block in
// admin-app/app/globals.css. Referenced via @config "../../tailwind.config.ts"
// in that file.
//
// Why this exists: Tailwind v4 auto-scans a fixed set of directories
// relative to the build cwd. On Vercel the effective cwd of the PostCSS
// step that processes globals.css does not match the admin-app/ layout,
// so the scanner sees zero .ts/.tsx files and the deployed bundle
// contains only @theme tokens + base reset — no utility classes. The
// legacy `content` field below is resolved relative to the repo root
// regardless of the PostCSS cwd, so the scanner finds the files and
// emits the utilities.
//
// This config is intentionally minimal: all design tokens live in the
// @theme block in globals.css (v4 native). We only use the legacy
// config to point Tailwind at the right files to scan.
//
// Note: we don't import the Config type from 'tailwindcss' because the
// root package.json doesn't depend on tailwindcss (it lives in
// admin-app/node_modules). A structural type with just `content` is
// enough for the runtime check Tailwind does.
type TailwindConfig = { content: string[] };

const config: TailwindConfig = {
  content: [
    './admin-app/app/**/*.{ts,tsx}',
    './admin-app/lib/**/*.{ts,tsx}',
    './admin-app/middleware.ts',
  ],
};

export default config;