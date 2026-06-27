# BRIEFING — 2026-06-26T23:01:00Z

## Mission
Connect the Campus-Bordes Expo mobile app to the Supabase backend (auth, catalog, transactions, secure PDF URLs).

## 🔒 My Identity
- Archetype: Project Orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: c:/Users/migue/Desktop/mes projets/campus 360/.agents/orchestrator_phase2
- Original parent: main agent
- Original parent conversation ID: c046ef2d-6220-42f6-bdc0-ad33cea51b74

## 🔒 My Workflow
- **Pattern**: Project
- **Scope document**: c:/Users/migue/Desktop/mes projets/campus 360/PROJECT.md
1. **Decompose**: Decompose the mobile app integration requirements into sequential milestones.
2. **Dispatch & Execute**:
   - **Delegate**: Spawn sub-orchestrators/workers for each milestone to implement the backend/frontend bindings and verification.
3. **On failure**:
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
   - Escalate: report to parent (sub-orchestrators only, last resort)
4. **Succession**: Self-succeed at spawn count 16.
- **Work items**:
  1. DB Setup & Auth Integration [pending]
  2. Live Catalog & Packs Integration [pending]
  3. Wallet Sync & Purchases Integration [pending]
  4. Secure PDF Viewer Integration [pending]
  5. E2E Verification & Hardening [pending]
- **Current phase**: 1
- **Current focus**: Planning and decomposition

## 🔒 Key Constraints
- Connect using betterAuth.ts and pdfApi.ts clients to Supabase.
- Persist sessions using expo-secure-store.
- Enable wallet sync and signed PDF URLs.
- Never write, modify, or create source code files directly as the orchestrator.
- Always delegate code changes to workers.
- Run Forensic Auditor to prevent cheating.

## Current Parent
- Conversation ID: c046ef2d-6220-42f6-bdc0-ad33cea51b74
- Updated: not yet

## Key Decisions Made
- Initiated Phase 2 coordination.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| explorer_m1 | teamwork_preview_explorer | Milestone 1 Explorer | completed | 58b5a21d-4c40-4cfa-8b65-a826dde91d83 |
| worker_m1 | teamwork_preview_worker | Milestone 1 Worker | completed | 202bcfdf-4e9b-46d4-acb7-d246196f1e27 |
| explorer_m2 | teamwork_preview_explorer | Milestone 2 Explorer | completed | 61d57705-88f9-4b94-a3c9-dc403c414ecf |
| worker_m2 | teamwork_preview_worker | Milestone 2 Worker | completed | 944ff712-4b99-42aa-b314-fb9b463f37d8 |
| auditor_phase2 | teamwork_preview_auditor | Forensic Auditor | in-progress | ecabb3c9-e3f3-4972-8426-e98059f9338c |

## Succession Status
- Succession required: no
- Spawn count: 5 / 16
- Pending subagents: ecabb3c9-e3f3-4972-8426-e98059f9338c
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: not started
- Safety timer: none

## Artifact Index
- c:/Users/migue/Desktop/mes projets/campus 360/.agents/orchestrator_phase2/progress.md — liveness heartbeat and status checkpoint
- c:/Users/migue/Desktop/mes projets/campus 360/.agents/orchestrator_phase2/ORIGINAL_REQUEST.md — verbatim user request copy
- c:/Users/migue/Desktop/mes projets/campus 360/PROJECT.md — global project scope and milestones
