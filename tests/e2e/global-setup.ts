import { execSync } from 'node:child_process';
import path from 'node:path';

/** Creates (or resets) the e2e accounts before the run. */
export default function globalSetup() {
  execSync('npm run e2e:fixture -w backend', { cwd: path.resolve(__dirname, '../../..'), stdio: 'inherit' });
}
