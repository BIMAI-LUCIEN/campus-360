import fs from 'fs';
import { spawn } from 'child_process';

const EXPO_TOKEN = process.env.EXPO_TOKEN;

const easConfig = JSON.parse(fs.readFileSync('./eas.json', 'utf8'));
const prodEnv = easConfig.build?.production?.env || {};

const env = {
  ...process.env,
  ...prodEnv,
  EXPO_TOKEN,
  CI: '1',
};

const branch = process.argv[2] || 'production';
const message = process.argv[3] || 'feat(redaction): academic stage report standards, svg diagrams and pdf export';

console.log(`🚀 Publishing EAS Update to branch [${branch}]...`);
console.log(`📝 Message: "${message}"`);

const easCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const args = ['eas', 'update', '--branch', branch, `--message="${message}"`, '--non-interactive'];

const child = spawn(easCmd, args, {
  env,
  stdio: 'inherit',
  shell: true,
});

child.on('close', (code) => {
  if (code === 0) {
    console.log(`\n✅ EAS Update to branch [${branch}] published successfully!`);
    process.exit(0);
  } else {
    console.error(`\n❌ EAS Update exited with code ${code}`);
    process.exit(code || 1);
  }
});
