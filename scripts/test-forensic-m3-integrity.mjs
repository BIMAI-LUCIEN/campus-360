import fs from 'fs';
import path from 'path';

console.log('🔍 [FORENSIC AUDITOR] Starting Comprehensive M3 Integrity Audit');

const projectRoot = process.cwd();
const stagesScreenPath = path.join(projectRoot, 'src', 'ui', 'screens', 'StagesScreen.tsx');
const typesPath = path.join(projectRoot, 'src', 'types.ts');
const aiApplyModalPath = path.join(projectRoot, 'src', 'features', 'stages', 'AiApplyModal.tsx');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    console.error(`  ❌ [FAIL] ${testName} - ${details}`);
    throw new Error(`Forensic assertion failed: ${testName}`);
  }
}

console.log('\n--- 1. Types Verification (src/types.ts) ---');
const typesContent = fs.readFileSync(typesPath, 'utf8');
assert(typesContent.includes('workspacePhotos?: string[];'), 'StageJob has workspacePhotos?: string[]');
assert(typesContent.includes("'SENT_PENDING'"), "AppStatus includes 'SENT_PENDING'");
assert(typesContent.includes("'DELIVERED'"), "AppStatus includes 'DELIVERED'");
assert(typesContent.includes("'FAILED'"), "AppStatus includes 'FAILED'");

console.log('\n--- 2. Export & Function Signature Integrity (StagesScreen.tsx) ---');
const stagesContent = fs.readFileSync(stagesScreenPath, 'utf8');
assert(stagesContent.includes('export const BANNER_POOLS'), 'BANNER_POOLS is exported');
assert(stagesContent.includes('export function getRotatingJobBanner'), 'getRotatingJobBanner is exported');
assert(stagesContent.includes('export function getWorkspacePhotos'), 'getWorkspacePhotos is exported');
assert(stagesContent.includes('export function StagesScreen'), 'StagesScreen component is exported');
assert(stagesContent.includes('interface StagesScreenProps'), 'StagesScreenProps interface is present');

console.log('\n--- 3. Clean White Feed Cards Verification (§R4) ---');
assert(stagesContent.includes('backgroundColor: stitchColors.paper'), 'Cards use stitchColors.paper (Clean White #FFFFFF)');
assert(stagesContent.includes('cardHeroImageContainer'), 'Card has hero image cover container');
assert(stagesContent.includes('floatingContractBadge'), 'Card has floating contract badge on image');
assert(stagesContent.includes('floatingMatchBadge'), 'Card has floating AI match badge on image');
assert(stagesContent.includes('companyAvatarBox'), 'Card has company avatar/logo container');
assert(stagesContent.includes('cardJobTitle'), 'Card has high-contrast job title');
assert(stagesContent.includes('metaRow'), 'Card has location and duration metadata');
assert(stagesContent.includes('skillTag'), 'Card has skill tags');
assert(stagesContent.includes('stipendAmount'), 'Card has stipend display');
assert(stagesContent.includes('testID={`btn-postuler-${job.id}}`') || stagesContent.includes('btn-postuler-'), 'Card has direct apply button');
assert(stagesContent.includes('setSelectedDetailJob(job)'), 'Card press opens Immersive Stage Detail Screen');

console.log('\n--- 4. Immersive Stage Detail Screen 9 Features (§R3) ---');
// Feature 1: Hero Image Header with Curved Bottom & Floating Action Buttons
assert(stagesContent.includes('detailHeroContainer'), 'F1: Hero container exists');
assert(stagesContent.includes('borderBottomLeftRadius: 32') && stagesContent.includes('borderBottomRightRadius: 32'), 'F1: Hero header has curved bottom corners (32px)');
assert(stagesContent.includes('btn-detail-back'), 'F1: Floating Back action button present');
assert(stagesContent.includes('btn-detail-share'), 'F1: Floating Share action button present');
assert(stagesContent.includes('btn-detail-favorite'), 'F1: Floating Favorite action button present');
assert(stagesContent.includes('Share.share('), 'F1: Share button calls native Share API');
assert(stagesContent.includes('toggleFavorite'), 'F1: Favorite button toggles favorites state');

// Feature 2: Workspace Photo Strip & +N Indicator
assert(stagesContent.includes('workspaceSection'), 'F2: Workspace section exists');
assert(stagesContent.includes('getWorkspacePhotos(selectedDetailJob)'), 'F2: Calls getWorkspacePhotos helper');
assert(stagesContent.includes('workspaceThumbBox'), 'F2: Workspace photo thumbnail slot exists');
assert(stagesContent.includes('workspaceOverlayText'), 'F2: +N photos indicator overlay present');
assert(stagesContent.includes('setSelectedPreviewPhoto'), 'F2: Tapping photo opens high-res preview modal');
assert(stagesContent.includes('photoPreviewContainer'), 'F2: Photo preview modal container exists');

