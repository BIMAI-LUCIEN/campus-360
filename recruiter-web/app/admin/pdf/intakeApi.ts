// Calls to the batch PDF import and contribution review (Module 27), through
// the /api/pdf/intake relay (admin session checked there, logic in mobile-api).

export type IntakeStatus =
  | 'analyzing'
  | 'duplicate'
  | 'probable_duplicate'
  | 'ready'
  | 'pending_review'
  | 'published'
  | 'rejected';

export type IntakeSheet = {
  title?: string;
  subject?: string;
  school?: string;
  year?: string;
  level?: string;
  kind?: string;
  summary?: string;
  keywords?: string[];
};

export type IntakeUpload = {
  id: string;
  batchId: string;
  status: IntakeStatus;
  originalName: string;
  sheet: IntakeSheet;
  duplicateOf: { id: string; title: string; kind: 'document' | 'upload' } | null;
  duplicateUrl?: string | null;
  similarity: number | null;
  rejectReason: string | null;
  copyrightFlag: boolean;
  personalDataFlag: boolean;
  documentId: string | null;
  storageUrl?: string | null;
  source?: 'admin' | 'student';
  uploaderEmail?: string;
  createdAt: string;
};

export const MAX_FILES = 10;
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

const readError = async (response: Response) => {
  const payload = await response.json().catch(() => ({}));
  return (payload as { error?: string }).error || `Erreur serveur (${response.status}).`;
};

// XHR rather than fetch: fetch gives no upload progress.
export const uploadIntakeFile = (file: File, batchId: string, onProgress: (ratio: number) => void) =>
  new Promise<IntakeUpload>((resolve, reject) => {
    const form = new FormData();
    form.append('file', file, file.name);
    form.append('batchId', batchId);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/pdf/intake');
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      let payload: { upload?: IntakeUpload; error?: string } = {};
      try {
        payload = JSON.parse(xhr.responseText);
      } catch {
        // handled below
      }
      if (xhr.status >= 200 && xhr.status < 300 && payload.upload) resolve(payload.upload);
      else reject(new Error(payload.error || `Erreur serveur (${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error('Connexion impossible. Vérifiez le réseau.'));
    xhr.send(form);
  });

export const listIntake = async (filters: { source?: string; status?: string } = {}) => {
  const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][]);
  const response = await fetch(`/api/pdf/intake${params.size ? `?${params}` : ''}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(await readError(response));
  return ((await response.json()) as { uploads: IntakeUpload[] }).uploads;
};

const patchIntake = async (id: string, body: Record<string, unknown>) => {
  const response = await fetch(`/api/pdf/intake/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await readError(response));
  return ((await response.json()) as { upload: IntakeUpload }).upload;
};

export const publishIntake = (id: string, sheet: IntakeSheet, force = false) =>
  patchIntake(id, { action: 'publish', sheet, force });
export const rejectIntake = (id: string, reason: string) => patchIntake(id, { action: 'reject', reason });
export const reanalyzeIntake = (id: string) => patchIntake(id, { action: 'reanalyze' });
