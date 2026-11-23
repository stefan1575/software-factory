import type { Effort, Picture } from '../../src/picture.ts';

/** Where in a project the window is. */
export type Place = { readonly kind: 'effort'; readonly number: number } | { readonly kind: 'no effort' } | { readonly kind: 'unplaced' };

export function shown(efforts: readonly Effort[], closedEfforts: boolean): readonly Effort[] {
  return closedEfforts ? efforts : efforts.filter((effort) => effort.state === 'open');
}

export function firstPlace(picture: Picture): Place {
  const [first] = shown(picture.efforts, false);
  if (first !== undefined) return { kind: 'effort', number: first.number };
  if (picture.ticketsWithNoEffort.length === 0 && picture.unplacedPullRequests.length > 0) return { kind: 'unplaced' };
  return { kind: 'no effort' };
}

export function findPlace(picture: Picture, number: number, closedEfforts: boolean): Effort | null {
  const look = (efforts: readonly Effort[]): Effort | null => {
    for (const effort of shown(efforts, closedEfforts)) {
      const found = effort.number === number ? effort : look(effort.efforts);
      if (found !== null) return found;
    }
    return null;
  };
  return look(picture.efforts);
}
