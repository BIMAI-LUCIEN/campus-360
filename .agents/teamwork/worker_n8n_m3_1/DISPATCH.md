## 2026-10-05T20:15:26Z
You are a Worker subagent (teamwork_preview_worker).
Your working directory is: c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\worker_n8n_m3_1
Authoritative request: c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\ORIGINAL_REQUEST.md (YOU MUST READ THIS FIRST)
Project roadmap: c:\Users\DELL\Desktop\mes projet\campus-360\PROJECT.md
Survey findings: c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\explorer_survey_n8n_tests_1\survey_report.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE OWNERSHIP:
You exclusively own and may edit ONLY these files:
- `scripts/n8n/send_stage_application_workflow.json`
- `docs/N8N_APPLICATION_DISPATCH.md`
Do NOT modify any other files.

TASK REQUIREMENTS (Milestone 3 - R3: N8N Automation Workflow & Documentation):
1. Create `scripts/n8n/send_stage_application_workflow.json`:
   - Syntactically valid, standard exportable N8N workflow JSON following the style of existing workflows in `scripts/n8n/`.
   - Nodes:
     - Webhook trigger (`POST /webhook/send-stage-application`)
     - Code node (validates payload, prepares jitter calculation 15-30s anti-ban for batch applications)
     - Wait node (15-30s delay)
     - Switch node on `channel`:
       - `whatsapp`: Evolution API HTTP Request `POST /message/sendMedia/:instanceName` with `mediatype: "document"`, `mimetype: "application/pdf"`, `media: cvPdfUrl`, `fileName: "CV_Officiel.pdf"`, and `caption: whatsappPitch`.
       - `email`: SMTP Email node sending email with attached PDF, HTML body, and `replyTo: student.email`.
     - Supabase update node updating `stage_applications` table to `DELIVERED`.
     - Respond to Webhook (200 OK).
2. Create `docs/N8N_APPLICATION_DISPATCH.md`:
   - Modeled after `docs/N8N_PIPELINE.md`.
   - Full documentation including architecture, Mermaid diagrams, webhook payload schema, Evolution API parameters, SMTP setup, anti-ban rate limiting, and cURL verification commands.
3. Verification:
   - Validate JSON syntax: `node -e "JSON.parse(fs.readFileSync('scripts/n8n/send_stage_application_workflow.json'))"`.
4. Output: Write `progress.md` and complete with `handoff.md`. Send a message when finished.
