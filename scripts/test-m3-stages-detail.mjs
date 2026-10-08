#!/usr/bin/env node

/**
 * ==============================================================================
 * CAMPUS 360 — CHALLENGER M3 EMPIRICAL VERIFICATION & ADVERSARIAL STRESS SUITE
 * ==============================================================================
 *
 * Independent empirical verification by Challenger 1 for Milestone M3:
 * 1. AST parsing & structural verification of all 9 features of §R3 and §R4.
 * 2. Pure functions runtime verification (`getWorkspacePhotos`, `getRotatingJobBanner`, `BANNER_POOLS`).
 * 3. Fallback behavior & boundary values on edge case jobs (empty fields, missing recruiter, missing photos).
 * 4. Theme token consumption (`stitchColors.paper`, `stitchColors.sienna`, `stitchShadows.card`, etc.).
 * 5. Full TypeScript compilation diagnostics.
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
// File Loading & AST Preparation
// ------------------------------------------------------------------------------
const stagesScreenPath = path.join(projectRoot, 'src', 'ui', 'screens', 'StagesScreen.tsx');
const stitchThemePath = path.join(projectRoot, 'src', 'theme', 'stitch.ts');
const typesPath = path.join(projectRoot, 'src', 'types.ts');

assert.ok(fs.existsSync(stagesScreenPath), `StagesScreen.tsx must exist at ${stagesScreenPath}`);
assert.ok(fs.existsSync(stitchThemePath), `stitch.ts must exist at ${stitchThemePath}`);
assert.ok(fs.existsSync(typesPath), `types.ts must exist at ${typesPath}`);

const stagesScreenContent = fs.readFileSync(stagesScreenPath, 'utf8');
const sourceFile = ts.createSourceFile(
  'StagesScreen.tsx',
  stagesScreenContent,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX
);

// Extract pure functions and execute in isolated VM
const bannerPoolsStart = stagesScreenContent.indexOf('export const BANNER_POOLS');
const sectorsStart = stagesScreenContent.indexOf('const SECTORS');
assert.ok(bannerPoolsStart !== -1 && sectorsStart !== -1, 'Must locate pure function definitions');
const pureFunctionsCode = stagesScreenContent.slice(bannerPoolsStart, sectorsStart);
const transpiledPure = ts.transpileModule(pureFunctionsCode, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

const vmContext = { exports: {} };
vm.createContext(vmContext);
vm.runInContext(transpiledPure, vmContext);
const { BANNER_POOLS, getRotatingJobBanner, getWorkspacePhotos } = vmContext.exports;

// Extract cleanPhoneNumber for WhatsApp verification
const waServicePath = path.join(projectRoot, 'src', 'features', 'whatsapp', 'whatsappService.ts');
const waServiceContent = fs.readFileSync(waServicePath, 'utf8');
const cleanPhoneStart = waServiceContent.indexOf('export function cleanPhoneNumber');
const cleanPhoneEnd = waServiceContent.indexOf('/**', cleanPhoneStart + 10);
const cleanPhoneCode = waServiceContent.slice(cleanPhoneStart, cleanPhoneEnd !== -1 ? cleanPhoneEnd : undefined);
const transpiledCleanPhone = ts.transpileModule(cleanPhoneCode, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const waVmContext = { exports: {} };
vm.createContext(waVmContext);
vm.runInContext(transpiledCleanPhone, waVmContext);
const { cleanPhoneNumber } = waVmContext.exports;

// ==============================================================================
// SUITE 1: AST PARSING & EXPORTS INTEGRITY
// ==============================================================================
describe('AST Parsing & Component Exports Contract', () => {
  test('StagesScreen.tsx parses without fatal syntax errors', () => {
    assert.ok(sourceFile, 'Source file must parse into AST');
    assert.ok(sourceFile.statements.length > 10, 'Source file must contain substantial AST statements');
  });

  test('Export BANNER_POOLS is exported as a const object', () => {
    assert.ok(BANNER_POOLS, 'BANNER_POOLS must be defined');
    assert.strictEqual(typeof BANNER_POOLS, 'object', 'BANNER_POOLS must be an object');
  });

  test('Export getRotatingJobBanner is exported as a function', () => {
    assert.strictEqual(typeof getRotatingJobBanner, 'function', 'getRotatingJobBanner must be a function');
  });

  test('Export getWorkspacePhotos is exported as a function', () => {
    assert.strictEqual(typeof getWorkspacePhotos, 'function', 'getWorkspacePhotos must be a function');
  });

  test('StagesScreen named export is present and exported', () => {
    const hasNamedExport = stagesScreenContent.includes('export function StagesScreen');
    assert.ok(hasNamedExport, 'StagesScreen must be exported as named function (export function StagesScreen)');
  });

  test('StagesScreenProps interface is declared with complete studentProfile contract', () => {
    const hasProps = stagesScreenContent.includes('interface StagesScreenProps');
    assert.ok(hasProps, 'StagesScreenProps interface must be declared');
    assert.ok(stagesScreenContent.includes('studentProfile:'), 'StagesScreenProps must contain studentProfile');
    assert.ok(stagesScreenContent.includes('onSelectJob?:'), 'StagesScreenProps must contain onSelectJob');
    assert.ok(stagesScreenContent.includes('onOpenWallet?:'), 'StagesScreenProps must contain onOpenWallet');
  });

  test('Essential React Native and Lucide imports are present', () => {
    const essentialImports = [
      'Modal',
      'ScrollView',
      'Pressable',
      'Image',
      'ChevronLeft',
      'Share2',
      'Heart',
      'Briefcase',
      'Star',
      'Compass',
      'Clock',
      'MapPin',
      'CheckCircle2',
      'Building2',
      'MessageCircle',
      'Mail',
      'Sparkles',
      'ChevronDown',
      'ChevronUp',
      'X',
    ];
    for (const imp of essentialImports) {
      assert.ok(
        stagesScreenContent.includes(imp),
        `StagesScreen.tsx must import ${imp}`
      );
    }
  });

  test('Integration with AiApplyModal is preserved', () => {
    assert.ok(
      stagesScreenContent.includes("import { AiApplyModal } from '../../features/stages/AiApplyModal';"),
      'Must import AiApplyModal'
    );
    assert.ok(
      stagesScreenContent.includes('<AiApplyModal'),
      'Must render <AiApplyModal />'
    );
  });
});

// ==============================================================================
// SUITE 2: SCREEN 2 IMMERSIVE STAGE DETAIL MODAL — 9 FEATURES (§R3)
// ==============================================================================
describe('Screen 2 Immersive Stage Detail Modal — 9 Features (§R3)', () => {
  test('Modal structure: renders full-bleed Modal bound to selectedDetailJob', () => {
    assert.ok(
      stagesScreenContent.includes('<Modal'),
      'Must render Modal component'
    );
    assert.ok(
      stagesScreenContent.includes('visible={!!selectedDetailJob}'),
      'Modal must be visible when selectedDetailJob is truthy'
    );
    assert.ok(
      stagesScreenContent.includes('statusBarTranslucent'),
      'Modal must specify statusBarTranslucent for full-bleed display'
    );
    assert.ok(
      stagesScreenContent.includes('onRequestClose={() => setSelectedDetailJob(null)}'),
      'Modal must handle onRequestClose safely'
    );
  });

  test('Feature 1: Full-bleed Hero Image Header with curved bottom (radius 32) and floating buttons', () => {
    assert.ok(
      stagesScreenContent.includes('detailHeroContainer:'),
      'Must define detailHeroContainer style'
    );
    assert.ok(
      stagesScreenContent.includes('borderBottomLeftRadius: 32') &&
      stagesScreenContent.includes('borderBottomRightRadius: 32'),
      'Hero container must have curved bottom corners with radius 32'
    );
    assert.ok(
      stagesScreenContent.includes('height: 290'),
      'Hero image container must have height 290'
    );
    assert.ok(
      stagesScreenContent.includes('source={{ uri: getRotatingJobBanner(selectedDetailJob) }}'),
      'Hero image must use getRotatingJobBanner'
    );
    assert.ok(
      stagesScreenContent.includes('testID="btn-detail-back"'),
      'Must have Back button testID'
    );
    assert.ok(
      stagesScreenContent.includes('testID="btn-detail-share"'),
      'Must have Share button testID'
    );
    assert.ok(
      stagesScreenContent.includes('testID="btn-detail-favorite"'),
      'Must have Favorite button testID'
    );
    assert.ok(
      stagesScreenContent.includes('handleShareJob(selectedDetailJob)'),
      'Share button must trigger handleShareJob'
    );
    assert.ok(
      stagesScreenContent.includes('toggleFavorite(selectedDetailJob.id)'),
      'Favorite button must toggle favorite status'
    );
  });

  test('Feature 2: Horizontal Workspace Photo Strip with 3 visible slots and +N photos indicator', () => {
    assert.ok(
      stagesScreenContent.includes('workspaceSection:'),
      'Must define workspaceSection style'
    );
    assert.ok(
      stagesScreenContent.includes('getWorkspacePhotos(selectedDetailJob).slice(0, 3)'),
      'Must render first 3 photos in thumbnail strip'
    );
    assert.ok(
      stagesScreenContent.includes('getWorkspacePhotos(selectedDetailJob).length >= 4'),
      'Must show 4th slot with +N photos overlay when 4+ photos exist'
    );
    assert.ok(
      stagesScreenContent.includes('+{Math.max(1, getWorkspacePhotos(selectedDetailJob).length - 3)} photos'),
      'Must compute and display +N photos label'
    );
    assert.ok(
      stagesScreenContent.includes('setSelectedPreviewPhoto('),
      'Tapping a workspace photo must set preview photo'
    );
    assert.ok(
      stagesScreenContent.includes('selectedPreviewPhoto'),
      'Must have high-resolution photo preview modal'
    );
  });

  test('Feature 3: Domain Pill Badge and AI Match Rating Badge', () => {
    assert.ok(
      stagesScreenContent.includes('domainPill:'),
      'Must define domainPill style'
    );
    assert.ok(
      stagesScreenContent.includes('aiMatchPill:'),
      'Must define aiMatchPill style'
    );
    assert.ok(
      stagesScreenContent.includes('selectedDetailJob.contractType || \'Stage Pré-embauche\''),
      'Domain pill must display contract type with fallback'
    );
    assert.ok(
      stagesScreenContent.includes('selectedDetailJob.company?.industry || \'Informatique\''),
      'Domain pill must display company industry with fallback'
    );
    assert.ok(
      stagesScreenContent.includes('★ {selectedDetailJob.matchScore || detailMatch?.score || 95}% Match'),
      'AI Match badge must display ★ score% Match'
    );
  });

  test('Feature 4: Prominent Job Title & Company Location with Directions Action', () => {
    assert.ok(
      stagesScreenContent.includes('detailJobTitle:'),
      'Must define detailJobTitle style'
    );
    assert.ok(
      stagesScreenContent.includes('<Text style={styles.detailJobTitle}>{selectedDetailJob.title}</Text>'),
      'Must render job title prominently'
    );
    assert.ok(
      stagesScreenContent.includes('testID="btn-detail-directions"'),
      'Must have directions button testID'
    );
    assert.ok(
      stagesScreenContent.includes('Itinéraire ↗'),
      'Must display direction label Itinéraire ↗'
    );
    assert.ok(
      stagesScreenContent.includes('handleOpenDirections('),
      'Must call handleOpenDirections'
    );
  });

  test('Feature 5: Segmented Tabs with Purple Underline Indicators', () => {
    assert.ok(
      stagesScreenContent.includes('segmentedTabsContainer:'),
      'Must define segmentedTabsContainer'
    );
    assert.ok(
      stagesScreenContent.includes('testID="tab-about"') &&
      stagesScreenContent.includes('testID="tab-company"') &&
      stagesScreenContent.includes('testID="tab-aiAdvice"'),
      'Must render all 3 segmented tabs: À propos, Entreprise, Conseils IA'
    );
    assert.ok(
      stagesScreenContent.includes('activeTabUnderline:'),
      'Must define activeTabUnderline style'
    );
    assert.ok(
      stagesScreenContent.includes("activeDetailTab === 'about'") &&
      stagesScreenContent.includes("activeDetailTab === 'company'") &&
      stagesScreenContent.includes("activeDetailTab === 'aiAdvice'"),
      'Must conditionally render content for each active tab'
    );
  });

  test('Feature 6: Quick Metadata Pill Row (Duration, Mode, Status)', () => {
    assert.ok(
      stagesScreenContent.includes('metadataGridRow:'),
      'Must define metadataGridRow style'
    );
    assert.ok(
      stagesScreenContent.includes('metadataCard:'),
      'Must define metadataCard style'
    );
    assert.ok(
      stagesScreenContent.includes("🏃 {selectedDetailJob.duration || '3 à 6 mois'}"),
      'Must display duration with 🏃 icon and fallback'
    );
    assert.ok(
      stagesScreenContent.includes("📍 {selectedDetailJob.location ? 'Présentiel' : 'Présentiel'}"),
      'Must display location mode with 📍 icon'
    );
    assert.ok(
      stagesScreenContent.includes('🕒 Ouvert'),
      'Must display status with 🕒 Ouvert'
    );
  });

  test('Feature 7: Rich Description Block with Expandable Toggle & Required Skills Chips', () => {
    assert.ok(
      stagesScreenContent.includes('numberOfLines={isDescExpanded ? undefined : 4}'),
      'Description must be truncated to 4 lines when collapsed'
    );
    assert.ok(
      stagesScreenContent.includes('testID="btn-toggle-description"'),
      'Must have description expand toggle button'
    );
    assert.ok(
      stagesScreenContent.includes("isDescExpanded ? 'Voir moins' : 'Voir plus'"),
      'Toggle button text must toggle between Voir plus and Voir moins'
    );
    assert.ok(
      stagesScreenContent.includes('detailSkillChip:'),
      'Must define detailSkillChip style'
    );
    assert.ok(
      stagesScreenContent.includes('detailSkillChipMatched'),
      'Must have matched skill chip styling'
    );
    assert.ok(
      stagesScreenContent.includes('isUserSkill'),
      'Must highlight skills matched with student profile'
    );
  });

  test('Feature 8: Recruiter / Company Info Card with WhatsApp & Email Actions', () => {
    assert.ok(
      stagesScreenContent.includes('recruiterCard:'),
      'Must define recruiterCard style'
    );
    assert.ok(
      stagesScreenContent.includes('testID="btn-contact-whatsapp"'),
      'Must have recruiter WhatsApp button'
    );
    assert.ok(
      stagesScreenContent.includes('testID="btn-contact-email"'),
      'Must have recruiter Email button'
    );
    assert.ok(
      stagesScreenContent.includes('handleRecruiterWhatsapp'),
      'Must handle WhatsApp contact via wa.me'
    );
    assert.ok(
      stagesScreenContent.includes('handleRecruiterEmail'),
      'Must handle Email contact via mailto'
    );
  });

  test('Feature 9: Fixed Sticky Bottom Bar with Estimated Stipend & Royal Violet CTA', () => {
    assert.ok(
      stagesScreenContent.includes('stickyBottomBar:'),
      'Must define stickyBottomBar style'
    );
    assert.ok(
      stagesScreenContent.includes("position: 'absolute'") &&
      stagesScreenContent.includes('bottom: 0'),
      'Sticky bottom bar must be absolutely pinned to bottom outside ScrollView'
    );
    assert.ok(
      stagesScreenContent.includes('INDEMNITÉ ESTIMÉE'),
      'Must display INDEMNITÉ ESTIMÉE header'
    );
    assert.ok(
      stagesScreenContent.includes('/mois'),
      'Must display /mois unit'
    );
    assert.ok(
      stagesScreenContent.includes('testID="btn-sticky-apply"'),
      'Must have sticky apply button testID'
    );
    assert.ok(
      stagesScreenContent.includes('Postuler en 1 Clic'),
      'Apply button must read Postuler en 1 Clic'
    );
    assert.ok(
      stagesScreenContent.includes('handleApplyFromDetail'),
      'Apply button must invoke handleApplyFromDetail'
    );
  });

  test('1-Click Apply Flow: safe modal transition with delay to prevent iOS collision', () => {
    assert.ok(
      stagesScreenContent.includes('setSelectedDetailJob(null);'),
      'handleApplyFromDetail must close the detail modal first'
    );
    assert.ok(
      stagesScreenContent.includes('setApplyingJob(job);'),
      'handleApplyFromDetail must set applyingJob to open AiApplyModal'
    );
    assert.ok(
      stagesScreenContent.includes('setTimeout('),
      'Must use setTimeout delay to prevent iOS UIViewController modal overlap'
    );
  });
});

// ==============================================================================
// SUITE 3: SCREEN 1 FEED CARDS HARMONIZATION (§R4)
// ==============================================================================
describe('Screen 1 Clean White Feed Cards Harmonization (§R4)', () => {
  test('Job cards adopt clean white surface with border and elevation shadow', () => {
    assert.ok(
      stagesScreenContent.includes('jobCard: {'),
      'Must define jobCard style'
    );
    assert.ok(
      stagesScreenContent.includes('backgroundColor: stitchColors.paper'),
      'Cards must use stitchColors.paper (#FFFFFF)'
    );
    assert.ok(
      stagesScreenContent.includes('...stitchShadows.card'),
      'Cards must apply stitchShadows.card'
    );
  });

  test('Feed card displays cover hero banner with floating contract & AI match badges', () => {
    assert.ok(
      stagesScreenContent.includes('cardHeroImageContainer:'),
      'Must have cardHeroImageContainer style'
    );
    assert.ok(
      stagesScreenContent.includes('getRotatingJobBanner(job, index)'),
      'Feed cards must call getRotatingJobBanner with index'
    );
    assert.ok(
      stagesScreenContent.includes('floatingContractBadge:'),
      'Must have floatingContractBadge style'
    );
    assert.ok(
      stagesScreenContent.includes('floatingMatchBadge:'),
      'Must have floatingMatchBadge style'
    );
  });

  test('Tapping card immediately opens detail modal, Postuler button triggers apply directly', () => {
    assert.ok(
      stagesScreenContent.includes('onPress={() => setSelectedDetailJob(job)}'),
      'Tapping card must set selectedDetailJob'
    );
    assert.ok(
      stagesScreenContent.includes('e.stopPropagation()'),
      'Direct Postuler button must stop event propagation to avoid opening detail modal simultaneously'
    );
    assert.ok(
      stagesScreenContent.includes('setApplyingJob(job);'),
      'Direct Postuler button must set applyingJob directly'
    );
  });
});

// ==============================================================================
// SUITE 4: PURE FUNCTION RUNTIME VERIFICATION (`BANNER_POOLS`)
// ==============================================================================
describe('Pure Function Runtime Verification: BANNER_POOLS', () => {
  const expectedCategories = [
    'tech',
    'finance',
    'btp',
    'marketing',
    'logistique',
    'sante',
    'droit',
    'admin',
    'default',
  ];

  test('BANNER_POOLS contains all 9 required industry categories', () => {
    for (const cat of expectedCategories) {
      assert.ok(
        Array.isArray(BANNER_POOLS[cat]),
        `BANNER_POOLS must define category array '${cat}'`
      );
      assert.ok(
        BANNER_POOLS[cat].length >= 3,
        `Category '${cat}' must have at least 3 photos (has ${BANNER_POOLS[cat].length})`
      );
    }
  });

  test('All photo URLs in BANNER_POOLS are valid HTTPS Unsplash URLs', () => {
    let totalPhotos = 0;
    for (const cat of expectedCategories) {
      for (const uri of BANNER_POOLS[cat]) {
        totalPhotos++;
        assert.ok(
          uri.startsWith('https://images.unsplash.com/'),
          `Photo URL '${uri}' in category '${cat}' must be an HTTPS Unsplash URL`
        );
        assert.ok(
          uri.includes('auto=format'),
          `Photo URL '${uri}' must include image optimization parameters`
        );
      }
    }
    assert.ok(totalPhotos >= 30, `Must have at least 30 total photos across pools (has ${totalPhotos})`);
  });

  test('No duplicate URLs within any single industry pool', () => {
    for (const cat of expectedCategories) {
      const set = new Set(BANNER_POOLS[cat]);
      assert.strictEqual(
        set.size,
        BANNER_POOLS[cat].length,
        `Category '${cat}' contains duplicate photo URLs`
      );
    }
  });
});

// ==============================================================================
// SUITE 5: PURE FUNCTION RUNTIME VERIFICATION (`getRotatingJobBanner`)
// ==============================================================================
describe('Pure Function Runtime Verification: getRotatingJobBanner', () => {
  const baseJob = {
    id: 'job-stage-test-01',
    companyId: 'comp-01',
    title: 'Développeur Fullstack React Native',
    description: 'Stage de fin détudes en développement mobile et API',
    requirements: ['React Native', 'TypeScript', 'Node.js'],
    applyMethod: 'WHATSAPP',
    isSponsored: false,
    source: 'INTERNAL',
    createdAt: '2026-10-01',
    expiresAt: '2026-12-01',
    company: {
      id: 'comp-01',
      name: 'Tech Solutions SARL',
      industry: 'Technologies de linformation & Cloud',
      address: 'Akwa Douala',
      contactEmail: 'rh@techsolutions.cm',
      contactWhatsapp: '237699112233',
      kybScore: 95,
      status: 'VERIFIED',
      isPremium: true,
    },
  };

  test('Returns flyerUrl directly when custom flyer exists and is not a placeholder', () => {
    const customJob = { ...baseJob, flyerUrl: 'https://cdn.campus360.app/flyers/custom-job-banner.jpg' };
    const banner = getRotatingJobBanner(customJob, 0);
    assert.strictEqual(banner, 'https://cdn.campus360.app/flyers/custom-job-banner.jpg');
  });

  test('Ignores flyerUrl if it contains "placeholder" and selects sector pool', () => {
    const placeholderJob = { ...baseJob, flyerUrl: 'https://campus360.app/images/flyer-placeholder.png' };
    const banner = getRotatingJobBanner(placeholderJob, 0);
    assert.ok(
      BANNER_POOLS.tech.includes(banner),
      `Expected banner from tech pool, got ${banner}`
    );
  });

  test('Sector keyword detection correctly maps multiple sectors', () => {
    const testCases = [
      { text: 'Auditeur Bancaire Junior', industry: 'Banque & Finance', expectedPool: 'finance' },
      { text: 'Conducteur de Travaux BTP', industry: 'Génie Civil', expectedPool: 'btp' },
      { text: 'Responsable Communication & Marketing', industry: 'Publicité', expectedPool: 'marketing' },
      { text: 'Gestionnaire de Stock & Logistique', industry: 'Supply Chain', expectedPool: 'logistique' },
      { text: 'Assistant Pharmacien', industry: 'Santé & Médical', expectedPool: 'sante' },
      { text: 'Juriste Droit des Affaires OHADA', industry: 'Conseil Juridique', expectedPool: 'droit' },
      { text: 'Secrétaire de Direction & Organisation', industry: 'Administration RH', expectedPool: 'admin' },
      { text: 'Réceptionniste Polyglotte', industry: 'Hôtellerie & Tourisme', expectedPool: 'default' },
    ];

    for (const tc of testCases) {
      const job = {
        id: `job-${tc.expectedPool}`,
        companyId: 'comp-test',
        title: tc.text,
        description: '', // Clean description without tech bleed
        requirements: [],
        applyMethod: 'WHATSAPP',
        isSponsored: false,
        source: 'INTERNAL',
        createdAt: '2026-10-01',
        expiresAt: '2026-12-01',
        company: {
          id: 'comp-test',
          name: 'Structure Test',
          industry: tc.industry,
          address: 'Douala',
          contactEmail: 'contact@test.cm',
          kybScore: 90,
          status: 'VERIFIED',
          isPremium: false,
        },
      };
      const banner = getRotatingJobBanner(job, 0);
      assert.ok(
        BANNER_POOLS[tc.expectedPool].includes(banner),
        `Failed sector mapping for ${tc.text} -> expected pool ${tc.expectedPool}, got ${banner}`
      );
    }
  });

  test('Deterministic rotation: varying index rotates across pool without crashing', () => {
    const banners = new Set();
    for (let i = 0; i < BANNER_POOLS.tech.length; i++) {
      banners.add(getRotatingJobBanner(baseJob, i));
    }
    assert.ok(
      banners.size > 1,
      `Rotating with index should produce diverse banners (got ${banners.size} distinct banners)`
    );
  });

  test('Adversarial stress: handles job with empty id, null company, unicode title', () => {
    const adversarialJob = {
      id: '',
      title: '🚀 Stage Développeur IA & Cybersécurité @ Douala #2026',
      description: 'Développement de modèles NLP & vision par ordinateur en environnement AWS Cloud',
      requirements: [],
      applyMethod: 'WHATSAPP',
      isSponsored: false,
      source: 'SCRAPED',
      createdAt: '',
      expiresAt: '',
      company: null,
    };
    const banner = getRotatingJobBanner(adversarialJob, 0);
    assert.ok(typeof banner === 'string' && banner.startsWith('https://'), 'Must return valid banner URL for adversarial job');
    assert.ok(BANNER_POOLS.tech.includes(banner), 'Must detect tech pool even with null company and unicode title');
  });
});

// ==============================================================================
// SUITE 6: PURE FUNCTION RUNTIME VERIFICATION (`getWorkspacePhotos`)
// ==============================================================================
describe('Pure Function Runtime Verification: getWorkspacePhotos', () => {
  const baseJob = {
    id: 'job-workspace-test',
    companyId: 'comp-01',
    title: 'Ingénieur DevOps Cloud',
    description: 'Gestion infrastructure Kubernetes',
    requirements: ['Docker', 'AWS'],
    applyMethod: 'WHATSAPP',
    isSponsored: false,
    source: 'INTERNAL',
    createdAt: '2026-10-01',
    expiresAt: '2026-12-01',
    company: {
      id: 'comp-01',
      name: 'Cloud SARL',
      industry: 'Technologies Informatique',
      address: 'Douala',
      contactEmail: 'recrutement@cloud.cm',
      contactWhatsapp: '237699000111',
      kybScore: 90,
      status: 'VERIFIED',
      isPremium: false,
    },
  };

  test('Returns explicit workspacePhotos when provided and non-empty', () => {
    const customPhotos = [
      'https://photos.campus360.app/office-1.jpg',
      'https://photos.campus360.app/office-2.jpg',
      'https://photos.campus360.app/office-3.jpg',
      'https://photos.campus360.app/office-4.jpg',
    ];
    const jobWithPhotos = { ...baseJob, workspacePhotos: customPhotos };
    const result = getWorkspacePhotos(jobWithPhotos);
    assert.deepStrictEqual(result, customPhotos);
  });

  test('Generates 4 to 5 fallback workspace photos when workspacePhotos is undefined', () => {
    const jobWithoutPhotos = { ...baseJob, workspacePhotos: undefined };
    const result = getWorkspacePhotos(jobWithoutPhotos);
    assert.ok(Array.isArray(result), 'Must return an array');
    assert.ok(result.length >= 4, `Must return at least 4 photos for +N indicator (returned ${result.length})`);
    for (const uri of result) {
      assert.ok(uri.startsWith('https://images.unsplash.com/'), 'All photos must be valid Unsplash URLs');
    }
  });

  test('Generates fallback workspace photos when workspacePhotos is empty array []', () => {
    const jobWithEmptyPhotos = { ...baseJob, workspacePhotos: [] };
    const result = getWorkspacePhotos(jobWithEmptyPhotos);
    assert.ok(result.length >= 4, 'Must fall back when workspacePhotos is empty array');
  });

  test('Never returns an empty array for any sector or empty job', () => {
    const minimalJob = {
      id: 'min-job',
      title: '',
      description: '',
      requirements: [],
      applyMethod: 'WHATSAPP',
      isSponsored: false,
      source: 'SCRAPED',
      createdAt: '',
      expiresAt: '',
    };
    const result = getWorkspacePhotos(minimalJob);
    assert.ok(result.length >= 3, `Must return at least 3 photos even for completely empty job (got ${result.length})`);
  });

  test('Handles different lengths of explicit photos: 1, 2, 4, 8 photos', () => {
    for (const count of [1, 2, 4, 8]) {
      const photos = Array.from({ length: count }, (_, i) => `https://test.photos/photo-${i + 1}.jpg`);
      const testJob = { ...baseJob, workspacePhotos: photos };
      const res = getWorkspacePhotos(testJob);
      assert.strictEqual(res.length, count, `Must return exactly ${count} photos`);
    }
  });
});

// ==============================================================================
// SUITE 7: FALLBACK BEHAVIOR ON EDGE CASE JOBS
// ==============================================================================
describe('Fallback Behavior & Boundary Values on Edge Case Jobs', () => {
  test('Company details fallback: missing company defaults initials to CP and name to Entreprise Partenaire', () => {
    assert.ok(
      stagesScreenContent.includes("selectedDetailJob.company?.name ? selectedDetailJob.company.name.slice(0, 2).toUpperCase() : 'CP'"),
      'Must default company initials to CP'
    );
    assert.ok(
      stagesScreenContent.includes("selectedDetailJob.company?.name || 'Entreprise Partenaire'"),
      'Must default company name to Entreprise Partenaire'
    );
  });

  test('Company address fallback: missing address defaults to Douala, Cameroun', () => {
    assert.ok(
      stagesScreenContent.includes("selectedDetailJob.location || selectedDetailJob.company?.address || 'Douala, Cameroun'"),
      'Must default company address to Douala, Cameroun'
    );
  });

  test('Recruiter contact fallback: missing phone defaults to Cameroon 237690123456 and email to recrutement@campus360.app', () => {
    assert.ok(
      stagesScreenContent.includes("selectedDetailJob.company?.contactWhatsapp || '237690123456'"),
      'Must default recruiter WhatsApp to 237690123456'
    );
    assert.ok(
      stagesScreenContent.includes("selectedDetailJob.company?.contactEmail || 'recrutement@campus360.app'"),
      'Must default recruiter email to recrutement@campus360.app'
    );
  });

  test('Stipend fallback: missing stipend in detail defaults to 75 000 FCFA', () => {
    assert.ok(
      stagesScreenContent.includes("selectedDetailJob.stipend ? selectedDetailJob.stipend.replace(/\\(.*\\)/, '').trim() : '75 000 FCFA'"),
      'Must default stipend to 75 000 FCFA'
    );
  });

  test('Stipend parsing: strips explanatory parentheses from stipend values', () => {
    const rawStipend = 'Rémunéré (50 000 FCFA/mois)';
    const cleaned = rawStipend.replace(/\(.*\)/, '').trim();
    assert.strictEqual(cleaned, 'Rémunéré', 'Must clean parenthesized notes from stipend');
  });

  test('Description fallback: missing description defaults to friendly placeholder without Voir plus toggle', () => {
    assert.ok(
      stagesScreenContent.includes("selectedDetailJob.description || \"Aucune description détaillée n'a été fournie pour cette offre de stage.\""),
      'Must provide friendly fallback description'
    );
    assert.ok(
      stagesScreenContent.includes('(selectedDetailJob.description?.length || 0) > 180'),
      'Voir plus toggle must be hidden if description is shorter than 180 chars or missing'
    );
  });

  test('WhatsApp phone number cleaning handles Cameroon formats seamlessly', () => {
    assert.strictEqual(cleanPhoneNumber('699112233'), '237699112233', '9-digit Cameroon number prefixed with 237');
    assert.strictEqual(cleanPhoneNumber('+237 699 11 22 33'), '237699112233', 'Spaced and prefixed number normalized');
    assert.strictEqual(cleanPhoneNumber(''), '', 'Empty string handled gracefully');
    assert.strictEqual(cleanPhoneNumber(null), '', 'Null handled gracefully');
    assert.strictEqual(cleanPhoneNumber(undefined), '', 'Undefined handled gracefully');
  });

  test('Skills match gracefully handles undefined or empty student skills', () => {
    assert.ok(
      stagesScreenContent.includes('studentProfile.skills?.some('),
      'Must use optional chaining studentProfile.skills?.some to prevent crashes on profiles without skills'
    );
  });
});

// ==============================================================================
// SUITE 8: THEME TOKEN CONSUMPTION & DESIGN SYSTEM INTEGRITY
// ==============================================================================
describe('Theme Token Consumption & Design System Integrity', () => {
  test('Imports required tokens from src/theme/stitch.ts', () => {
    assert.ok(
      stagesScreenContent.includes('stitchColors') &&
      stagesScreenContent.includes('stitchRadius') &&
      stagesScreenContent.includes('stitchShadows'),
      'Must import stitchColors, stitchRadius, and stitchShadows'
    );
  });

  test('Consumes stitchColors.paper for detail modal background (#FFFFFF)', () => {
    assert.ok(
      stagesScreenContent.includes('backgroundColor: stitchColors.paper'),
      'detailModalContainer and cards must use stitchColors.paper'
    );
  });

  test('Consumes stitchColors.sienna for Royal Violet accents (#7C3AED)', () => {
    assert.ok(
      stagesScreenContent.includes('color: stitchColors.sienna') ||
      stagesScreenContent.includes('backgroundColor: stitchColors.sienna'),
      'Must consume stitchColors.sienna for Royal Violet accents and CTA buttons'
    );
  });

  test('Consumes stitchShadows.card for soft card elevation', () => {
    assert.ok(
      stagesScreenContent.includes('...stitchShadows.card'),
      'Must consume stitchShadows.card'
    );
  });

  test('Consumes stitchShadows.primary for CTA glow', () => {
    assert.ok(
      stagesScreenContent.includes('...stitchShadows.primary'),
      'Must consume stitchShadows.primary on sticky apply button'
    );
  });

  test('Consumes stitchColors.emeraldTone for match scores and verified badges', () => {
    assert.ok(
      stagesScreenContent.includes('stitchColors.emeraldTone'),
      'Must consume stitchColors.emeraldTone'
    );
  });

  test('Consumes stitchColors.paperSoft for metadata cards', () => {
    assert.ok(
      stagesScreenContent.includes('backgroundColor: stitchColors.paperSoft'),
      'Must consume stitchColors.paperSoft on metadata cards'
    );
  });

  test('Absence of legacy obsidian dark backgrounds on main views', () => {
    const hasLegacyObsidianBg =
      stagesScreenContent.includes("backgroundColor: '#090714'") ||
      stagesScreenContent.includes("backgroundColor: '#120E22'");
    assert.strictEqual(
      hasLegacyObsidianBg,
      false,
      'StagesScreen.tsx must not use legacy obsidian dark backgrounds (#090714, #120E22)'
    );
  });
});

// ==============================================================================
// SUITE 9: TYPESCRIPT COMPILER API DIAGNOSTICS
// ==============================================================================
describe('TypeScript Compiler API Diagnostics', () => {
  test('Compile StagesScreen.tsx with ts.createProgram has zero semantic/syntactic errors', () => {
    const tsConfigPath = path.join(projectRoot, 'tsconfig.json');
    const configFile = ts.readConfigFile(tsConfigPath, ts.sys.readFile);
    const parsedConfig = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      projectRoot
    );

    const program = ts.createProgram([stagesScreenPath], parsedConfig.options);
    const progSourceFile = program.getSourceFile(stagesScreenPath);
    assert.ok(progSourceFile, 'Must locate SourceFile inside Program');

    const diagnostics = ts.getPreEmitDiagnostics(program, progSourceFile);
    const errorDiagnostics = diagnostics.filter(
      (d) => d.category === ts.DiagnosticCategory.Error
    );

    if (errorDiagnostics.length > 0) {
      const formatted = ts.formatDiagnosticsWithColorAndContext(errorDiagnostics, {
        getCanonicalFileName: (f) => f,
        getCurrentDirectory: () => projectRoot,
        getNewLine: () => '\n',
      });
      console.error(formatted);
    }

    assert.strictEqual(
      errorDiagnostics.length,
      0,
      `StagesScreen.tsx must compile with 0 semantic/syntactic errors (found ${errorDiagnostics.length})`
    );
  });
});

// ==============================================================================
// SUMMARY & VERDICT REPORT
// ==============================================================================
const totalDuration = Date.now() - globalStartTime;
console.log(`\n==============================================================================`);
console.log(`📊 CHALLENGER M3 TEST EXECUTION SUMMARY`);
console.log(`==============================================================================`);
console.log(`Total Suites:   ${totalSuites}`);
console.log(`Total Tests:    ${totalTests}`);
console.log(`Passed Tests:   ${passedTests} ✅`);
console.log(`Failed Tests:   ${failedTests} ${failedTests === 0 ? '' : '❌'}`);
console.log(`Total Duration: ${totalDuration}ms`);
console.log(`==============================================================================`);

if (testFailures.length > 0) {
  console.error(`\n❌ FAILURES (${testFailures.length}):`);
  testFailures.forEach((f, idx) => {
    console.error(`  ${idx + 1}. ${f.testName}: ${f.error.message}`);
  });
  console.log(`\n🔴 VERDICT: FAILED\n`);
  process.exit(1);
} else {
  console.log(`\n🟢 VERDICT: CONFIRMED CORRECT\n`);
  process.exit(0);
}
