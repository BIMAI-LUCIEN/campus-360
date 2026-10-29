import assert from 'node:assert/strict';
import test from 'node:test';

import { loadTsWithPackages } from './helpers/load-ts.mjs';

const m = await loadTsWithPackages('lib/external-offer.ts');

test('externalOfferRequestSchema : une photo ou un texte de 30 caractères est exigé', () => {
  assert.equal(m.externalOfferRequestSchema.safeParse({}).success, false);
  assert.equal(m.externalOfferRequestSchema.safeParse({ text: 'trop court' }).success, false);
  assert.equal(m.externalOfferRequestSchema.safeParse({ text: 'Stage comptable chez Orange Douala, 3 mois, envoyer CV.' }).success, true);
  assert.equal(m.externalOfferRequestSchema.safeParse({ images: [{ mime: 'image/png', base64: 'iVBORw0KGgoAAAA' }] }).success, true);
  assert.equal(m.externalOfferRequestSchema.safeParse({ images: [{ mime: 'image/gif', base64: 'R0lGODlhAQABAAAA' }] }).success, false);
});

test('buildExternalOfferMessages : les images partent en data URL après le texte', () => {
  const [, user] = m.buildExternalOfferMessages({ images: [{ mime: 'image/jpeg', base64: 'abc123abc123' }] });
  assert.equal(user.content[0].type, 'text');
  assert.equal(user.content[1].image_url.url, 'data:image/jpeg;base64,abc123abc123');
});

test('parseExternalOffer : JSON entouré de texte, contacts invalides vidés', () => {
  const offer = m.parseExternalOffer(
    'Voici :\n{"isOffer":true,"kind":"emploi","title":"Comptable junior","company":"Afriland","requirements":["BTS", 4],"contactEmail":"pas un mail","contactWhatsapp":"+237 6 99 00 11 22"}',
  );
  assert.equal(offer.kind, 'emploi');
  assert.equal(offer.title, 'Comptable junior');
  assert.deepEqual(offer.requirements, ['BTS']);
  assert.equal(offer.contactEmail, '');
  assert.equal(offer.contactWhatsapp, '+237 6 99 00 11 22');
  assert.equal(offer.location, '');
});

test('parseExternalOffer : pas une offre, sans titre ou illisible → null', () => {
  assert.equal(m.parseExternalOffer(null), null);
  assert.equal(m.parseExternalOffer('rien'), null);
  assert.equal(m.parseExternalOffer('{"isOffer":false,"title":"Concert samedi"}'), null);
  assert.equal(m.parseExternalOffer('{"isOffer":true,"title":""}'), null);
});

test('externalOfferDescription : la date limite suit la description', () => {
  const offer = m.parseExternalOffer('{"title":"Stage RH","description":"Gestion des dossiers","deadline":"30 novembre"}');
  assert.equal(m.externalOfferDescription(offer), 'Gestion des dossiers\n\nDate limite : 30 novembre');
});
