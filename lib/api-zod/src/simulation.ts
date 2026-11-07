export const PRACTICE_DISCLOSURE = 'Prototype: simulated AI feedback. This note is based on the selected skill and your description. The video has not been automatically analyzed. Review suggestions against your trainer’s instructions.';
export const PRACTICE_SOURCE = 'Simulated handler-reported feedback' as const;
export type ReportedOutcome = 'responded' | 'prompting' | 'incomplete' | 'unsure';
export const outcomeLabels: Record<ReportedOutcome, string> = {
  responded: 'Responded to the agreed cue.',
  prompting: 'Needed additional prompting.',
  incomplete: 'Did not complete the skill.',
  unsure: 'Not sure / something else.',
};
type Skill = { name: string; description: string; instructions: string; command: string };
const stopWords = new Set('the and this that with from your they their have were when then what while about will would should could agreed using until word completed practice trainer dog skill'.split(' '));

/** Rules v1: uses reports and written plans only. No video, filename, bytes, or inferred observations are inputs. */
export function simulatePractice(skill: Skill, description: string, outcome: ReportedOutcome) {
  const report = description.trim();
  const words: string[] = report.toLowerCase().match(/[a-z]+/g) ?? [];
  const planWords: string[] = `${skill.name} ${skill.description} ${skill.instructions} ${skill.command}`.toLowerCase().match(/[a-z]+/g) ?? [];
  const meaningful = new Set(planWords.filter(w => w.length > 3 && !stopWords.has(w)));
  const trainingWords = /\b(cue|prompt|prompting|attempt|practice|signal|responded|respond|sit|stay|heel|retrieve|recall)\b/i.test(report);
  const relevant = trainingWords || words.some(w => meaningful.has(w));
  const reported = `You reported: ${report ? `“${report}”` : 'No description was provided.'}\nSelected description: ${outcomeLabels[outcome] ?? outcomeLabels.unsure}`;
  const missingPlan = !skill.description.trim() || !skill.instructions.trim();
  const unsupported = /\b(pain|limping|injured|diagnos|medical|certified|certification|investment|pizza|football|weather)\b/i.test(report);
  const conflict = outcome === 'responded' && /\b(did not|didn't|never|unable|failed)\b/i.test(report);
  if (words.length < 4 || !relevant || outcome === 'unsure' || unsupported || conflict || missingPlan) {
    const question = missingPlan
      ? `Ask the trainer to add a completion objective and practice instructions for ${skill.name || 'this skill'} before interpreting this attempt.`
      : unsupported
        ? 'This description includes something these practice rules do not support. Clarify the training attempt with your trainer; these rules cannot assess health, safety, certification, or unrelated topics.'
        : `What cue or step did you try for ${skill.name || 'this skill'}, what did you report happening, and which of the listed outcomes best fits? Please clarify rather than treating an upload as evidence of completion.`;
    return { text: `${reported}\n\nClarification needed: ${question}`, needsClarification: true, ruleId: 'clarify-v1' };
  }
  const consideration = outcome === 'responded'
    ? `Compare your reported response with the written objective: “${skill.description}”. Your description alone does not establish consistency across attempts.`
    : outcome === 'prompting'
      ? 'Your report mentions additional help. Ask which prompts are part of the agreed plan and how to record extra prompting without changing the cue.'
      : 'Your report describes an incomplete attempt. Identify which part of the agreed sequence you tried and discuss the next manageable practice step with the trainer.';
  const next = outcome === 'responded'
    ? 'Ask the trainer what further repetitions or settings they want documented before they decide progression.'
    : outcome === 'prompting'
      ? 'Ask the trainer whether to repeat the planned setup or adjust the amount of help. Record their guidance before changing the plan.'
      : 'Ask the trainer whether to repeat the setup or simplify one part of the agreed sequence. Do not mark completion on the basis of this note.';
  return {
    text: `${reported}\n\nPractice consideration for ${skill.name}: ${consideration}\nTrainer instructions to review: “${skill.instructions.slice(0, 900)}${skill.instructions.length > 900 ? '…' : ''}”\n\nSuggested next step: ${next}`,
    needsClarification: false, ruleId: `${outcome}-v1`,
  };
}
