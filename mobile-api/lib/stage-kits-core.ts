// Pure SQL operations for stage_application_kits on a passed pg client.
// Self-contained (no imports) so unit tests can drive it with an in-memory client.

export const MAX_KIT_QUESTIONS = 5;

export type KitReadyAnswers = {
  presentation: string;
  whyThisRole: string;
  availability: string;
  keySkills: string;
};

export type KitCustomQuestion = {
  question: string;
  answer: string;
  createdAt: string;
};

export type KitAnswersPayload = {
  ready?: KitReadyAnswers;
  customQuestions: KitCustomQuestion[];
};

export type StageApplicationKit = {
  id: string;
  userId: string;
  jobId: string;
  letter: string;
  answers: KitAnswersPayload;
  questionsUsed: number;
  questionsRemaining: number;
  createdAt: string;
  updatedAt: string;
};

export type KitDbClient = {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }>;
};

const normalizeAnswers = (raw: unknown): KitAnswersPayload => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { customQuestions: [] };
  }
  const obj = raw as Record<string, unknown>;
  let ready: KitReadyAnswers | undefined;
  if (obj.ready && typeof obj.ready === 'object' && !Array.isArray(obj.ready)) {
    const r = obj.ready as Record<string, unknown>;
    if (
      typeof r.presentation === 'string' &&
      typeof r.whyThisRole === 'string' &&
      typeof r.availability === 'string' &&
      typeof r.keySkills === 'string'
    ) {
      ready = {
        presentation: r.presentation,
        whyThisRole: r.whyThisRole,
        availability: r.availability,
        keySkills: r.keySkills,
      };
    }
  }
  const customQuestions: KitCustomQuestion[] = Array.isArray(obj.customQuestions)
    ? obj.customQuestions
        .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
        .filter((item) => typeof item.question === 'string' && typeof item.answer === 'string')
        .map((item) => ({
          question: String(item.question),
          answer: String(item.answer),
          createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
        }))
    : [];
  return ready ? { ready, customQuestions } : { customQuestions };
};

const toIso = (val: unknown): string => {
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'string' && val) return val;
  return new Date().toISOString();
};

export const mapKitRow = (row: Record<string, unknown>): StageApplicationKit => {
  const used = Math.min(MAX_KIT_QUESTIONS, Math.max(0, Number(row.questions_used ?? 0)));
  return {
    id: String(row.id ?? ''),
    userId: String(row.user_id ?? ''),
    jobId: String(row.job_id ?? ''),
    letter: String(row.letter ?? ''),
    answers: normalizeAnswers(row.answers),
    questionsUsed: used,
    questionsRemaining: Math.max(0, MAX_KIT_QUESTIONS - used),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
};

export const getStageKitOn = async (
  client: KitDbClient,
  userId: string,
  jobId: string,
): Promise<StageApplicationKit | null> => {
  const res = await client.query(
    `select id, user_id, job_id, letter, answers, questions_used, created_at, updated_at
       from public.stage_application_kits
      where user_id = $1 and job_id = $2
      limit 1`,
    [userId, jobId],
  );
  if (!res.rows[0]) return null;
  return mapKitRow(res.rows[0]);
};

export const upsertStageKitLetterOn = async (
  client: KitDbClient,
  userId: string,
  jobId: string,
  letter: string,
): Promise<StageApplicationKit> => {
  const res = await client.query(
    `insert into public.stage_application_kits (user_id, job_id, letter)
     values ($1, $2, $3)
     on conflict (user_id, job_id) do update
       set letter = case when excluded.letter <> '' then excluded.letter else public.stage_application_kits.letter end,
           updated_at = now()
     returning id, user_id, job_id, letter, answers, questions_used, created_at, updated_at`,
    [userId, jobId, letter],
  );
  return mapKitRow(res.rows[0]);
};

export const saveKitReadyAnswersOn = async (
  client: KitDbClient,
  userId: string,
  jobId: string,
  ready: KitReadyAnswers,
): Promise<StageApplicationKit> => {
  const res = await client.query(
    `insert into public.stage_application_kits (user_id, job_id, answers)
     values ($1, $2, jsonb_build_object('ready', $3::jsonb, 'customQuestions', '[]'::jsonb))
     on conflict (user_id, job_id) do update
       set answers = jsonb_set(
             coalesce(public.stage_application_kits.answers, '{"customQuestions":[]}'::jsonb),
             '{ready}',
             $3::jsonb,
             true
           ),
           updated_at = now()
     returning id, user_id, job_id, letter, answers, questions_used, created_at, updated_at`,
    [userId, jobId, JSON.stringify(ready)],
  );
  return mapKitRow(res.rows[0]);
};

export const reserveKitQuestionSlotOn = async (
  client: KitDbClient,
  userId: string,
  jobId: string,
): Promise<number | null> => {
  await client.query(
    `insert into public.stage_application_kits (user_id, job_id)
     values ($1, $2)
     on conflict (user_id, job_id) do nothing`,
    [userId, jobId],
  );
  const updated = await client.query(
    `update public.stage_application_kits
        set questions_used = questions_used + 1,
            updated_at = now()
      where user_id = $1 and job_id = $2 and questions_used < $3
      returning questions_used`,
    [userId, jobId, MAX_KIT_QUESTIONS],
  );
  if (!updated.rows[0]) return null;
  return Number(updated.rows[0].questions_used);
};

export const releaseKitQuestionSlotOn = async (
  client: KitDbClient,
  userId: string,
  jobId: string,
): Promise<number> => {
  const updated = await client.query(
    `update public.stage_application_kits
        set questions_used = greatest(0, questions_used - 1),
            updated_at = now()
      where user_id = $1 and job_id = $2
      returning questions_used`,
    [userId, jobId],
  );
  return Number(updated.rows[0]?.questions_used ?? 0);
};

export const appendKitCustomQuestionOn = async (
  client: KitDbClient,
  userId: string,
  jobId: string,
  item: KitCustomQuestion,
): Promise<StageApplicationKit> => {
  const res = await client.query(
    `update public.stage_application_kits
        set answers = jsonb_set(
              coalesce(answers, '{"customQuestions":[]}'::jsonb),
              '{customQuestions}',
              coalesce(answers->'customQuestions', '[]'::jsonb) || jsonb_build_array($3::jsonb),
              true
            ),
            updated_at = now()
      where user_id = $1 and job_id = $2
      returning id, user_id, job_id, letter, answers, questions_used, created_at, updated_at`,
    [userId, jobId, JSON.stringify(item)],
  );
  return mapKitRow(res.rows[0]);
};
