import { eq, and } from 'drizzle-orm';
import { db, handlerShares, trainingWorkspaces } from '@workspace/db';
import type { TrainingWorkspace, HandlerPath, MilestoneContent } from '@workspace/api-zod';

export function snapshotWorkspace(state: TrainingWorkspace, previous?: TrainingWorkspace): TrainingWorkspace {
  return { ...state, assignments: state.assignments.map(assignment => {
    if (assignment.milestones !== undefined) return assignment;
    // Legacy clients must not rebuild an existing dog's content after editing a source.
    const prior = previous?.assignments.find(a => a.id === assignment.id);
    const source = prior && previous ? previous : state;
    const original = prior || assignment;
    if (original.milestones !== undefined) return { ...assignment, milestones: structuredClone(original.milestones) };
    const path = source.paths.find(p => p.id === original.pathId);
    if (!path) throw new Error('Missing path for an existing dog assignment');
    return { ...assignment, milestones: path.steps.map(step => {
      const content = step.customization || source.milestones.find(m => m.id === step.templateId);
      if (!content) throw new Error('Missing milestone for an existing dog assignment');
      return { id: step.id, templateId: step.templateId, content: structuredClone(content), practiceVideoPath: '' };
    }) };
  }) };
}

export async function sharedPath(id: string): Promise<(HandlerPath & { ownerId: string }) | null> {
  const [share] = await db.select().from(handlerShares).where(and(eq(handlerShares.id, id), eq(handlerShares.revoked, false)));
  if (!share) return null;
  const [workspace] = await db.select().from(trainingWorkspaces).where(eq(trainingWorkspaces.ownerId, share.ownerId));
  if (!workspace) return null;
  const state = snapshotWorkspace(workspace.state as TrainingWorkspace);
  const assignment = state.assignments.find(a => a.id === share.assignmentId);
  if (!assignment) return null;
  const dog = state.dogs.find(d => d.id === assignment.dogId);
  const path = state.paths.find(p => p.id === assignment.pathId);
  if (!dog || !path) return null;
  const milestones = assignment.milestones!.map(step => {
    const content: MilestoneContent = step.content;
    return { name: content.name, description: content.description, command: content.command, handSignal: content.handSignal, instructions: content.instructions, category: content.category, difficulty: content.difficulty, videoPath: content.videoPath, id: step.id, status: assignment.progress[step.id] || 'not-started' as const };
  });
  return { ownerId: share.ownerId, dog, pathName: path.name, pathDescription: path.description, handlerName: share.handlerName, milestones, updatedAt: workspace.updatedAt.toISOString() };
}
