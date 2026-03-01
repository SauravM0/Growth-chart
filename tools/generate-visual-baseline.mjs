#!/usr/bin/env node
import { mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const repoRoot = process.cwd();
const baselineDir = join(repoRoot, 'artifacts', 'baseline');
const npmExecPath = process.env.npm_execpath;

mkdirSync(baselineDir, { recursive: true });

if (!npmExecPath) {
  console.error('Unable to locate npm executable path from npm_execpath.');
  process.exit(1);
}

const result = spawnSync(process.execPath, [npmExecPath, 'run', 'visual:update'], {
  stdio: 'inherit',
  cwd: repoRoot,
  env: process.env,
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
