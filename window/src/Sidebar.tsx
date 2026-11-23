import * as Popover from '@radix-ui/react-popover';
import { clsx } from 'clsx';
import { Check, ChevronsUpDown, CircleDashed, Factory, GitPullRequest } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { Effort } from '../../src/picture.ts';
import { Progress } from './parts.tsx';
import { shown, type Place } from './places.ts';
import type { Project } from './samples.ts';

interface Props {
  readonly projects: readonly Project[];
  readonly project: Project;
  readonly onProject: (project: Project) => void;
  readonly place: Place;
  readonly onPlace: (place: Place) => void;
  readonly closedEfforts: boolean;
  readonly onClosedEfforts: (on: boolean) => void;
}

export function Sidebar({ projects, project, onProject, place, onPlace, closedEfforts, onClosedEfforts }: Props) {
  const { picture } = project;
  const efforts = (list: readonly Effort[], depth: number): ReactNode =>
    shown(list, closedEfforts).map((effort) => (
      <div key={effort.number}>
        <Row on={place.kind === 'effort' && place.number === effort.number} depth={depth} onClick={() => { onPlace({ kind: 'effort', number: effort.number }); }}>
          <span className={clsx('min-w-0 flex-1 truncate', effort.state !== 'open' && 'text-mute')}>{effort.title}</span>
          <Progress {...effort.progress} />
        </Row>
        {efforts(effort.efforts, depth + 1)}
      </div>
    ));

  return (
    <aside aria-label="Project" className="flex w-[300px] shrink-0 flex-col border-r border-line bg-side">
      <div className="p-3">
        <ProjectSwitcher projects={projects} project={project} onProject={onProject} />
      </div>
      <nav aria-label="Efforts" className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <h2 className="px-2 pb-1 pt-2 text-[13px] font-medium text-mute">Efforts</h2>
        {shown(picture.efforts, closedEfforts).length === 0 && <p className="px-2 py-1.5 text-mute">None open</p>}
        {efforts(picture.efforts, 0)}
        <div className="mt-3 border-t border-line pt-3">
          <Row on={place.kind === 'no effort'} onClick={() => { onPlace({ kind: 'no effort' }); }}>
            <CircleDashed aria-hidden className="size-4 text-mute" />
            <span className="flex-1">No effort</span>
            <Count n={picture.ticketsWithNoEffort.length} />
          </Row>
          <Row on={place.kind === 'unplaced'} onClick={() => { onPlace({ kind: 'unplaced' }); }}>
            <GitPullRequest aria-hidden className="size-4 text-mute" />
            <span className="flex-1">Unplaced</span>
            <Count n={picture.unplacedPullRequests.length} />
          </Row>
        </div>
      </nav>
      <button
        type="button"
        role="switch"
        aria-checked={closedEfforts}
        onClick={() => { onClosedEfforts(!closedEfforts); }}
        className="flex items-center gap-2 border-t border-line px-5 py-3 text-left text-ink-2 hover:bg-surface/60"
      >
        <span className="flex-1">Closed efforts</span>
        <span className={clsx('flex h-5 w-9 rounded-full p-0.5 transition-colors', closedEfforts ? 'justify-end bg-ink' : 'bg-faint')}>
          <span className="size-4 rounded-full bg-surface" />
        </span>
      </button>
    </aside>
  );
}

function Row({ on, depth = 0, onClick, children }: { readonly on: boolean; readonly depth?: number; readonly onClick: () => void; readonly children: ReactNode }) {
  return (
    <button
      type="button"
      aria-current={on ? 'page' : undefined}
      onClick={onClick}
      style={{ paddingLeft: 8 + depth * 16 }}
      className={clsx('flex w-full items-center gap-2.5 rounded-lg py-1.5 pr-2 text-left', on ? 'bg-surface text-ink shadow-sm ring-1 ring-line' : 'text-ink-2 hover:bg-surface/60')}
    >
      {children}
    </button>
  );
}

function Count({ n }: { readonly n: number }) {
  return <span className="text-[14px] text-mute">{n}</span>;
}

function ProjectSwitcher({ projects, project, onProject }: Pick<Props, 'projects' | 'project' | 'onProject'>) {
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger aria-label={`Project: ${project.name}`} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-surface/70 data-[state=open]:bg-surface">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-ink text-page">
          <Factory aria-hidden className="size-[18px]" />
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate font-semibold">{project.name}</span>
          <span className="block truncate text-[14px] text-mute">{project.note}</span>
        </span>
        <ChevronsUpDown aria-hidden className="size-4 text-faint" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={6} aria-label="Projects" className="z-50 w-[276px] rounded-xl border border-line bg-surface p-1.5 shadow-xl">
          {projects.map((each) => (
            <button
              key={each.name}
              type="button"
              aria-current={each === project ? 'true' : undefined}
              onClick={() => {
                onProject(each);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-sunk"
            >
              <span className="flex-1 truncate">{each.name}</span>
              <span className="text-[14px] text-mute">{each.note}</span>
              {each === project ? <Check aria-hidden className="size-4" /> : <span className="size-4" />}
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
