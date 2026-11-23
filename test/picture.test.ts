import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { IssueFacts, OpenPullRequestFacts } from '../src/facts.ts';
import { workOutPicture } from '../src/picture.ts';

const HERE = 'this-repository';
const ELSEWHERE = 'another-repository';

function at(number: number, repositoryId = HERE) {
  return { repositoryId, number };
}

function issue(number: number, over: Partial<IssueFacts> = {}): IssueFacts {
  return { number, title: `Issue ${number}`, status: { kind: 'open' }, labels: [], parent: null, ...over };
}

function closed(reason: 'completed' | 'not planned' | 'duplicate' | 'none recorded'): Pick<IssueFacts, 'status'> {
  return { status: { kind: 'closed', reason } };
}

function picture(issues: IssueFacts[], openPullRequests: OpenPullRequestFacts[] = []) {
  return workOutPicture({ repositoryId: HERE, issues, openPullRequests });
}

test('efforts nest, and progress counts the tickets of nested efforts', () => {
  const { efforts, ticketsWithNoEffort } = picture([
    issue(1),
    issue(2, { parent: at(1) }),
    issue(3, { parent: at(2), ...closed('completed') }),
    issue(4, { parent: at(2) }),
    issue(5, { parent: at(1), ...closed('completed') }),
  ]);
  assert.deepEqual(ticketsWithNoEffort, []);
  assert.equal(efforts.length, 1);
  assert.deepEqual(efforts[0]?.progress, { done: 2, total: 3 });
  assert.deepEqual(efforts[0].tickets.map((ticket) => ticket.number), [5]);
  assert.deepEqual(efforts[0].efforts[0]?.progress, { done: 1, total: 2 });
  assert.deepEqual(efforts[0].efforts[0].tickets.map((ticket) => ticket.number), [3, 4]);
});

test('a ticket with no parent has no effort, whatever its title says', () => {
  const { efforts, ticketsWithNoEffort } = picture([
    issue(1),
    issue(2, { parent: at(1) }),
    issue(3, { title: 'Part of #1', labels: ['bug'] }),
  ]);
  assert.deepEqual(efforts[0]?.tickets.map((ticket) => ticket.number), [2]);
  assert.deepEqual(ticketsWithNoEffort, [{ number: 3, title: 'Part of #1', state: { kind: 'open', labels: ['bug'] } }]);
});

test('how an issue was closed decides done or dropped', () => {
  const { ticketsWithNoEffort } = picture([
    issue(1, closed('completed')),
    issue(2, closed('none recorded')),
    issue(3, closed('not planned')),
    issue(4, closed('duplicate')),
  ]);
  assert.deepEqual(ticketsWithNoEffort.map((ticket) => ticket.state.kind), ['done', 'done', 'dropped', 'dropped']);
});

test('dropped tickets stay listed and are left out of progress', () => {
  const { efforts } = picture([
    issue(1),
    issue(2, { parent: at(1), ...closed('completed') }),
    issue(3, { parent: at(1), ...closed('not planned') }),
    issue(4, { parent: at(1) }),
  ]);
  assert.deepEqual(efforts[0]?.progress, { done: 1, total: 2 });
  assert.equal(efforts[0].tickets.length, 3);
});

test('a pull request linked to two tickets puts both in progress', () => {
  const { ticketsWithNoEffort, unplacedPullRequests } = picture(
    [issue(1), issue(2)],
    [
      { number: 9, linkedIssues: [at(1)] },
      { number: 8, linkedIssues: [at(1), at(2)] },
    ],
  );
  assert.deepEqual(ticketsWithNoEffort.map((ticket) => ticket.state), [
    { kind: 'in progress', pullRequests: [8, 9] },
    { kind: 'in progress', pullRequests: [8] },
  ]);
  assert.deepEqual(unplacedPullRequests, []);
});

test('a closed ticket keeps its state and still shows its open pull request', () => {
  const { ticketsWithNoEffort, unplacedPullRequests } = picture([issue(1, closed('completed'))], [{ number: 8, linkedIssues: [at(1)] }]);
  assert.deepEqual(ticketsWithNoEffort[0]?.state, { kind: 'done', pullRequests: [8] });
  assert.deepEqual(unplacedPullRequests, []);
});

test('a pull request with no link, or only links elsewhere, is unplaced', () => {
  const { ticketsWithNoEffort, unplacedPullRequests } = picture(
    [issue(1)],
    [
      { number: 8, linkedIssues: [] },
      { number: 9, linkedIssues: [at(1, ELSEWHERE)] },
      { number: 10, linkedIssues: [at(1, ELSEWHERE), at(1)] },
    ],
  );
  assert.deepEqual(unplacedPullRequests, [8, 9]);
  assert.deepEqual(ticketsWithNoEffort[0]?.state, { kind: 'in progress', pullRequests: [10] });
});

test('a parent in another repository gives a ticket no effort', () => {
  const { efforts, ticketsWithNoEffort } = picture([issue(1), issue(2, { parent: at(1, ELSEWHERE) })]);
  assert.deepEqual(efforts, []);
  assert.equal(ticketsWithNoEffort.length, 2);
});

test('an effort whose tickets are all dropped has no tickets left', () => {
  const { efforts } = picture([issue(1), issue(2, { parent: at(1), ...closed('not planned') })]);
  assert.deepEqual(efforts[0]?.progress, { done: 0, total: 0 });
});

test('a pull request linked to an effort is shown on the effort', () => {
  const { efforts, unplacedPullRequests } = picture([issue(1), issue(2, { parent: at(1) })], [{ number: 8, linkedIssues: [at(1)] }]);
  assert.deepEqual(efforts[0]?.pullRequests, [8]);
  assert.deepEqual(unplacedPullRequests, []);
});

test('a link to an issue that was not read stops the run', () => {
  assert.throws(() => picture([issue(2, { parent: at(1) })]), /#1 is linked to but was not read/);
  assert.throws(() => picture([], [{ number: 8, linkedIssues: [at(1)] }]), /#1 is linked to but was not read/);
});

test('issues that are each above the other stop the run instead of vanishing', () => {
  assert.throws(() => picture([issue(1, { parent: at(2) }), issue(2, { parent: at(1) })]), /no place/);
});
