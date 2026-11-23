import type { Effort, TicketState } from '../../src/picture.ts';

export function Progress({ done, total }: Effort['progress']) {
  if (total === 0) return <span className="shrink-0 text-[14px] text-mute">None left</span>;
  return (
    <span role="img" aria-label={`${done} of ${total} done`} className="flex shrink-0 items-center gap-2 text-[14px] text-mute">
      <span className="h-1.5 w-10 overflow-hidden rounded-full bg-line">
        <span className="block h-full bg-ok" style={{ width: `${(done / total) * 100}%` }} />
      </span>
      <span className="min-w-[4ch] whitespace-nowrap text-right">{done}/{total}</span>
    </span>
  );
}

const COLOURS: Readonly<Record<TicketState['kind'], string>> = {
  'in progress': 'bg-warn',
  open: 'bg-faint',
  done: 'bg-ok',
  dropped: 'bg-line',
};

export function Dot({ kind }: { readonly kind: TicketState['kind'] }) {
  return <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${COLOURS[kind]}`} />;
}

export function Chip({ text }: { readonly text: string }) {
  return <span className="rounded-full border border-line px-2 text-[13px] text-mute">{text}</span>;
}

export function PullRequests({ list }: { readonly list: readonly number[] }) {
  return list.map((number) => (
    <span key={number} className="whitespace-nowrap rounded-full bg-warn-soft px-2 text-[13px] text-warn">
      Pull request #{number}
    </span>
  ));
}
