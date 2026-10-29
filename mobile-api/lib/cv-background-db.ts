import { cvBackgroundSchema, type CvBackground } from './cv-background';
import { databasePool } from './database';

export const getCvBackground = async (userId: string): Promise<CvBackground | null> => {
  const result = await databasePool.query<{ cv_background: unknown }>(
    'select cv_background from public.app_users where id = $1',
    [userId],
  );
  const parsed = cvBackgroundSchema.safeParse(result.rows[0]?.cv_background ?? null);
  return parsed.success ? parsed.data : null;
};

export const saveCvBackground = async (userId: string, background: CvBackground): Promise<void> => {
  await databasePool.query(
    'update public.app_users set cv_background = $2::jsonb, updated_at = now() where id = $1',
    [userId, JSON.stringify(background)],
  );
};
