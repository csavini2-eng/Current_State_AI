import type { TrainingWorkspace, Status } from './training';
import { assignmentMilestones } from './training.ts';

export type CompletionEvent = { assignmentId: string; stepId: string; message: string; pathCompleted: boolean };

/** Computes an intended transition only. The UI must wait for save=true before displaying its event. */
export function transitionProgress(state: TrainingWorkspace, assignmentId: string, stepId: string, status: Status): { next: TrainingWorkspace; celebration: CompletionEvent | null } {
  const assignment = state.assignments.find(a => a.id === assignmentId);
  if (!assignment) throw new Error('This dog assignment no longer exists.');
  const milestones = assignmentMilestones(state, assignment);
  const milestone = milestones.find(m => m.id === stepId);
  if (!milestone) throw new Error('This assigned milestone no longer exists.');
  const previous = assignment.progress[stepId] ?? 'not-started';
  if (previous === status) return { next: state, celebration: null };
  const progress = { ...assignment.progress, [stepId]: status };
  const next = { ...state, assignments: state.assignments.map(a => a.id === assignmentId ? { ...a, progress } : a) };
  if (status !== 'completed') return { next, celebration: null };
  const total = milestones.length;
  const done = milestones.filter(m => progress[m.id] === 'completed').length;
  const dog = state.dogs.find(d => d.id === assignment.dogId)?.name ?? 'This dog';
  return {
    next,
    celebration: {
      assignmentId, stepId,
      message: `${milestone.content.name || 'Skill'} completed! ${dog} has completed ${done} of ${total} milestones.`,
      pathCompleted: total > 0 && done === total,
    },
  };
}
