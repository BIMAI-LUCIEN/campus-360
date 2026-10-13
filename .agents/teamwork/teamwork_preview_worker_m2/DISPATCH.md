# Dispatch: Worker M2 (Master Shared Components & Navigation)

## Mission & Scope
Implement Milestone 2 of the Campus 360 mobile UI redesign in `src/ui/GlassComponents.tsx` (and `src/AppShell.tsx` if needed for header/navigation prop wiring).
Exclusive write ownership: `src/ui/GlassComponents.tsx`, `src/AppShell.tsx`.

Authoritative request: `c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\ORIGINAL_REQUEST.md` (specifically ## 2026-10-08T01:55:15Z).
Read Survey Explorer 2 report and handoff:
- `c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\teamwork_preview_explorer_survey_2\report.md`
- `c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\teamwork_preview_explorer_survey_2\handoff.md`

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Requirements
1. **Curved Royal Violet Header (`TopBar`):**
   - Transformed into a convex curved bottom container (`borderBottomLeftRadius: 28-30`, `borderBottomRightRadius: 28-30`) with Royal Violet gradient (`#7C3AED` to `#6D28D9`).
   - Integrated frosted location pill dropdown (`📍 Ville / Université ∨`), notification bell with unread badge, and integrated pure white search pill (`#FFFFFF`) with search input and purple filter icon (`SlidersHorizontal`).
   - 100% backward compatible: Retain all existing props (`appName`, `onBellPress`, `hasUnread`, `onAvatarPress`, `avatarInitials`) with identical defaults and types.
2. **Floating Clean White Navigation (`BottomNav`):**
   - Floating clean white capsule (`#FFFFFF`, subtle border, soft elevation shadow `0 8px 20px rgba(15,23,42,0.10)`).
   - 5 destinations (`Accueil`, `Stages`, `Créer`, `Ressources`, `Profil`).
   - Active tab displays as solid Royal Violet pill (`#7C3AED`) with white icon and bold label. Inactive tabs display in slate (`#64748B`).
3. **Circular Category Architecture (`CategoryGrid`):**
   - Horizontal circular category items (`56x56`, `borderRadius: 28`) with soft purple container backgrounds (`rgba(124, 58, 237, 0.08)` / `#F5F3FF`) and Royal Violet icons (`#7C3AED`).
   - Active state highlight and high-contrast labels (`#0F172A`) underneath.
4. **Foundation Components:**
   - `Card` / `GlassCard` / `GlassPanel`: Pure white surfaces (`#FFFFFF`), rounded radii (18-20px), subtle border (`#F1F5F9`), ultra-soft elevation shadows.
   - `GradientButton` / `PrimaryButton`: Solid Royal Violet (`#7C3AED`) and Electric Violet (`#8B5CF6`) with white bold text.
   - `EditorialInput` / `GlassInput`: Clean off-white surface (`#F8FAFC`), crisp border (`#E2E8F0`), Royal Violet focus ring.
   - `Pill` / `GlassPill`: Active solid violet pill (`#7C3AED`), inactive light pill.
   - Retain all aliases (`GlassCard`, `GlassButton`, `GlassInput`, `GlassPill`) for 100% backward compatibility.
5. **AppShell Coordination (`src/AppShell.tsx`):**
   - Ensure `TopBar` and `BottomNav` render seamlessly within `AppShell.tsx`.
6. **Typecheck & Verification:**
   - Run `npm run typecheck` (`node --stack_size=8192 node_modules/typescript/bin/tsc --noEmit`) to verify 0 errors.

## Output
Write report to `.agents/teamwork/teamwork_preview_worker_m2/handoff.md` including exact build and test results.

## 2026-10-08T03:50:48Z
**Context**: Milestone 2 Shared Components
**Content**: Status check: Your progress.md has not been updated since 05:21Z. Are you still making progress on the implementation of src/ui/GlassComponents.tsx?
**Action**: Please report your current progress immediately or proceed with applying the updates and typecheck.
