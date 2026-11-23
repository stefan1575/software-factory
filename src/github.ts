import type { IssueFacts, IssueReference, OpenPullRequestFacts, ProjectFacts, ProjectSource, RepositoryName } from './facts.ts';
import { Json } from './json.ts';

export type Variables = Readonly<Record<string, string | null>>;

/** Sends one GraphQL query and gives back its `data`. */
export type SendQuery = (query: string, variables: Variables) => Promise<unknown>;

const PAGE = 'pageInfo { hasNextPage endCursor }';
const REFERENCE = 'number repository { id }';
const LABELS = `nodes { name } ${PAGE}`;
const LINKED_ISSUES = `nodes { ${REFERENCE} } ${PAGE}`;

const REPOSITORY = `query($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) { id }
}`;

const PULL_REQUESTS = `query($repository: ID!, $after: String) {
  node(id: $repository) { ... on Repository {
    page: pullRequests(first: 100, after: $after, states: OPEN, orderBy: { field: CREATED_AT, direction: ASC }) {
      nodes { id number closingIssuesReferences(first: 20) { ${LINKED_ISSUES} } }
      ${PAGE}
    }
  } }
}`;

const ISSUES = `query($repository: ID!, $after: String) {
  node(id: $repository) { ... on Repository {
    page: issues(first: 100, after: $after, orderBy: { field: CREATED_AT, direction: ASC }) {
      nodes { id number title state stateReason parent { ${REFERENCE} } labels(first: 20) { ${LABELS} } }
      ${PAGE}
    }
  } }
}`;

const MORE_LABELS = `query($id: ID!, $after: String) {
  node(id: $id) { ... on Issue { page: labels(first: 100, after: $after) { ${LABELS} } } }
}`;

const MORE_LINKED_ISSUES = `query($id: ID!, $after: String) {
  node(id: $id) { ... on PullRequest { page: closingIssuesReferences(first: 100, after: $after) { ${LINKED_ISSUES} } } }
}`;

export class GitHubSource implements ProjectSource {
  readonly #send: SendQuery;

  constructor(send: SendQuery) {
    this.#send = send;
  }

  async read({ owner, name }: RepositoryName): Promise<ProjectFacts> {
    const repositoryId = (await this.#ask(REPOSITORY, { owner, name })).get('repository').get('id').text();

    // Pull requests first: an issue created meanwhile and linked to one is then still read.
    const openPullRequests: OpenPullRequestFacts[] = [];
    for await (const node of this.#nodes(PULL_REQUESTS, { repository: repositoryId })) {
      const linkedIssues: IssueReference[] = [];
      const links = this.#nodes(MORE_LINKED_ISSUES, { id: node.get('id').text() }, node.get('closingIssuesReferences'));
      for await (const link of links) linkedIssues.push(reference(link));
      openPullRequests.push({ number: node.get('number').number(), linkedIssues });
    }

    const issues: IssueFacts[] = [];
    for await (const node of this.#nodes(ISSUES, { repository: repositoryId })) {
      const labels: string[] = [];
      const labelNodes = this.#nodes(MORE_LABELS, { id: node.get('id').text() }, node.get('labels'));
      for await (const label of labelNodes) labels.push(label.get('name').text());
      const parent = node.get('parent');
      issues.push({
        number: node.get('number').number(),
        title: node.get('title').text(),
        status: status(node),
        labels,
        parent: parent.isNull() ? null : reference(parent),
      });
    }
    return { repositoryId, issues, openPullRequests };
  }

  /** Every item of a paged list, starting from `first` when its first page is already in hand. */
  async *#nodes(query: string, variables: Variables, first?: Json): AsyncGenerator<Json> {
    let page = first ?? (await this.#page(query, variables, null));
    for (;;) {
      yield* page.get('nodes').list();
      const info = page.get('pageInfo');
      if (!info.get('hasNextPage').flag()) return;
      page = await this.#page(query, variables, info.get('endCursor').text());
    }
  }

  async #page(query: string, variables: Variables, after: string | null): Promise<Json> {
    return (await this.#ask(query, { ...variables, after })).get('node').get('page');
  }

  async #ask(query: string, variables: Variables): Promise<Json> {
    return new Json(await this.#send(query, variables));
  }
}

function reference(issue: Json): IssueReference {
  return { repositoryId: issue.get('repository').get('id').text(), number: issue.get('number').number() };
}

function status(issue: Json): IssueFacts['status'] {
  if (issue.get('state').oneOf({ OPEN: 'open', CLOSED: 'closed' }) === 'open') return { kind: 'open' };
  const reason = issue.get('stateReason');
  if (reason.isNull()) return { kind: 'closed', reason: 'none recorded' };
  return {
    kind: 'closed',
    reason: reason.oneOf({ COMPLETED: 'completed', NOT_PLANNED: 'not planned', DUPLICATE: 'duplicate' }),
  };
}

/** Talks to GitHub itself. Any reported error stops the read: a partial answer is not an answer. */
export function sendToGitHub(token: string): SendQuery {
  return async (query, variables) => {
    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'user-agent': 'software-factory' },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) throw new Error(`GitHub answered ${response.status} ${response.statusText}.`);
    const body: unknown = await response.json();
    if (typeof body === 'object' && body !== null && 'errors' in body) {
      const messages = new Json(body.errors, 'errors').list().map((error) => error.get('message').text());
      throw new Error(`GitHub reported: ${messages.join('; ')}`);
    }
    if (typeof body !== 'object' || body === null || !('data' in body)) throw new Error('GitHub sent no data.');
    return body.data;
  };
}
