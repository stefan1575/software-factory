import { execFileSync } from 'node:child_process';

/** The sign-in, held in memory only. */
export function findToken(): string {
  for (const token of [process.env['GH_TOKEN'], process.env['GITHUB_TOKEN'], askGh()]) {
    if (token !== undefined && token !== '') return token;
  }
  throw new Error('No GitHub sign-in found. Set GH_TOKEN, or run: gh auth login');
}

function askGh(): string {
  try {
    return execFileSync('gh', ['auth', 'token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}
