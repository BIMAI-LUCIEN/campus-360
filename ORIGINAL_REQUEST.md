# Original User Request

## Initial Request — 2026-06-26T19:48:46Z

An admin web dashboard for Campus-Bordes to upload academic PDFs to Supabase Storage, automatically generate watermarked preview files, and display sales and downloads on a live analytics dashboard.

Working directory: c:/Users/migue/Desktop/mes projets/campus 360
Integrity mode: demo

## Requirements

### R1. Supabase PDF Upload and Metadata Sync
The app must allow admins to upload complete academic PDF files. The file must be saved in the private `documents` bucket on Supabase Storage, and the metadata (title, subject, price, page count, etc.) must be saved/updated in the Supabase PostgreSQL database.

### R2. Automatic Watermarked Preview Generation
Upon uploading a complete PDF, the app must automatically extract its first page, overlay a highly visible "Campus-Bordes Preview" watermark, and upload the watermarked preview PDF to the private `document-previews` bucket on Supabase Storage.

### R3. Live Analytics Dashboard
The app must display a dashboard fetching data from Supabase (`document_events`, `documents`, and `profiles`) that displays key metrics: total revenue, total sales, number of search queries, top performing documents by conversion rate (purchases / previews), and a live event stream.

### R4. Complete Document Catalog Management
Admins must be able to list all documents, edit metadata, update status (draft, published, archived), and delete documents. These operations must be synced directly to the Supabase database.

## Acceptance Criteria

### PDF Upload & Storage
- [ ] Uploading a PDF via Next.js Admin dashboard creates an entry in `public.documents` table with correct metadata (title, faculty, subject, university, price_coins, level, page_count).
- [ ] The full PDF is stored in the private `documents` bucket on Supabase Storage.
- [ ] A 1-page preview PDF is automatically extracted from the uploaded document, overlayed with a "Campus-Bordes Preview" watermark, and saved in the private `document-previews` bucket on Supabase.

### Analytics & Catalog Management
- [ ] The Next.js Admin Analytics page displays: total sessions, search query count, previews, purchases, total revenue, top-performing documents by conversion rate, and a list of recent events.
- [ ] The admin can view the document list, update document price, title, subject details, status (draft, published, archived), and delete any document.
- [ ] Deleting a document removes its files from both `documents` and `document-previews` storage buckets on Supabase.

### Code Quality & Security
- [ ] Enforces role-based access control: only authenticated users with role `admin` or `super_admin` in `public.profiles` can access admin pages and APIs.
- [ ] Running `npm run typecheck` or `npm run build` in `admin-app/` passes without any TypeScript or compile errors.

## Verification Plan

### Automated Checks
- Run typecheck in `admin-app/`: `npm run typecheck`

### Manual Verification
- Log in to Next.js Admin Dashboard using credentials in `.env.local`.
- Upload a test academic PDF. Verify that it appears in Supabase database (`public.documents`) and Storage (`documents` and `document-previews` buckets).
- Verify the generated preview by downloading/viewing it to confirm that it contains only the first page and has the watermark text overlaid.
- Perform a simulated purchase from the mobile app (or manually insert a `document_events` purchase event in Supabase). Verify that the admin analytics dashboard updates in real-time.
- Try to access the admin pages/APIs with a student profile. Verify that access is denied with a 403 error.

## Follow-up — 2026-06-26T21:59:03Z

Connect the Campus-Bordes Expo mobile app to the Supabase backend, enabling user authentication, live catalog loading, wallet transaction synchronization, and secure signed PDF URLs for reading.

Working directory: c:/Users/migue/Desktop/mes projets/campus 360
Integrity mode: development

## Requirements

### R1. Persistent Email/Password Authentication
Replace the mocked auth in the Expo app with real user registration and login flows using `betterAuth.ts` client. Persist sessions using `expo-secure-store` so the user remains authenticated upon restarting the app.

### R2. Live Catalog and Packs Integration
Connect the catalog and packs UI in `PdfStudentSection.tsx` and `App.tsx` to `listPublishedPdfDocuments()` and `listPublishedPdfPacks()` from `pdfApi.ts`, fetching live records from Supabase instead of showing mock items.

### R3. Synchronized Wallet & Purchases
Connect the purchase buttons for documents and packs to `purchasePdfDocument()` and `purchasePdfPack()`, debiting the user's real Supabase wallet balance and listing their items under the "Mes PDF" tab upon successful purchase.

### R4. Secure PDF Viewer
Connect the reader screen to open the PDF using a temporary secure signed URL retrieved via `createSignedPdfUrl()`, displaying the actual PDF pages instead of a mock reader interface.

## Acceptance Criteria

### Authentication & Session
- [ ] User login and sign-up communicate with the Better Auth server backend, writing profiles to the database.
- [ ] The authenticated session persists across app restarts (e.g. killing and reopening the app retains the student profile and wallet balance).
- [ ] Logging out successfully clears session details from SecureStore.

### Catalog & Transactions
- [ ] The "Catalog" tab lists documents retrieved directly from Supabase's `public.documents` table where status is `published`.
- [ ] Buying a document/pack executes the purchase endpoint, updates the wallet balance (`public.wallets`), and successfully adds the document/pack ID to the student's purchased library.
- [ ] The wallet balance shown in the app matches the balance stored in the database.

### Secure PDF Viewer
- [ ] The student can open a preview of any PDF, loading the file from `document-previews` bucket.
- [ ] The student can read a purchased PDF, loading the complete file from `documents` bucket via a signed URL.
- [ ] An unpurchased full PDF is not accessible, returning an access error if the reader tries to load it without purchase.

### Build & Type Safety
- [ ] Running `npm run typecheck` in the mobile app root passes without TypeScript compilation errors.

## Verification Plan

### Automated Checks
- Run typecheck at the project root: `npm run typecheck`

### Manual Verification
- Register a new student user in the mobile app. Log out, restart the app, and verify you are prompted to log in. Log in and verify session persistence.
- Complete a wallet top-up and check that the balance increments in the app and matches the DB.
- Confirm that the catalog lists published documents from the Supabase DB.
- Purchase a document. Confirm that the coins are debited and the document appears under "Mes PDF".
- Open a preview PDF and confirm it renders. Open the purchased PDF and confirm it renders using the signed URL. Attempt to read an unpurchased PDF directly and confirm it fails.
