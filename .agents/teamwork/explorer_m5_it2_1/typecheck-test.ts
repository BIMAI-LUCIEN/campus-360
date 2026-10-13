import { z } from '../../../mobile-api/node_modules/zod';

const emptyStringToUndefined = (val: unknown) => {
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return trimmed === '' ? undefined : trimmed;
  }
  return val === null ? undefined : val;
};

const dispatchSchema = z.object({
  jobId: z.string().trim().min(1, 'jobId requis'),
  channel: z.enum(['whatsapp', 'email']),
  whatsappPitch: z.string().trim().max(10_000).optional(),
  letterText: z.string().trim().max(50_000).optional(),
  cvPdfBase64: z.string().trim().optional(),
  cvPdfUrl: z.preprocess(
    emptyStringToUndefined,
    z.string().trim().url().optional().or(z.literal(''))
  ),
  studentNotes: z.string().trim().max(5_000).optional(),
  studentName: z.string().trim().max(200).optional(),
  studentEmail: z.preprocess(
    emptyStringToUndefined,
    z.string().trim().email().optional().or(z.literal(''))
  ),
  studentPhone: z.string().trim().max(30).optional(),
  phoneNumber: z.string().trim().max(30).optional(),
});

type DispatchInput = z.infer<typeof dispatchSchema>;

const testInput: DispatchInput = {
  jobId: 'j-1',
  channel: 'whatsapp',
  studentEmail: undefined,
  cvPdfUrl: undefined,
};

const userEmail: string = testInput.studentEmail || 'fallback@test.com';
const cvUrl: string | undefined = testInput.cvPdfUrl || undefined;

console.log(userEmail, cvUrl);
