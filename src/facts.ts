/** What was read from GitHub, before anything is worked out from it. */

export interface RepositoryName {
  readonly owner: string;
  readonly name: string;
}

/** An issue as another issue or a pull request points at it. It may be in another repository. */
export interface IssueReference {
  readonly repositoryId: string;
  readonly number: number;
}

export type IssueStatus =
  | { readonly kind: 'open' }
  | { readonly kind: 'closed'; readonly reason: 'completed' | 'not planned' | 'duplicate' | 'none recorded' };

export interface IssueFacts {
  readonly number: number;
  readonly title: string;
  readonly status: IssueStatus;
  readonly labels: readonly string[];
  readonly parent: IssueReference | null;
}

export interface OpenPullRequestFacts {
  readonly number: number;
  readonly linkedIssues: readonly IssueReference[];
}

export interface ProjectFacts {
  readonly repositoryId: string;
  readonly issues: readonly IssueFacts[];
  readonly openPullRequests: readonly OpenPullRequestFacts[];
}

/** The one way the rest of the program reads a project. */
export interface ProjectSource {
  read(repository: RepositoryName): Promise<ProjectFacts>;
}
