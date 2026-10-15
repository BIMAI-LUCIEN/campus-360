import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

// Uploaded files live on the VPS disk, outside any public folder. Vercel has no
// persistent disk, so writes are refused there and the app uploads to the files host.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KEY_RE = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.[a-z0-9]{2,5}$/i;
const ALLOWED_EXTENSIONS = new Set(['png', 'jpg', 'webp', 'pdf', 'docx', 'txt']);

export class FileStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileStorageError';
  }
}

export const getUploadRoot = (): string => {
  const configured = process.env.UPLOAD_ROOT?.trim();
  return path.resolve(configured || path.join(process.cwd(), '.uploads'));
};

// True when this instance can keep files (the VPS, or a local dev machine).
export const canStoreFiles = (): boolean => !process.env.VERCEL;

// Resolves a storage key to an absolute path, refusing anything that could escape the root.
export const resolveStoragePath = (key: string): string => {
  if (typeof key !== 'string' || !KEY_RE.test(key)) {
    throw new FileStorageError('Clé de stockage invalide.');
  }
  const root = getUploadRoot();
  const resolved = path.resolve(root, key);
  const relative = path.relative(root, resolved);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new FileStorageError('Chemin hors de la racine de stockage.');
  }
  return resolved;
};

export const buildStorageKey = (userId: string, extension: string): string => {
  if (!UUID_RE.test(userId)) throw new FileStorageError('Utilisateur invalide.');
  const ext = extension.toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) throw new FileStorageError('Extension non autorisée.');
  return `${userId.toLowerCase()}/${crypto.randomUUID()}.${ext}`;
};

// Writes to a temporary file first, then renames, so a crash never leaves a partial file.
export const saveFile = async (userId: string, extension: string, data: Buffer): Promise<string> => {
  if (!canStoreFiles()) {
    throw new FileStorageError('Le stockage de fichiers est indisponible sur cette instance.');
  }
  const key = buildStorageKey(userId, extension);
  const target = resolveStoragePath(key);
  await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o750 });
  const temp = `${target}.${crypto.randomBytes(6).toString('hex')}.tmp`;
  await fs.writeFile(temp, data, { mode: 0o640, flag: 'wx' });
  await fs.rename(temp, target);
  return key;
};

export const readStoredFile = async (key: string): Promise<Buffer> => {
  const target = resolveStoragePath(key);
  const stat = await fs.lstat(target);
  if (!stat.isFile()) throw new FileStorageError('Fichier introuvable.');
  return fs.readFile(target);
};

export const storedFileExists = async (key: string): Promise<boolean> => {
  try {
    const stat = await fs.lstat(resolveStoragePath(key));
    return stat.isFile();
  } catch {
    return false;
  }
};

export const deleteStoredFile = async (key: string): Promise<void> => {
  try {
    await fs.unlink(resolveStoragePath(key));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
};
