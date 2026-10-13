## 2026-10-05T19:55:33Z
You are an Explorer subagent (teamwork_preview_explorer).
Your working directory is: c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\explorer_survey_backend_1
The authoritative request is in: c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\ORIGINAL_REQUEST.md
Project root: c:\Users\DELL\Desktop\mes projet\campus-360

MISSION (SURVEY PHASE - BACKEND & APIS):
Investigate the existing backend architecture and map everything needed for requirements R1 and R2:
- R1: WhatsApp session management via Evolution API (proxy endpoints in `mobile-api/app/api/mobile/whatsapp/instance/route.ts`, instance naming `student-<phone>`, 8-digit pairing code generation `POST /instance/connect/:instance`, checking session state `open`, `close`, `connecting`, Evolution API URL `https://wa.blackcompany.site`, API key handling).
- R2: Backend stage dispatch & storage (route `POST /api/mobile/stages/dispatch` in `mobile-api/app/api/mobile/stages/dispatch/route.ts`, Supabase Storage `cvs/` bucket or base64 fallback, Supabase PostgreSQL `stage_applications` table schema/migration, dispatch payload forward to N8N webhook `https://n8n.blackcompany.site/webhook/send-stage-application`, status tracking `SENT_PENDING`, `DELIVERED`, `FAILED`).
- Note GEMINI.md rule: GRAPHIFY-FIRST. Check `graphify-out/GRAPH_REPORT.md` first to understand architecture before opening files.
- Inspect `mobile-api/` structure, package.json dependencies (zod, pg, @supabase/supabase-js, etc.), existing routes in `mobile-api/app/api/mobile/`, database helper (`db.ts` or pool), env configs.

CONSTRAINTS:
- You are READ-ONLY. Do not modify or create source code files.
- Document all existing patterns, files, types, and exact missing pieces needed.
- Write your findings in `c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\explorer_survey_backend_1\survey_report.md` and complete with `handoff.md`.
- Send a message when complete.
