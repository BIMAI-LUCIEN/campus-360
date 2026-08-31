import path from 'node:path';
import os from 'node:os';

export const rootDir = process.cwd();

const isVercel = process.env.VERCEL === '1';

export const pdfUploadDir = isVercel
  ? path.join(os.tmpdir(), 'pdfs')
  : path.join(rootDir, 'public', 'uploads', 'pdfs');
