## Challenge Summary

**Overall risk assessment**: LOW

The overall implementation is solid and robust against main error cases (e.g. database errors in analytics dashboard, missing files during deletion). Some edge cases could be improved to prevent unnecessary state resets or 500 API responses.

## Challenges

### [Medium] Challenge 1: Invalid/Corrupted PDF Uploads
- **Assumption challenged**: Assumes all files uploaded with mime-type `application/pdf` are valid, well-formed PDFs.
- **Attack scenario**: A user uploads an empty file or a corrupted PDF named `test.pdf`.
- **Blast radius**: The call to `PDFDocument.load` will fail and throw an exception, leading to a 500 response from the Next.js backend instead of a clean 400 validation error.
- **Mitigation**: Add a try-catch block around the PDF preview generation and database creation inside `/api/pdf/route.ts` and return a `400 Bad Request` with an appropriate message.

### [Low] Challenge 2: Dashboard Metrics Reset to Zero on DB Connection Glitch
- **Assumption challenged**: Assumes database queries inside `getSupabasePdfAnalytics` will never fail unless configuration is missing.
- **Attack scenario**: A brief database connection pool exhaustion or network failure occurs during one of the periodic 10-second updates.
- **Blast radius**: `getSupabasePdfAnalytics` catches the exception and returns `emptyAnalytics(true)`. The frontend client receives this and resets the dashboard's display (showing 0 sessions, 0 revenue, empty charts) for at least 10 seconds.
- **Mitigation**: Modify the client-side state machine in `AnalyticsDashboard.tsx` to retain the last successfully loaded analytics if the API returns empty/default statistics during an active session, or display a "Sync failed - showing stale data" warning instead of setting everything to 0.

## Stress Test Results

- **Corrupted PDF Upload** → `PDFDocument.load(corruptedBytes)` throws an error → API fails with 500 error → **FAIL** (mitigation recommended)
- **Non-existent Local File Deletion** → `unlink(localPath)` throws `ENOENT` → caught and handled gracefully → **PASS**
- **Non-existent Supabase Storage File Deletion** → `fetch` DELETE returns 404 → caught and handled gracefully without throwing → **PASS**
- **Database Query Failure in Analytics** → `getSupabasePdfAnalytics` catches error → returns empty stats gracefully → **PASS**

## Unchallenged Areas

- **Supabase Storage upload rates / limits** — reason not challenged: limits are external to the application logic and governed by the service provider quotas.
