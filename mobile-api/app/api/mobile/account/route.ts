import { freeLaunchState } from '@/lib/free-launch';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { databasePool } from '@/lib/database';
import { corsPreflight, MobileApiError, mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';
import { ACCOUNT_DELETION_CONFIRM, deleteAccount } from '@/lib/account-deletion';
import { getInstanceName, logoutInstance } from '@/lib/evolution-api';
import { canStoreFiles, deleteStoredFile } from '@/lib/file-storage';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function OPTIONS(request: NextRequest) {
  return corsPreflight(request);
}

// Partial update: every field is optional and an empty string means "keep the current value".
// The profile is filled progressively (sign-up: name, onboarding: studies, first application: WhatsApp).
const phoneField = z
  .string()
  .trim()
  .max(20)
  .refine((value) => value === '' || (value.length >= 6 && /^[+0-9 ()\-]+$/.test(value)), 'Telephone invalide.')
  .optional();
const textField = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((value) => value === '' || value.length >= 2, 'Valeur trop courte.')
    .optional();

const updateProfileSchema = z.object({
  name: textField(120),
  phone: phoneField,
  whatsappPhone: phoneField,
  university: textField(120),
  faculty: textField(120),
  level: z.string().trim().max(60).optional(),
});

const MAX_BODY_BYTES = 4 * 1024;

export async function GET(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    const user = access.user;

    // No fake balance or identity on failure: a DB error surfaces as an error response.
    const [wallet, documents, packs, transactions] = await Promise.all([
      databasePool.query('select balance_coins, ia_credits, report_credits from public.app_wallets where user_id = $1', [user.id]),
      databasePool.query('select document_id from public.app_document_purchases where buyer_id = $1', [user.id]),
      databasePool.query('select pack_id, document_ids from public.app_pack_purchases where buyer_id = $1', [user.id]),
      databasePool.query(
        `select
           tx.id,
           tx.type,
           tx.amount_coins,
           tx.reference_id,
           tx.status,
           tx.created_at,
           d.title as document_title,
           p.title as pack_title
         from public.app_wallet_transactions tx
         left join public.documents d on d.id = tx.reference_id
         left join public.pdf_packs p on p.id = tx.reference_id
         where tx.user_id = $1
         order by tx.created_at desc limit 30`,
        [user.id],
      ),
    ]);

    const packDocumentIds = packs.rows.flatMap((row) => row.document_ids ?? []);
    return withCors(
      NextResponse.json({
        user: {
          id: user.id,
          email: user.email ?? undefined,
          name: user.name ?? '',
          role: user.role ?? 'student',
          phone: user.phone ?? undefined,
          whatsappPhone: user.whatsappPhone ?? undefined,
          university: user.university ?? undefined,
          faculty: user.faculty ?? undefined,
          level: user.level ?? undefined,
        },
        wallet: {
          balanceCoins: Number(wallet.rows[0]?.balance_coins ?? 0),
          iaCredits: Number(wallet.rows[0]?.ia_credits ?? 0),
          reportCredits: Number(wallet.rows[0]?.report_credits ?? 0),
          freeLaunch: freeLaunchState().active,
          freeLaunchUntil: freeLaunchState().until,
        },
        purchasedDocumentIds: Array.from(
          new Set([
            ...documents.rows.map((row) => String(row.document_id)),
            ...packDocumentIds.map(String),
          ]),
        ),
        purchasedPackIds: packs.rows.map((row) => String(row.pack_id)),
        transactions: transactions.rows.map((row) => ({
          ...row,
          reference_title: row.document_title ?? row.pack_title ?? null,
          reference_kind: row.document_title ? 'document' : row.pack_title ? 'pack' : null,
        })),
      }),
      request,
    );
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      return withCors(NextResponse.json({ error: 'Requete trop volumineuse.' }, { status: 413 }), request);
    }
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    const user = access.user;

    const body = await request.json().catch(() => null);
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      throw new MobileApiError('Profil etudiant incomplet.');
    }

    const result = await databasePool.query(
      `update public.app_users
       set
         name = coalesce(nullif($2, ''), name),
         phone = coalesce(nullif($3, ''), phone),
         whatsapp_phone = coalesce(nullif($4, ''), whatsapp_phone),
         university = coalesce(nullif($5, ''), university),
         faculty = coalesce(nullif($6, ''), faculty),
         level = coalesce(nullif($7, ''), level),
         updated_at = now()
       where id = $1
       returning id, email, name, role, phone, whatsapp_phone, university, faculty, level`,
      [
        user.id,
        parsed.data.name ?? '',
        parsed.data.phone ?? '',
        parsed.data.whatsappPhone ?? '',
        parsed.data.university ?? '',
        parsed.data.faculty ?? '',
        parsed.data.level ?? '',
      ],
    );

    const row = result.rows[0];
    return withCors(
      NextResponse.json({
        id: String(row.id),
        email: row.email ? String(row.email) : undefined,
        name: String(row.name),
        role: String(row.role),
        phone: row.phone ? String(row.phone) : undefined,
        whatsappPhone: row.whatsapp_phone ? String(row.whatsapp_phone) : undefined,
        university: row.university ? String(row.university) : undefined,
        faculty: row.faculty ? String(row.faculty) : undefined,
        level: row.level ? String(row.level) : undefined,
      }),
      request,
    );
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}


const deleteAccountSchema = z.object({
  confirm: z.literal(ACCOUNT_DELETION_CONFIRM),
}).strict();

export async function DELETE(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    const user = access.user;

    await rateLimit(request, {
      bucket: 'account-delete',
      max: 3,
      windowMs: 60 * 60_000,
      key: user.id,
      failMode: 'closed',
    });

    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (contentLength > 1024) {
      return withCors(NextResponse.json({ error: 'Requete trop volumineuse.' }, { status: 413 }), request);
    }

    const body = await request.json().catch(() => null);
    const parsed = deleteAccountSchema.safeParse(body);
    if (!parsed.success) {
      return withCors(
        NextResponse.json({ error: 'Tape SUPPRIMER pour confirmer la suppression.' }, { status: 400 }),
        request,
      );
    }

    const result = await deleteAccount(
      {
        appUserId: user.id,
        betterAuthUserId: user.betterAuthUserId,
        email: user.email,
      },
      {
        pool: databasePool,
        logoutWhatsApp: async () => {
          const phone = user.whatsappPhone || user.phone;
          if (!phone) return false;
          return logoutInstance(getInstanceName(phone));
        },
        deleteFile: deleteStoredFile,
        canStoreFiles,
      },
    );

    const res = NextResponse.json({ success: true, whatsapp: result.whatsapp });
    res.cookies.set('better-auth.session_token', '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      expires: new Date(0),
    });
    return withCors(res, request);
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}
