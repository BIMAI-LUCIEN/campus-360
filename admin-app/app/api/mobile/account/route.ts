import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { databasePool } from '@/lib/database';
import { MobileApiError, mobileErrorResponse, requireMobileUser } from '@/lib/mobile-access';

export const runtime = 'nodejs';

const updateProfileSchema = z.object({
  name: z.string().trim().min(2),
  phone: z.string().trim().min(6),
  whatsappPhone: z.string().trim().min(6),
  university: z.string().trim().min(2),
  faculty: z.string().trim().min(2),
  level: z.string().trim().optional().default(''),
});

export async function GET(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response) return access.response;
    const user = access.user;

    const [wallet, documents, packs, transactions] = await Promise.all([
      databasePool.query('select balance_coins, ia_credits from public.app_wallets where user_id = $1', [user.id]),
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
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        whatsappPhone: user.whatsappPhone,
        university: user.university,
        faculty: user.faculty,
        level: user.level,
      },
      wallet: {
        balanceCoins: Number(wallet.rows[0]?.balance_coins ?? 0),
        iaCredits: Number(wallet.rows[0]?.ia_credits ?? 0),
      },
      subscription: {
        tier: String(user.subscription_tier || 'free'),
        expiresAt: user.subscription_expires_at ? new Date(user.subscription_expires_at).toISOString() : null,
      },
      purchasedDocumentIds: Array.from(new Set([
        ...documents.rows.map((row) => String(row.document_id)),
        ...packDocumentIds.map(String),
      ])),
      purchasedPackIds: packs.rows.map((row) => String(row.pack_id)),
      transactions: transactions.rows.map((row) => ({
        ...row,
        reference_title: row.document_title ?? row.pack_title ?? null,
        reference_kind: row.document_title ? 'document' : row.pack_title ? 'pack' : null,
      })),
    });
  } catch (error) {
    return mobileErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response) return access.response;

    const body = await request.json().catch(() => null);
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      throw new MobileApiError('Profil etudiant incomplet.');
    }

    await databasePool.query(`
      alter table public.app_users add column if not exists phone text;
      alter table public.app_users add column if not exists whatsapp_phone text;
    `);

    const result = await databasePool.query(
      `update public.app_users
       set
         name = $2,
         phone = $3,
         whatsapp_phone = $4,
         university = $5,
         faculty = $6,
         level = nullif($7, ''),
         updated_at = now()
       where id = $1
       returning id, email, name, role, phone, whatsapp_phone, university, faculty, level`,
      [
        access.user.id,
        parsed.data.name,
        parsed.data.phone,
        parsed.data.whatsappPhone,
        parsed.data.university,
        parsed.data.faculty,
        parsed.data.level ?? '',
      ],
    );

    const row = result.rows[0];
    return NextResponse.json({
      id: String(row.id),
      email: row.email ? String(row.email) : undefined,
      name: String(row.name),
      role: String(row.role),
      phone: row.phone ? String(row.phone) : undefined,
      whatsappPhone: row.whatsapp_phone ? String(row.whatsapp_phone) : undefined,
      university: row.university ? String(row.university) : undefined,
      faculty: row.faculty ? String(row.faculty) : undefined,
      level: row.level ? String(row.level) : undefined,
    });
  } catch (error) {
    return mobileErrorResponse(error);
  }
}
