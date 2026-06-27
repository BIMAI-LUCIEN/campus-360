# Project Plan - Campus-360 Admin Dashboard and PDF Integration

## Objective
Implement an admin web dashboard for Campus-Bordes to upload academic PDFs to Supabase Storage, automatically generate watermarked preview files, display sales and downloads on a live analytics dashboard, and manage the complete document catalog.

## Milestones

### Milestone 1: DB Setup and Schema Verification
- **Status**: Completed
- **Verification**: Verified by explorer_m1 and auditor_m2. Supabase schema contains correct tables (`documents`, `document_events`, `profiles`, `document_purchases`, `app_document_purchases`, `app_wallets`) and policies.

### Milestone 2: R1: PDF Upload & DB Sync
- **Status**: Completed
- **Verification**: Verified via `npm run verify` which runs the automated test runner in `verify-implementation.mjs`.

### Milestone 3: R2: Automatic Watermarked Preview Generation
- **Status**: Completed
- **Verification**: Verified using `pdf-lib` to extract page 0, apply diagonal text overlay with 45-degree rotation and 0.4 opacity, and save to `document-previews` bucket.

### Milestone 4: R3: Live Analytics Dashboard
- **Status**: Completed
- **Verification**: Verified by checking telemetry aggregation from Postgres, query logic joining with `profiles` to resolve student emails, and dynamic auto-polling in the React frontend.

### Milestone 5: R4: Catalog Management & Sync
- **Status**: Completed
- **Verification**: Verified that update metadata operations, status edits, and file/database deletion are properly synced to Supabase.

### Milestone 6: Next.js Windows Build Support and E2E Verification
- **Status**: Completed
- **Verification**: Worker_m3 fixed path extension issues and Next.js trace errors. Checked via:
  - `npm.cmd run typecheck` (tsc success)
  - `npm.cmd run build` (Next.js production compile success)
  - `npm.cmd run verify` (All verification checks passed)
