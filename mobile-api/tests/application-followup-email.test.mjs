import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

const { buildFollowupEmail } = await loadTs('lib/application-followup-email.ts');

const base = { studentName: 'Awa Ngono', jobTitle: 'Stage comptable', companyName: 'Sabc', appliedAt: '2026-11-01T10:00:00Z' };

test('relance : poste, entreprise, date et nom, sans accord masculin ou féminin', () => {
  const mail = buildFollowupEmail(base);
  assert.equal(mail.subject, 'Relance de candidature : Stage comptable (Awa Ngono)');
  assert.match(mail.message, /candidature du 1 novembre 2026 pour le poste « Stage comptable » chez Sabc/);
  assert.match(mail.message, /Bien cordialement,\nAwa Ngono/);
  assert.match(mail.text, /via Campus 360/);
  assert.ok(!/motivé/i.test(mail.text));
});

test('relance : le HTML du nom et du titre est échappé', () => {
  const mail = buildFollowupEmail({ ...base, studentName: '<script>x</script>', jobTitle: '<img src=x onerror=y>' });
  assert.ok(!mail.html.includes('<script>'));
  assert.ok(!mail.html.includes('<img'));
  assert.ok(mail.html.includes('&lt;script&gt;'));
});

test('relance : un retour à la ligne ne passe pas dans l’objet', () => {
  const mail = buildFollowupEmail({ ...base, jobTitle: 'Stage\r\nBcc: autre@exemple.cm', studentName: 'Awa\nNgono' });
  assert.ok(!/[\r\n]/.test(mail.subject));
  assert.equal(mail.subject, 'Relance de candidature : Stage Bcc: autre@exemple.cm (Awa Ngono)');
});

test('relance : sans entreprise ni titre, le message reste correct', () => {
  const mail = buildFollowupEmail({ ...base, companyName: null, jobTitle: '  ' });
  assert.match(mail.message, /pour le poste « votre offre de stage »\./);
});

test('mailer : replyTo optionnel, les appels existants ne changent pas', () => {
  const mailer = fs.readFileSync(path.resolve('lib/mailer.ts'), 'utf8');
  assert.match(mailer, /replyTo\?: string/);
  assert.match(mailer, /\.\.\.\(replyTo \? \{ replyTo \} : \{\}\)/);
});
