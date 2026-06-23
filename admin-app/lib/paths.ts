import path from 'node:path';

export const rootDir = process.cwd();
export const databasePath = path.join(rootDir, 'campus360-admin.sqlite');
export const pdfUploadDir = path.join(rootDir, 'public', 'uploads', 'pdfs');
