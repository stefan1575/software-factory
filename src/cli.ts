import { parseArgs } from 'node:util';
import type { RepositoryName } from './facts.ts';
import { GitHubSource, sendToGitHub } from './github.ts';
import { workOutPicture } from './picture.ts';
import { printPicture } from './print.ts';
import { findToken } from './token.ts';

function readArguments(): { repository: RepositoryName; closedEfforts: boolean } {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { 'closed-efforts': { type: 'boolean', default: false } },
  });
  const match = /^([^/\s]+)\/([^/\s]+)$/.exec(positionals.join(' '));
  const [owner, name] = match?.slice(1) ?? [];
  if (owner === undefined || name === undefined) throw new Error('Usage: node src/cli.ts <owner>/<repo> [--closed-efforts]');
  return { repository: { owner, name }, closedEfforts: values['closed-efforts'] };
}

try {
  const { repository, closedEfforts } = readArguments();
  const facts = await new GitHubSource(sendToGitHub(findToken())).read(repository);
  process.stdout.write(printPicture(workOutPicture(facts), { closedEfforts }));
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
