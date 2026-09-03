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

const requestedBranch = process.argv[2];
const message = process.argv.slice(3).join(' ') || 'OTA-Update';
const branches = requestedBranch && requestedBranch !== 'all' ? [requestedBranch] : ['production', 'preview'];

const easCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

async function publishBranch(branch) {
  return new Promise((resolve, reject) => {
    const safeMsg = (message || 'OTA-Update').replace(/["'\n\r]/g, ' ').trim();
    console.log(`📝 Message: "${safeMsg}"`);

    const args = ['eas', 'update', '--branch', branch, `--message="${safeMsg}"`, '--non-interactive'];

    const child = spawn(easCmd, args, {
      env,
      stdio: 'inherit',
      shell: true,
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ EAS Update to branch [${branch}] published successfully!`);
        resolve();
      } else {
        console.error(`❌ EAS Update to branch [${branch}] failed with code ${code}`);
        reject(new Error(`Exit code ${code}`));
      }
    });
  });
}

async function run() {
  for (const b of branches) {
    try {
      await publishBranch(b);
    } catch (e) {
      console.error(`Failed on branch ${b}:`, e.message);
      process.exit(1);
    }
  }
  console.log('\n🎉 All EAS updates published successfully to branches:', branches.join(', '));
}

run();
