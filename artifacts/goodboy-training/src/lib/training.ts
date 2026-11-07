import type { TrainingWorkspace, MilestoneContent, PathStep, DogProfile, DogAssignment, AssignedMilestone } from '@workspace/api-client-react';
import { fillBlankSitFields } from './sample-sit.ts';
export type { TrainingWorkspace, MilestoneContent, MilestoneTemplate, DogProfile, TrainingProgram, DogAssignment, PathStep, AssignedMilestone, SampleFeedbackNote, PracticeEntry, PracticeOutcome, PracticeFeedback } from '@workspace/api-client-react';
export type Status = 'not-started' | 'in-progress' | 'completed';
export const statusLabel: Record<Status, string> = { 'not-started': 'Not started', 'in-progress': 'In progress', completed: 'Completed' };
export const newId = () => crypto.randomUUID();
export const blankMilestone = (): MilestoneContent => ({ name: '', description: '', command: '', handSignal: '', instructions: '', category: 'Foundation', difficulty: 'Beginner', videoPath: '' });
export const foundationObjectives: Readonly<Record<string, string>> = {
  sit: 'Responds to the agreed sit cue and remains seated until released.',
  stay: 'Remains in position for the duration and distance agreed with the trainer, until released.',
  retrieve: 'Brings the agreed object back and releases it to the handler on cue.',
  come: 'Returns to the handler on the agreed recall cue in the practice setting.',
  heel: 'Walks beside the handler for the distance and position agreed with the trainer.',
};
export function foundationObjectiveExample(templateId: string, name: string): string | undefined {
  return templateId === name.trim().toLowerCase() ? foundationObjectives[templateId] : undefined;
}
export function isExampleObjective(description: string): boolean {
  return Object.values(foundationObjectives).includes(description.trim());
}
export function seedWorkspace(): TrainingWorkspace {
  const names = ['Sit', 'Stay', 'Retrieve', 'Come', 'Heel'];
  const ids = names.map(name => name.toLowerCase());
  const state: TrainingWorkspace = {
    version: 2,
    dogs: [{ id: 'raya', name: 'Raya', breed: 'Newfoundland', trainingType: 'Service dog in training', birthDate: '', handlerName: '', photo: '' }],
    // Defaults apply only to a fresh workspace, never when loading saved guest records.
    milestones: names.map((name, i) => {
      const content = { ...blankMilestone(), name, description: foundationObjectives[ids[i]] };
      return { ...(ids[i] === 'sit' ? fillBlankSitFields(content) : content), id: ids[i] };
    }),
    paths: [{ id: 'foundation', name: 'Foundation Skills', description: 'The everyday cues that build a shared language.', steps: ids.map(id => ({ id: `step-${id}`, templateId: id, customization: null })) }],
    assignments: [],
  };
  state.assignments.push(createAssignment(state, 'raya', 'foundation', 'raya-foundation'));
  return state;
}
export function snapshotSteps(state: TrainingWorkspace, pathId: string): AssignedMilestone[] {
  const path = state.paths.find(p => p.id === pathId);
  if (!path) throw new Error('The assigned training path is missing. Existing records have not been changed.');
  return path.steps.map(step => {
    const content = resolveStep(state, step);
    if (!content) throw new Error('An assigned milestone is missing. Existing records have not been changed.');
    return { id: step.id, templateId: step.templateId, content: structuredClone(content), practiceVideoPath: '' };
  });
}
export function createAssignment(state: TrainingWorkspace, dogId: string, pathId: string, id: string = newId()): DogAssignment {
  return { id, dogId, pathId, progress: {}, milestones: snapshotSteps(state, pathId) };
}
export function migrateAssignments(state: TrainingWorkspace): TrainingWorkspace {
  return { ...state, assignments: state.assignments.map(a => {
    const milestones = a.milestones ?? snapshotSteps(state, a.pathId);
    return { ...a, milestones: milestones.map(m => !m.practiceVideoPath || m.practiceEntries !== undefined ? m : {
      ...m, practiceEntries: [{ id: `legacy-${m.id}`, milestoneId: m.id, createdAt: '', videoPath: m.practiceVideoPath, description: '', outcome: 'unsure' as const }],
    }) };
  }) };
}
export function assignmentMilestones(state: TrainingWorkspace, assignment: DogAssignment): AssignedMilestone[] {
  return assignment.milestones ?? snapshotSteps(state, assignment.pathId);
}
export function loadPrototype(): TrainingWorkspace {
  const saved = localStorage.getItem('goodboy-prototype-v2');
  if (saved) {
    const state = JSON.parse(saved);
    if (state.version !== 2 || !Array.isArray(state.dogs) || !Array.isArray(state.milestones) || !Array.isArray(state.paths) || !Array.isArray(state.assignments)) throw new Error('Saved records could not be loaded. Your original data has been retained.');
    return migrateAssignments(state);
  }
  const raw = localStorage.getItem('goodboy-prototype-v1');
  if (!raw) return seedWorkspace();
  const old = JSON.parse(raw);
  if (!old.profile || !Array.isArray(old.paths) || !Array.isArray(old.skills)) throw new Error('Saved records could not be loaded. Your original data has been retained.');
  const photo = String(old.profile.photo || '');
  const dogs: DogProfile[] = [{ id: 'raya', name: old.profile.name, breed: old.profile.breed, trainingType: old.profile.trainingType, handlerName: '', birthDate: '', photo: photo.startsWith('data:image/') ? photo : '' }];
  const milestones = old.skills.map((s: Record<string, string>) => ({ ...blankMilestone(), id: s.id, name: s.name || '', description: s.description || '', command: s.command || '', handSignal: s.handSignal || '', instructions: s.instructions || '', videoPath: s.videoPath || s.videoUrl || '' }));
  const paths = old.paths.map((p: {id: string; name: string; description: string; skillIds: string[]}) => ({ id: p.id, name: p.name, description: p.description, steps: p.skillIds.filter(id => milestones.some((m: {id: string}) => m.id === id)).map(id => ({ id: `step-${id}`, templateId: id, customization: null })) }));
  const path = paths.find((p: {id: string}) => p.id === old.profile.pathId);
  const progress: Record<string, Status> = {};
  old.skills.forEach((s: {id: string; status: Status}) => { progress[`step-${s.id}`] = s.status || 'not-started'; });
  return migrateAssignments({ version: 2, dogs, milestones, paths, assignments: path ? [{ id: 'raya-foundation', dogId: 'raya', pathId: path.id, progress }] : [] });
}
export function resolveStep(state: TrainingWorkspace, step: PathStep): MilestoneContent | undefined {
  return step.customization || state.milestones.find(m => m.id === step.templateId);
}
export function ageLabel(birthDate: string, now = new Date()): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return 'Age not added';
  const [year, month, day] = birthDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.valueOf()) || date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day || date > now) return 'Age not added';
  let months = (now.getFullYear() - year) * 12 + now.getMonth() - (month - 1);
  if (now.getDate() < day) months--;
  if (months < 1) return 'Under 1 month';
  const years = Math.floor(months / 12), remaining = months % 12;
  return [years ? `${years} year${years === 1 ? '' : 's'}` : '', remaining ? `${remaining} month${remaining === 1 ? '' : 's'}` : ''].filter(Boolean).join(', ');
}
export function mediaUrl(path: string, shareId?: string): string {
  if (!path) return '';
  if (path.startsWith('data:image/')) return path;
  return `/api/storage${path}${shareId ? `?share=${encodeURIComponent(shareId)}` : ''}`;
}
