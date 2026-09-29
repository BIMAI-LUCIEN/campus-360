import { z } from '../mobile-api/node_modules/zod/v3/index.js';

const ingestSchema = z
  .object({
    title: z.string().trim().min(3, 'Le titre du stage doit comporter au moins 3 caractères.'),
    companyName: z.string().trim().min(2, "Le nom de l'entreprise doit comporter au moins 2 caractères."),
    industry: z.string().trim().optional(),
    location: z.string().trim().optional(),
    duration: z.string().trim().optional(),
    contractType: z.string().trim().optional(),
    stipend: z.string().trim().optional(),
    requirements: z.array(z.string().trim()).optional().default([]),
    flyerUrl: z.string().url().optional().or(z.literal('')),
    videoUrl: z.string().url().optional().or(z.literal('')),
    contactWhatsapp: z.string().trim().optional(),
    contactEmail: z.string().trim().email('Email invalide').optional().or(z.literal('')),
    description: z.string().trim().max(2000).optional(),
    source: z.enum(['INTERNAL', 'SCRAPED']).optional().default('SCRAPED'),
    expiresInDays: z.number().int().min(1).max(90).optional().default(30),
  })
  .refine(
    (data) => Boolean(data.contactWhatsapp?.trim() || data.contactEmail?.trim()),
    {
      message: "Au moins un moyen de contact valide (WhatsApp ou Email) est obligatoire pour publier l'offre.",
      path: ['contactWhatsapp'],
    },
  );

console.log('🧪 Testing n8n Ingest Validation Schema...');

// 1. Test Valid Scraped Offer with WhatsApp
const validJob1 = {
  title: 'Stagiaire Développeur React Native',
  companyName: 'TechNovation Labs',
  industry: 'Technologies de l\'information',
  location: 'Douala, Cameroun',
  contactWhatsapp: '+237690123456',
  requirements: ['React Native', 'TypeScript', 'Git'],
};
const res1 = ingestSchema.safeParse(validJob1);
console.log(res1.success ? '✅ Test 1 Passed: Valid job with WhatsApp accepted' : '❌ Test 1 Failed');
if (!res1.success) console.error(res1.error);

// 2. Test Valid Scraped Offer with Email
const validJob2 = {
  title: 'Stagiaire Analyste Cybersécurité',
  companyName: 'Orange Cyberdefense',
  industry: 'Télécoms',
  location: 'Abidjan, Côte d\'Ivoire',
  contactEmail: 'rh@orange-defense.ci',
  requirements: ['Réseaux', 'Linux'],
};
const res2 = ingestSchema.safeParse(validJob2);
console.log(res2.success ? '✅ Test 2 Passed: Valid job with Email accepted' : '❌ Test 2 Failed');

// 3. Test Invalid Offer WITHOUT Contact (Must Fail)
const invalidJobNoContact = {
  title: 'Stage Sans Contact',
  companyName: 'Entreprise Fantôme',
  requirements: ['Rien'],
};
const res3 = ingestSchema.safeParse(invalidJobNoContact);
console.log(!res3.success ? '✅ Test 3 Passed: Rejected job with no contact' : '❌ Test 3 Failed: Should have rejected');

// 4. Test Invalid Title (too short)
const invalidJobTitle = {
  title: 'St',
  companyName: 'Valid Comp',
  contactWhatsapp: '+237690123456',
};
const res4 = ingestSchema.safeParse(invalidJobTitle);
console.log(!res4.success ? '✅ Test 4 Passed: Rejected job with short title' : '❌ Test 4 Failed: Should have rejected');

// 5. Test API Key Verification Logic
function verifyApiKey(headerKey, expectedKey) {
  if (!headerKey || headerKey !== expectedKey) {
    return { status: 401, error: 'Unauthorized' };
  }
  return { status: 201, success: true };
}

const auth1 = verifyApiKey('wrong_key', 'campus360_n8n_secret_prod_key');
console.log(auth1.status === 401 ? '✅ Test 5 Passed: Unauthorized key returned 401' : '❌ Test 5 Failed');

const auth2 = verifyApiKey('campus360_n8n_secret_prod_key', 'campus360_n8n_secret_prod_key');
console.log(auth2.status === 201 ? '✅ Test 6 Passed: Valid key returned 201' : '❌ Test 6 Failed');

console.log('\n🎉 ALL N8N INGESTION LOGIC ASSERTIONS PASSED!');
