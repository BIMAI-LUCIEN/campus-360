# Plan: Campus-Bordes Expo Mobile App & Supabase Integration (Phase 2)

## Architecture
- **Mobile Client**: React Native Expo app utilizing `betterAuth.ts` and `pdfApi.ts` clients.
- **Backend API**: Next.js app (`admin-app/`) exposing `/api/auth` (Better Auth) and `/api/mobile/*` endpoints (Next.js server-side Supabase interactions).
- **Database / Storage**: Supabase Postgres database and Storage buckets (`documents`, `document-previews`).

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | DB Schema & Auth Verification | Ensure `app_users`, `app_wallets`, and Better Auth table structures are correct. Verify session restoration/persistence. | None | PLANNED |
| 2 | Live Catalog & Packs Integration | Connect student catalog & packs views to the backend database via `pdfApi.ts` (using `explore` and `library` viewModes). | M1 | PLANNED |
| 3 | Wallet & Purchase Transactions | Connect document and pack buy buttons to backend purchase routes, updating wallet balance and purchased libraries. | M2 | PLANNED |
| 4 | Secure PDF Reader & Signed URLs | Fetch signed URLs via `/api/mobile/pdf/signed-url` to view full PDFs. Restrict unpurchased access. | M3 | PLANNED |
| 5 | E2E Verification & Typecheck | Run typechecks, unit tests, and perform manual verification checks. | M4 | PLANNED |

## Verification Plan
- **Automated checks**: Run `npm.cmd run typecheck` in the root mobile project and `npm.cmd run typecheck` in `admin-app/`.
- **Integrity verification**: Run Forensic Auditor to check for hardcoded mocks or integrity bypasses.
- **Manual verification**: Verify session persistence across reloads, wallet balance updates, purchase logs, document previews, and restricted/secure PDF reading.
