import type { IssueFacts, IssueReference, ProjectFacts } from './facts.ts';

export type NonEmpty<T> = readonly [T, ...T[]];

/** Pull requests are the open ones GitHub links to the ticket. A closed ticket can still have some. */
export type TicketState =
  | { readonly kind: 'done'; readonly pullRequests: readonly number[] }
  | { readonly kind: 'dropped'; readonly pullRequests: readonly number[] }
  | { readonly kind: 'in progress'; readonly pullRequests: NonEmpty<number> }
  | { readonly kind: 'open'; readonly labels: readonly string[] };

export interface Ticket {
  readonly number: number;
  readonly title: string;
  readonly state: TicketState;
}

export interface Effort {
  readonly number: number;
  readonly title: string;
  readonly state: 'open' | 'done' | 'dropped';
  /** Open pull requests linked to the effort's own issue. */
  readonly pullRequests: readonly number[];
  /** Counts every ticket beneath the effort, those of nested efforts included. */
  readonly progress: { readonly done: number; readonly total: number };
  readonly tickets: readonly Ticket[];
  readonly efforts: readonly Effort[];
}

export interface Picture {
  readonly efforts: readonly Effort[];
  readonly ticketsWithNoEffort: readonly Ticket[];
  readonly unplacedPullRequests: readonly number[];
}

export function workOutPicture(facts: ProjectFacts): Picture {
  const issues = facts.issues.toSorted((a, b) => a.number - b.number);
  const known = new Set(issues.map((issue) => issue.number));
  const here = (reference: IssueReference): boolean => {
    if (reference.repositoryId !== facts.repositoryId) return false;
    if (!known.has(reference.number)) {
      throw new Error(`Issue #${reference.number} is linked to but was not read. The project may have changed during the read; run again.`);
    }
    return true;
  };

  const roots: IssueFacts[] = [];
  const children = new Map<number, IssueFacts[]>();
  for (const issue of issues) {
    if (issue.parent !== null && here(issue.parent)) append(children, issue.parent.number, issue);
    else roots.push(issue);
  }

  const pullRequests = new Map<number, number[]>();
  const unplacedPullRequests: number[] = [];
  for (const pullRequest of facts.openPullRequests.toSorted((a, b) => a.number - b.number)) {
    const linked = new Set(pullRequest.linkedIssues.filter(here).map((issue) => issue.number));
    for (const number of linked) append(pullRequests, number, pullRequest.number);
    if (linked.size === 0) unplacedPullRequests.push(pullRequest.number);
  }

  let placed = 0;
  const split = (group: readonly IssueFacts[]): { tickets: Ticket[]; efforts: Effort[] } => {
    const tickets: Ticket[] = [];
    const efforts: Effort[] = [];
    for (const issue of group) {
      placed += 1;
      const linked = pullRequests.get(issue.number) ?? [];
      const under = children.get(issue.number);
      if (under === undefined) tickets.push({ number: issue.number, title: issue.title, state: ticketState(issue, linked) });
      else efforts.push(effort(issue, linked, split(under)));
    }
    return { tickets, efforts };
  };
  const { tickets, efforts } = split(roots);

  if (placed !== issues.length) {
    throw new Error('Some issues are each above the other, so they have no place. The project may have changed during the read; run again.');
  }
  return { efforts, ticketsWithNoEffort: tickets, unplacedPullRequests };
}

function effort(issue: IssueFacts, pullRequests: readonly number[], under: Pick<Effort, 'tickets' | 'efforts'>): Effort {
  const progress = {
    done: under.tickets.filter((ticket) => ticket.state.kind === 'done').length,
    total: under.tickets.filter((ticket) => ticket.state.kind !== 'dropped').length,
  };
  for (const nested of under.efforts) {
    progress.done += nested.progress.done;
    progress.total += nested.progress.total;
  }
  const state = closedState(issue) ?? 'open';
  return { number: issue.number, title: issue.title, state, pullRequests, progress, ...under };
}

function ticketState(issue: IssueFacts, pullRequests: readonly number[]): TicketState {
  const closed = closedState(issue);
  if (closed !== null) return { kind: closed, pullRequests };
  const [first, ...rest] = pullRequests;
  if (first !== undefined) return { kind: 'in progress', pullRequests: [first, ...rest] };
  return { kind: 'open', labels: issue.labels };
}

function closedState({ status }: IssueFacts): 'done' | 'dropped' | null {
  if (status.kind === 'open') return null;
  switch (status.reason) {
    case 'completed':
    case 'none recorded':
      return 'done';
    case 'not planned':
    case 'duplicate':
      return 'dropped';
  }
}

function append<T>(map: Map<number, T[]>, key: number, value: T): void {
  const list = map.get(key);
  if (list === undefined) map.set(key, [value]);
  else list.push(value);
}
