// Legacy Tailwind config used as a fallback for content scanning on
// Vercel. Referenced via @config "../tailwind.config.ts" in
// admin-app/app/globals.css.
//
// Why this file lives next to the Next.js app (admin-app/) instead of
// at the repo root: Vercel's Tailwind v4 scanner appears to resolve
// @source / @config paths relative to an unpredictable cwd. Putting
// the config one directory up from globals.css (../tailwind.config.ts)
// gives a short, unambiguous relative path that works regardless of
// whether Vercel's effective cwd is the repo root or admin-app/.
//
// All design tokens stay in the @theme block in globals.css (v4
// native). This config is intentionally minimal — only `content` —
// so we don't fork the design system between two configs.
type TailwindConfig = { content: string[] };

const config: TailwindConfig = {
  content: [
    './app/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './middleware.ts',
  ],
};

export default config;