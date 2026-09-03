import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

test('1. Social Scraper Agent Architecture & Modules', async (t) => {
  const agentFiles = [
    'scripts/agents/config.py',
    'scripts/agents/linkedin_agent.py',
    'scripts/agents/facebook_agent.py',
    'scripts/agents/web_academic_agent.py',
    'scripts/agents/ai_analyzer_agent.py',
    'scripts/agents/database_ingestor.py',
    'scripts/agents/orchestrator.py',
    'scripts/agents/run_scraper.py',
  ];

  for (const file of agentFiles) {
    const fullPath = path.join(rootDir, file);
    assert.ok(fs.existsSync(fullPath), `Agent file must exist: ${file}`);
    const stat = fs.statSync(fullPath);
    assert.ok(stat.size > 200, `Agent file must not be empty: ${file}`);
  }
});

test('2. Scraped Reports Supabase Table & API Endpoint', async (t) => {
  const apiRoutePath = path.join(rootDir, 'mobile-api', 'app', 'api', 'mobile', 'documents', 'scraped-reports', 'route.ts');
  assert.ok(fs.existsSync(apiRoutePath), 'scraped-reports API route must exist');

  const content = fs.readFileSync(apiRoutePath, 'utf8');
  assert.match(content, /public\.scraped_stage_reports/, 'Route queries scraped_stage_reports table');
  assert.match(content, /withCors/, 'Route uses withCors for mobile access');
  assert.match(content, /quality_score/, 'Route orders by quality score');
});
