import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Effort, Picture, Ticket, TicketState } from '../../src/picture.ts';
import { Chip, Dot, Progress, PullRequests } from './parts.tsx';
import { findPlace, shown, type Place } from './places.ts';

interface Props {
  readonly picture: Picture;
  readonly place: Place;
  readonly closedEfforts: boolean;
  readonly onPlace: (place: Place) => void;
}

export function Main({ picture, place, closedEfforts, onPlace }: Props) {
  switch (place.kind) {
    case 'effort': {
      const effort = findPlace(picture, place.number, closedEfforts);
      if (effort === null) return <Page title="Effort not found">{null}</Page>;
      return <EffortPage effort={effort} closedEfforts={closedEfforts} onPlace={onPlace} />;
    }
    case 'no effort':
      return (
        <Page title="No effort">
          {picture.ticketsWithNoEffort.length === 0 ? <Nothing text="No tickets here" /> : <Tickets tickets={picture.ticketsWithNoEffort} />}
        </Page>
      );
    case 'unplaced':
      return (
        <Page title="Unplaced">
          {picture.unplacedPullRequests.length === 0 ? (
            <Nothing text="Every open pull request is tied to a ticket" />
          ) : (
            <Card>
              {picture.unplacedPullRequests.map((number) => (
                <li key={number} className="px-4 py-2.5">Pull request #{number}</li>
              ))}
            </Card>
          )}
        </Page>
      );
  }
}

function EffortPage({ effort, closedEfforts, onPlace }: { readonly effort: Effort } & Pick<Props, 'closedEfforts' | 'onPlace'>) {
  const nested = shown(effort.efforts, closedEfforts);
  return (
    <Page
      title={effort.title}
      aside={
        <>
          <span className="text-mute">#{effort.number}</span>
          {effort.state !== 'open' && <Chip text={`Closed as ${effort.state}`} />}
          <PullRequests list={effort.pullRequests} />
          <span className="flex-1" />
          <Progress {...effort.progress} />
        </>
      }
    >
      <Tickets tickets={effort.tickets} />
      {nested.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 font-medium text-mute">Efforts under it</h2>
          <Card>
            {nested.map((each) => (
              <li key={each.number}>
                <button type="button" onClick={() => { onPlace({ kind: 'effort', number: each.number }); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-sunk">
                  <span className="w-12 shrink-0 text-mute">#{each.number}</span>
                  <span className="min-w-0 flex-1">{each.title}</span>
                  <Progress {...each.progress} />
                  <ChevronRight aria-hidden className="size-4 text-faint" />
                </button>
              </li>
            ))}
          </Card>
        </section>
      )}
    </Page>
  );
}

function Page({ title, aside, children }: { readonly title: string; readonly aside?: ReactNode; readonly children: ReactNode }) {
  return (
    <main className="min-w-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[920px] px-8 py-8">
        <h1 className="text-pretty text-[26px] font-semibold leading-tight">{title}</h1>
        {aside !== undefined && <div className="mt-2 flex flex-wrap items-center gap-3">{aside}</div>}
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}

const GROUPS: readonly { readonly kind: TicketState['kind']; readonly title: string; readonly folded: boolean }[] = [
  { kind: 'in progress', title: 'In progress', folded: false },
  { kind: 'open', title: 'Open', folded: false },
  { kind: 'done', title: 'Done', folded: true },
  { kind: 'dropped', title: 'Dropped', folded: true },
];

function Tickets({ tickets }: { readonly tickets: readonly Ticket[] }) {
  return GROUPS.map(({ kind, title, folded }) => {
    const group = tickets.filter((ticket) => ticket.state.kind === kind);
    if (group.length === 0) return null;
    return (
      <details key={kind} open={!folded} className="group mb-5">
        <summary className="mb-2 flex cursor-pointer list-none items-center gap-2 font-medium text-mute">
          <ChevronRight aria-hidden className="size-4 transition-transform group-open:rotate-90" />
          {title} <span className="font-normal">{group.length}</span>
        </summary>
        <Card>
          {group.map((ticket) => (
            <li key={ticket.number} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
              <Dot kind={kind} />
              <span className="w-12 shrink-0 text-mute">#{ticket.number}</span>
              <span className="min-w-0 flex-1">{ticket.title}</span>
              <Detail state={ticket.state} />
            </li>
          ))}
        </Card>
      </details>
    );
  });
}

function Detail({ state }: { readonly state: TicketState }) {
  if (state.kind === 'open') return state.labels.map((label) => <Chip key={label} text={label} />);
  return <PullRequests list={state.pullRequests} />;
}

function Card({ children }: { readonly children: ReactNode }) {
  return <ul className="divide-y divide-line-2 overflow-hidden rounded-xl border border-line bg-surface">{children}</ul>;
}

function Nothing({ text }: { readonly text: string }) {
  return <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-mute">{text}</p>;
}
