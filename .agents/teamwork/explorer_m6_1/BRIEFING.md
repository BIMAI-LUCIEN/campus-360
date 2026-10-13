# BRIEFING — 2026-10-07T15:25:45Z

## Mission
Investigate and analyze Evolution API backend proxy implementation for Milestone M6 test automation.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis
- Working directory: c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\explorer_m6_1
- Original parent: c784b0be-802c-44ca-81e8-88270c86745f
- Milestone: M6

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Strictly follow project conventions and graphify/read efficiency
- Document findings in handoff.md and notify parent orchestrator via send_message

## Current Parent
- Conversation ID: c784b0be-802c-44ca-81e8-88270c86745f
- Updated: 2026-10-07T15:25:45Z

## Investigation State
- **Explored paths**:
  - `mobile-api/lib/evolution-api.ts`
  - `mobile-api/app/api/mobile/whatsapp/instance/route.ts`
  - `src/features/whatsapp/whatsappService.ts`
  - `src/features/whatsapp/WhatsAppPairingModal.tsx`
  - `mobile-api/app/api/mobile/stages/dispatch/route.ts`
  - `src/features/stages/stagesApi.ts`
  - `scripts/n8n/send_stage_application_workflow.json`
  - `docs/N8N_APPLICATION_DISPATCH.md`
  - `scripts/mobile-app-test-suite.mjs`, `scripts/test-challenger-m5-schema.mjs`, `scripts/test-stage-ingest.mjs`
  - Live API probe: `https://wa.blackcompany.site` (200 OK, v2.3.7), `https://api.campus360b.site/api/health`
- **Key findings**:
  - Evolution API backend proxy implements a dual-mode strategy: Live mode via HTTP calls to Evolution API v2 (`/instance/create`, `/instance/connect/:instance`, `/instance/connectionState/:instance`), and Mock/Fallback mode when unconfigured or unreachable.
  - Fallback mode generates deterministic 8-digit codes formatted as `XXXX - XXXX` using a 31-multiplier rolling hash of phone digits.
  - Proxy route `/api/mobile/whatsapp/instance` supports `POST` (create + connect pairing code) and `GET` (polling connection state), with non-strict prod fallback for automated testing without cookies.
  - Remote production server does not have M1 routes deployed yet; tests in `scripts/test-stage-dispatch.mjs` must test logic, schemas, contracts, and workflow files in a self-contained ESM runner.
- **Unexplored areas**: None for M6 Evolution API proxy scope.

## Key Decisions Made
- Outlined a 6-suite test architecture for `scripts/test-stage-dispatch.mjs` covering normalization, 8-digit code generation, proxy schema contracts, N8N payload generation, workflow JSON integrity, and live API probing.

## Artifact Index
- `DISPATCH.md` — Initial dispatch message
- `BRIEFING.md` — Agent memory and state tracking
- `progress.md` — Agent heartbeat
- `handoff.md` — Final 5-component handoff report for M6 test implementation
