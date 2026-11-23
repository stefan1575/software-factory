import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Picture } from '../src/picture.ts';
import { printPicture } from '../src/print.ts';

const picture: Picture = {
  efforts: [
    {
      number: 12,
      title: 'Sign-in by email',
      state: 'open',
      pullRequests: [],
      progress: { done: 1, total: 3 },
      tickets: [
        { number: 13, title: 'Send the link', state: { kind: 'done', pullRequests: [] } },
        { number: 14, title: 'Accept the link', state: { kind: 'in progress', pullRequests: [20] } },
      ],
      efforts: [
        {
          number: 15,
          title: 'Sign out',
          state: 'open',
          pullRequests: [23],
          progress: { done: 0, total: 1 },
          tickets: [{ number: 16, title: 'Everywhere', state: { kind: 'open', labels: ['ready', 'bug'] } }],
          efforts: [],
        },
      ],
    },
    {
      number: 30,
      title: 'Old',
      state: 'done',
      pullRequests: [],
      progress: { done: 0, total: 1 },
      tickets: [
        { number: 31, title: 'Left open', state: { kind: 'in progress', pullRequests: [24] } },
        { number: 32, title: 'Not needed', state: { kind: 'dropped', pullRequests: [] } },
      ],
      efforts: [],
    },
  ],
  ticketsWithNoEffort: [{ number: 18, title: 'Fix\u001b[2Jthe link', state: { kind: 'open', labels: [] } }],
  unplacedPullRequests: [21, 22],
};

const OPEN_PART = `Effort #12  Sign-in by email    1 of 3 done

  #13  Send the link    done
  #14  Accept the link  in progress   pull request #20 open

  Effort #15  Sign out    0 of 1 done    pull request #23 open

    #16  Everywhere  open          ready, bug
`;

const REST = `No effort
  #18  Fix [2Jthe link  open

Unplaced: 2 open pull requests tied to no ticket (#21, #22)
`;

test('closed efforts are left out, and what is still open under them is named', () => {
  assert.equal(
    printPicture(picture, { closedEfforts: false }),
    `${OPEN_PART}
${REST}
Left out: 1 closed effort (#30), shown with --closed-efforts
  Still open under them: #31
  Open pull requests linked to them: #24
`,
  );
});

test('closed efforts are shown when asked for', () => {
  assert.equal(
    printPicture(picture, { closedEfforts: true }),
    `${OPEN_PART}
Effort #30  Old    0 of 1 done    closed as done

  #31  Left open   in progress   pull request #24 open
  #32  Not needed  dropped

${REST}`,
  );
});

test('an effort with no tickets left says so', () => {
  const effort = { number: 1, title: 'Empty', state: 'open', pullRequests: [], progress: { done: 0, total: 0 }, tickets: [], efforts: [] } as const;
  assert.equal(
    printPicture({ efforts: [effort], ticketsWithNoEffort: [], unplacedPullRequests: [] }, { closedEfforts: false }),
    'Effort #1  Empty    no tickets left\n',
  );
});
