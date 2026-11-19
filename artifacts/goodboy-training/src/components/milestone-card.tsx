import * as Menu from '@radix-ui/react-dropdown-menu';
import { ArrowDown, ArrowUp, Check, MoreHorizontal, Pencil, Play, RotateCcw, Trash2, Undo2 } from 'lucide-react';
import type { MilestoneContent, Status } from '@/lib/training';
import { isExampleObjective } from '@/lib/training';
import { StatusPill } from './shared';

type Props = {
  content: MilestoneContent; status?: Status; side: string; busy: boolean;
  isFirst: boolean; isLast: boolean; customized?: boolean; editLabel: string; removeLabel: string;
  onView: () => void; onEdit: () => void; onMove: (d: -1 | 1) => void; onRemove: () => void;
  onStatus?: (s: Status) => void; onResetCustom?: () => void;
};

/** Header (skill, badge, More) → objective + View instructions → one primary progress action. */
export function MilestoneCard({ content, status, side, busy, isFirst, isLast, customized, editLabel, removeLabel, onView, onEdit, onMove, onRemove, onStatus, onResetCustom }: Props) {
  const name = content.name || 'Untitled skill';
  return <div className={`node-card card ${side}`}>
    <div className="card-head">
      <h3>{name}</h3>
      {status && <StatusPill status={status} />}
      <Menu.Root modal={false}>
        <Menu.Trigger asChild><button type="button" className="more-btn" aria-label={`More actions for ${name}`} data-testid="button-more"><MoreHorizontal size={18} /></button></Menu.Trigger>
        <Menu.Portal><Menu.Content className="menu" align="end" sideOffset={6} onCloseAutoFocus={e => { e.preventDefault(); }}>
          <Menu.Item className="menu-item" disabled={busy} onSelect={onEdit}><Pencil size={15} /> {editLabel}</Menu.Item>
          <Menu.Item className="menu-item" disabled={busy || isFirst} onSelect={() => onMove(-1)}><ArrowUp size={15} /> Move earlier</Menu.Item>
          <Menu.Item className="menu-item" disabled={busy || isLast} onSelect={() => onMove(1)}><ArrowDown size={15} /> Move later</Menu.Item>
          {onStatus && status === 'completed' && <Menu.Item className="menu-item" disabled={busy} onSelect={() => onStatus('in-progress')}><Play size={15} /> Practice again</Menu.Item>}
          {onStatus && <Menu.Item className="menu-item" disabled={busy || status === 'not-started'} onSelect={() => onStatus('not-started')}><Undo2 size={15} /> Reset to Not started</Menu.Item>}
          {customized && onResetCustom && <Menu.Item className="menu-item" disabled={busy} onSelect={onResetCustom}><RotateCcw size={15} /> Use gallery milestone again</Menu.Item>}
          <Menu.Separator className="menu-sep" />
          <Menu.Item className="menu-item danger" disabled={busy} onSelect={onRemove}><Trash2 size={15} /> {removeLabel}</Menu.Item>
        </Menu.Content></Menu.Portal>
      </Menu.Root>
    </div>
    {content.description.trim()
      ? <p className="milestone-objective">{content.description}</p>
      : <p className="objective-missing">Completion objective not added.</p>}
    {isExampleObjective(content.description) && <span className="objective-example">Example · tailor to this dog</span>}
    {customized && <span className="tag">Path copy</span>}
    <button type="button" className="text-action" aria-label={`View instructions for ${name}`} data-testid="button-view-instructions" onClick={e => { e.currentTarget.focus({ preventScroll: true }); onView(); }}>View instructions</button>
    {onStatus && status && <div className="primary-row">
      {status === 'not-started' && <button type="button" className="btn btn-small" disabled={busy} onClick={() => onStatus('in-progress')} data-testid="button-start">Start practicing</button>}
      {status === 'in-progress' && <button type="button" className="btn btn-small btn-done" disabled={busy} onClick={() => onStatus('completed')} data-testid="button-complete">Mark completed</button>}
      {status === 'completed' && <span className="done-state"><Check size={16} strokeWidth={3} /> Skill completed</span>}
    </div>}
  </div>;
}
