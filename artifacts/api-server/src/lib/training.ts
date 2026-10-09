import { eq, and } from 'drizzle-orm';
import { db, handlerShares, trainingWorkspaces } from '@workspace/db';
import type { TrainingWorkspace, HandlerPath, MilestoneContent } from '@workspace/api-zod';

export async function sharedPath(id: string): Promise<(HandlerPath & { ownerId: string }) | null> {
  const [share] = await db.select().from(handlerShares).where(and(eq(handlerShares.id, id), eq(handlerShares.revoked, false)));
  if (!share) return null;
  const [workspace] = await db.select().from(trainingWorkspaces).where(eq(trainingWorkspaces.ownerId, share.ownerId));
  if (!workspace) return null;
  const state = workspace.state as TrainingWorkspace;
  const assignment = state.assignments.find(a => a.id === share.assignmentId);
  if (!assignment) return null;
  const dog = state.dogs.find(d => d.id === assignment.dogId);
  const path = state.paths.find(p => p.id === assignment.pathId);
  if (!dog || !path) return null;
  const milestones = path.steps.map(step => {
    const content: MilestoneContent | undefined = step.customization || state.milestones.find(m => m.id === step.templateId);
    if (!content) throw new Error('Invalid milestone reference in saved workspace');
    return { name: content.name, description: content.description, command: content.command, handSignal: content.handSignal, instructions: content.instructions, category: content.category, difficulty: content.difficulty, videoPath: content.videoPath, id: step.id, status: assignment.progress[step.id] || 'not-started' as const };
  });
  return { ownerId: share.ownerId, dog, pathName: path.name, pathDescription: path.description, handlerName: share.handlerName, milestones, updatedAt: workspace.updatedAt.toISOString() };
}
