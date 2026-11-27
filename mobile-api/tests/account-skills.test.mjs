import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const source = fs.readFileSync(path.resolve('lib/account-skills.ts'), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { sanitizeSkills, MAX_ACCOUNT_SKILLS } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
);

test('sanitizeSkills nettoie les espaces, filtre < 2 caractères et déduplique sans casser la casse', () => {
  const result = sanitizeSkills(['  React   Native ', 'a', '', 'react native', 'SQL', 'sql', 'Node.js']);
  assert.deepEqual(result, ['React Native', 'SQL', 'Node.js']);
});

test('sanitizeSkills accepte une liste vide (retrait complet possible)', () => {
  assert.deepEqual(sanitizeSkills([]), []);
});

test('sanitizeSkills plafonne à MAX_ACCOUNT_SKILLS (20) et tronque à 60 caractères', () => {
  const longSkill = 'A'.repeat(90);
  const many = [longSkill, ...Array.from({ length: 25 }, (_, i) => `Compétence ${i + 1}`)];
  const result = sanitizeSkills(many);
  assert.equal(result.length, MAX_ACCOUNT_SKILLS);
  assert.equal(result[0].length, 60);
});

test('route /api/mobile/account lit et met à jour les compétences dans stage_students', () => {
  const routeSource = fs.readFileSync(path.resolve('app/api/mobile/account/route.ts'), 'utf8');
  assert.match(routeSource, /loadStudentSkills/);
  assert.match(routeSource, /skills:\s*z\.array/);
  assert.match(routeSource, /update public\.stage_students set skills = \$2 where id = \$1/);
});
