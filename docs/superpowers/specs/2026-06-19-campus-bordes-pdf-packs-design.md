# Campus-Bordes PDF Packs Design

Date: 2026-06-19

## Objective

Campus-Bordes must become a focused PDF marketplace for students: discover, preview,
buy, read, and study academic PDFs from a mobile app, while the admin dashboard makes
bulk PDF ingestion fast through AI-assisted classification and pack creation.

The MVP stays PDF-first. Social features, events, messaging, subscriptions, and full
mobile money integration are outside this design.

## Product Model

The app sells two product types:

- `PDF document`: one academic file such as a course, TD, corrected exam, summary, or
  past paper.
- `PDF pack`: a curated set of documents sold together, usually cheaper than buying
  each PDF separately.

Packs can be academic-specific or transversal:

- Targeted pack: linked to institution, faculty/program, level, and semester.
- Transversal pack: useful across several institutions or programs, such as OHADA,
  mathematics basics, methodology, or exam preparation.

A document can be sold alone and can also belong to multiple packs. When a student buys
a pack, every published document inside that pack becomes available in their library.

## Admin Upload AI Flow

The admin dashboard must support bulk PDF upload.

1. The admin drops or selects multiple PDFs.
2. The server extracts text and metadata with `pdfjs-dist`.
3. The AI analyzes each document with a low-cost OpenRouter model.
4. The system creates draft document records with extracted metadata.
5. The AI proposes packs from common signals: institution, program, level, semester,
   subject, document type, and exam intent.
6. The admin reviews confidence levels, fixes missing fields, moves documents between
   packs, merges packs, removes files, then publishes documents and packs together.

The AI must not publish content automatically. It accelerates classification, but the
admin remains the final reviewer.

Required admin validation fields before publication:

- title
- document type
- subject
- price
- publication status
- at least one academic target or transversal flag
- preview availability
- storage file path

### AI Output Per PDF

Each analyzed PDF should produce:

- cleaned title
- student-facing description
- detected institution
- faculty or program
- academic level
- semester
- subject
- document type: course, TD, exam, correction, summary, methodology, other
- professor name when detectable
- tags
- page count
- quality score
- recommended price
- confidence score
- missing fields

### AI Output For Packs

The AI should propose draft packs with:

- pack title
- description
- target institution/program/level/semester when detected
- pack type: semester, exam prep, corrected exams, course bundle, catch-up, transversal
- included PDF IDs
- suggested order
- suggested price
- discount compared with separate purchases
- confidence score

## Mobile Client Experience

The mobile app uses the logo color system: blue, ice, white, and deep navy. The style is
clean, premium, rounded, and mobile-first, inspired by modern telecom self-care apps but
adapted to academics.

### Onboarding

Onboarding is limited to three steps:

1. Welcome and authentication: Google or email/password, with guest catalog browsing.
2. Academic profile: institution, faculty/program, level, current semester.
3. Study intent: exams, past papers, courses, TD/corrections, catch-up.

The app must avoid long manual forms. Common values should be selectable, with an
optional manual field when the value is missing.

Required student profile fields:

- email
- display name
- institution
- faculty or program
- academic level
- current semester
- city or campus, optional
- preferred subjects, optional
- study goal

The app should allow catalog browsing before profile completion, but pack
recommendations become personalized only after the academic profile is filled.

### Home

The first screen should make PDF discovery immediate:

- search bar
- academic profile shortcut
- recommended packs
- current semester content
- popular PDFs in the user's program
- new documents
- purchased library shortcut

### Pack Detail

A pack detail page shows:

- title and academic target
- price and discount
- document count and total pages
- included PDFs
- badges such as exam-ready, corrections included, semester complete
- previewable documents
- buy button fixed in the thumb zone

### PDF Detail

A PDF detail page shows:

- preview
- summary
- metadata
- price
- included packs, when any
- AI study assistant entry point
- buy button

Before purchase, the student sees only preview and metadata. After purchase, the full
reader is available.

### Library

Library has two tabs:

- My packs
- My PDFs

For packs, the library shows reading progress such as `3/12 PDFs read` and lets the
student continue from the last opened document.

## Reader And AI Study Assistant

PDFs must be read inside the app for the MVP. Full PDF download is not offered.

Before purchase, the AI can answer only from metadata, summary, and preview content.
After purchase, the AI can help with the opened document or purchased pack.

MVP assistant actions:

