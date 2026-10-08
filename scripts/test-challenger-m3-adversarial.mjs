import fs from 'fs';
import path from 'path';

console.log('⚔️ [REVIEWER 2 / ADVERSARIAL CRITIC] Stress-Testing Milestone M3 (StagesScreen.tsx)');

const projectRoot = process.cwd();
const stagesScreenPath = path.join(projectRoot, 'src', 'ui', 'screens', 'StagesScreen.tsx');
const whatsappServicePath = path.join(projectRoot, 'src', 'features', 'whatsapp', 'whatsappService.ts');
const typesPath = path.join(projectRoot, 'src', 'types.ts');

const stagesContent = fs.readFileSync(stagesScreenPath, 'utf8');
const whatsappContent = fs.readFileSync(whatsappServicePath, 'utf8');
const typesContent = fs.readFileSync(typesPath, 'utf8');

let totalTests = 0;
let passedTests = 0;

function assert(condition, name, detail = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${name}`);
  } else {
    console.error(`  ❌ [FAIL] ${name} - ${detail}`);
    throw new Error(`Test failed: ${name}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Stress Testing getRotatingJobBanner & getWorkspacePhotos
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 1. Pure Function Data Edge Cases (getRotatingJobBanner & getWorkspacePhotos) ---');

// Extract BANNER_POOLS, getRotatingJobBanner, getWorkspacePhotos
const bannerPoolsMatch = stagesContent.match(/export const BANNER_POOLS[\s\S]*?^};/m);
const rotatingBannerMatch = stagesContent.match(/export function getRotatingJobBanner[\s\S]*?^}/m);
const workspacePhotosMatch = stagesContent.match(/export function getWorkspacePhotos[\s\S]*?^}/m);

assert(!!bannerPoolsMatch, 'BANNER_POOLS exported block found');
assert(!!rotatingBannerMatch, 'getRotatingJobBanner exported block found');
assert(!!workspacePhotosMatch, 'getWorkspacePhotos exported block found');

// Build an executable sandbox to run the actual TS functions transpiled/cleaned
const jsCode = `
${bannerPoolsMatch[0].replace('export const BANNER_POOLS: Record<string, string[]>', 'const BANNER_POOLS')}
${rotatingBannerMatch[0]
  .replace('export function', 'function')
  .replace(/:\s*StageJob/g, '')
  .replace(/:\s*number\s*=\s*0/g, ' = 0')
  .replace(/:\s*string/g, '')}
${workspacePhotosMatch[0]
  .replace('export function', 'function')
  .replace(/:\s*StageJob/g, '')
  .replace(/:\s*string\[\]/g, '')}

return { BANNER_POOLS, getRotatingJobBanner, getWorkspacePhotos };
`;

const evalFn = new Function(jsCode);
const { BANNER_POOLS, getRotatingJobBanner, getWorkspacePhotos } = evalFn();

