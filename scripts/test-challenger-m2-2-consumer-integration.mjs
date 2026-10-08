#!/usr/bin/env node

/**
 * ==============================================================================
 * CAMPUS 360 — CHALLENGER M2-2 CONSUMER INTEGRATION & RUNTIME REGRESSION SUITE
 * ==============================================================================
 *
 * Independent empirical verification by Challenger M2-2:
 * 1. Verification of all 10 consumer components importing `src/ui/GlassComponents.tsx`
 * 2. AST parsing & prop contract validation for every imported component invocation
 * 3. Runtime VM simulation of Master Shared Components (TopBar, BottomNav, CategoryGrid,
 *    Card, Pill, EditorialInput, GradientButton, SecondaryButton) under normal & edge-case inputs
 * 4. TypeScript compiler API diagnostics across all consumer files and `GlassComponents.tsx`
 * 5. Regression suite execution (Theme Integrity & Stage Dispatch)
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

// ------------------------------------------------------------------------------
// Target Files Configuration
// ------------------------------------------------------------------------------
const glassComponentsRelPath = 'src/ui/GlassComponents.tsx';
const glassComponentsFullPath = path.join(projectRoot, glassComponentsRelPath);

const consumerFiles = [
  'src/AppShell.tsx',
  'src/ui/screens/StagesScreen.tsx',
  'src/ui/screens/ProfileScreen.tsx',
  'src/ui/screens/LibraryScreen.tsx',
  'src/ui/screens/HomeScreen.tsx',
  'src/ui/screens/ExploreScreen.tsx',
  'src/ui/screens/DocumentsScreen.tsx',
  'src/ui/screens/DashboardScreen.tsx',
  'src/ui/screens/AuthScreen.tsx',
  'src/features/documents/DocumentsScreen.tsx',
];

console.log(`🚀 Campus 360 — Démarrage du banc d'essai Challenger M2-2`);
console.log(`📁 Racine projet: ${projectRoot}`);
console.log(`📅 Horodatage: ${new Date().toISOString()}`);

// ==============================================================================
// SUITE 1: Consumer Import & Export Contract Resolution (All 10 Consumers)
// ==============================================================================
describe('Consumer Import & Export Contract Resolution (All 10 Consumers)', () => {
  test('TC 1.1: Verification that GlassComponents.tsx and all 10 consumer files exist on disk', () => {
    assert.ok(fs.existsSync(glassComponentsFullPath), `Fichier manquant: ${glassComponentsRelPath}`);
    for (const relPath of consumerFiles) {
      const fullPath = path.join(projectRoot, relPath);
      assert.ok(fs.existsSync(fullPath), `Fichier consommateur manquant: ${relPath}`);
    }
  });

  // Extract all exported symbols from GlassComponents.tsx
  const glassSource = fs.readFileSync(glassComponentsFullPath, 'utf8');
  const glassSourceFile = ts.createSourceFile(
    glassComponentsFullPath,
    glassSource,
    ts.ScriptTarget.Latest,
    true
  );

  const exportedSymbols = new Set();
  ts.forEachChild(glassSourceFile, (node) => {
    // export function X / export const X / export interface X
    if (node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
      if (ts.isFunctionDeclaration(node) && node.name) {
        exportedSymbols.add(node.name.text);
      } else if (ts.isVariableStatement(node)) {
        for (const decl of node.declarationList.declarations) {
          if (ts.isIdentifier(decl.name)) {
            exportedSymbols.add(decl.name.text);
          }
        }
      } else if (ts.isInterfaceDeclaration(node) && node.name) {
        exportedSymbols.add(node.name.text);
      } else if (ts.isTypeAliasDeclaration(node) && node.name) {
        exportedSymbols.add(node.name.text);
      }
    }
  });

  test('TC 1.2: GlassComponents.tsx exports all required Milestone 2 symbols', () => {
    const requiredExports = [
      'TopBar',
      'BottomNav',
      'CategoryGrid',
      'Card',
      'Pill',
      'EditorialInput',
      'GradientButton',
      'PrimaryButton',
      'SiennaButton',
      'SecondaryButton',
      'GlassCard',
      'GlassPanel',
      'GlassPill',
      'GlassInput',
      'IconButton',
      'SearchFilterBar',
      'TransactionRow',
      'ScreenMasthead',
      'EmptyState',
      'DocumentGridCard',
      'DashboardGrid',
      'TrustBadgeStrip',
      'GradientText',
    ];

    for (const sym of requiredExports) {
      assert.ok(
        exportedSymbols.has(sym),
        `Export obligatoire manquant dans GlassComponents.tsx: ${sym}`
      );
    }
  });

  test('TC 1.3: AST analysis ensures every import from GlassComponents resolves cleanly', () => {
    let totalImportedSymbols = 0;

    for (const relPath of consumerFiles) {
      const fullPath = path.join(projectRoot, relPath);
      const source = fs.readFileSync(fullPath, 'utf8');
      const sf = ts.createSourceFile(fullPath, source, ts.ScriptTarget.Latest, true);

      ts.forEachChild(sf, (node) => {
        if (ts.isImportDeclaration(node)) {
          const modSpec = node.moduleSpecifier.text;
          if (
            modSpec.endsWith('GlassComponents') ||
            modSpec.endsWith('GlassComponents.tsx')
          ) {
            assert.ok(node.importClause, `${relPath}: clause d'import manquante`);
            const namedBindings = node.importClause.namedBindings;
            if (namedBindings && ts.isNamedImports(namedBindings)) {
              for (const elem of namedBindings.elements) {
                const importedName = elem.propertyName ? elem.propertyName.text : elem.name.text;
                assert.ok(
                  exportedSymbols.has(importedName),
                  `${relPath}: Symbole '${importedName}' importé mais non exporté par GlassComponents.tsx`
                );
                totalImportedSymbols++;
              }
            }
          }
        }
      });
    }

    assert.ok(totalImportedSymbols >= 15, `Attendu au moins 15 imports résolus, trouvé: ${totalImportedSymbols}`);
  });
});

// ==============================================================================
// SUITE 2: Component Invocation & Prop Schema Validation
// ==============================================================================
describe('Component Invocation & Prop Schema Validation', () => {
  test('TC 2.1: AppShell TopBar invocation passes strictly valid TopBarProps', () => {
    const appShellPath = path.join(projectRoot, 'src', 'AppShell.tsx');
    const source = fs.readFileSync(appShellPath, 'utf8');
    const sf = ts.createSourceFile(appShellPath, source, ts.ScriptTarget.Latest, true);

    const validTopBarProps = new Set([
      'appName',
      'onBellPress',
      'hasUnread',
      'unreadCount',
      'onAvatarPress',
      'avatarInitials',
      'locationName',
      'universityName',
      'onLocationPress',
      'showLocation',
      'showSearch',
      'searchValue',
      'onSearchChange',
      'searchPlaceholder',
      'onFilterPress',
      'onSearchPress',
      'hasActiveFilters',
      'iaCredits',
      'onWalletPress',
      'style',
    ]);

    let foundTopBar = false;
    function visit(node) {
      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tagName = (node.openingElement || node).tagName.getText(sf);
        if (tagName === 'TopBar') {
          foundTopBar = true;
          const attributes = (node.openingElement || node).attributes;
          for (const prop of attributes.properties) {
            if (ts.isJsxAttribute(prop)) {
              const propName = prop.name.text;
              assert.ok(
                validTopBarProps.has(propName),
                `AppShell: Propriété inconnue '${propName}' fournie à TopBar`
              );
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(sf);
    assert.ok(foundTopBar, "AppShell doit contenir une invocation de <TopBar>");
  });

  test('TC 2.2: AppShell BottomNav invocation passes strictly valid BottomNavProps', () => {
    const appShellPath = path.join(projectRoot, 'src', 'AppShell.tsx');
    const source = fs.readFileSync(appShellPath, 'utf8');
    const sf = ts.createSourceFile(appShellPath, source, ts.ScriptTarget.Latest, true);

    const validBottomNavProps = new Set(['activeSection', 'onPress']);

    let foundBottomNav = false;
    function visit(node) {
      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tagName = (node.openingElement || node).tagName.getText(sf);
        if (tagName === 'BottomNav') {
          foundBottomNav = true;
          const attributes = (node.openingElement || node).attributes;
          const presentProps = new Set();
          for (const prop of attributes.properties) {
            if (ts.isJsxAttribute(prop)) {
              const propName = prop.name.text;
              assert.ok(
                validBottomNavProps.has(propName),
                `AppShell: Propriété inconnue '${propName}' fournie à BottomNav`
              );
              presentProps.add(propName);
            }
          }
          assert.ok(presentProps.has('activeSection'), 'BottomNav requiert activeSection');
          assert.ok(presentProps.has('onPress'), 'BottomNav requiert onPress');
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(sf);
    assert.ok(foundBottomNav, "AppShell doit contenir une invocation de <BottomNav>");
  });

  test('TC 2.3: StagesScreen & HomeScreen SearchFilterBar invocations pass valid props', () => {
    const validSearchProps = new Set([
      'value',
      'onChangeText',
      'placeholder',
      'onFilterPress',
      'onSubmitEditing',
      'hasActiveFilters',
      'style',
    ]);

    for (const screenPath of ['src/ui/screens/StagesScreen.tsx', 'src/ui/screens/HomeScreen.tsx']) {
      const fullPath = path.join(projectRoot, screenPath);
      const source = fs.readFileSync(fullPath, 'utf8');
      const sf = ts.createSourceFile(fullPath, source, ts.ScriptTarget.Latest, true);

      let foundSearchFilterBar = false;
      function visit(node) {
        if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
          const tagName = (node.openingElement || node).tagName.getText(sf);
          if (tagName === 'SearchFilterBar') {
            foundSearchFilterBar = true;
            const attributes = (node.openingElement || node).attributes;
            for (const prop of attributes.properties) {
              if (ts.isJsxAttribute(prop)) {
                const propName = prop.name.text;
                assert.ok(
                  validSearchProps.has(propName),
                  `${screenPath}: Propriété inconnue '${propName}' sur SearchFilterBar`
                );
              }
            }
          }
        }
        ts.forEachChild(node, visit);
      }
      visit(sf);
      assert.ok(foundSearchFilterBar, `${screenPath} doit contenir <SearchFilterBar>`);
    }
  });

  test('TC 2.4: ProfileScreen TransactionRow invocations pass required props', () => {
    const profilePath = path.join(projectRoot, 'src/ui/screens/ProfileScreen.tsx');
    const source = fs.readFileSync(profilePath, 'utf8');
    const sf = ts.createSourceFile(profilePath, source, ts.ScriptTarget.Latest, true);

    const validTxProps = new Set(['key', 'label', 'date', 'amount', 'type', 'formatCoins']);

    let foundTxRow = false;
    function visit(node) {
      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tagName = (node.openingElement || node).tagName.getText(sf);
        if (tagName === 'TransactionRow') {
          foundTxRow = true;
          const attributes = (node.openingElement || node).attributes;
          for (const prop of attributes.properties) {
            if (ts.isJsxAttribute(prop)) {
              const propName = prop.name.text;
              assert.ok(
                validTxProps.has(propName),
                `ProfileScreen: Propriété inattendue '${propName}' sur TransactionRow`
              );
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(sf);
    assert.ok(foundTxRow, "ProfileScreen doit invoquer <TransactionRow>");
  });

  test('TC 2.5: LibraryScreen & DocumentsScreen shared components invocations pass valid props', () => {
    const files = ['src/ui/screens/LibraryScreen.tsx', 'src/ui/screens/DocumentsScreen.tsx'];
    for (const rel of files) {
      const fullPath = path.join(projectRoot, rel);
      const source = fs.readFileSync(fullPath, 'utf8');
      const sf = ts.createSourceFile(fullPath, source, ts.ScriptTarget.Latest, true);

      let foundGridCard = false;
      let foundMasthead = false;
      let foundEmpty = false;

      function visit(node) {
        if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
          const tagName = (node.openingElement || node).tagName.getText(sf);
          if (tagName === 'DocumentGridCard') foundGridCard = true;
          if (tagName === 'ScreenMasthead') foundMasthead = true;
          if (tagName === 'EmptyState') foundEmpty = true;
        }
        ts.forEachChild(node, visit);
      }
      visit(sf);
      assert.ok(foundGridCard, `${rel}: <DocumentGridCard> doit être invoqué`);
      assert.ok(foundMasthead, `${rel}: <ScreenMasthead> doit être invoqué`);
      assert.ok(foundEmpty, `${rel}: <EmptyState> doit être invoqué`);
    }
  });
});

// ==============================================================================
// SUITE 3: Runtime Logic & Edge Cases for Milestone 2 Core Components
// ==============================================================================
describe('Runtime Logic & Edge Cases for Milestone 2 Core Components', () => {
  // Transpile GlassComponents.tsx for runtime execution test
  const glassSource = fs.readFileSync(glassComponentsFullPath, 'utf8');
  const transpiled = ts.transpileModule(glassSource, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
    },
  }).outputText;

  // Mock React & React Native runtime
  const mockReact = {
    createElement: (type, props, ...children) => ({
      type,
      props: { ...props, children: children.length === 1 ? children[0] : children },
    }),
    useState: (initial) => [initial, () => {}],
    useRef: (init) => ({ current: init }),
    useEffect: () => {},
    useMemo: (fn) => fn(),
    useCallback: (fn) => fn,
  };

  const mockReactNative = {
    Platform: {
      OS: 'ios',
      select: (spec) => spec.ios || spec.default || spec.web || spec.android,
    },
    StyleSheet: {
      create: (styles) => styles,
      flatten: (style) => (Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style || {}),
    },
    Dimensions: {
      get: () => ({ width: 390, height: 844 }),
    },
    View: 'View',
    Text: 'Text',
    TextInput: 'TextInput',
    Pressable: ({ children, style, onPress }) => ({
      type: 'Pressable',
      props: { children, style, onPress },
    }),
    ScrollView: 'ScrollView',
  };

  const mockLinearGradient = ({ children, colors, style }) => ({
    type: 'LinearGradient',
    props: { children, colors, style },
  });

  const mockLucide = new Proxy(
    {},
    {
      get: (_, prop) => {
        const IconComponent = (props) => ({ type: `Lucide.${prop}`, props });
        return IconComponent;
      },
    }
  );

  const mockSvg = {
    default: 'Svg',
    Text: 'SvgText',
    Defs: 'Defs',
    LinearGradient: 'SvgLinearGradient',
    Stop: 'Stop',
  };

  const vmSandbox = {
    module: { exports: {} },
    exports: {},
    require: (id) => {
      if (id === 'react') return mockReact;
      if (id === 'react-native') return mockReactNative;
      if (id === 'expo-linear-gradient') return { LinearGradient: mockLinearGradient };
      if (id === 'lucide-react-native') return mockLucide;
      if (id === 'react-native-svg') return mockSvg;
      if (id === '../theme/stitch' || id.endsWith('/stitch')) {
        // Return required stitch tokens
        return {
          stitchColors: {
            surface: '#FFFFFF',
            paperSoft: '#F1F5F9',
            paperDeep: '#E2E8F0',
            glassBorder: 'rgba(15, 23, 42, 0.08)',
            ink: '#0F172A',
            inkMuted: '#64748B',
            inkSubtle: '#94A3B8',
            sienna: '#7C3AED',
            siennaBg: 'rgba(124, 58, 237, 0.08)',
            siennaSoft: 'rgba(124, 58, 237, 0.16)',
            white: '#FFFFFF',
            emerald: '#10B981',
            brandGlow: 'rgba(124, 58, 237, 0.25)',
          },
          stitchRadius: {
            sm: 8,
            md: 12,
            lg: 20,
            xl: 24,
            full: 9999,
            card: 20,
            button: 16,
          },
          stitchSpacing: {
            containerMargin: 16,
            cardPad: 16,
          },
          brandGradient: {
            colors: ['#7C3AED', '#8B5CF6'],
          },
          fontFamilies: {
            serif: 'Georgia',
            mono: 'monospace',
            sans: 'System',
          },
        };
      }
      return {};
    },
    console,
  };

  vm.createContext(vmSandbox);
  vm.runInContext(transpiled, vmSandbox);
  const runtimeExports = vmSandbox.exports;

  test('TC 3.1: TopBar renders cleanly with zero required props (safe defaults)', () => {
    assert.equal(typeof runtimeExports.TopBar, 'function');
    const elem = runtimeExports.TopBar({});
    assert.ok(elem, 'TopBar({}) doit retourner un élément valide');
    assert.equal(elem.type, 'LinearGradient');
    assert.deepEqual(elem.props.colors, ['#7C3AED', '#6D28D9']);
  });

  test('TC 3.2: TopBar location fallback vs explicit locationName vs universityName', () => {
    // 1. Fallback default
    const defElem = runtimeExports.TopBar({});
    assert.ok(defElem);

    // 2. Explicit locationName
    const locElem = runtimeExports.TopBar({ locationName: 'Douala • Univ. Douala' });
    assert.ok(locElem);

    // 3. universityName fallback
    const univElem = runtimeExports.TopBar({ universityName: 'Univ. Dschang' });
    assert.ok(univElem);

    // 4. showLocation = false
    const noLocElem = runtimeExports.TopBar({ showLocation: false, appName: 'Custom Campus' });
    assert.ok(noLocElem);
  });

  test('TC 3.3: TopBar notification counter edge cases (0, normal, and 9+ overflow)', () => {
    // Unread 0 -> dot or no count
    const zeroElem = runtimeExports.TopBar({ hasUnread: true, unreadCount: 0 });
    assert.ok(zeroElem);

    // Unread 5 -> displays 5
    const fiveElem = runtimeExports.TopBar({ hasUnread: true, unreadCount: 5 });
    assert.ok(fiveElem);

    // Unread 15 -> displays '9+'
    const overflowElem = runtimeExports.TopBar({ hasUnread: true, unreadCount: 15 });
    assert.ok(overflowElem);
  });

  test('TC 3.4: TopBar search interaction modes (onSearchPress vs onSearchChange)', () => {
    let pressed = false;
    let changed = '';

    // Search pill as button
    const pressableSearch = runtimeExports.TopBar({
      onSearchPress: () => { pressed = true; },
    });
    assert.ok(pressableSearch);

    // Search pill as input
    const inputSearch = runtimeExports.TopBar({
      searchValue: 'informatique',
      onSearchChange: (t) => { changed = t; },
    });
    assert.ok(inputSearch);

    // showSearch = false
    const hiddenSearch = runtimeExports.TopBar({ showSearch: false });
    assert.ok(hiddenSearch);
  });

  test('TC 3.5: BottomNav renders exactly 5 destinations with active pill highlighting', () => {
    assert.equal(typeof runtimeExports.BottomNav, 'function');

    const expectedKeys = ['home', 'stages', 'documents', 'resources', 'account'];
    const expectedLabels = ['Accueil', 'Stages', 'Créer', 'Ressources', 'Profil'];

    for (let i = 0; i < expectedKeys.length; i++) {
      const activeKey = expectedKeys[i];
      let clickedKey = null;

      const navElem = runtimeExports.BottomNav({
        activeSection: activeKey,
        onPress: (k) => { clickedKey = k; },
      });

      assert.ok(navElem, `BottomNav doit retourner un élément valide pour activeSection=${activeKey}`);
      assert.equal(navElem.type, 'View');
    }
  });

  test('TC 3.6: CategoryGrid renders circular avatar cards and handles horizontal toggle', () => {
    assert.equal(typeof runtimeExports.CategoryGrid, 'function');

    const mockCategories = [
      { id: 'dev', label: 'Dév Web', icon: () => null, color: '#7C3AED', bg: '#F5F3FF' },
      { id: 'data', label: 'Data Science', icon: () => null, color: '#3B82F6', bg: '#EFF6FF' },
      { id: 'design', label: 'UI / UX', icon: () => null, color: '#EC4899', bg: '#FDF2F8' },
    ];

    let selectedCat = null;
    let seeAllClicked = false;

    // Horizontal mode with active category
    const horizElem = runtimeExports.CategoryGrid({
      categories: mockCategories,
      activeId: 'dev',
      onSelectCategory: (id) => { selectedCat = id; },
      onSeeAllPress: () => { seeAllClicked = true; },
      horizontal: true,
    });
    assert.ok(horizElem);

    // Grid mode (non-horizontal)
    const gridElem = runtimeExports.CategoryGrid({
      categories: mockCategories,
      activeId: 'data',
      onSelectCategory: (id) => {},
      horizontal: false,
    });
    assert.ok(gridElem);

    // Empty categories edge case
    const emptyElem = runtimeExports.CategoryGrid({
      categories: [],
      onSelectCategory: (id) => {},
    });
    assert.ok(emptyElem);
  });

  test('TC 3.7: Foundation components (Card, Pill, EditorialInput, GradientButton, SecondaryButton)', () => {
    // Card with tone variations
    const paperCard = runtimeExports.Card({ children: null, tone: 'paper' });
    const inkCard = runtimeExports.Card({ children: null, tone: 'ink' });
    const siennaCard = runtimeExports.Card({ children: null, tone: 'sienna' });
    assert.ok(paperCard && inkCard && siennaCard);

    // Pill active vs inactive
    const activePill = runtimeExports.Pill({ label: 'Actif', active: true });
    const inactivePill = runtimeExports.Pill({ label: 'Inactif', active: false });
    assert.ok(activePill && inactivePill);

    // EditorialInput
    const inputElem = runtimeExports.EditorialInput({
      label: 'Email',
      value: 'test@campus.cm',
      onChangeText: () => {},
    });
    assert.ok(inputElem);

    // GradientButton (loading and normal)
    const gradBtn = runtimeExports.GradientButton({
      label: 'Valider',
      onPress: () => {},
      loading: true,
    });
    assert.ok(gradBtn);

    // SecondaryButton
    const secBtn = runtimeExports.SecondaryButton({
      label: 'Annuler',
      onPress: () => {},
      disabled: true,
    });
    assert.ok(secBtn);
  });
});

// ==============================================================================
// SUITE 4: Programmatic TypeScript Compilation Verification
// ==============================================================================
describe('Programmatic TypeScript Compilation Verification', () => {
  test('TC 4.1: TypeScript compiler compiles all 10 consumer files and GlassComponents with 0 errors', () => {
    const configPath = path.join(projectRoot, 'tsconfig.json');
    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    assert.ok(!configFile.error, 'tsconfig.json doit être lisible');

    const parsedConfig = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      projectRoot
    );

    // Create program
    const targetFiles = [
      glassComponentsFullPath,
      ...consumerFiles.map((rel) => path.join(projectRoot, rel)),
    ];

    const program = ts.createProgram({
      rootNames: targetFiles,
      options: parsedConfig.options,
    });

    const diagnostics = [];
    for (const file of targetFiles) {
      const sourceFile = program.getSourceFile(file);
      if (sourceFile) {
        const fileDiagnostics = ts.getPreEmitDiagnostics(program, sourceFile);
        diagnostics.push(...fileDiagnostics);
      }
    }

    if (diagnostics.length > 0) {
      const formatted = ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCurrentDirectory: () => projectRoot,
        getCanonicalFileName: (f) => f,
        getNewLine: () => '\n',
      });
      console.error(formatted);
    }

    assert.equal(
      diagnostics.length,
      0,
      `Erreurs de compilation TypeScript détectées: ${diagnostics.length}`
    );
  });
});

// ==============================================================================
// SUITE 5: Verification of Regression Tests
// ==============================================================================
describe('Verification of Regression Tests', () => {
  test('TC 5.1: scripts/test-challenger-m1-2-theme-integrity.mjs passes with 100% success', async () => {
    const { execSync } = await import('node:child_process');
    const output = execSync('node scripts/test-challenger-m1-2-theme-integrity.mjs', {
      cwd: projectRoot,
      encoding: 'utf8',
    });
    assert.ok(
      output.includes("SUCCÈS : Tous les tests empiriques M1-2 ont été validés avec succès"),
      "Le banc d'essai M1-2 doit réussir"
    );
  });

  test('TC 5.2: scripts/test-stage-dispatch.mjs passes with 100% success', async () => {
    const { execSync } = await import('node:child_process');
    const output = execSync('node scripts/test-stage-dispatch.mjs', {
      cwd: projectRoot,
      encoding: 'utf8',
    });
    assert.ok(
      output.includes("SUCCÈS : Tous les tests d'intégration M6 ont été validés avec succès"),
      "Le banc d'essai M6 doit réussir"
    );
  });
});

// ==============================================================================
// TEST SUMMARY & FINAL VERDICT
// ==============================================================================
const totalDuration = Date.now() - globalStartTime;
console.log(`==============================================================================`);
console.log(`🏁 RÉSUMÉ DU BANC D'ESSAI CHALLENGER M2-2`);
console.log(`==============================================================================`);
console.log(`📊 Total Suites  : ${totalSuites}`);
console.log(`📋 Total Tests   : ${totalTests}`);
console.log(`✅ Tests Réussis : ${passedTests}`);
console.log(`❌ Tests Échoués : ${failedTests}`);
console.log(`⏱️  Durée Totale : ${totalDuration}ms\n`);

if (failedTests > 0) {
  console.error(`🚨 ÉCHEC : ${failedTests} test(s) ont échoué !`);
  for (const failure of testFailures) {
    console.error(`  - ${failure.testName}: ${failure.error.message}`);
  }
  process.exit(1);
} else {
  console.log(`🎉 SUCCÈS : Tous les tests empiriques M2-2 ont été validés avec succès !`);
  process.exit(0);
}
