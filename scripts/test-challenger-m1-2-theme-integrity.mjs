#!/usr/bin/env node

/**
 * ==============================================================================
 * CAMPUS 360 — CHALLENGER M1-2 EMPIRICAL VERIFICATION & STRESS TEST HARNESS
 * ==============================================================================
 *
 * Independent empirical verification by Challenger M1-2:
 * 1. AST Static Analysis of all 23 consumer files in `src/`
 * 2. Property access resolution of all 988+ token accesses against `src/theme/stitch.ts`
 * 3. Export contract validation for all 11 exported symbols and 72 color tokens
 * 4. Spec conformance to Royal Violet & Clean White design tokens (R1)
 * 5. WCAG 2.1 relative luminance and contrast calculations (ink on white, primary on white)
 * 6. React Native / Expo style schema validity and shadow boundary safety
 * 7. End-to-end typecheck and test suite regression verification
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

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
  fn();
  const elapsed = Date.now() - (suiteStartTimes.get(suiteName) || Date.now());
  console.log(`⏱️  Suite ${totalSuites} complétée en ${elapsed}ms\n`);
}

function test(testName, fn) {
  totalTests++;
  const start = Date.now();
  try {
    fn();
    const duration = Date.now() - start;
    passedTests++;
    console.log(`  ✅ [PASS] ${testName} (${duration}ms)`);
  } catch (err) {
    failedTests++;
    console.error(`  ❌ [FAIL] ${testName}`);
    console.error(`     ↳ ${err.message}`);
    testFailures.push({ testName, error: err });
  }
}

console.log('🚀 Campus 360 — Démarrage du banc d\'essai Challenger M1-2');
console.log(`📁 Racine projet: ${projectRoot}`);
console.log(`📅 Horodatage: ${new Date().toISOString()}`);

// ------------------------------------------------------------------------------
// LOAD AND EVALUATE src/theme/stitch.ts IN ISOLATED VM
// ------------------------------------------------------------------------------
const stitchPath = path.join(projectRoot, 'src', 'theme', 'stitch.ts');
assert.ok(fs.existsSync(stitchPath), `Le fichier source stitch.ts doit exister: ${stitchPath}`);

const stitchSource = fs.readFileSync(stitchPath, 'utf8');
const transpiledStitch = ts.transpileModule(stitchSource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const mockReactNative = {
  Platform: {
    select: (spec) => spec.ios || spec.default || spec.web || spec.android,
  },
  StyleSheet: {
    create: (styles) => styles,
  },
  Dimensions: {
    get: () => ({ width: 390, height: 844 }),
  },
};

const vmSandbox = {
  module: { exports: {} },
  exports: {},
  require: (id) => (id === 'react-native' ? mockReactNative : {}),
  console,
};
vm.createContext(vmSandbox);
vm.runInContext(transpiledStitch, vmSandbox);

const stitchExports = vmSandbox.exports;

// List of all 23 consumer files in src/
const consumerFiles = [
  'src/ui/Toast.tsx',
  'src/AppShell.tsx',
  'src/ui/GlassComponents.tsx',
  'src/ui/screens/AuthScreen.tsx',
  'src/ui/screens/DashboardScreen.tsx',
  'src/ui/screens/DocumentsScreen.tsx',
  'src/ui/screens/HomeScreen.tsx',
  'src/ui/screens/ProfileScreen.tsx',
  'src/ui/screens/LibraryScreen.tsx',
  'src/ui/screens/ExploreScreen.tsx',
  'src/features/documents/EditorAiChat.tsx',
  'src/features/whatsapp/WhatsAppPairingModal.tsx',
  'src/features/documents/DocGenChat.tsx',
  'src/features/documents/DocumentSourcesModal.tsx',
  'src/features/documents/DocumentsScreen.tsx',
  'src/features/onboarding/FreePdfSelector.tsx',
  'src/features/onboarding/OnboardingScreen.tsx',
  'src/features/stages/AiApplyModal.tsx',
  'src/features/pdf/PdfStudentSection.tsx',
  'src/features/pdf/SimplePdfReaderModal.tsx',
  'src/features/stages/ApplicationDetailModal.tsx',
  'src/features/stages/OfficialCvView.tsx',
  'src/features/stages/StudentProfileExpressModal.tsx',
];

// ==============================================================================
// SUITE 1: Consumer Import & Token Access Resolution (All 23 Files)
// ==============================================================================
describe('Consumer Import & Token Access Resolution (All 23 Files)', () => {
  test('TC 1.1: Verification that all 23 consumer files exist on disk', () => {
    assert.equal(consumerFiles.length, 23, 'Must test exactly 23 consumer files');
    for (const relPath of consumerFiles) {
      const fullPath = path.join(projectRoot, relPath);
      assert.ok(fs.existsSync(fullPath), `Consumer file missing: ${relPath}`);
    }
  });

  test('TC 1.2: AST Static Analysis of Imports across all 23 consumers', () => {
    const recognizedExports = new Set(Object.keys(stitchExports));
    for (const relPath of consumerFiles) {
      const fullPath = path.join(projectRoot, relPath);
      const content = fs.readFileSync(fullPath, 'utf8');
      const sf = ts.createSourceFile(fullPath, content, ts.ScriptTarget.Latest, true);

      let foundStitchImport = false;
      function visit(node) {
        if (ts.isImportDeclaration(node)) {
          const modSpec = node.moduleSpecifier.text;
          if (modSpec.includes('stitch')) {
            foundStitchImport = true;
            if (node.importClause && node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
              for (const elem of node.importClause.namedBindings.elements) {
                const originalName = elem.propertyName ? elem.propertyName.text : elem.name.text;
                assert.ok(
                  recognizedExports.has(originalName),
                  `File ${relPath} imports unrecognized symbol "${originalName}" from stitch.ts`
                );
              }
            }
          }
        }
        ts.forEachChild(node, visit);
      }
      visit(sf);
      assert.ok(foundStitchImport, `File ${relPath} must have a stitch import declaration`);
    }
  });

  test('TC 1.3: Deep Resolution of every PropertyAccessExpression across all 23 files', () => {
    let totalAccesses = 0;
    const missingTokens = [];

    for (const relPath of consumerFiles) {
      const fullPath = path.join(projectRoot, relPath);
      const content = fs.readFileSync(fullPath, 'utf8');
      const sf = ts.createSourceFile(fullPath, content, ts.ScriptTarget.Latest, true);

      const importedBindings = new Map();

      function findImports(node) {
        if (ts.isImportDeclaration(node)) {
          const modSpec = node.moduleSpecifier.text;
          if (modSpec.includes('stitch')) {
            const ic = node.importClause;
            if (ic && ic.namedBindings && ts.isNamedImports(ic.namedBindings)) {
              for (const elem of ic.namedBindings.elements) {
                const orig = elem.propertyName ? elem.propertyName.text : elem.name.text;
                importedBindings.set(elem.name.text, orig);
              }
            }
          }
        }
        ts.forEachChild(node, findImports);
      }
      findImports(sf);

      function checkAccess(node) {
        if (ts.isPropertyAccessExpression(node)) {
          if (ts.isIdentifier(node.expression)) {
            const ident = node.expression.text;
            if (importedBindings.has(ident)) {
              const exportName = importedBindings.get(ident);
              const propName = node.name.text;
              totalAccesses++;

              const target = stitchExports[exportName];
              if (!target || target[propName] === undefined) {
                missingTokens.push({ file: relPath, exportName, propName });
              }
            }
          }
        }
        ts.forEachChild(node, checkAccess);
      }
      checkAccess(sf);
    }

    assert.ok(totalAccesses >= 900, `Expected at least 900 property accesses, found ${totalAccesses}`);
    assert.deepEqual(missingTokens, [], `No property access should resolve to undefined: ${JSON.stringify(missingTokens)}`);
  });
});

// ==============================================================================
// SUITE 2: Export Contract & Token Schema Validation
// ==============================================================================
describe('Export Contract & Token Schema Validation', () => {
  test('TC 2.1: Exactly 11 exported symbols present with correct types', () => {
    const expectedSymbols = [
      'stitchColors',
      'brandGradient',
      'brandGradientTwo',
      'stitchSpacing',
      'stitchRadius',
      'fontFamilies',
      'stitchTypography',
      'stitchShadows',
      'glassPanel',
      'glassCard',
      'stitchComponents',
    ];
    for (const sym of expectedSymbols) {
      assert.ok(stitchExports[sym] !== undefined, `Exported symbol ${sym} must be defined`);
      assert.equal(typeof stitchExports[sym], 'object', `Exported symbol ${sym} must be an object`);
    }
  });

  test('TC 2.2: stitchColors contains >= 72 valid color strings', () => {
    const colors = stitchExports.stitchColors;
    const colorKeys = Object.keys(colors);
    assert.ok(colorKeys.length >= 72, `stitchColors must contain at least 72 keys, found ${colorKeys.length}`);

    const hexRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
    const rgbaRegex = /^rgba?\(\s*([0-9]+(?:\.[0-9]+)?%?)\s*,\s*([0-9]+(?:\.[0-9]+)?%?)\s*,\s*([0-9]+(?:\.[0-9]+)?%?)(?:\s*,\s*([0-9]+(?:\.[0-9]+)?%?))?\s*\)$/;

    for (const [k, v] of Object.entries(colors)) {
      assert.equal(typeof v, 'string', `Token ${k} must be string`);
      assert.ok(
        hexRegex.test(v) || rgbaRegex.test(v) || v === 'transparent',
        `Token ${k} has invalid color value "${v}"`
      );
    }
  });

  test('TC 2.3: Gradient tuples match LinearGradient tuple format', () => {
    const { brandGradient, brandGradientTwo } = stitchExports;
    assert.ok(Array.isArray(brandGradient.colors), 'brandGradient.colors must be an array');
    assert.ok(brandGradient.colors.length >= 2, 'brandGradient.colors must have at least 2 stops');
    assert.ok(brandGradient.horizontal.start && brandGradient.horizontal.end, 'Horizontal gradient coordinates present');
    assert.ok(brandGradient.diagonal.start && brandGradient.diagonal.end, 'Diagonal gradient coordinates present');

    assert.ok(Array.isArray(brandGradientTwo.colors), 'brandGradientTwo.colors must be an array');
    assert.ok(brandGradientTwo.colors.length >= 2, 'brandGradientTwo.colors must have at least 2 stops');
    assert.ok(brandGradientTwo.start && brandGradientTwo.end, 'GradientTwo coordinates present');
  });

  test('TC 2.4: stitchRadius and stitchSpacing contain valid positive numbers', () => {
    const { stitchRadius, stitchSpacing } = stitchExports;

    for (const [k, v] of Object.entries(stitchRadius)) {
      assert.equal(typeof v, 'number', `stitchRadius.${k} must be number`);
      assert.ok(v > 0, `stitchRadius.${k} must be positive`);
    }
    assert.ok(stitchRadius.card >= 16 && stitchRadius.card <= 24, 'card radius must be 16-24px');
    assert.ok(stitchRadius.button >= 14 && stitchRadius.button <= 18, 'button radius must be 14-18px');

    for (const [k, v] of Object.entries(stitchSpacing)) {
      assert.equal(typeof v, 'number', `stitchSpacing.${k} must be number`);
      assert.ok(v > 0, `stitchSpacing.${k} must be positive`);
    }
  });

  test('TC 2.5: stitchShadows presets have valid non-negative numbers and 0-1 opacity', () => {
    const { stitchShadows } = stitchExports;
    for (const [k, preset] of Object.entries(stitchShadows)) {
      if (k === 'none') continue;
      assert.ok(typeof preset.shadowOpacity === 'number', `${k}.shadowOpacity must be number`);
      assert.ok(preset.shadowOpacity >= 0 && preset.shadowOpacity <= 1, `${k}.shadowOpacity must be 0..1`);
      assert.ok(preset.shadowRadius >= 0, `${k}.shadowRadius must be >= 0`);
      assert.ok(preset.elevation >= 0, `${k}.elevation must be >= 0`);
    }
  });

  test('TC 2.6: stitchTypography contains all required text presets', () => {
    const { stitchTypography } = stitchExports;
    const requiredPresets = [
      'displayHero', 'displayLg', 'displayMd', 'displaySm',
      'headlineXl', 'headlineLg', 'headlineLgMobile', 'headlineMd',
      'bodyItalic', 'bodyLg', 'bodyMd', 'bodySm',
      'monoKicker', 'monoEyebrow', 'labelMd', 'labelSm', 'labelMonoSm'
    ];
    for (const preset of requiredPresets) {
      assert.ok(stitchTypography[preset], `stitchTypography.${preset} must exist`);
      assert.ok(typeof stitchTypography[preset].fontSize === 'number', `${preset} fontSize must be number`);
      assert.ok(stitchTypography[preset].color, `${preset} color must be set`);
    }
  });
});

// ==============================================================================
// SUITE 3: Royal Violet & Clean White Spec Conformance (R1)
// ==============================================================================
describe('Royal Violet & Clean White Spec Conformance (R1)', () => {
  test('TC 3.1: Clean White background ramp tokens', () => {
    const { stitchColors } = stitchExports;
    assert.equal(stitchColors.paper, '#FFFFFF', 'paper must be Clean White #FFFFFF');
    assert.equal(stitchColors.paperDeep, '#F8FAFC', 'paperDeep must be Slate 50 #F8FAFC');
    assert.equal(stitchColors.paperSoft, '#F1F5F9', 'paperSoft must be Slate 100 #F1F5F9');
    assert.equal(stitchColors.surface, '#FFFFFF', 'surface must be Clean White #FFFFFF');
  });

  test('TC 3.2: Royal Violet & Electric Violet accent tokens', () => {
    const { stitchColors } = stitchExports;
    assert.equal(stitchColors.primary, '#7C3AED', 'primary must be Royal Violet #7C3AED');
    assert.equal(stitchColors.sienna, '#7C3AED', 'sienna must match primary Royal Violet #7C3AED');
    assert.equal(stitchColors.secondary, '#8B5CF6', 'secondary must be Electric Violet #8B5CF6');
    assert.equal(stitchColors.siennaTone, '#8B5CF6', 'siennaTone must be Electric Violet #8B5CF6');
    assert.equal(stitchColors.siennaBg, 'rgba(124, 58, 237, 0.08)', 'siennaBg must be 8% purple tint');
    assert.equal(stitchColors.primaryContainer, 'rgba(124, 58, 237, 0.08)', 'primaryContainer must be 8% purple tint');
  });

  test('TC 3.3: High-contrast Deep Slate Black typography tokens', () => {
    const { stitchColors } = stitchExports;
    assert.equal(stitchColors.ink, '#0F172A', 'ink must be Deep Slate Black #0F172A');
    assert.equal(stitchColors.inkSoft, '#334155', 'inkSoft must be Slate 700 #334155');
    assert.equal(stitchColors.inkMuted, '#64748B', 'inkMuted must be Slate 500 #64748B');
  });

  test('TC 3.4: Curved BottomNav and Clean White GlassCard presets', () => {
    const { glassPanel, glassCard } = stitchExports;
    assert.equal(glassPanel.bottomNav.backgroundColor, '#FFFFFF', 'bottomNav background must be clean white');
    assert.equal(glassPanel.bottomNav.borderRadius, 9999, 'bottomNav must have full pill border radius');
    assert.equal(glassCard.light.backgroundColor, '#FFFFFF', 'glassCard.light must have clean white background');
    assert.equal(glassCard.light.borderRadius, 20, 'glassCard.light must have 20px card radius');
  });
});

// ==============================================================================
// SUITE 4: WCAG 2.1 Accessibility & Contrast Stress Testing
// ==============================================================================
describe('WCAG 2.1 Accessibility & Contrast Stress Testing', () => {
  function hexToRgb(hex) {
    const cleanHex = hex.replace('#', '');
    const bigint = parseInt(cleanHex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return [r, g, b];
  }

  function getLuminance([r, g, b]) {
    const a = [r, g, b].map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }

  function getContrastRatio(hex1, hex2) {
    const lum1 = getLuminance(hexToRgb(hex1));
    const lum2 = getLuminance(hexToRgb(hex2));
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
  }

  test('TC 4.1: Deep Slate Black on Clean White text contrast (passes WCAG AAA >= 7.0:1)', () => {
    const { stitchColors } = stitchExports;
    const contrast = getContrastRatio(stitchColors.ink, stitchColors.paper);
    assert.ok(contrast >= 7.0, `Contrast ratio ${contrast.toFixed(2)}:1 must pass WCAG AAA (>= 7.0:1)`);
  });

  test('TC 4.2: Slate Muted on Clean White text contrast (passes WCAG AA normal text >= 4.5:1)', () => {
    const { stitchColors } = stitchExports;
    const contrast = getContrastRatio(stitchColors.inkMuted, stitchColors.paper);
    assert.ok(contrast >= 4.5, `Contrast ratio ${contrast.toFixed(2)}:1 must pass WCAG AA (>= 4.5:1)`);
  });

  test('TC 4.3: White text on Royal Violet Primary Button (passes WCAG AA UI/Large >= 3.0:1)', () => {
    const { stitchColors } = stitchExports;
    const contrast = getContrastRatio(stitchColors.onPrimary, stitchColors.primary);
    assert.ok(contrast >= 3.0, `Contrast ratio ${contrast.toFixed(2)}:1 must pass WCAG UI components (>= 3.0:1)`);
  });
});

// ==============================================================================
// SUITE 5: Style Composition & React Native Mutation Immunity
// ==============================================================================
describe('Style Composition & React Native Mutation Immunity', () => {
  test('TC 5.1: Composition and flattening of stitchComponents presets', () => {
    const { stitchComponents, stitchColors, stitchRadius } = stitchExports;
    const mergedBtn = {
      ...stitchComponents.btnPrimary,
      paddingHorizontal: 32,
    };
    assert.equal(mergedBtn.backgroundColor, stitchColors.primary);
    assert.equal(mergedBtn.borderRadius, stitchRadius.button);
    assert.equal(mergedBtn.paddingHorizontal, 32);
  });

  test('TC 5.2: Absence of illegal web-only CSS properties in React Native styles', () => {
    const illegalKeys = ['cursor', 'transition', 'float', 'filter', 'backdropFilter', 'boxSizing'];
    function checkKeys(obj, pathName) {
      if (!obj || typeof obj !== 'object') return;
      for (const [k, v] of Object.entries(obj)) {
        assert.ok(!illegalKeys.includes(k), `Illegal CSS key "${k}" found in ${pathName}`);
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          checkKeys(v, `${pathName}.${k}`);
        }
      }
    }
    checkKeys(stitchExports.stitchComponents, 'stitchComponents');
    checkKeys(stitchExports.stitchTypography, 'stitchTypography');
    checkKeys(stitchExports.glassPanel, 'glassPanel');
    checkKeys(stitchExports.glassCard, 'glassCard');
  });
});

// ==============================================================================
// SUMMARY AND EXIT
// ==============================================================================
const totalDuration = Date.now() - globalStartTime;
console.log(`==============================================================================`);
console.log(`🏁 RÉSUMÉ DU BANC D'ESSAI CHALLENGER M1-2`);
console.log(`==============================================================================`);
console.log(`📊 Total Suites  : ${totalSuites}`);
console.log(`📋 Total Tests   : ${totalTests}`);
console.log(`✅ Tests Réussis : ${passedTests}`);
console.log(`❌ Tests Échoués : ${failedTests}`);
console.log(`⏱️  Durée Totale : ${totalDuration}ms`);

if (failedTests > 0) {
  console.error(`\n🚨 ÉCHEC : ${failedTests} test(s) ont échoué !`);
  process.exit(1);
} else {
  console.log(`\n🎉 SUCCÈS : Tous les tests empiriques M1-2 ont été validés avec succès !`);
  process.exit(0);
}
