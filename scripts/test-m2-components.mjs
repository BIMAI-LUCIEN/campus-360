#!/usr/bin/env node

/**
 * ==============================================================================
 * CAMPUS 360 — CHALLENGER M2-1 EMPIRICAL VERIFICATION & STRESS TEST SUITE
 * ==============================================================================
 *
 * Independent empirical verification of Milestone 2:
 * Master Shared Components & Navigation Redesign (Royal Violet & Clean White)
 * Target components:
 *   - TopBar (`src/ui/GlassComponents.tsx`)
 *   - BottomNav (`src/ui/GlassComponents.tsx`)
 *   - CategoryGrid (`src/ui/GlassComponents.tsx`)
 *   - Foundation components: Card, Pill, EditorialInput, GradientButton & aliases
 *   - AppShell integration (`src/AppShell.tsx`)
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

console.log('🚀 Campus 360 — Démarrage du banc d\'essai Challenger M2-1');
console.log(`📁 Racine projet: ${projectRoot}`);
console.log(`📅 Horodatage: ${new Date().toISOString()}`);

// ------------------------------------------------------------------------------
// COMMONJS VM EVALUATION ENGINE WITH REACT & REACT NATIVE MOCKS
// ------------------------------------------------------------------------------
function evaluateCommonJS(code, mocks = {}) {
  const exportsObj = {};
  const sandbox = {
    module: { exports: exportsObj },
    exports: exportsObj,
    require: (id) => {
      if (mocks[id]) return mocks[id];
      if (id.includes('stitch')) return mocks['stitch'];
      return {};
    },
    console,
  };
  vm.createContext(sandbox);
  const wrapped = '(function(exports, require, module) {\n' + code + '\n})';
  const fn = vm.runInContext(wrapped, sandbox);
  fn(sandbox.exports, sandbox.require, sandbox.module);
  return sandbox.module.exports;
}

// React Native mock
const mockReactNative = {
  Platform: {
    OS: 'ios',
    select: (spec) => (spec.ios !== undefined ? spec.ios : (spec.default !== undefined ? spec.default : spec.web)),
  },
  StyleSheet: {
    create: (styles) => styles,
  },
  Dimensions: {
    get: () => ({ width: 390, height: 844 }),
  },
  View: function View(props) { return { type: 'View', props }; },
  Text: function Text(props) { return { type: 'Text', props }; },
  TextInput: function TextInput(props) { return { type: 'TextInput', props }; },
  Pressable: function Pressable(props) { return { type: 'Pressable', props }; },
  ScrollView: function ScrollView(props) { return { type: 'ScrollView', props }; },
};

// LinearGradient mock
const mockExpoLinearGradient = {
  LinearGradient: function LinearGradient(props) { return { type: 'LinearGradient', props }; },
};

// Lucide icon factory proxy
const mockLucide = new Proxy({}, {
  get: (target, propName) => {
    return function LucideIcon(props) {
      return { type: `Lucide.${String(propName)}`, props };
    };
  },
});

// react-native-svg mock
const mockSvg = {
  default: function Svg(props) { return { type: 'Svg', props }; },
  Text: function SvgText(props) { return { type: 'SvgText', props }; },
  Defs: function Defs(props) { return { type: 'Defs', props }; },
  LinearGradient: function SvgGradient(props) { return { type: 'SvgGradient', props }; },
  Stop: function Stop(props) { return { type: 'Stop', props }; },
};

// React mock with createElement & hooks
let currentHookState = [];
let hookIndex = 0;
const mockReact = {
  default: null,
  useState: (initial) => {
    const idx = hookIndex++;
    if (currentHookState[idx] === undefined) {
      currentHookState[idx] = typeof initial === 'function' ? initial() : initial;
    }
    const setState = (nextVal) => {
      currentHookState[idx] = typeof nextVal === 'function' ? nextVal(currentHookState[idx]) : nextVal;
    };
    return [currentHookState[idx], setState];
  },
  useRef: (init) => ({ current: init }),
  createElement: (type, props, ...children) => {
    let resolvedChildren = children;
    if (children.length === 1 && Array.isArray(children[0])) {
      resolvedChildren = children[0];
    } else if (children.length === 0) {
      resolvedChildren = props && props.children !== undefined ? props.children : undefined;
    }
    return {
      type,
      props: {
        ...props,
        children: resolvedChildren,
      },
    };
  },
};
mockReact.default = mockReact;

function resetHooks() {
  currentHookState = [];
  hookIndex = 0;
}

// ------------------------------------------------------------------------------
// LOAD AND EVALUATE src/theme/stitch.ts & src/ui/GlassComponents.tsx
// ------------------------------------------------------------------------------
const stitchPath = path.join(projectRoot, 'src', 'theme', 'stitch.ts');
assert.ok(fs.existsSync(stitchPath), `stitch.ts must exist at ${stitchPath}`);
const stitchSource = fs.readFileSync(stitchPath, 'utf8');
const stitchTranspiled = ts.transpileModule(stitchSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const stitchExports = evaluateCommonJS(stitchTranspiled, { 'react-native': mockReactNative });

const gcPath = path.join(projectRoot, 'src', 'ui', 'GlassComponents.tsx');
assert.ok(fs.existsSync(gcPath), `GlassComponents.tsx must exist at ${gcPath}`);
const gcSource = fs.readFileSync(gcPath, 'utf8');
const gcTranspiled = ts.transpileModule(gcSource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.React,
  },
}).outputText;

const gcExports = evaluateCommonJS(gcTranspiled, {
  'react': mockReact,
  'react-native': mockReactNative,
  'expo-linear-gradient': mockExpoLinearGradient,
  'lucide-react-native': mockLucide,
  'react-native-svg': mockSvg,
  'stitch': stitchExports,
  '../theme/stitch': stitchExports,
});

// ------------------------------------------------------------------------------
// ELEMENT TREE TRAVERSAL HELPERS
// ------------------------------------------------------------------------------
function findNode(element, predicate) {
  if (!element || typeof element !== 'object') return null;
  if (predicate(element)) return element;

  const children = element.props && element.props.children;
  if (Array.isArray(children)) {
    for (const child of children) {
      const found = findNode(child, predicate);
      if (found) return found;
    }
  } else if (children && typeof children === 'object') {
    return findNode(children, predicate);
  }
  return null;
}

function findAllNodes(element, predicate, results = []) {
  if (!element || typeof element !== 'object') return results;
  if (predicate(element)) results.push(element);

  const children = element.props && element.props.children;
  if (Array.isArray(children)) {
    for (const child of children) {
      findAllNodes(child, predicate, results);
    }
  } else if (children && typeof children === 'object') {
    findAllNodes(children, predicate, results);
  }
  return results;
}

function flattenStyle(styleProp) {
  if (!styleProp) return {};
  if (Array.isArray(styleProp)) {
    return styleProp.reduce((acc, cur) => {
      if (typeof cur === 'function') {
        const evaluated = cur({ pressed: false });
        return { ...acc, ...flattenStyle(evaluated) };
      }
      return { ...acc, ...flattenStyle(cur) };
    }, {});
  }
  if (typeof styleProp === 'function') {
    return flattenStyle(styleProp({ pressed: false }));
  }
  if (typeof styleProp === 'object') {
    return { ...styleProp };
  }
  return {};
}

function extractAllStrings(element) {
  const strings = [];
  function walk(node) {
    if (node === null || node === undefined) return;
    if (typeof node === 'string' || typeof node === 'number') {
      strings.push(String(node));
      return;
    }
    if (typeof node === 'object' && node.props && node.props.children) {
      const c = node.props.children;
      if (Array.isArray(c)) c.forEach(walk);
      else walk(c);
    }
  }
  walk(element);
  return strings.join(' ');
}

// ==============================================================================
// SUITE 1: TopBar Component Verification & Adversarial Stress Testing
// ==============================================================================
describe('TopBar Component Verification & Adversarial Stress Testing', () => {
  const { TopBar } = gcExports;

  test('TC 1.1: TopBar export existence and function type', () => {
    assert.equal(typeof TopBar, 'function', 'TopBar must be exported as a function component');
  });

  test('TC 1.2: Root container is LinearGradient with Royal Violet gradient colors', () => {
    resetHooks();
    const tree = TopBar({});
    assert.equal(tree.type, 'LinearGradient', 'TopBar root element must be LinearGradient');
    assert.deepEqual(tree.props.colors, ['#7C3AED', '#6D28D9'], 'TopBar gradient must use [#7C3AED, #6D28D9]');
  });

  test('TC 1.3: Convex curved styling with 30px bottom radius and elevation 8', () => {
    resetHooks();
    const tree = TopBar({});
    const rootStyle = flattenStyle(tree.props.style);
    assert.equal(rootStyle.borderBottomLeftRadius, 30, 'borderBottomLeftRadius must be 30px');
    assert.equal(rootStyle.borderBottomRightRadius, 30, 'borderBottomRightRadius must be 30px');
    assert.equal(rootStyle.elevation, 8, 'elevation must be 8');
    assert.equal(rootStyle.shadowColor, stitchExports.stitchColors.sienna, 'shadowColor must be Royal Violet sienna token');
  });

  test('TC 1.4: Prop defaults verification (showLocation=true, showSearch=true, default location fallback)', () => {
    resetHooks();
    const tree = TopBar({});
    const textContent = extractAllStrings(tree);
    assert.ok(textContent.includes('Yaoundé • Univ. Ydé I'), 'Default location must fall back to "Yaoundé • Univ. Ydé I"');
    assert.ok(textContent.includes('Rechercher un stage, entreprise...'), 'Default search placeholder must be present');
  });

  test('TC 1.5: Location resolution precedence (locationName > universityName > fallback)', () => {
    // universityName only
    resetHooks();
    const tree1 = TopBar({ universityName: 'Univ. Douala' });
    assert.ok(extractAllStrings(tree1).includes('Univ. Douala'), 'Should display universityName when locationName not provided');

    // locationName only
    resetHooks();
    const tree2 = TopBar({ locationName: 'Bafoussam Centre' });
    assert.ok(extractAllStrings(tree2).includes('Bafoussam Centre'), 'Should display locationName');

    // Both provided: locationName takes precedence
    resetHooks();
    const tree3 = TopBar({ locationName: 'Yaoundé Omnisports', universityName: 'Univ. Yaoundé II' });
    assert.ok(extractAllStrings(tree3).includes('Yaoundé Omnisports'), 'locationName must take precedence over universityName');

    // Empty string falls back to default
    resetHooks();
    const tree4 = TopBar({ locationName: '', universityName: '' });
    assert.ok(extractAllStrings(tree4).includes('Yaoundé • Univ. Ydé I'), 'Empty string must fall back to default');
  });

  test('TC 1.6: Location pill Pressable wiring with onLocationPress', () => {
    let pressed = false;
    resetHooks();
    const tree = TopBar({ onLocationPress: () => { pressed = true; } });
    const pressable = findNode(tree, (n) => n.props && typeof n.props.onPress === 'function' && extractAllStrings(n).includes('Yaoundé'));
    assert.ok(pressable, 'Location pill Pressable must be present');
    pressable.props.onPress();
    assert.equal(pressed, true, 'onLocationPress callback must be invoked');
  });

  test('TC 1.7: Brand mode when showLocation is false', () => {
    resetHooks();
    const tree = TopBar({ showLocation: false, appName: 'Campus 360 Pro' });
    const text = extractAllStrings(tree);
    assert.ok(text.includes('Campus 360 Pro'), 'appName must be rendered when showLocation=false');
    assert.ok(text.includes('C'), 'Brand mark "C" must be rendered');
    assert.ok(!text.includes('Yaoundé'), 'Location pill must not be rendered when showLocation=false');
  });

  test('TC 1.8: IA credits pill rendering and wallet callback', () => {
    let walletPressed = false;
    resetHooks();
    const tree = TopBar({
      iaCredits: 15,
      onWalletPress: () => { walletPressed = true; },
    });
    const text = extractAllStrings(tree);
    assert.ok(text.includes('15 cr'), 'IA credits pill must display "15 cr"');
    const creditsNode = findNode(tree, (n) => extractAllStrings(n).includes('15 cr') && typeof n.props.onPress === 'function');
    assert.ok(creditsNode, 'Credits pill Pressable must exist');
    creditsNode.props.onPress();
    assert.equal(walletPressed, true, 'onWalletPress must be triggered on press');
  });

  test('TC 1.9: Adversarial check: iaCredits = 0 is rendered and not falsy hidden', () => {
    resetHooks();
    const tree = TopBar({
      iaCredits: 0,
      onWalletPress: () => {},
    });
    const text = extractAllStrings(tree);
    assert.ok(text.includes('0 cr'), 'iaCredits=0 must render "0 cr" without being hidden by falsy check');
  });

  test('TC 1.10: Notification bell callback & unread badge / dot states', () => {
    let bellPressed = false;
    // hasUnread = false -> no dot or badge
    resetHooks();
    const treeOff = TopBar({ onBellPress: () => { bellPressed = true; }, hasUnread: false });
    const bellNode = findNode(treeOff, (n) => n.type === 'Lucide.Bell');
    assert.ok(bellNode, 'Bell icon must be present');

    // hasUnread = true without unreadCount -> dot indicator
    resetHooks();
    const treeDot = TopBar({ hasUnread: true });
    assert.ok(!extractAllStrings(treeDot).match(/\d+/), 'Unread dot has no numeric text');

    // hasUnread = true with unreadCount = 4 -> badge with '4'
    resetHooks();
    const treeCount = TopBar({ hasUnread: true, unreadCount: 4 });
    assert.ok(extractAllStrings(treeCount).includes('4'), 'Unread badge must display count 4');

    // unreadCount > 9 -> badge with '9+'
    resetHooks();
    const treeOverflow = TopBar({ hasUnread: true, unreadCount: 42 });
    assert.ok(extractAllStrings(treeOverflow).includes('9+'), 'Unread count > 9 must be capped at "9+"');
  });

  test('TC 1.11: Avatar circle rendering with initials and fallback', () => {
    let avatarPressed = false;
    // Default fallback 'CB'
    resetHooks();
    const tree1 = TopBar({ onAvatarPress: () => { avatarPressed = true; } });
    assert.ok(extractAllStrings(tree1).includes('CB'), 'Default initials must be "CB"');

    // Custom initials 'JD'
    resetHooks();
    const tree2 = TopBar({ onAvatarPress: () => {}, avatarInitials: 'JD' });
    assert.ok(extractAllStrings(tree2).includes('JD'), 'Custom initials "JD" must be rendered');
  });

  test('TC 1.12: Integrated Clean White search pill structure and styles', () => {
    resetHooks();
    const tree = TopBar({});
    const searchIcon = findNode(tree, (n) => n.type === 'Lucide.Search');
    assert.ok(searchIcon, 'Search icon must be present inside search pill');
    assert.equal(searchIcon.props.color, stitchExports.stitchColors.inkSubtle, 'Search icon color must be inkSubtle');
  });

  test('TC 1.13: Dual search interaction modes (TextInput vs Pressable placeholder)', () => {
    // Mode A: onSearchChange provided -> renders TextInput
    let changedText = '';
    resetHooks();
    const treeInput = TopBar({
      searchValue: 'informatique',
      onSearchChange: (t) => { changedText = t; },
    });
    const textInputNode = findNode(treeInput, (n) => n.props && n.props.value === 'informatique');
    assert.ok(textInputNode, 'TextInput must be rendered when onSearchChange provided');
    textInputNode.props.onChangeText('react native');
    assert.equal(changedText, 'react native', 'onChangeText handler must receive typed text');

    // Mode B: onSearchPress provided without onSearchChange -> renders Pressable placeholder
    let searchNavigated = false;
    resetHooks();
    const treeNav = TopBar({
      onSearchPress: () => { searchNavigated = true; },
      searchPlaceholder: 'Trouver une offre',
    });
    const pressableSearch = findNode(treeNav, (n) => n.props && typeof n.props.onPress === 'function' && extractAllStrings(n).includes('Trouver une offre'));
    assert.ok(pressableSearch, 'Pressable search pill must be rendered for navigation mode');
    pressableSearch.props.onPress();
    assert.equal(searchNavigated, true, 'onSearchPress must be invoked');
  });

  test('TC 1.14: Filter button active toggle state & SlidersHorizontal icon', () => {
    let filterPressed = false;
    // Inactive filter button
    resetHooks();
    const treeInactive = TopBar({
      hasActiveFilters: false,
      onFilterPress: () => { filterPressed = true; },
    });
    const filterIcon = findNode(treeInactive, (n) => n.type === 'Lucide.SlidersHorizontal');
    assert.ok(filterIcon, 'SlidersHorizontal icon must be present');
    assert.equal(filterIcon.props.color, stitchExports.stitchColors.sienna, 'Inactive filter icon color must be Royal Violet sienna');

    // Active filter button
    resetHooks();
    const treeActive = TopBar({
      hasActiveFilters: true,
      onFilterPress: () => {},
    });
    const activeFilterIcon = findNode(treeActive, (n) => n.type === 'Lucide.SlidersHorizontal');
    assert.equal(activeFilterIcon.props.color, stitchExports.stitchColors.white, 'Active filter icon color must be white');
  });
});

// ==============================================================================
// SUITE 2: BottomNav 5 Destinations, Floating Capsule & Solid Violet Active Pill
// ==============================================================================
describe('BottomNav 5 Destinations, Floating Capsule & Solid Violet Active Pill', () => {
  const { BottomNav } = gcExports;

  test('TC 2.1: BottomNav export existence and function type', () => {
    assert.equal(typeof BottomNav, 'function', 'BottomNav must be exported as a function component');
  });

  test('TC 2.2: Exactly 5 destinations present with spec keys and labels', () => {
    resetHooks();
    const tree = BottomNav({ activeSection: 'home', onPress: () => {} });
    const allButtons = findAllNodes(tree, (n) => n.props && n.props.testID && n.props.testID.startsWith('nav-'));
    assert.equal(allButtons.length, 5, 'BottomNav must render exactly 5 navigation buttons');

    const expectedKeys = ['home', 'stages', 'documents', 'resources', 'account'];
    const expectedLabels = ['Accueil', 'Stages', 'Créer', 'Ressources', 'Profil'];

    for (let i = 0; i < 5; i++) {
      assert.equal(allButtons[i].props.testID, `nav-${expectedKeys[i]}`, `Item ${i} must have testID nav-${expectedKeys[i]}`);
      assert.equal(allButtons[i].props.accessibilityLabel, expectedLabels[i], `Item ${i} accessibilityLabel must be ${expectedLabels[i]}`);
    }
  });

  test('TC 2.3: Correct Lucide icons associated with all 5 destinations', () => {
    resetHooks();
    const tree = BottomNav({ activeSection: 'home', onPress: () => {} });
    const icons = findAllNodes(tree, (n) => typeof n.type === 'string' && n.type.startsWith('Lucide.'));
    const iconNames = icons.map((n) => n.type.replace('Lucide.', ''));
    assert.deepEqual(iconNames, ['Home', 'Briefcase', 'FileText', 'BookOpen', 'User'], 'Destinations must map to Home, Briefcase, FileText, BookOpen, User');
  });

  test('TC 2.4: Floating capsule outer wrapper styling (absolute positioning, zIndex 100)', () => {
    resetHooks();
    const tree = BottomNav({ activeSection: 'home', onPress: () => {} });
    const wrapStyle = flattenStyle(tree.props.style);
    assert.equal(wrapStyle.position, 'absolute', 'bottomNavWrap must be position: absolute');
    assert.equal(wrapStyle.left, 0, 'left must be 0');
    assert.equal(wrapStyle.right, 0, 'right must be 0');
    assert.equal(wrapStyle.bottom, 0, 'bottom must be 0');
    assert.equal(wrapStyle.zIndex, 100, 'zIndex must be 100');
  });

  test('TC 2.5: Floating capsule container dimensions, full border radius and elevation 12', () => {
    resetHooks();
    const tree = BottomNav({ activeSection: 'home', onPress: () => {} });
    const innerCapsule = tree.props.children;
    const capsuleStyle = flattenStyle(innerCapsule.props.style);
    assert.equal(capsuleStyle.backgroundColor, stitchExports.stitchColors.surface, 'Capsule background must be Clean White #FFFFFF');
    assert.equal(capsuleStyle.borderRadius, stitchExports.stitchRadius.full, 'Capsule borderRadius must be stitchRadius.full (9999)');
    assert.equal(capsuleStyle.borderWidth, 1, 'Capsule borderWidth must be 1');
    assert.equal(capsuleStyle.elevation, 12, 'Capsule elevation must be 12 (floating effect)');
    assert.equal(capsuleStyle.shadowRadius, 20, 'Capsule shadowRadius must be 20');
  });

  test('TC 2.6: Active destination rendered as solid Royal Violet pill with white icon & label', () => {
    resetHooks();
    const tree = BottomNav({ activeSection: 'stages', onPress: () => {} });
    const stagesButton = findNode(tree, (n) => n.props && n.props.testID === 'nav-stages');
    assert.ok(stagesButton, 'Active stages button must be found');

    const activePillStyle = flattenStyle(stagesButton.props.style);
    assert.equal(activePillStyle.backgroundColor, stitchExports.stitchColors.sienna, 'Active pill background must be Royal Violet sienna token (#7C3AED)');
    assert.equal(activePillStyle.borderRadius, stitchExports.stitchRadius.full, 'Active pill borderRadius must be full (9999)');

    // White icon inside active pill
    const icon = findNode(stagesButton, (n) => n.type === 'Lucide.Briefcase');
    assert.equal(icon.props.color, stitchExports.stitchColors.white, 'Active icon color must be white');

    // White bold label text inside active pill
    const textNode = findNode(stagesButton, (n) => extractAllStrings(n).includes('Stages'));
    assert.ok(textNode, 'Active pill must contain label text');
    const labelStyle = flattenStyle(textNode.props.style);
    assert.equal(labelStyle.color, stitchExports.stitchColors.white, 'Active label color must be white');
    assert.equal(labelStyle.fontWeight, '700', 'Active label fontWeight must be 700');
  });

  test('TC 2.7: Inactive destinations rendered as icon-only with slate muted color', () => {
    resetHooks();
    const tree = BottomNav({ activeSection: 'stages', onPress: () => {} });
    const homeButton = findNode(tree, (n) => n.props && n.props.testID === 'nav-home');
    assert.ok(homeButton, 'Inactive home button must be found');

    // No visible text inside inactive destination
    const homeText = extractAllStrings(homeButton);
    assert.equal(homeText, '', 'Inactive navigation item must not render text label');

    const icon = findNode(homeButton, (n) => n.type === 'Lucide.Home');
    assert.equal(icon.props.color, stitchExports.stitchColors.inkMuted, 'Inactive icon color must be inkMuted token (#64748B)');
    assert.equal(icon.props.size, 20, 'Inactive icon size must be 20');
  });

  test('TC 2.8: Navigation callback onPress fires with correct section key for all 5 tabs', () => {
    const keys = ['home', 'stages', 'documents', 'resources', 'account'];
    for (const targetKey of keys) {
      let clickedKey = null;
      resetHooks();
      const tree = BottomNav({ activeSection: 'home', onPress: (k) => { clickedKey = k; } });
      const button = findNode(tree, (n) => n.props && n.props.testID === `nav-${targetKey}`);
      assert.ok(button, `Button for ${targetKey} must exist`);
      button.props.onPress();
      assert.equal(clickedKey, targetKey, `Clicking button must pass section key "${targetKey}"`);
    }
  });
});

// ==============================================================================
// SUITE 3: CategoryGrid Horizontal Scroll, Circular 56x56 & High-Contrast Labels
// ==============================================================================
describe('CategoryGrid Horizontal Scroll, Circular 56x56 & High-Contrast Labels', () => {
  const { CategoryGrid } = gcExports;

  const mockCategories = [
    { id: 'tech', label: 'Tech & Dév', icon: () => ({ type: 'Lucide.Zap' }), color: '#7C3AED', bg: '#F5F3FF' },
    { id: 'design', label: 'Design & UI', icon: () => ({ type: 'Lucide.Sparkles' }), color: '#EC4899', bg: '#FDF2F8' },
    { id: 'finance', label: 'Finance & Audit', icon: () => ({ type: 'Lucide.Coins' }), color: '#F59E0B', bg: '#FFFBEB' },
  ];

  test('TC 3.1: CategoryGrid export existence and function type', () => {
    assert.equal(typeof CategoryGrid, 'function', 'CategoryGrid must be exported as a function component');
  });

  test('TC 3.2: Prop defaults verification (title="Filières Populaires", horizontal=true)', () => {
    resetHooks();
    const tree = CategoryGrid({ categories: mockCategories, onSelectCategory: () => {} });
    const text = extractAllStrings(tree);
    assert.ok(text.includes('Filières Populaires'), 'Default title must be "Filières Populaires"');
  });

  test('TC 3.3: Horizontal scroll mode renders ScrollView with horizontal=true', () => {
    resetHooks();
    const tree = CategoryGrid({ categories: mockCategories, onSelectCategory: () => {}, horizontal: true });
    const scrollView = findNode(tree, (n) => n.type === 'ScrollView');
    assert.ok(scrollView, 'ScrollView must be rendered in horizontal mode');
    assert.equal(scrollView.props.horizontal, true, 'horizontal prop must be true');
    assert.equal(scrollView.props.showsHorizontalScrollIndicator, false, 'showsHorizontalScrollIndicator must be false');
  });

  test('TC 3.4: Grid mode renders View with categoryGridWrap when horizontal=false', () => {
    resetHooks();
    const tree = CategoryGrid({ categories: mockCategories, onSelectCategory: () => {}, horizontal: false });
    const scrollView = findNode(tree, (n) => n.type === 'ScrollView');
    assert.equal(scrollView, null, 'ScrollView must NOT be rendered when horizontal=false');

    const gridContainer = findNode(tree, (n) => {
      const s = flattenStyle(n.props && n.props.style);
      return s.flexWrap === 'wrap';
    });
    assert.ok(gridContainer, 'Grid container with flexWrap: wrap must be rendered');
  });

  test('TC 3.5: Circular item geometry verification (56x56, borderRadius 28)', () => {
    resetHooks();
    const tree = CategoryGrid({ categories: mockCategories, onSelectCategory: () => {} });
    const circleNodes = findAllNodes(tree, (n) => {
      const s = flattenStyle(n.props && n.props.style);
      return s.width === 56 && s.height === 56 && s.borderRadius === 28;
    });
    assert.equal(circleNodes.length, 3, 'Must find exactly 3 circular avatar nodes (56x56, radius 28)');
  });

  test('TC 3.6: Active category circular avatar styling (solid Royal Violet sienna, elevation 4)', () => {
    resetHooks();
    const tree = CategoryGrid({
      categories: mockCategories,
      activeId: 'tech',
      onSelectCategory: () => {},
    });
    const activeCircle = findNode(tree, (n) => {
      const s = flattenStyle(n.props && n.props.style);
      return s.width === 56 && s.backgroundColor === stitchExports.stitchColors.sienna;
    });
    assert.ok(activeCircle, 'Active category must have solid Royal Violet background (#7C3AED)');
    const activeStyle = flattenStyle(activeCircle.props.style);
    assert.equal(activeStyle.borderColor, stitchExports.stitchColors.sienna, 'Active circle borderColor must be sienna');
    assert.equal(activeStyle.elevation, 4, 'Active circle elevation must be 4');
  });

  test('TC 3.7: Inactive category circular avatar styling (soft lavender background & subtle border)', () => {
    resetHooks();
    const tree = CategoryGrid({
      categories: mockCategories,
      activeId: 'tech',
      onSelectCategory: () => {},
    });
    // Find design category (inactive)
    const inactiveCircle = findNode(tree, (n) => {
      const s = flattenStyle(n.props && n.props.style);
      return s.width === 56 && s.backgroundColor === '#FDF2F8';
    });
    assert.ok(inactiveCircle, 'Inactive category with custom bg must preserve background color');
  });

  test('TC 3.8: Typography & High-contrast labels (Deep Slate ink #0F172A vs active sienna #7C3AED)', () => {
    resetHooks();
    const tree = CategoryGrid({
      categories: mockCategories,
      activeId: 'tech',
      onSelectCategory: () => {},
    });

    // Active label (Tech & Dév)
    const activeLabelNode = findNode(tree, (n) => extractAllStrings(n).includes('Tech & Dév') && n.type === 'Text');
    const activeLabelStyle = flattenStyle(activeLabelNode.props.style);
    assert.equal(activeLabelStyle.color, stitchExports.stitchColors.sienna, 'Active label color must be sienna (#7C3AED)');
    assert.equal(activeLabelStyle.fontWeight, '700', 'Active label fontWeight must be 700');

    // Inactive label (Design & UI)
    const inactiveLabelNode = findNode(tree, (n) => extractAllStrings(n).includes('Design & UI') && n.type === 'Text');
    const inactiveLabelStyle = flattenStyle(inactiveLabelNode.props.style);
    assert.equal(inactiveLabelStyle.color, stitchExports.stitchColors.ink, 'Inactive label color must be Deep Slate ink (#0F172A)');
    assert.equal(inactiveLabelStyle.fontWeight, '600', 'Inactive label fontWeight must be 600');
    assert.equal(inactiveLabelNode.props.numberOfLines, 2, 'Label must support numberOfLines=2 for multi-line safety');
  });

  test('TC 3.9: Header "Voir tout" button rendered with ChevronRight icon when onSeeAllPress provided', () => {
    let seeAllClicked = false;
    resetHooks();
    const tree = CategoryGrid({
      categories: mockCategories,
      onSelectCategory: () => {},
      onSeeAllPress: () => { seeAllClicked = true; },
      seeAllLabel: 'Explorer tout',
    });
    const text = extractAllStrings(tree);
    assert.ok(text.includes('Explorer tout'), 'Custom seeAllLabel must be rendered');

    const chevron = findNode(tree, (n) => n.type === 'Lucide.ChevronRight');
    assert.ok(chevron, 'ChevronRight icon must be rendered next to "Voir tout"');
    assert.equal(chevron.props.color, stitchExports.stitchColors.sienna, 'ChevronRight icon color must be sienna');

    const pressableSeeAll = findNode(tree, (n) => n.props && typeof n.props.onPress === 'function' && extractAllStrings(n).includes('Explorer tout'));
    assert.ok(pressableSeeAll, 'See all Pressable must be present');
    pressableSeeAll.props.onPress();
    assert.equal(seeAllClicked, true, 'onSeeAllPress callback must be triggered');
  });

  test('TC 3.10: Item press callback invokes onSelectCategory with correct category id', () => {
    let selectedId = null;
    resetHooks();
    const tree = CategoryGrid({
      categories: mockCategories,
      onSelectCategory: (id) => { selectedId = id; },
    });
    const financeItem = findNode(tree, (n) => n.props && typeof n.props.onPress === 'function' && extractAllStrings(n).includes('Finance & Audit'));
    assert.ok(financeItem, 'Finance item Pressable must exist');
    financeItem.props.onPress();
    assert.equal(selectedId, 'finance', 'onSelectCategory must receive category id "finance"');
  });

  test('TC 3.11: Boundary stress test: Empty categories list rendered cleanly without error', () => {
    resetHooks();
    const tree = CategoryGrid({
      categories: [],
      onSelectCategory: () => {},
    });
    assert.ok(tree, 'CategoryGrid must render with empty array');
    const text = extractAllStrings(tree);
    assert.ok(text.includes('Filières Populaires'), 'Header must still render cleanly');
  });
});

// ==============================================================================
// SUITE 4: Foundation Component Aliases & Style Conformance
// ==============================================================================
describe('Foundation Component Aliases & Style Conformance', () => {
  const {
    Card,
    GlassCard,
    GlassPanel,
    Pill,
    GlassPill,
    EditorialInput,
    GlassInput,
    GradientButton,
    PrimaryButton,
    SiennaButton,
    SecondaryButton,
    IconButton,
    TrustBadgeStrip,
  } = gcExports;

  test('TC 4.1: Card aliases backward-compatibility (GlassCard === Card, GlassPanel === Card)', () => {
    assert.equal(GlassCard, Card, 'GlassCard must strictly equal Card');
    assert.equal(GlassPanel, Card, 'GlassPanel must strictly equal Card');
  });

  test('TC 4.2: Card styling and tone presets (surface white, paperDeep ink, siennaBg)', () => {
    // Default paper tone -> clean white surface
    resetHooks();
    const cardDefault = Card({ children: 'Content' });
    const defaultStyle = flattenStyle(cardDefault.props.style);
    assert.equal(defaultStyle.backgroundColor, stitchExports.stitchColors.surface, 'Default card background must be Clean White #FFFFFF');
    assert.equal(defaultStyle.borderRadius, stitchExports.stitchRadius.lg, 'Card borderRadius must be lg (20px)');
    assert.equal(defaultStyle.borderColor, stitchExports.stitchColors.paperSoft, 'Card borderColor must be Slate 100 paperSoft');

    // Ink tone -> paperDeep
    resetHooks();
    const cardInk = Card({ tone: 'ink', children: 'Ink' });
    const inkStyle = flattenStyle(cardInk.props.style);
    assert.equal(inkStyle.backgroundColor, stitchExports.stitchColors.paperDeep, 'Ink tone background must be paperDeep');

    // Sienna tone -> siennaBg (soft purple container)
    resetHooks();
    const cardSienna = Card({ tone: 'sienna', children: 'Sienna' });
    const siennaStyle = flattenStyle(cardSienna.props.style);
    assert.equal(siennaStyle.backgroundColor, stitchExports.stitchColors.siennaBg, 'Sienna tone background must be siennaBg');
  });

  test('TC 4.3: Pill alias backward-compatibility (GlassPill === Pill)', () => {
    assert.equal(GlassPill, Pill, 'GlassPill must strictly equal Pill');
  });

  test('TC 4.4: Pill active state (solid Royal Violet #7C3AED) vs inactive state', () => {
    // Active Pill
    resetHooks();
    const pillActive = Pill({ label: 'Stage Pro', active: true });
    const activeStyle = flattenStyle(pillActive.props.style);
    assert.equal(activeStyle.backgroundColor, stitchExports.stitchColors.sienna, 'Active pill background must be sienna (#7C3AED)');
    assert.equal(activeStyle.borderRadius, stitchExports.stitchRadius.full, 'Active pill borderRadius must be full (9999)');
    assert.ok(extractAllStrings(pillActive).includes('Stage Pro'), 'Pill must render label');

    // Inactive Pill
    resetHooks();
    const pillInactive = Pill({ label: 'Tous', active: false });
    const inactiveStyle = flattenStyle(pillInactive.props.style);
    assert.equal(inactiveStyle.backgroundColor, stitchExports.stitchColors.paperDeep, 'Inactive pill background must be paperDeep');

    // Pressable wrapper when onPress provided
    let pillPressed = false;
    resetHooks();
    const pillPressable = Pill({ label: 'Cliquable', onPress: () => { pillPressed = true; } });
    assert.equal(pillPressable.type, 'Pressable', 'Pill with onPress must wrap in Pressable');
    pillPressable.props.onPress();
    assert.equal(pillPressed, true, 'Pill onPress must be triggered');
  });

  test('TC 4.5: EditorialInput alias backward-compatibility (GlassInput === EditorialInput)', () => {
    assert.equal(GlassInput, EditorialInput, 'GlassInput must strictly equal EditorialInput');
  });

  test('TC 4.6: EditorialInput styling, labels, and password visibility toggle', () => {
    let toggled = false;
    resetHooks();
    const inputTree = EditorialInput({
      label: 'Mot de passe',
      value: 'secret123',
      onChangeText: () => {},
      showPasswordToggle: true,
      showPassword: false,
      onTogglePassword: () => { toggled = true; },
      secureTextEntry: true,
    });
    assert.ok(extractAllStrings(inputTree).includes('Mot de passe'), 'Label must be rendered');

    // Eye icon when password hidden
    const eyeIcon = findNode(inputTree, (n) => n.type === 'Lucide.Eye');
    assert.ok(eyeIcon, 'Eye icon must be rendered when showPassword=false');

    // Toggle button press
    const toggleBtn = findNode(inputTree, (n) => n.props && typeof n.props.onPress === 'function');
    assert.ok(toggleBtn, 'Password toggle button must exist');
    toggleBtn.props.onPress();
    assert.equal(toggled, true, 'onTogglePassword callback must be called');
  });

  test('TC 4.7: GradientButton alias backward-compatibility (PrimaryButton === GradientButton)', () => {
    assert.equal(PrimaryButton, GradientButton, 'PrimaryButton must strictly equal GradientButton');
  });

  test('TC 4.8: GradientButton Royal Violet gradient, white bold text and loading state', () => {
    let btnPressed = false;
    // Normal button
    resetHooks();
    const btn = GradientButton({
      label: 'Postuler en 1 Clic',
      onPress: () => { btnPressed = true; },
    });
    assert.equal(btn.type, 'Pressable', 'GradientButton root must be Pressable');
    btn.props.onPress();
    assert.equal(btnPressed, true, 'Button onPress must be called');

    const grad = findNode(btn, (n) => n.type === 'LinearGradient');
    assert.ok(grad, 'LinearGradient must be rendered inside button');
    assert.deepEqual(grad.props.colors, ['#7C3AED', '#8B5CF6'], 'Gradient colors must be Royal Violet to Electric Violet');

    // Loading state
    resetHooks();
    const loadingBtn = GradientButton({
      label: 'Postuler',
      onPress: () => {},
      loading: true,
    });
    assert.ok(extractAllStrings(loadingBtn).includes('Patiente…'), 'Loading button must display "Patiente…"');
    assert.equal(loadingBtn.props.disabled, true, 'Loading button must be disabled');
  });

  test('TC 4.9: SiennaButton solid Royal Violet CTA and SecondaryButton clean slate surface', () => {
    // SiennaButton
    resetHooks();
    const sienna = SiennaButton({ label: 'Valider', onPress: () => {} });
    const siennaStyle = flattenStyle(sienna.props.style);
    assert.equal(siennaStyle.backgroundColor, stitchExports.stitchColors.sienna, 'SiennaButton background must be sienna (#7C3AED)');

    // SecondaryButton
    resetHooks();
    const sec = SecondaryButton({ label: 'Annuler', onPress: () => {} });
    const secStyle = flattenStyle(sec.props.style);
    assert.equal(secStyle.backgroundColor, stitchExports.stitchColors.paperSoft, 'SecondaryButton background must be paperSoft Slate 100');
  });

  test('TC 4.10: IconButton export and TrustBadgeStrip 4 badges verification', () => {
    let iconPressed = false;
    resetHooks();
    const iconBtn = IconButton({
      onPress: () => { iconPressed = true; },
      icon: { type: 'Lucide.Heart' },
      size: 40,
    });
    assert.equal(iconBtn.type, 'Pressable', 'IconButton must be Pressable');
    const iconStyle = flattenStyle(iconBtn.props.style);
    assert.equal(iconStyle.width, 40, 'IconButton width must match prop size');
    assert.equal(iconStyle.height, 40, 'IconButton height must match prop size');
    assert.equal(iconStyle.borderRadius, 20, 'IconButton borderRadius must be size / 2');

    // TrustBadgeStrip
    resetHooks();
    const trustStrip = TrustBadgeStrip({});
    const trustText = extractAllStrings(trustStrip);
    assert.ok(trustText.includes('Entreprises'), 'Badge 1: Entreprises Vérifiées');
    assert.ok(trustText.includes('Indemnités'), 'Badge 2: Indemnités Claires');
    assert.ok(trustText.includes('Postulation'), 'Badge 3: Postulation IA 1-Clic');
    assert.ok(trustText.includes('Suivi Direct'), 'Badge 4: Suivi Direct J+7');
  });
});

// ==============================================================================
// SUITE 5: AppShell.tsx AST Integration & Adversarial Boundary Testing
// ==============================================================================
describe('AppShell.tsx AST Integration & Adversarial Boundary Testing', () => {
  const appShellPath = path.join(projectRoot, 'src', 'AppShell.tsx');
  assert.ok(fs.existsSync(appShellPath), `AppShell.tsx must exist at ${appShellPath}`);
  const appShellSource = fs.readFileSync(appShellPath, 'utf8');

  test('TC 5.1: AST verification of AppShell importing TopBar and BottomNav from GlassComponents', () => {
    const sf = ts.createSourceFile(appShellPath, appShellSource, ts.ScriptTarget.Latest, true);
    let importedTopBar = false;
    let importedBottomNav = false;

    function visit(node) {
      if (ts.isImportDeclaration(node)) {
        const spec = node.moduleSpecifier.text;
        if (spec.includes('GlassComponents')) {
          if (node.importClause && node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
            for (const elem of node.importClause.namedBindings.elements) {
              const name = elem.name.text;
              if (name === 'TopBar') importedTopBar = true;
              if (name === 'BottomNav') importedBottomNav = true;
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(sf);

    assert.ok(importedTopBar, 'AppShell must import TopBar from GlassComponents');
    assert.ok(importedBottomNav, 'AppShell must import BottomNav from GlassComponents');
  });

  test('TC 5.2: AST verification of TopBar JSX element in AppShell with spec props', () => {
    const sf = ts.createSourceFile(appShellPath, appShellSource, ts.ScriptTarget.Latest, true);
    let topBarFound = false;
    const propsFound = new Set();

    function visit(node) {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        if (node.tagName.getText(sf) === 'TopBar') {
          topBarFound = true;
          for (const attr of node.attributes.properties) {
            if (ts.isJsxAttribute(attr)) {
              propsFound.add(attr.name.getText(sf));
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(sf);

    assert.ok(topBarFound, 'TopBar JSX invocation must be present in AppShell');
    assert.ok(propsFound.has('locationName'), 'TopBar must receive locationName prop in AppShell');
    assert.ok(propsFound.has('onLocationPress'), 'TopBar must receive onLocationPress prop in AppShell');
    assert.ok(propsFound.has('unreadCount'), 'TopBar must receive unreadCount prop in AppShell');
    assert.ok(propsFound.has('iaCredits'), 'TopBar must receive iaCredits prop in AppShell');
    assert.ok(propsFound.has('onWalletPress'), 'TopBar must receive onWalletPress prop in AppShell');
    assert.ok(propsFound.has('onSearchPress'), 'TopBar must receive onSearchPress prop in AppShell');
  });

  test('TC 5.3: AST verification of BottomNav JSX element in AppShell with activeSection and onPress', () => {
    const sf = ts.createSourceFile(appShellPath, appShellSource, ts.ScriptTarget.Latest, true);
    let bottomNavFound = false;
    const propsFound = new Set();

    function visit(node) {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        if (node.tagName.getText(sf) === 'BottomNav') {
          bottomNavFound = true;
          for (const attr of node.attributes.properties) {
            if (ts.isJsxAttribute(attr)) {
              propsFound.add(attr.name.getText(sf));
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(sf);

    assert.ok(bottomNavFound, 'BottomNav JSX invocation must be present in AppShell');
    assert.ok(propsFound.has('activeSection'), 'BottomNav must receive activeSection prop in AppShell');
    assert.ok(propsFound.has('onPress'), 'BottomNav must receive onPress prop in AppShell');
  });

  test('TC 5.4: Stress test: Unread count extreme boundaries (0, 9, 99999)', () => {
    const { TopBar } = gcExports;
    resetHooks();
    const tree0 = TopBar({ hasUnread: true, unreadCount: 0 });
    assert.ok(!extractAllStrings(tree0).includes('0'), 'unreadCount=0 should show dot not number 0');

    resetHooks();
    const tree9 = TopBar({ hasUnread: true, unreadCount: 9 });
    assert.ok(extractAllStrings(tree9).includes('9'), 'unreadCount=9 shows "9"');

    resetHooks();
    const treeLarge = TopBar({ hasUnread: true, unreadCount: 99999 });
    assert.ok(extractAllStrings(treeLarge).includes('9+'), 'unreadCount=99999 caps at "9+"');
  });

  test('TC 5.5: Stress test: CategoryGrid with 100 dynamic categories handles rendering without memory leak or crash', () => {
    const { CategoryGrid } = gcExports;
    const hugeCategories = Array.from({ length: 100 }, (_, i) => ({
      id: `cat_${i}`,
      label: `Filière ${i}`,
      icon: () => ({ type: 'Lucide.Star' }),
      color: '#7C3AED',
      bg: '#F5F3FF',
    }));

    resetHooks();
    const tree = CategoryGrid({
      categories: hugeCategories,
      activeId: 'cat_50',
      onSelectCategory: () => {},
    });
    assert.ok(tree, '100 categories rendered successfully');
    const activeLabel = findNode(tree, (n) => extractAllStrings(n).includes('Filière 50'));
    assert.ok(activeLabel, 'Active category in large list found');
  });
});

// ==============================================================================
// SUMMARY AND EXIT
// ==============================================================================
const totalDuration = Date.now() - globalStartTime;
console.log(`==============================================================================`);
console.log(`🏁 RÉSUMÉ DU BANC D'ESSAI CHALLENGER M2-1`);
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
  console.log(`\n🎉 SUCCÈS : Tous les tests empiriques M2-1 ont été validés avec succès !`);
  process.exit(0);
}
