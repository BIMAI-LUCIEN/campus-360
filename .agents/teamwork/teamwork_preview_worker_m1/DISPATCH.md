# Dispatch: Worker M1 (Design System & Theme Foundation)

## Mission & Scope
Implement Milestone 1 of the Campus 360 mobile UI redesign in `src/theme/stitch.ts`.
Exclusive write ownership: `src/theme/stitch.ts`.

Authoritative request: `c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\ORIGINAL_REQUEST.md` (specifically ## 2026-10-08T01:55:15Z).
Read Survey Explorer 1 report and handoff:
- `c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\teamwork_preview_explorer_survey_1\report.md`
- `c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\teamwork_preview_explorer_survey_1\handoff.md`

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Requirements
1. Transition `src/theme/stitch.ts` to the Clean White & Royal Violet design system:
   - Primary backgrounds: `#FFFFFF` (`paper`) and `#F8FAFC` (`paperDeep`).
   - Surfaces: `#FFFFFF` (`surface`), `#F8FAFC` (`surfaceContainerLow`, `surfaceContainer`), `#F1F5F9` (`surfaceContainerHigh`).
   - Brand Accents: `#7C3AED` (`sienna`, `primary`), `#8B5CF6` (`siennaTone`), `rgba(124, 58, 237, 0.08)` (`siennaBg`).
   - Foreground/Typography: Deep Slate Black `#0F172A` (`ink`), Muted Slate `#64748B` (`inkMuted`), Slate `#334155` (`inkSoft`), `#94A3B8` (`inkFaint`).
   - Borders: `#E2E8F0` (`glassBorder`), `#F1F5F9` (`outlineVariant`), `#CBD5E1` (`outline`).
   - Shadows: Soft elevation presets at 4–6% opacity with `#0F172A` (`card`, `floating`, `primary`, `secondary`) while preserving legacy `sm`, `md`, `lg` keys.
   - Radiuses: Modern 16–24px scale (`md: 16`, `lg: 20`, `xl: 24`, `card: 20`, `button: 16`).
   - Gradients: Royal Violet to Electric Violet (`brandGradient.colors: ['#7C3AED', '#8B5CF6', '#A78BFA']`).
2. Retain ALL 42 accessed keys in `stitchColors` (see Section 4 & 7 of Explorer 1 report) to guarantee 100% backward compatibility.
3. Preserve all existing exports (`stitchColors`, `brandGradient`, `brandGradientTwo`, `stitchSpacing`, `stitchRadius`, `fontFamilies`, `stitchTypography`, `stitchShadows`, `glassPanel`, `glassCard`, `stitchComponents`).
4. Run `npm run typecheck` (`node --stack_size=8192 node_modules/typescript/bin/tsc --noEmit`) to verify 0 errors.

## Output
Write report to `.agents/teamwork/teamwork_preview_worker_m1/handoff.md` including exact build and test results.
