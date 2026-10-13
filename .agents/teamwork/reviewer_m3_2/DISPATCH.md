## 2026-10-08T06:57:57Z
You are Reviewer 2 for Milestone M3 (Immersive Stage Detail Screen & Clean White Feed) in Campus 360.

Working directory: c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\reviewer_m3_2\
Ensure you maintain your progress.md and handoff.md in that directory.

MANDATORY: Read the user request at:
c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\ORIGINAL_REQUEST.md (§R3, §R4, and §R5)
and the worker handoff report at:
c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\worker_m3_1\handoff.md

YOUR MISSION:
Perform an adversarial and robustness review of `src/ui/screens/StagesScreen.tsx`:
1. Stress test edge cases in data handling:
   - Missing company data, null/empty recruiter contact details, missing skills array, missing stipend, empty workspace photos array.
   - Null handling in `getWorkspacePhotos` and `getRotatingJobBanner`.
2. Inspect UX/UI edge cases:
   - Safe area handling on iOS devices (top notch and bottom home indicator).
   - Modal collision or presentation stack issues between detail screen modal and `AiApplyModal`.
   - Direction button URL encoding and deep link fallbacks.
   - Phone sanitization for WhatsApp contact (`cleanPhoneNumber`).
3. Run verification commands:
   - `npm run typecheck`
   - `cd mobile-api && npm run typecheck`
4. Provide a clear verdict: `APPROVE` or `REQUEST_CHANGES` with detailed reasoning in your handoff.md. Send a message back when completed.