- explain a passage
- summarize a page or section
- generate revision questions
- correct a short student answer
- create a revision plan for a pack

Cost controls:

- OpenRouter free or low-cost model first
- daily message limit
- cached document analysis
- extracted text chunks instead of full PDF resend
- local fallback answer when AI is unavailable

## Admin Dashboard

The admin dashboard is a decision dashboard, not a decorative landing page.

Navigation:

- Dashboard
- AI Upload
- PDFs
- Packs
- Sales
- Students
- Settings

### Dashboard KPIs

Show at most five headline KPIs:

- monthly revenue
- PDF sales
- pack sales
- preview-to-purchase conversion
- documents or packs needing review

Charts and tables:

- sales by day
- top packs
- top PDFs
- searches with no results
- conversion funnel: search, preview, purchase, read

### AI Upload Screen

The AI upload screen is the operational center:

- drag and drop multi-upload
- analysis progress
- detected PDFs table
- proposed packs panel
- issues panel
- confidence badges
- bulk publish action

### PDF Management

PDF table columns:

- title
- subject
- institution
- program
- level
- semester
- price
- status
- sales
- actions

Actions:

- edit
- preview
- add to pack
- publish
- archive

### Pack Management

Pack table columns:

- title
- academic target
- document count
- price
- discount
- sales
- revenue
- status

Pack detail should allow document ordering, item removal, price editing, and publication.

## Data Model

Required core tables:

- `institutions`
- `faculties`
- `programs`
- `academic_levels`
- `semesters`
- `pdf_documents`
- `pdf_packs`
- `pdf_pack_items`
- `pdf_purchases`
- `pack_purchases`
- `wallet_transactions`
- `ai_analysis_jobs`
- `document_events`

`pdf_pack_items` is the join table that allows one PDF to appear in multiple packs.

## Security And Access

Student auth uses Supabase Auth. Admin auth uses Better Auth in the Next.js dashboard.
Admin routes require middleware and an admin role or allowed email.

Full PDF files are private. The app receives a signed URL only when the current student
has purchased the document directly or through a pack.

Wallet debits must happen through a server-side RPC or API transaction:

1. verify student session
2. verify wallet balance
3. debit wallet
4. create purchase record
5. create wallet transaction
6. grant document or pack access

The mobile client must never directly update wallet balances.

## Error Handling

Mobile errors must be written in student language, not technical language:

- auth failure: ask the student to retry or use another login method
- insufficient wallet balance: show current balance and top-up action
- unavailable PDF: explain that the document is being reviewed
- AI unavailable: show a local fallback and invite retry
- purchase already exists: open the purchased item instead of failing

Admin errors must be actionable:

- failed PDF extraction: mark the file as needing manual metadata
- weak AI confidence: require admin review before publication
- duplicate PDF suspicion: show possible matches
- missing storage upload: block publication
- pack with zero published PDFs: block publication

## Testing Plan

Mobile checks:

- a guest can browse the catalog but cannot buy
- a student can complete onboarding and receive personalized packs
- a student can buy one PDF
- a student can buy one pack and access every included PDF
- a student cannot access a full PDF without purchase
- the reader resumes the last opened document
- the AI assistant uses only allowed content before purchase

Admin checks:

- an admin can upload multiple PDFs
- extraction creates analysis jobs
- AI metadata can be edited before publication
- proposed packs can be merged, edited, and published
- invalid packs cannot be published
- dashboard KPIs update after purchases
- non-admin users cannot access admin routes

## MVP Scope

Included:

- short onboarding
- academic profile
- PDF catalog
- pack catalog
- PDF detail
- pack detail
- in-app PDF reader
- AI assistant for purchased content
- wallet purchase for PDFs and packs
- library with packs and PDFs
- admin AI bulk upload
- admin PDF management
- admin pack management
- dashboard KPIs

Excluded:

- social feed
- events and parties
- messaging
- public comments
- subscriptions
- complete mobile money provider integration
- offline PDF download
- fully automatic publishing without admin review

## Success Criteria

- An admin can upload a batch of PDFs, receive AI metadata and pack proposals, correct
  issues, and publish documents and packs.
- A student can create a profile, see relevant packs, buy a pack, and read included PDFs.
- Buying a pack grants access to every included PDF without separate purchases.
- Full PDFs are not public and require valid purchase access.
- The dashboard shows only actionable KPIs and review queues.
