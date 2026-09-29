import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { ingestStageJob } from '@/lib/stages-db';
import { mobileErrorResponse, withCors } from '@/lib/mobile-access';

export const runtime = 'nodejs';

export const OPTIONS = (request: NextRequest) =>
  withCors(new NextResponse(null, { status: 204 }), request);

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

export async function POST(request: NextRequest) {
  try {
    // 1. Authentification sécurisée de l'agent n8n
    const apiKey =
      request.headers.get('x-n8n-api-key') ||
      request.headers.get('X-N8N-API-KEY') ||
      request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

    const expectedKey = process.env.N8N_INGESTION_SECRET || 'campus360_n8n_secret_prod_key';

    if (!apiKey || apiKey !== expectedKey) {
      return withCors(
        NextResponse.json(
          {
            error: 'Non autorisé : Clé API X-N8N-API-KEY invalide ou absente.',
            success: false,
          },
          { status: 401 },
        ),
        request,
      );
    }

    // 2. Validation Zod stricte du payload
    const rawBody = await request.json().catch(() => ({}));
    const validated = ingestSchema.parse(rawBody);

    // 3. Persistance & Dédoublonnage atomique en base
    const result = await ingestStageJob({
      title: validated.title,
      companyName: validated.companyName,
      industry: validated.industry,
      location: validated.location,
      duration: validated.duration,
      contractType: validated.contractType,
      stipend: validated.stipend,
      requirements: validated.requirements,
      flyerUrl: validated.flyerUrl || undefined,
      videoUrl: validated.videoUrl || undefined,
      contactWhatsapp: validated.contactWhatsapp || undefined,
      contactEmail: validated.contactEmail || undefined,
      description: validated.description,
      source: validated.source,
      expiresInDays: validated.expiresInDays,
    });

    return withCors(
      NextResponse.json(
        {
          success: true,
          jobId: result.jobId,
          companyId: result.companyId,
          isNew: result.isNew,
          message: result.isNew
            ? 'Nouvelle offre de stage ingérée avec succès.'
            : 'Offre existante identifiée et actualisée sans duplication.',
        },
        { status: 201 },
      ),
      request,
    );
  } catch (error) {
    return mobileErrorResponse(error, request);
  }
}