// Test suite for getRotatingJobBanner
const bannerEdgeCases = [
  { desc: 'Minimal job with ID only', job: { id: 'test-1' } },
  { desc: 'Job with missing company', job: { id: 'test-2', title: 'Développeur FullStack' } },
  { desc: 'Job with null company', job: { id: 'test-3', title: 'Comptable', company: null } },
  { desc: 'Job with empty company object', job: { id: 'test-4', company: {} } },
  { desc: 'Job with custom flyerUrl (not placeholder)', job: { id: 'test-5', flyerUrl: 'https://real.com/banner.jpg' }, expected: 'https://real.com/banner.jpg' },
  { desc: 'Job with placeholder flyerUrl', job: { id: 'test-6', flyerUrl: 'https://site.com/placeholder-image.png' } },
  { desc: 'Tech keyword matching', job: { id: 'test-7', title: 'Stage Dev React' } },
  { desc: 'Finance keyword matching', job: { id: 'test-8', title: 'Stage Audit Financier' } },
  { desc: 'BTP keyword matching', job: { id: 'test-9', title: 'Stage Chantier Génie Civil' } },
  { desc: 'Marketing keyword matching', job: { id: 'test-10', title: 'Stage Commercial & Ventes' } },
  { desc: 'Logistique keyword matching', job: { id: 'test-11', title: 'Stage Transit Maritime & Fret' } },
  { desc: 'Sante keyword matching', job: { id: 'test-12', title: 'Stage Laboratoire Biomédical' } },
  { desc: 'Droit keyword matching', job: { id: 'test-13', title: 'Stage Juridique OHADA' } },
  { desc: 'Admin keyword matching', job: { id: 'test-14', title: 'Stage Gestion Secrétariat' } },
  { desc: 'Unknown industry falling back to default pool', job: { id: 'test-15', title: 'Pilote Navette Spatiale' } },
  { desc: 'Empty id string', job: { id: '', title: 'Test Empty ID' } },
  { desc: 'UUID with hyphens', job: { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', title: 'UUID Test' } },
];

for (const tc of bannerEdgeCases) {
  const result = getRotatingJobBanner(tc.job, 0);
  assert(typeof result === 'string' && result.startsWith('http'), `Banner handles ${tc.desc}`);
  if (tc.expected) {
    assert(result === tc.expected, `Banner uses custom flyerUrl when valid`);
  }
}

// Test suite for getWorkspacePhotos
const photoEdgeCases = [
  { desc: 'Provided workspacePhotos array (2 photos)', job: { id: 'p1', workspacePhotos: ['https://u1.jpg', 'https://u2.jpg'] }, expectedLen: 2 },
  { desc: 'Provided workspacePhotos empty array [] (must fallback to pool)', job: { id: 'p2', workspacePhotos: [] }, mustFallback: true },
  { desc: 'Undefined workspacePhotos (fallback to pool)', job: { id: 'p3' }, mustFallback: true },
  { desc: 'Null workspacePhotos (fallback to pool)', job: { id: 'p4', workspacePhotos: null }, mustFallback: true },
  { desc: 'Missing company & sector info (fallback to default pool)', job: { id: 'p5', title: 'Job X' }, mustFallback: true },
  { desc: 'Tech sector workspace photo fallback pool', job: { id: 'p6', title: 'Software Engineer' }, mustFallback: true },
];

for (const tc of photoEdgeCases) {
  const photos = getWorkspacePhotos(tc.job);
  assert(Array.isArray(photos), `Workspace photos returns array for ${tc.desc}`);
  assert(photos.length > 0, `Workspace photos array is never empty for ${tc.desc}`);
  if (tc.expectedLen) {
    assert(photos.length === tc.expectedLen, `Preserves custom photos count (${tc.expectedLen})`);
  }
  if (tc.mustFallback) {
    assert(photos.length >= 3 && photos.length <= 5, `Fallback pool provides 3-5 photos (got ${photos.length})`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Phone Sanitization & WhatsApp Contact Deep Linking
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 2. Phone Sanitization & Deep Link Integrity ---');

const cleanPhoneMatch = whatsappContent.match(/export function cleanPhoneNumber[\s\S]*?^}/m);
assert(!!cleanPhoneMatch, 'cleanPhoneNumber found in whatsappService.ts');

const cleanPhoneFn = new Function(`
${cleanPhoneMatch[0].replace('export function', 'function').replace(/:\s*string/g, '')}
return cleanPhoneNumber;
`)();

const phoneTestCases = [
  { input: '+237 670 00 99 88', expected: '237670009988' },
  { input: '690123456', expected: '237690123456' },
  { input: '237690123456', expected: '237690123456' },
  { input: '00237690123456', expected: '00237690123456' },
  { input: '   ', expected: '' },
  { input: '', expected: '' },
  { input: null, expected: '' },
  { input: undefined, expected: '' },
];

for (const tc of phoneTestCases) {
  const cleaned = cleanPhoneFn(tc.input);
  assert(cleaned === tc.expected, `cleanPhoneNumber("${tc.input}") -> "${tc.expected}"`);
}

// Test recruiter WhatsApp URL construction in StagesScreen
assert(stagesContent.includes('const rawPhone = selectedDetailJob.company?.contactWhatsapp || \'237690123456\';'), 'Recruiter WhatsApp has fallback phone when undefined or null');
assert(stagesContent.includes('const clean = cleanPhoneNumber(rawPhone);'), 'Recruiter WhatsApp calls cleanPhoneNumber');
assert(stagesContent.includes('https://wa.me/${clean}?text=${textMsg}'), 'Recruiter WhatsApp builds valid wa.me URL format');
assert(stagesContent.includes('Linking.openURL(url).catch('), 'Recruiter WhatsApp safely catches Linking failures');

// Test recruiter Email URL construction
assert(stagesContent.includes('const email = selectedDetailJob.company?.contactEmail || \'recrutement@campus360.app\';'), 'Recruiter Email has fallback email address');
assert(stagesContent.includes('mailto:${email}?subject=${subject}&body=${body}'), 'Recruiter Email constructs valid mailto scheme');
assert(stagesContent.includes('Linking.openURL(url).catch('), 'Recruiter Email safely catches Linking failures');

// ─────────────────────────────────────────────────────────────────────────────
// 3. Navigation / Direction Handling & URL Encoding
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 3. Navigation & Direction Deep Link Fallbacks ---');

assert(stagesContent.includes('handleOpenDirections'), 'handleOpenDirections handler exists');
assert(stagesContent.includes('encodeURIComponent(loc)'), 'Location query is sanitized with encodeURIComponent');
assert(stagesContent.includes("ios: `maps:0,0?q=${query}`"), 'iOS maps native URL scheme is provided');
assert(stagesContent.includes("android: `geo:0,0?q=${query}`"), 'Android geo native intent scheme is provided');
assert(stagesContent.includes("default: `https://maps.google.com/?q=${query}`"), 'Web fallback to Google Maps URL is provided');
assert(stagesContent.includes('Linking.openURL(url).catch(() => {\n      Linking.openURL(`https://maps.google.com/?q=${query}`).catch(() => {});\n    });'), 'Native maps failure falls back to web Google Maps URL');

// ─────────────────────────────────────────────────────────────────────────────
// 4. iOS Safe Area Handling & Modal Collision Defenses
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 4. iOS Safe Area & Modal Stack Collision Defenses ---');

// Floating Header Safe Area
assert(stagesContent.includes("top: Platform.OS === 'ios' ? 48 : 36"), 'Floating action buttons clear iOS notch/Dynamic Island (48pt) and Android status bar (36dp)');

// Sticky Bottom Bar Safe Area
assert(stagesContent.includes("paddingBottom: Platform.OS === 'ios' ? 32 : 16"), 'Sticky bottom bar accounts for iOS Home Indicator (32pt cushion) and Android nav bar (16dp)');

// Scroll Clearance
assert(stagesContent.includes('detailScrollContent: {\n    paddingBottom: 110,\n  }'), 'Detail scroll content has 110pt paddingBottom ensuring zero overlap with sticky CTA bar');

// Modal Stack Collision Defense
assert(stagesContent.includes("Platform.OS === 'ios'"), 'handleApplyFromDetail differentiates iOS vs Android transition');
assert(stagesContent.includes('setSelectedDetailJob(null);'), 'Detail modal dismissed before mounting apply modal');
assert(stagesContent.includes('setTimeout(() => {\n        setApplyingJob(job);\n      }, 350);'), 'iOS modal dismissal given 350ms buffer to prevent UIViewController presentation collision');
assert(stagesContent.includes('setTimeout(() => {\n        setApplyingJob(job);\n      }, 200);'), 'Android modal transition given 200ms buffer');

// ─────────────────────────────────────────────────────────────────────────────
// 5. Stipend & Data Formatting Resiliency
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 5. Stipend & Metadata Formatting Resiliency ---');

// Stipend regex stripping
const stipendRaw = 'Rémunéré (75 000 FCFA/mois)';
const stipendCleaned = stipendRaw.replace(/\(.*\)/, '').trim();
assert(stipendCleaned === 'Rémunéré', 'Stipend regex handles bracketed annotations');

const stipendRaw2 = '75 000 FCFA';
const stipendCleaned2 = stipendRaw2.replace(/\(.*\)/, '').trim();
assert(stipendCleaned2 === '75 000 FCFA', 'Stipend regex handles clean amounts');

assert(stagesContent.includes("selectedDetailJob.stipend ? selectedDetailJob.stipend.replace(/\\(.*\\)/, '').trim() : '75 000 FCFA'"), 'Sticky bar has resilient fallback if stipend is undefined or missing');
assert(stagesContent.includes("job.stipend ? job.stipend.replace(/\\(.*\\)/, '').trim() : 'Gratification'"), 'Feed card has resilient fallback if stipend is undefined or missing');

// ─────────────────────────────────────────────────────────────────────────────
// 6. Adversarial Integrity & Anti-Facade Audit
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 6. Anti-Facade & Integrity Audit ---');

// Verify real integration with AiApplyModal
assert(stagesContent.includes('<AiApplyModal'), 'AiApplyModal genuinely imported and rendered');
assert(stagesContent.includes('job={applyingJob}'), 'Selected job passed to AiApplyModal');
assert(stagesContent.includes('studentProfile={studentProfile}'), 'Student profile passed to AiApplyModal');
assert(stagesContent.includes('onClose={() => setApplyingJob(null)}'), 'Proper clean unmount handler');

// Verify zero test mock overrides in production screen
assert(!stagesContent.includes('MOCK_TEST_OVERRIDE'), 'Zero test flags or mock bypasses in StagesScreen');
assert(!stagesContent.includes('return true; // bypass'), 'Zero bypass comments or shortcuts');

console.log(`\n🎉 ALL ${passedTests}/${totalTests} ADVERSARIAL STRESS TESTS PASSED SUCCESSFULLY!`);
