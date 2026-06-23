import path from 'node:path';
import os from 'node:os';

export const rootDir = process.cwd();

const isVercel = process.env.VERCEL === '1';

export const databasePath = isVercel
  ? path.join(os.tmpdir(), 'campus360-admin.sqlite')
  : path.join(rootDir, 'campus360-admin.sqlite');

export const pdfUploadDir = isVercel
  ? path.join(os.tmpdir(), 'pdfs')
  : path.join(rootDir, 'public', 'uploads', 'pdfs');
