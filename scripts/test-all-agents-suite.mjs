import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

test('1. Python AI Agents Integrity & Modules', async (t) => {
  const code = "import sys; sys.path.insert(0, 'scripts/agents'); from config import SUPABASE_URL; from cameroon_jobs_agent import CameroonJobsAgent; from linkedin_agent import LinkedInScraperAgent; from facebook_agent import FacebookScraperAgent; from web_academic_agent import WebAcademicAgent; from ai_analyzer_agent import AIAnalyzerAgent; from database_ingestor import DatabaseIngestor; from orchestrator import ScraperOrchestrator; from daily_scheduler import CAMEROON_SECTORS; from in_app_push_notifier_agent import InAppPushNotifierAgent; from ocr_flyer_agent import OCRFlyerAgent; from defense_coach_agent import DefenseCoachAgent; from company_direct_reach_agent import CompanyDirectReachAgent; print('ALL_AGENTS_IMPORTED_OK')";
  const output = execSync(`python -c "${code}"`, { cwd: rootDir, encoding: 'utf8' });
  assert.match(output, /ALL_AGENTS_IMPORTED_OK/, 'All Python agent modules must load without error');
});

test('2. Live Multi-Agent Pipeline Run (Cameroon Jobs & Stage Reports)', async (t) => {
  const runScript = `python scripts/agents/run_scraper.py --platforms CAMEROON_JOBS,LINKEDIN,FACEBOOK,ACADEMIC_WEB --query "génie logiciel Douala" --limit 1`;
  const output = execSync(runScript, { cwd: rootDir, encoding: 'utf8' });

  assert.match(output, /DÉPLOIEMENT DES AGENTS DE SCRAPING/, 'Orchestrator CLI header printed');
  assert.match(output, /RAPPORT D'EXÉCUTION DE LA MISSION/, 'Execution summary produced');
  assert.match(output, /Documents collectés/, 'Collected documents counted');
});

test('3. Database Ingestion Verification (Supabase Tables)', async (t) => {
  const code = "import requests, os; from scripts.agents.config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY; headers = {'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY}; r1 = requests.get(SUPABASE_URL + '/rest/v1/scraped_stage_reports?select=id', headers=headers); r2 = requests.get(SUPABASE_URL + '/rest/v1/stage_jobs?select=id', headers=headers); r3 = requests.get(SUPABASE_URL + '/rest/v1/stage_companies?select=id', headers=headers); print('DB_CHECK_OK', r1.status_code, r2.status_code, r3.status_code)";
  const output = execSync(`python -c "${code}"`, { cwd: rootDir, encoding: 'utf8' });
  assert.match(output, /DB_CHECK_OK 200 200 200/, 'Supabase tables exist and return status 200');
});

test('4. Mobile API Endpoints Integrity', async (t) => {
  const routes = [
    'mobile-api/app/api/mobile/documents/scraped-reports/route.ts',
    'mobile-api/app/api/mobile/stages/route.ts',
    'mobile-api/app/api/ai/pdf-chat/route.ts',
    'mobile-api/app/api/mobile/documents/generate-full/route.ts',
    'mobile-api/app/api/mobile/documents/defense-coach/route.ts',
    'mobile-api/app/api/mobile/stages/direct-reach/route.ts',
  ];

  for (const r of routes) {
    const fullPath = path.join(rootDir, r);
    assert.ok(fs.existsSync(fullPath), `API Route must exist: ${r}`);
  }
});
