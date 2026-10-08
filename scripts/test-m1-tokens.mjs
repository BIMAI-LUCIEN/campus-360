#!/usr/bin/env node

/**
 * ==============================================================================
 * CAMPUS 360 — MILESTONE 1 DESIGN TOKENS VERIFICATION & STRESS SUITE
 * ==============================================================================
 *
 * Automated verification suite for Milestone 1 (Design System & Theme Foundation):
 * - Suite 1: Token Completeness & Format Validation (72 Keys of stitchColors)
 * - Suite 2: WCAG 2.1 Color Contrast Ratio & AAA Certification
 * - Suite 3: Brand Accent & Gradient Scale Verification (#7C3AED, #8B5CF6)
 * - Suite 4: Border Radius Architecture (stitchRadius 16-24px Scale)
 * - Suite 5: Elevation Shadows Architecture (stitchShadows Presets & Opacities)
 * - Suite 6: Master Shared Components & Typography Cascading
 * - Suite 7: TypeScript Compiler Static Verification (Zero Errors)
 *
 * Run via: node scripts/test-m1-tokens.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// ==============================================================================
// MINI TEST RUNNER FRAMEWORK
// ==============================================================================

let totalSuites = 0;
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const testFailures = [];
const suiteStartTimes = new Map();
const globalStartTime = Date.now();

function describe(suiteName, fn) {
  totalSuites++;
  console.log(`\n==============================================================================`);
  console.log(`🔷 SUITE ${totalSuites}: ${suiteName}`);
  console.log(`==============================================================================`);
  suiteStartTimes.set(suiteName, Date.now());
  try {
    fn();
  } catch (err) {
    console.error(`💥 Fatal error in suite "${suiteName}":`, err);
    failedTests++;
    testFailures.push({ suite: suiteName, test: 'Suite Execution', error: err });
  }
  const elapsed = Date.now() - (suiteStartTimes.get(suiteName) || Date.now());
  console.log(`⏱️  Suite elapsed: ${elapsed}ms`);
}

function it(testName, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✅ PASS: ${testName}`);
  } catch (err) {
    failedTests++;
    testFailures.push({ test: testName, error: err });
    console.error(`  ❌ FAIL: ${testName}`);
    console.error(`     Error: ${err.message}`);
  }
}

// ==============================================================================
// HELPER: WCAG 2.1 CONTRAST & LUMINANCE CALCULATION
// ==============================================================================

function parseHex(hexStr) {
  let clean = hexStr.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  if (clean.length !== 6) {
    throw new Error(`Invalid hex color string: ${hexStr}`);
  }
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return { r, g, b };
}

function sRgbToLinear(c) {
  const norm = c / 255;
  return norm <= 0.04045
    ? norm / 12.92
    : Math.pow((norm + 0.055) / 1.055, 2.4);
}

function getRelativeLuminance(rgb) {
  const rLin = sRgbToLinear(rgb.r);
  const gLin = sRgbToLinear(rgb.g);
  const bLin = sRgbToLinear(rgb.b);
  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
}

function getContrastRatio(hex1, hex2) {
  const rgb1 = parseHex(hex1);
  const rgb2 = parseHex(hex2);
  const l1 = getRelativeLuminance(rgb1);
  const l2 = getRelativeLuminance(rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ==============================================================================
// LOAD AND EVALUATE src/theme/stitch.ts VIA TYPESCRIPT TRANSPILATION & VM
// ==============================================================================

const themePath = path.resolve(projectRoot, 'src/theme/stitch.ts');
assert.ok(fs.existsSync(themePath), `stitch.ts must exist at ${themePath}`);

const themeSource = fs.readFileSync(themePath, 'utf8');

const transpiled = ts.transpileModule(themeSource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
}).outputText;

const mockReactNative = {
  Platform: {
    select: (map) => map.web || map.default || map.ios || map.android || 'System',
  },
  StyleSheet: {
    create: (obj) => obj,
  },
  Dimensions: {
    get: () => ({ width: 390, height: 844, scale: 3, fontScale: 1 }),
  },
};

const sandboxExports = {};
const sandboxContext = {
  module: { exports: sandboxExports },
  exports: sandboxExports,
  require: (moduleId) => {
    if (moduleId === 'react-native') {
      return mockReactNative;
    }
    throw new Error(`Unexpected import in stitch.ts: ${moduleId}`);
  },
  console,
};

vm.createContext(sandboxContext);
vm.runInContext(transpiled, sandboxContext);

const {
  stitchColors,
  brandGradient,
  brandGradientTwo,
  stitchSpacing,
  stitchRadius,
  fontFamilies,
  stitchTypography,
  stitchShadows,
  glassPanel,
  glassCard,
  stitchComponents,
} = sandboxExports;

// ==============================================================================
// TEST EXECUTION
// ==============================================================================

describe('Suite 1: Token Completeness & Format Validation (72 Keys)', () => {
  it('exports stitchColors as a defined object', () => {
    assert.ok(stitchColors && typeof stitchColors === 'object');
  });

  it('contains exactly 72 color tokens in stitchColors', () => {
    const keys = Object.keys(stitchColors);
    assert.equal(keys.length, 72, `Expected exactly 72 keys, but found ${keys.length}`);
  });

  const expected72Keys = [
    'ink', 'inkSoft', 'inkMuted', 'inkSubtle', 'inkFaint',
    'paper', 'paperDeep', 'paperSoft',
    'sienna', 'siennaDeep', 'siennaTone', 'siennaBg', 'siennaSoft',
    'emerald', 'emeraldDeep', 'emeraldTone', 'emeraldBg', 'emeraldSoft',
    'white',
    'error', 'errorBg', 'warning', 'warningDeep', 'warningBg', 'warningTone',
    'primary', 'onPrimary', 'primaryContainer', 'onPrimaryContainer',
    'primaryFixed', 'onPrimaryFixed', 'primaryFixedDim', 'onPrimaryFixedVariant',
    'inversePrimary',
    'secondary', 'onSecondary', 'secondaryContainer', 'onSecondaryContainer',
    'secondaryFixed', 'onSecondaryFixed', 'secondaryFixedDim', 'onSecondaryFixedVariant',
    'tertiary', 'onTertiary',
    'background', 'onBackground', 'surface', 'onSurface', 'surfaceVariant', 'onSurfaceVariant',
    'surfaceContainerLowest', 'surfaceContainerLow', 'surfaceContainer',
    'surfaceContainerHigh', 'surfaceContainerHighest',
    'inverseSurface', 'inverseOnSurface',
    'outline', 'outlineVariant',
    'success', 'successContainer',
    'onError', 'errorContainer', 'onErrorContainer',
    'glassSurface', 'glassBorder', 'glassBorderLight', 'glassOverlay',
    'glassCardBg', 'glassCardBorder', 'glassSurfaceDark', 'glassBorderDark'
  ];

  it('contains all 72 expected keys without any missing token', () => {
    const currentKeys = new Set(Object.keys(stitchColors));
    const missing = expected72Keys.filter(k => !currentKeys.has(k));
    assert.deepEqual(missing, [], `Missing expected keys: ${missing.join(', ')}`);
  });

  it('all 72 token values are non-empty strings with valid CSS/hex/rgba format', () => {
    const hexPattern = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
    const rgbaPattern = /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\)$/;

    for (const [key, val] of Object.entries(stitchColors)) {
      assert.equal(typeof val, 'string', `Token ${key} must be a string`);
      assert.ok(val.trim().length > 0, `Token ${key} cannot be empty`);
      const isValid = hexPattern.test(val) || rgbaPattern.test(val);
      assert.ok(isValid, `Token ${key} has invalid color format: "${val}"`);
    }
  });

  it('background and surface tokens reflect Clean White & Slate 50 palette', () => {
    assert.equal(stitchColors.paper, '#FFFFFF');
    assert.equal(stitchColors.paperDeep, '#F8FAFC');
    assert.equal(stitchColors.paperSoft, '#F1F5F9');
    assert.equal(stitchColors.surface, '#FFFFFF');
    assert.equal(stitchColors.surfaceContainerLowest, '#FFFFFF');
    assert.equal(stitchColors.surfaceContainerLow, '#F8FAFC');
    assert.equal(stitchColors.surfaceContainer, '#F8FAFC');
    assert.equal(stitchColors.surfaceContainerHigh, '#F1F5F9');
    assert.equal(stitchColors.surfaceContainerHighest, '#CBD5E1');
    assert.equal(stitchColors.glassBorder, '#E2E8F0');
  });

  it('foreground ramp tokens reflect Deep Slate Black (#0F172A) palette', () => {
    assert.equal(stitchColors.ink, '#0F172A');
    assert.equal(stitchColors.inkSoft, '#334155');
    assert.equal(stitchColors.inkMuted, '#64748B');
    assert.equal(stitchColors.inkSubtle, '#94A3B8');
  });
});

describe('Suite 2: WCAG 2.1 Color Contrast Ratio & AAA Certification', () => {
  it('WCAG AAA: #0F172A on #FFFFFF passes AAA normal text (ratio >= 7.0:1)', () => {
    const ratio = getContrastRatio(stitchColors.ink, stitchColors.paper);
    console.log(`    ℹ️  Contrast ratio (#0F172A on #FFFFFF): ${ratio.toFixed(2)}:1`);
    assert.ok(ratio >= 7.0, `Expected ratio >= 7.0 for AAA, but got ${ratio.toFixed(2)}:1`);
    assert.ok(ratio > 16.0, `Expected crisp high contrast > 16:1, got ${ratio.toFixed(2)}:1`);
  });

  it('WCAG AAA: #0F172A on #F8FAFC (Slate 50) passes AAA normal text (ratio >= 7.0:1)', () => {
    const ratio = getContrastRatio(stitchColors.ink, stitchColors.paperDeep);
    console.log(`    ℹ️  Contrast ratio (#0F172A on #F8FAFC): ${ratio.toFixed(2)}:1`);
    assert.ok(ratio >= 7.0, `Expected ratio >= 7.0 for AAA, but got ${ratio.toFixed(2)}:1`);
    assert.ok(ratio > 15.0, `Expected crisp high contrast > 15:1, got ${ratio.toFixed(2)}:1`);
  });

  it('WCAG AAA: #0F172A on #F1F5F9 (Slate 100) passes AAA normal text (ratio >= 7.0:1)', () => {
    const ratio = getContrastRatio(stitchColors.ink, stitchColors.paperSoft);
    console.log(`    ℹ️  Contrast ratio (#0F172A on #F1F5F9): ${ratio.toFixed(2)}:1`);
    assert.ok(ratio >= 7.0, `Expected ratio >= 7.0 for AAA, but got ${ratio.toFixed(2)}:1`);
  });

  it('WCAG AAA: #334155 (inkSoft) on #FFFFFF passes AAA normal text (ratio >= 7.0:1)', () => {
    const ratio = getContrastRatio(stitchColors.inkSoft, stitchColors.paper);
    console.log(`    ℹ️  Contrast ratio (#334155 on #FFFFFF): ${ratio.toFixed(2)}:1`);
    assert.ok(ratio >= 7.0, `Expected ratio >= 7.0 for AAA, but got ${ratio.toFixed(2)}:1`);
  });

  it('WCAG AA: #64748B (inkMuted) on #FFFFFF passes AA normal text (ratio >= 4.5:1)', () => {
    const ratio = getContrastRatio(stitchColors.inkMuted, stitchColors.paper);
    console.log(`    ℹ️  Contrast ratio (#64748B on #FFFFFF): ${ratio.toFixed(2)}:1`);
    assert.ok(ratio >= 4.5, `Expected ratio >= 4.5 for AA, but got ${ratio.toFixed(2)}:1`);
  });

  it('WCAG AA & AAA Large: Royal Violet #7C3AED on #FFFFFF passes AA (ratio >= 4.5:1)', () => {
    const ratio = getContrastRatio(stitchColors.primary, stitchColors.white);
    console.log(`    ℹ️  Contrast ratio (#7C3AED on #FFFFFF): ${ratio.toFixed(2)}:1`);
    assert.ok(ratio >= 4.5, `Expected ratio >= 4.5 for AA, but got ${ratio.toFixed(2)}:1`);
  });

  it('WCAG AA & AAA Large: White text on Royal Violet button (#7C3AED) passes AA (ratio >= 4.5:1)', () => {
    const ratio = getContrastRatio('#FFFFFF', stitchColors.primary);
    console.log(`    ℹ️  Contrast ratio (#FFFFFF on #7C3AED): ${ratio.toFixed(2)}:1`);
    assert.ok(ratio >= 4.5, `Expected ratio >= 4.5 for AA, but got ${ratio.toFixed(2)}:1`);
  });

  it('WCAG Non-Text UI / Large Text: Electric Violet #8B5CF6 on #FFFFFF passes ratio >= 3.0:1', () => {
    const ratio = getContrastRatio(stitchColors.secondary, stitchColors.white);
    console.log(`    ℹ️  Contrast ratio (#8B5CF6 on #FFFFFF): ${ratio.toFixed(2)}:1`);
    assert.ok(ratio >= 3.0, `Expected ratio >= 3.0 for graphical/large text, but got ${ratio.toFixed(2)}:1`);
  });
});

describe('Suite 3: Brand Accent & Gradient Scale Verification', () => {
  it('brand accents match #7C3AED and #8B5CF6', () => {
    assert.equal(stitchColors.sienna, '#7C3AED', 'sienna must match Royal Violet #7C3AED');
    assert.equal(stitchColors.primary, '#7C3AED', 'primary must match Royal Violet #7C3AED');
    assert.equal(stitchColors.siennaTone, '#8B5CF6', 'siennaTone must match Electric Violet #8B5CF6');
    assert.equal(stitchColors.secondary, '#8B5CF6', 'secondary must match Electric Violet #8B5CF6');
    assert.equal(stitchColors.siennaDeep, '#6D28D9');
  });

  it('brand soft tinted containers use specified rgba', () => {
    assert.equal(stitchColors.siennaBg, 'rgba(124, 58, 237, 0.08)');
    assert.equal(stitchColors.siennaSoft, 'rgba(124, 58, 237, 0.14)');
  });

  it('brandGradient contains 3-stop Royal Violet to Electric Violet tuple', () => {
    assert.ok(brandGradient && Array.isArray(brandGradient.colors));
    assert.equal(brandGradient.colors.length, 3, 'brandGradient must have 3 stops for LinearGradient');
    assert.equal(brandGradient.colors[0], '#7C3AED');
    assert.equal(brandGradient.colors[1], '#8B5CF6');
    assert.equal(brandGradient.colors[2], '#A78BFA');
  });

  it('brandGradientTwo contains 2-stop Royal Violet to Deep Violet tuple', () => {
    assert.ok(brandGradientTwo && Array.isArray(brandGradientTwo.colors));
    assert.equal(brandGradientTwo.colors.length, 2);
    assert.equal(brandGradientTwo.colors[0], '#7C3AED');
    assert.equal(brandGradientTwo.colors[1], '#6D28D9');
  });
});

describe('Suite 4: Border Radius Architecture (16-24px Scale)', () => {
  it('exports stitchRadius with all required keys', () => {
    const requiredKeys = ['DEFAULT', 'sm', 'md', 'lg', 'xl', 'card', 'button', 'full'];
    for (const key of requiredKeys) {
      assert.ok(key in stitchRadius, `stitchRadius must contain key ${key}`);
      assert.equal(typeof stitchRadius[key], 'number', `stitchRadius.${key} must be a number`);
    }
  });

  it('component radii fall in the 16-24px scale', () => {
    assert.equal(stitchRadius.md, 16, 'stitchRadius.md must be 16');
    assert.equal(stitchRadius.lg, 20, 'stitchRadius.lg must be 20');
    assert.equal(stitchRadius.xl, 24, 'stitchRadius.xl must be 24');
    assert.equal(stitchRadius.card, 20, 'stitchRadius.card must be 20 (within 16-24px)');
    assert.equal(stitchRadius.button, 16, 'stitchRadius.button must be 16 (within 16-24px)');
  });

  it('full radius is 9999 for circular/pill elements', () => {
    assert.equal(stitchRadius.full, 9999);
  });

  it('radius progression is strictly monotonic: sm <= md <= lg <= xl', () => {
    assert.ok(stitchRadius.sm <= stitchRadius.md);
    assert.ok(stitchRadius.md <= stitchRadius.lg);
    assert.ok(stitchRadius.lg <= stitchRadius.xl);
  });
});

describe('Suite 5: Elevation Shadows Architecture (Presets & Opacities)', () => {
  it('exports stitchShadows with all 8 preset styles', () => {
    const requiredPresets = ['none', 'sm', 'md', 'lg', 'card', 'floating', 'primary', 'secondary'];
    for (const preset of requiredPresets) {
      assert.ok(preset in stitchShadows, `stitchShadows must contain ${preset}`);
      assert.ok(typeof stitchShadows[preset] === 'object', `${preset} must be an object`);
    }
  });

  it('sm, md, lg presets use #0F172A at 4-6% opacity', () => {
    assert.equal(stitchShadows.sm.shadowColor, '#0F172A');
    assert.equal(stitchShadows.sm.shadowOpacity, 0.04);
    assert.equal(stitchShadows.sm.elevation, 1);

    assert.equal(stitchShadows.md.shadowColor, '#0F172A');
    assert.equal(stitchShadows.md.shadowOpacity, 0.05);
    assert.equal(stitchShadows.md.elevation, 2);

    assert.equal(stitchShadows.lg.shadowColor, '#0F172A');
    assert.equal(stitchShadows.lg.shadowOpacity, 0.06);
    assert.equal(stitchShadows.lg.elevation, 4);
  });

  it('card preset has soft 5% elevation shadow with radius 14', () => {
    assert.equal(stitchShadows.card.shadowColor, '#0F172A');
    assert.equal(stitchShadows.card.shadowOpacity, 0.05);
    assert.equal(stitchShadows.card.shadowRadius, 14);
    assert.equal(stitchShadows.card.elevation, 3);
  });

  it('floating preset has prominent soft elevation shadow with radius 22', () => {
    assert.equal(stitchShadows.floating.shadowColor, '#0F172A');
    assert.equal(stitchShadows.floating.shadowOpacity, 0.07);
    assert.equal(stitchShadows.floating.shadowRadius, 22);
    assert.equal(stitchShadows.floating.elevation, 8);
  });

  it('primary and secondary presets use tinted violet glow shadows', () => {
    assert.equal(stitchShadows.primary.shadowColor, '#7C3AED');
    assert.equal(stitchShadows.primary.shadowOpacity, 0.22);
    assert.equal(stitchShadows.primary.shadowRadius, 12);

    assert.equal(stitchShadows.secondary.shadowColor, '#8B5CF6');
    assert.equal(stitchShadows.secondary.shadowOpacity, 0.18);
    assert.equal(stitchShadows.secondary.shadowRadius, 10);
  });
});

describe('Suite 6: Master Shared Components & Typography Cascading', () => {
  it('glassPanel.bottomNav is a floating clean white pill with violet border', () => {
    assert.equal(glassPanel.bottomNav.backgroundColor, '#FFFFFF');
    assert.equal(glassPanel.bottomNav.borderRadius, 9999);
    assert.equal(glassPanel.bottomNav.borderColor, 'rgba(124, 58, 237, 0.08)');
  });

  it('glassPanel.topBar is solid Royal Violet', () => {
    assert.equal(glassPanel.topBar.backgroundColor, '#7C3AED');
  });

  it('glassCard.light and glassCard.solid use clean white card container', () => {
    assert.equal(glassCard.light.backgroundColor, '#FFFFFF');
    assert.equal(glassCard.light.borderColor, '#E2E8F0');
    assert.equal(glassCard.light.borderRadius, 20);

    assert.equal(glassCard.solid.backgroundColor, '#FFFFFF');
    assert.equal(glassCard.solid.borderColor, '#E2E8F0');
    assert.equal(glassCard.solid.borderRadius, 20);
  });

  it('primary button presets use Royal Violet #7C3AED with white text', () => {
    assert.equal(stitchComponents.btnPrimary.backgroundColor, '#7C3AED');
    assert.equal(stitchComponents.btnPrimary.borderRadius, 16);
    assert.equal(stitchComponents.btnPrimaryText.color, '#FFFFFF');

    assert.equal(stitchComponents.btnSienna.backgroundColor, '#7C3AED');
    assert.equal(stitchComponents.btnSienna.borderRadius, 16);
    assert.equal(stitchComponents.btnSiennaText.color, '#FFFFFF');
  });

  it('secondary button presets use clean slate border with 16px radius', () => {
    assert.equal(stitchComponents.btnSecondary.borderRadius, 16);
    assert.equal(stitchComponents.btnSecondary.borderColor, '#E2E8F0');
  });

  it('modalSheet uses Clean White container with 24px top radiuses', () => {
    assert.equal(stitchComponents.modalSheet.backgroundColor, '#FFFFFF');
    assert.equal(stitchComponents.modalSheet.borderTopLeftRadius, 24);
    assert.equal(stitchComponents.modalSheet.borderTopRightRadius, 24);
  });

  it('typography styles cascade Deep Slate Black ink and muted tokens', () => {
    assert.equal(stitchTypography.displayHero.color, '#0F172A');
    assert.equal(stitchTypography.displayLg.color, '#0F172A');
    assert.equal(stitchTypography.headlineLg.color, '#0F172A');
    assert.equal(stitchTypography.bodyMd.color, '#64748B');
    assert.equal(stitchTypography.bodySm.color, '#64748B');
    assert.equal(stitchTypography.monoKicker.color, '#7C3AED');
  });
});

describe('Suite 7: TypeScript Compiler Static Verification (Zero Errors)', () => {
  it('root tsc --noEmit completes with exit code 0 and zero diagnostics', () => {
    console.log('    ℹ️  Running root TypeScript check (node --stack_size=8192 node_modules/typescript/bin/tsc --noEmit)...');
    try {
      const output = execSync('node --stack_size=8192 node_modules/typescript/bin/tsc --noEmit', {
        cwd: projectRoot,
        encoding: 'utf8',
        stdio: 'pipe',
      });
      console.log('    ℹ️  tsc --noEmit stdout clean.');
      assert.ok(true);
    } catch (err) {
      console.error('    ❌ tsc stdout:', err.stdout);
      console.error('    ❌ tsc stderr:', err.stderr);
      throw new Error(`TypeScript check failed with exit code ${err.status}`);
    }
  });

  it('mobile-api tsc --noEmit completes with exit code 0', () => {
    const apiPath = path.resolve(projectRoot, 'mobile-api');
    console.log('    ℹ️  Running mobile-api TypeScript check...');
    try {
      execSync('npm run typecheck', {
        cwd: apiPath,
        encoding: 'utf8',
        stdio: 'pipe',
      });
      console.log('    ℹ️  mobile-api tsc clean.');
      assert.ok(true);
    } catch (err) {
      console.error('    ❌ mobile-api tsc failed:', err.stdout || err.message);
      throw new Error(`mobile-api TypeScript check failed with exit code ${err.status}`);
    }
  });
});

// ==============================================================================
// SUMMARY & EXIT CODE
// ==============================================================================

const totalDuration = Date.now() - globalStartTime;
console.log('\n==============================================================================');
console.log('🏁 MILESTONE 1 VERIFICATION RUN COMPLETE');
console.log('==============================================================================');
console.log(`Suites:   ${totalSuites} total`);
console.log(`Tests:    ${totalTests} total | ${passedTests} passed | ${failedTests} failed`);
console.log(`Duration: ${totalDuration}ms`);

if (failedTests > 0) {
  console.error('\n💥 TEST FAILURES ENCOUNTERED:');
  for (const failure of testFailures) {
    console.error(`- [${failure.suite || 'Test'}] ${failure.test}: ${failure.error.message}`);
  }
  process.exit(1);
} else {
  console.log('\n🎉 ALL 7 MILESTONE 1 TEST SUITES PASSED EMPIRICALLY WITH ZERO FAILURES!');
  process.exit(0);
}
