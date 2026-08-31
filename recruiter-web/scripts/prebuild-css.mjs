#!/usr/bin/env node
/**
 * prebuild-css.mjs
 *
 * Tailwind v4 + Next.js workaround:
 * When `next build` invokes `@tailwindcss/postcss`, the `@source`
 * directive resolution is broken in monorepo / git-worktree setups
 * (verified in this repo: the bundled CSS only contained @theme +
 * reset, no utility classes).
 *
 * We work around this by compiling globals.css ourselves with the
 * official Tailwind v4 PostCSS plugin and emitting the result to
 * `app/globals.compiled.css`. `app/globals.css` is then a tiny
 * stub that imports the compiled file, so Next.js loads the full
 * stylesheet regardless of cwd.
 *
 * Reference:
 *   https://tailwindcss.com/docs/installation/using-postcss
 *   https://github.com/tailwindlabs/tailwindcss/issues/13500
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import tailwindcssPostcss from '@tailwindcss/postcss';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const inputPath = path.resolve(projectRoot, 'app', 'globals.css');
const outputPath = path.resolve(projectRoot, 'app', 'globals.compiled.css');

const css = fs.readFileSync(inputPath, 'utf8');

const result = await postcss([tailwindcssPostcss()]).process(css, {
  from: inputPath,
  to: outputPath,
});

fs.writeFileSync(outputPath, result.css, 'utf8');

const lengthKb = (result.css.length / 1024).toFixed(1);
console.log(`[prebuild-css] Compiled ${lengthKb}KB → ${path.relative(__dirname, outputPath)}`);
