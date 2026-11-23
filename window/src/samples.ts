import type { IssueFacts, IssueStatus, OpenPullRequestFacts } from '../../src/facts.ts';
import { workOutPicture, type NonEmpty, type Picture } from '../../src/picture.ts';

export interface Project {
  readonly name: string;
  readonly note: string;
  readonly picture: Picture;
}

const REPOSITORY = 'made-up';
const OPEN: IssueStatus = { kind: 'open' };
const DONE: IssueStatus = { kind: 'closed', reason: 'completed' };
const DROPPED: IssueStatus = { kind: 'closed', reason: 'not planned' };

function at(number: number) {
  return { repositoryId: REPOSITORY, number };
}

function issue(number: number, title: string, status: IssueStatus, parent?: number, labels: readonly string[] = []): IssueFacts {
  return { number, title, status, labels, parent: parent === undefined ? null : at(parent) };
}

function pull(number: number, ...issues: readonly number[]): OpenPullRequestFacts {
  return { number, linkedIssues: issues.map(at) };
}

function project(name: string, note: string, issues: readonly IssueFacts[], openPullRequests: readonly OpenPullRequestFacts[] = []): Project {
  return { name, note, picture: workOutPicture({ repositoryId: REPOSITORY, issues, openPullRequests }) };
}

const PARTS = ['Orders', 'Stock', 'Delivery', 'Returns', 'Invoices', 'Suppliers', 'Search', 'Sign-in'] as const;

function large(): Project {
  const issues: IssueFacts[] = [];
  const pulls: OpenPullRequestFacts[] = [];
  let number = 1;
  for (const round of [1, 2, 3]) {
    for (const part of PARTS) {
      const effort = number++;
      issues.push(issue(effort, `${part}, part ${round}`, round === 1 ? DONE : OPEN));
      for (let i = 1; i <= 12; i++) {
        const ticket = number++;
        const done = round === 1 || (round === 2 && i <= 7);
        issues.push(issue(ticket, `${part} step ${i} of part ${round}`, done ? DONE : i === 12 ? DROPPED : OPEN, effort, ['ready']));
        if (!done && i === 8) pulls.push(pull(1000 + ticket, ticket));
      }
    }
  }
  for (let i = 1; i <= 8; i++) pulls.push(pull(2000 + i));
  return project('Warehouse', 'Large', issues, pulls);
}

export const SAMPLES: NonEmpty<Project> = [
  project(
    'Corner Shop',
    'Normal',
    [
      issue(12, 'Sign-in by email', OPEN),
      issue(13, 'Send the sign-in link', DONE, 12),
      issue(14, 'Accept the link and start a session', OPEN, 12),
      issue(15, 'Sign out everywhere', OPEN, 12, ['ready']),
      issue(16, 'Remember the browser for a month', DROPPED, 12),
      issue(30, 'Sessions across devices', OPEN, 12),
      issue(31, 'List where you are signed in', OPEN, 30, ['ready', 'design']),
      issue(32, 'End one session', OPEN, 30),
      issue(40, 'Checkout', OPEN),
      issue(41, 'Work out delivery cost', DONE, 40),
      issue(42, 'Save the basket', DONE, 40),
      issue(43, 'Take a card payment', OPEN, 40),
      issue(44, 'Send a receipt', OPEN, 40, ['ready']),
      issue(50, 'Product pages', DONE),
      issue(51, 'Photos that zoom', DONE, 50),
      issue(52, 'Stock left', DONE, 50),
      issue(18, 'Fix the footer link', OPEN, undefined, ['bug']),
      issue(19, 'The search box loses focus', DONE),
      issue(20, 'Say sorry on the 404 page', DROPPED),
    ],
    [pull(60, 14), pull(61, 43, 44), pull(62), pull(63)],
  ),
  large(),
  project('Bakery', 'Nothing left', [
    issue(1, 'Opening hours', OPEN),
    issue(2, 'Show holidays', DROPPED, 1),
    issue(3, 'Order ahead', OPEN),
    issue(4, 'Pick a time', DONE, 3),
    issue(5, 'Pay at the counter', DONE, 3),
  ]),
  project('New Idea', 'Empty', []),
];