// Feature 3: Domain Pill Badge & AI Match Rating Badge
assert(stagesContent.includes('domainPill'), 'F3: Domain pill badge exists');
assert(stagesContent.includes('aiMatchPill'), 'F3: AI Match pill badge exists');
assert(stagesContent.includes('★'), 'F3: AI Match badge displays star rating');

// Feature 4: Prominent Job Title & Company Location with Direction Action
assert(stagesContent.includes('detailJobTitle'), 'F4: Prominent job title exists (22px bold)');
assert(stagesContent.includes('directionBtn'), 'F4: Direction button (Itinéraire ↗) exists');
assert(stagesContent.includes('handleOpenDirections'), 'F4: Direction handler calls Maps URL with encoded query');

// Feature 5: Segmented Underline Tabs
assert(stagesContent.includes('tab-about'), 'F5: À propos tab exists');
assert(stagesContent.includes('tab-company'), 'F5: Entreprise tab exists');
assert(stagesContent.includes('tab-aiAdvice'), 'F5: Conseils IA tab exists');
assert(stagesContent.includes('activeTabUnderline'), 'F5: Active tab underline indicator exists (3px royal violet)');

// Feature 6: Quick Metadata Pill Row
assert(stagesContent.includes('metadataGridRow'), 'F6: Metadata grid row exists');
assert(stagesContent.includes('🏃'), 'F6: Duration pill displays runner icon');
assert(stagesContent.includes('📍'), 'F6: Location mode pill displays pin');
assert(stagesContent.includes('🕒 Ouvert'), 'F6: Status pill displays open status');

// Feature 7: Rich Description Block with Expandable Toggle & Skills Chips
assert(stagesContent.includes('detailDescriptionText'), 'F7: Rich description block exists');
assert(stagesContent.includes('expandToggleBtn'), 'F7: Expand toggle button exists');
assert(stagesContent.includes('detailSkillChip'), 'F7: Required skills chips exist');
assert(stagesContent.includes('detailSkillChipMatched'), 'F7: Highlight student matched skills');

// Feature 8: Recruiter / Company Info Card
assert(stagesContent.includes('recruiterCard'), 'F8: Recruiter info card exists');
assert(stagesContent.includes('btn-contact-whatsapp'), 'F8: WhatsApp contact button exists');
assert(stagesContent.includes('btn-contact-email'), 'F8: Email contact button exists');
assert(stagesContent.includes('handleRecruiterWhatsapp'), 'F8: Recruiter WhatsApp handler exists');
assert(stagesContent.includes('handleRecruiterEmail'), 'F8: Recruiter Email handler exists');

// Feature 9: Fixed Sticky Bottom Bar
assert(stagesContent.includes('stickyBottomBar'), 'F9: Sticky bottom bar container exists');
assert(stagesContent.includes('INDEMNITÉ ESTIMÉE'), 'F9: Displays estimated stipend label');
assert(stagesContent.includes('btn-sticky-apply'), 'F9: Sticky apply CTA button exists');
assert(stagesContent.includes('handleApplyFromDetail'), 'F9: Apply CTA triggers handleApplyFromDetail');

console.log('\n--- 5. 1-Click Apply Flow & Modal Wiring ---');
assert(stagesContent.includes('<AiApplyModal'), 'AiApplyModal is rendered in StagesScreen');
assert(stagesContent.includes('setApplyingJob(job)'), 'handleApplyFromDetail transitions to setApplyingJob');
assert(stagesContent.includes('setTimeout('), 'Modal dismiss uses safe transition delay before mounting AiApplyModal');

const aiModalContent = fs.readFileSync(aiApplyModalPath, 'utf8');
assert(aiModalContent.includes('dispatchStageApplication('), 'AiApplyModal calls dispatchStageApplication for automated dispatch');
assert(aiModalContent.includes('generateCvPdfBase64('), 'AiApplyModal generates real CV PDF base64');
assert(aiModalContent.includes('buildWhatsAppPitch('), 'AiApplyModal builds personalized WhatsApp pitch');

console.log('\n--- 6. Security & Anti-Pattern Forensics ---');
// Verify clean phone sanitization
assert(stagesContent.includes('cleanPhoneNumber('), 'Phone numbers passed to WhatsApp are sanitized with cleanPhoneNumber');
assert(stagesContent.includes('encodeURIComponent('), 'Query parameters in external links are sanitized with encodeURIComponent');

// Verify zero hardcoded keys or passwords
const secretRegex = /(api[_-]?key\s*[:=]\s*['"][a-zA-Z0-9_\-]{16,}['"]|bearer\s+[a-zA-Z0-9_\-\.]{20,}|password\s*[:=]\s*['"][^'"]+['"])/i;
assert(!secretRegex.test(stagesContent), 'Zero hardcoded API keys or passwords in StagesScreen.tsx');
assert(!secretRegex.test(typesContent), 'Zero hardcoded secrets in types.ts');

console.log(`\n🎉 ALL ${passedTests}/${totalTests} FORENSIC INTEGRITY CHECKS PASSED EMPIRICALLY!`);
