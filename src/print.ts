import type { Effort, Picture, Ticket } from './picture.ts';

export interface PrintOptions {
  readonly closedEfforts: boolean;
}

export function printPicture(picture: Picture, options: PrintOptions): string {
  const hidden: Effort[] = [];
  const sections: string[] = [];

  const addEffort = (effort: Effort, indent: string): void => {
    if (effort.state !== 'open' && !options.closedEfforts) {
      hidden.push(effort);
      return;
    }
    sections.push(indent + effortLine(effort));
    if (effort.tickets.length > 0) sections.push(ticketLines(effort.tickets, `${indent}  `));
    for (const nested of effort.efforts) addEffort(nested, `${indent}  `);
  };
  for (const effort of picture.efforts) addEffort(effort, '');

  if (picture.ticketsWithNoEffort.length > 0) {
    sections.push(`No effort\n${ticketLines(picture.ticketsWithNoEffort, '  ')}`);
  }
  const unplaced = picture.unplacedPullRequests;
  if (unplaced.length > 0) {
    sections.push(`Unplaced: ${unplaced.length} open pull ${unplaced.length === 1 ? 'request' : 'requests'} tied to no ticket (${numbers(unplaced)})`);
  }
  if (hidden.length > 0) sections.push(hiddenLines(hidden));
  if (sections.length === 0) sections.push('No issues and no open pull requests');
  return `${sections.join('\n\n')}\n`;
}

function effortLine(effort: Effort): string {
  const { done, total } = effort.progress;
  const parts = [
    `Effort #${effort.number}  ${clean(effort.title)}`,
    total === 0 ? 'no tickets left' : `${done} of ${total} done`,
  ];
  if (effort.state !== 'open') parts.push(`closed as ${effort.state}`);
  if (effort.pullRequests.length > 0) parts.push(pullRequests(effort.pullRequests));
  return parts.join('    ');
}

function ticketLines(tickets: readonly Ticket[], indent: string): string {
  const rows = tickets.map((ticket) => ({
    number: `#${ticket.number}`,
    title: clean(ticket.title),
    state: ticket.state.kind,
    detail: ticketDetail(ticket),
  }));
  const width = (column: 'number' | 'title'): number => Math.max(...rows.map((row) => row[column].length));
  const numberWidth = width('number');
  const titleWidth = width('title');
  return rows
    .map((row) => `${indent}${row.number.padEnd(numberWidth)}  ${row.title.padEnd(titleWidth)}  ${row.state.padEnd(11)}   ${row.detail}`.trimEnd())
    .join('\n');
}

function ticketDetail({ state }: Ticket): string {
  if (state.kind === 'open') return state.labels.map(clean).join(', ');
  return state.pullRequests.length > 0 ? pullRequests(state.pullRequests) : '';
}

/** Names what was left out, so an open issue or pull request under a closed effort isn't lost. */
function hiddenLines(hidden: readonly Effort[]): string {
  const openIssues: number[] = [];
  const openPullRequests = new Set<number>();
  const collect = (effort: Effort): void => {
    if (effort.state === 'open') openIssues.push(effort.number);
    for (const number of effort.pullRequests) openPullRequests.add(number);
    for (const { number, state } of effort.tickets) {
      if (state.kind === 'open' || state.kind === 'in progress') openIssues.push(number);
      if (state.kind !== 'open') for (const pullRequest of state.pullRequests) openPullRequests.add(pullRequest);
    }
    effort.efforts.forEach(collect);
  };
  hidden.forEach(collect);

  const lines = [
    `Left out: ${hidden.length} closed ${hidden.length === 1 ? 'effort' : 'efforts'} (${numbers(hidden.map((effort) => effort.number))}), shown with --closed-efforts`,
  ];
  if (openIssues.length > 0) lines.push(`  Still open under them: ${numbers(openIssues)}`);
  if (openPullRequests.size > 0) lines.push(`  Open pull requests linked to them: ${numbers([...openPullRequests])}`);
  return lines.join('\n');
}

function pullRequests(list: readonly number[]): string {
  return `pull ${list.length === 1 ? 'request' : 'requests'} ${numbers(list)} open`;
}

function numbers(list: readonly number[]): string {
  return list.map((number) => `#${number}`).join(', ');
}

/** Anyone can write a title on a public repository, so control characters never reach the terminal. */
function clean(text: string): string {
  return text.replace(/\p{Cc}/gu, ' ');
}
