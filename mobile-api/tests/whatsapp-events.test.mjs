import assert from 'node:assert/strict';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

const { parseWhatsAppEvent, phoneKey } = await loadTs('lib/whatsapp-events.ts');

test('messages.upsert entrant du recruteur : détecté', () => {
  const event = parseWhatsAppEvent({
    event: 'messages.upsert',
    instance: 'student-237690000001',
    data: { key: { remoteJid: '237670000002@s.whatsapp.net', fromMe: false }, message: { conversation: 'Bonjour' } },
  });
  assert.deepEqual(event, { kind: 'incoming', instance: 'student-237690000001', fromPhone: '237670000002' });
});

test('messages ignorés : envoyés par l’étudiant, groupe, statut, autre instance', () => {
  const base = { event: 'messages.upsert', instance: 'student-237690000001' };
  assert.equal(parseWhatsAppEvent({ ...base, data: { key: { remoteJid: '237670000002@s.whatsapp.net', fromMe: true } } }).kind, 'ignored');
  assert.equal(parseWhatsAppEvent({ ...base, data: { key: { remoteJid: '123-456@g.us', fromMe: false } } }).kind, 'ignored');
  assert.equal(parseWhatsAppEvent({ ...base, data: { key: { remoteJid: 'status@broadcast', fromMe: false } } }).kind, 'ignored');
  assert.equal(parseWhatsAppEvent({ event: 'messages.upsert', instance: 'admin', data: { key: { remoteJid: '237670000002@s.whatsapp.net' } } }).kind, 'ignored');
  assert.equal(parseWhatsAppEvent(null).kind, 'ignored');
});

test('connection.update : état ouvert ou fermé', () => {
  assert.deepEqual(parseWhatsAppEvent({ event: 'CONNECTION_UPDATE', instance: 'student-237690000001', data: { state: 'open' } }), {
    kind: 'connection',
    instance: 'student-237690000001',
    connected: true,
  });
  assert.equal(parseWhatsAppEvent({ event: 'connection.update', instance: 'student-237690000001', data: { state: 'close' } }).connected, false);
});

test('phoneKey : même numéro avec ou sans 237', () => {
  assert.equal(phoneKey('+237 6 70 00 00 02'), phoneKey('670000002'));
});
