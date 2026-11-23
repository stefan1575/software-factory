import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GitHubSource, sendToGitHub } from '../src/github.ts';
import type { SendQuery } from '../src/github.ts';

const REPOSITORY = { owner: 'someone', name: 'something' };

function page(nodes: readonly unknown[], endCursor: string | null = null) {
  return { nodes, pageInfo: { hasNextPage: endCursor !== null, endCursor } };
}

function link(number: number) {
  return { number, repository: { id: 'repo' } };
}

function issue(number: number, over: Readonly<Record<string, unknown>> = {}) {
  return { id: `issue-${number}`, number, title: `Issue ${number}`, state: 'OPEN', stateReason: null, parent: null, labels: page([]), ...over };
}

function pullRequest(number: number, closingIssuesReferences: unknown) {
  return { id: `pull-${number}`, number, closingIssuesReferences };
}

/** Pages by list, then by the cursor that asks for them ('' is the first). */
interface MadeUp {
  readonly issues?: Readonly<Record<string, unknown>>;
  readonly pullRequests?: Readonly<Record<string, unknown>>;
  readonly more?: Readonly<Record<string, unknown>>;
}

function source(madeUp: MadeUp): GitHubSource {
  const send: SendQuery = (query, variables) => {
    if (variables['owner'] !== undefined) return Promise.resolve({ repository: { id: 'repo' } });
    const after = variables['after'] ?? '';
    const id = variables['id'];
    if (id !== undefined) return Promise.resolve({ node: { page: madeUp.more?.[`${id ?? ''} ${after}`] } });
    const list = query.includes('pullRequests(') ? madeUp.pullRequests : madeUp.issues;
    return Promise.resolve({ node: { page: list === undefined ? page([]) : list[after] } });
  };
  return new GitHubSource(send);
}

test('issues and pull requests are read past the first page', async () => {
  const facts = await source({
    issues: { '': page([issue(1)], 'i2'), i2: page([issue(2)], 'i3'), i3: page([issue(3, { parent: link(1) })]) },
    pullRequests: { '': page([pullRequest(4, page([]))], 'p2'), p2: page([pullRequest(5, page([link(3)]))]) },
  }).read(REPOSITORY);
  assert.deepEqual(facts.issues.map(({ number }) => number), [1, 2, 3]);
  assert.deepEqual(facts.issues[2]?.parent, { repositoryId: 'repo', number: 1 });
  assert.deepEqual(facts.openPullRequests, [
    { number: 4, linkedIssues: [] },
    { number: 5, linkedIssues: [{ repositoryId: 'repo', number: 3 }] },
  ]);
});

test("an issue's labels and a pull request's links are read past their first page", async () => {
  const facts = await source({
    issues: { '': page([issue(1, { labels: page([{ name: 'a' }], 'l2') })]) },
    pullRequests: { '': page([pullRequest(4, page([link(1)], 'r2'))]) },
    more: { 'issue-1 l2': page([{ name: 'b' }]), 'pull-4 r2': page([link(2)]) },
  }).read(REPOSITORY);
  assert.deepEqual(facts.issues[0]?.labels, ['a', 'b']);
  assert.deepEqual(facts.openPullRequests[0]?.linkedIssues.map(({ number }) => number), [1, 2]);
});

test("GitHub's close reasons are read as they are, and an unknown one stops the run", async () => {
  const read = (state: string, stateReason: string | null) =>
    source({ issues: { '': page([issue(1, { state, stateReason })]) } })
      .read(REPOSITORY)
      .then((facts) => facts.issues[0]?.status);
  assert.deepEqual(await read('OPEN', 'REOPENED'), { kind: 'open' });
  assert.deepEqual(await read('CLOSED', 'COMPLETED'), { kind: 'closed', reason: 'completed' });
  assert.deepEqual(await read('CLOSED', 'NOT_PLANNED'), { kind: 'closed', reason: 'not planned' });
  assert.deepEqual(await read('CLOSED', 'DUPLICATE'), { kind: 'closed', reason: 'duplicate' });
  assert.deepEqual(await read('CLOSED', null), { kind: 'closed', reason: 'none recorded' });
  await assert.rejects(read('CLOSED', 'SOMETHING_NEW'), /not understood/);
});

test('a reply that reports errors is refused even when it carries data', async (t) => {
  t.mock.method(globalThis, 'fetch', () => Promise.resolve(Response.json({ data: { node: null }, errors: [{ message: 'No access' }] })));
  await assert.rejects(sendToGitHub('made-up')('query', {}), /GitHub reported: No access/);
});
