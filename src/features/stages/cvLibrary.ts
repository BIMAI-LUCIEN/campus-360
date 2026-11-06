import type { OfficialCvData } from '../../types';
import type { CvStyle, CvTemplateId } from './cvHtml';
import type { CareerOffer } from '../documents/careerContextApi';
import type { CvReview } from '../documents/cvJuryApi';
import { readJsonFile, writeJsonFile } from '../documents/localJsonStore';

// Every CV the student generates (one per application, or from the CV page) is kept here,
// so it can be found again later, for any job.

const CV_LIBRARY_KEY = 'campus360_cv_library';
const MAX_SAVED_CVS = 200;

export interface SavedCv {
  id: string;
  createdAt: string;
  templateId: CvTemplateId;
  /** Job the CV was written for, when it comes from an application. */
  jobId?: string;
  jobTitle: string;
  company: string;
  officialCv: OfficialCvData;
  /** Offer seen outside the app, kept so the jury can judge the CV against it later. */
  offer?: CareerOffer | null;
  /** cv-fill generation the CV came from: its first jury review is free (server rule). */
  sourceGenerationId?: string;
  /** Last jury verdict, and the score before the last correction. */
  review?: CvReview;
  previousScore?: number;
  /** Accent colour, font and spacing of the preview and the PDF. */
  style?: CvStyle;
}

export type NewSavedCv = Omit<SavedCv, 'id' | 'createdAt'>;

export async function loadCvLibrary(): Promise<SavedCv[]> {
  const list = await readJsonFile<SavedCv[]>(CV_LIBRARY_KEY);
  return Array.isArray(list) ? list : [];
}

export async function saveCvToLibrary(entry: NewSavedCv): Promise<SavedCv> {
  const saved: SavedCv = {
    ...entry,
    id: `cv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  const list = await loadCvLibrary();
  await writeJsonFile(CV_LIBRARY_KEY, [saved, ...list].slice(0, MAX_SAVED_CVS));
  return saved;
}

export async function updateCvInLibrary(id: string, patch: Partial<Omit<SavedCv, 'id' | 'createdAt'>>): Promise<SavedCv[]> {
  const next = (await loadCvLibrary()).map((cv) => (cv.id === id ? { ...cv, ...patch } : cv));
  await writeJsonFile(CV_LIBRARY_KEY, next);
  return next;
}

export async function removeCvFromLibrary(id: string): Promise<SavedCv[]> {
  const next = (await loadCvLibrary()).filter((cv) => cv.id !== id);
  await writeJsonFile(CV_LIBRARY_KEY, next);
  return next;
}

/** Title shown in the library: "Développeur web · Orange" or the template name for a CV without a job. */
export function savedCvTitle(cv: Pick<SavedCv, 'jobTitle' | 'company'>): string {
  const parts = [cv.jobTitle, cv.company].filter((part) => part && part.trim());
  return parts.length > 0 ? parts.join(' · ') : 'CV général';
}
