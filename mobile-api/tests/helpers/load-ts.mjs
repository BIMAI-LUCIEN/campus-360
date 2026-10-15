import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const transpile = (relativePath) => {
  const source = fs.readFileSync(path.resolve(relativePath), 'utf8');
  return ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
};

// Transpiles a self-contained TS module (only `node:` imports) and imports it.
export const loadTs = async (relativePath) =>
  import(`data:text/javascript;base64,${Buffer.from(transpile(relativePath)).toString('base64')}`);

// Same, for modules that import npm packages: the output is written next to
// node_modules so bare specifiers resolve, then removed. Local dependencies
// (e.g. './document-style') must be listed in `localDeps` (paths from mobile-api/).
export const loadTsWithPackages = async (relativePath, localDeps = []) => {
  const dir = fs.mkdtempSync(path.join(path.resolve('tests'), '.tmp-'));
  const write = (file) => {
    const code = transpile(file).replace(/from '(\.\/[^']+)'/g, "from '$1.mjs'");
    const target = path.join(dir, `${path.basename(file, '.ts')}.mjs`);
    fs.writeFileSync(target, code);
    return target;
  };
  try {
    localDeps.forEach(write);
    return await import(pathToFileURL(write(relativePath)).href);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

export const tmpDir = (prefix) => fs.mkdtempSync(path.join(os.tmpdir(), prefix));
