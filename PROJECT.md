# Project: Campus-Bordes Mobile App & Supabase Integration (Phase 2)

## Architecture
- **Mobile Client**: Expo React Native app utilizing `Better Auth` and `pdfApi.ts` for database/storage operations.
- **Backend Server**: Next.js app in `admin-app/` acting as the API gateway. Exposes `/api/auth` (Better Auth backend) and `/api/mobile/*` (secured business routes talking to Supabase via service role).
- **Database**: Supabase PostgreSQL (`public.app_users`, `public.app_wallets`, `public.app_wallet_transactions`, `public.documents`, `public.app_document_purchases`, `public.app_pack_purchases`).
- **Storage**: Supabase Storage (`documents` and `document-previews` buckets).

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | DB Schema & Auth Verification | Verify Supabase database schema, betterAuth configuration, and session restoration. | None | PLANNED |
| 2 | Live Catalog & Packs Integration | Connect mobile explore/catalog views to backend database tables using `pdfApi.ts`. | M1 | PLANNED |
| 3 | Wallet & Purchase Transactions | Integrate purchase routes, transaction history, and wallet sync on the frontend. | M2 | PLANNED |
| 4 | Secure PDF Reader & Signed URLs | Implement signed URL retrieval for reading purchased PDFs and preview loading. | M3 | PLANNED |
| 5 | E2E Verification & Typecheck | Verify all requirements pass typecheck, manual E2E tests, and audit checks. | M4 | PLANNED |

## Interface Contracts
### Mobile API: `/api/mobile/account` (GET & PATCH)
- GET: Returns profile details, wallet balance, active subscription, purchased document/pack IDs, and transaction history.
- PATCH: Updates student name, phone, whatsappPhone, university, faculty, and level.

### Mobile API: `/api/mobile/purchase/document` (POST)
- POST: Performs atomic document purchase by debiting wallet and inserting into `app_document_purchases`.

### Mobile API: `/api/mobile/purchase/pack` (POST)
- POST: Performs atomic pack purchase by debiting wallet and inserting into `app_pack_purchases` + unlocking all documents in the pack.

### Mobile API: `/api/mobile/pdf/signed-url` (POST)
- POST: Validates purchase status and returns a temporary secure signed URL from the private `documents` bucket.
