import type { MilestoneContent } from '@workspace/api-client-react';

export const SAMPLE_SIT_VIDEO_PATH = 'samples/sit-sample.mp4';
export const SAMPLE_SIT_CUE = 'Sit.';
export const SAMPLE_SIT_OBJECTIVE = 'Responds to the agreed sit cue and remains seated until released.';
export const SAMPLE_SIT_INSTRUCTIONS = 'Agree on the cue and release word with the trainer. Practice in a quiet setting, give the agreed cue, reward the completed sit using the trainer’s timing, and release using the agreed word.';
export const SAMPLE_FEEDBACK_DISCLOSURE = 'Simulated feedback · Prepared observations about this sample clip. No automated video analysis is running.';
export const SAMPLE_FEEDBACK_SOURCE = 'Simulated sample feedback' as const;
export const SAMPLE_OBSERVATIONS = [
  { title: 'What is visible', text: 'Near the end of the clip, the dog moves from standing to sitting while following the person’s raised hand.' },
  { title: 'What cannot be confirmed', text: 'This clip has no audio. The verbal cue, release cue, and consistency across repeated attempts cannot be confirmed.' },
  { title: 'Next step', text: 'Compare this practice with the trainer’s agreed instructions before deciding whether to mark the milestone completed.' },
] as const;
export const SAMPLE_FEEDBACK_TEXT = SAMPLE_OBSERVATIONS.map(o => `${o.title}: ${o.text}`).join('\n\n');

export function isSampleSit(templateId: string, content: MilestoneContent): boolean {
  return templateId === 'sit' && content.name.trim().toLowerCase() === 'sit';
}
// Only an explicit user action may apply this to an existing dog editor draft.
export function fillBlankSitFields(content: MilestoneContent): MilestoneContent {
  return {
    ...content,
    command: content.command.trim() ? content.command : SAMPLE_SIT_CUE,
    description: content.description.trim() ? content.description : SAMPLE_SIT_OBJECTIVE,
    instructions: content.instructions.trim() ? content.instructions : SAMPLE_SIT_INSTRUCTIONS,
  };
}
