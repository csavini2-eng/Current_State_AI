import * as Tabs from '@radix-ui/react-tabs';
import type { MilestoneContent } from '@/lib/training';
import { isSampleSit, SAMPLE_SIT_CUE, SAMPLE_SIT_INSTRUCTIONS, SAMPLE_SIT_OBJECTIVE } from '@/lib/sample-sit';
import { isExampleObjective } from '@/lib/training';
import { Modal } from './shared';
import { LocalVideoField } from './local-video-field';
import { AuthorizedVideo } from './authorized-video';
import { SampleSit, type SampleNoteApi } from './sample-sit';
import { PracticePanel, dedupeEntries, type PracticeApi } from './practice-panel';

export type { SampleNoteApi } from './sample-sit';

export function MilestoneInstructions({ content, templateId, dogName, onClose, scopeNote, onDemoChange, practice, note, token }: {
  content: MilestoneContent; templateId?: string; dogName?: string; note?: SampleNoteApi; onClose: () => void; scopeNote?: string;
  /** Trainer scope only. Without it the demonstration video is read-only. */
  onDemoChange?: (ref: string) => Promise<boolean>;
  practice?: PracticeApi;
  /** Handler capability for reading shared media. */
  token?: string;
}) {
  const sit = !!templateId && isSampleSit(templateId, content);
  const usesSample = sit && (content.command === SAMPLE_SIT_CUE || content.description === SAMPLE_SIT_OBJECTIVE || content.instructions === SAMPLE_SIT_INSTRUCTIONS);
  const skill = content.name || 'Untitled skill';
  const who = dogName ?? 'this dog';
  const saved = practice ? dedupeEntries(practice.entries).filter(e => e.feedback).length : 0;
  return <Modal title={`${skill} instructions`} context={dogName ? `${dogName} · ${skill}` : `Reusable path · ${skill}`} onClose={onClose} wide
    footer={<button type="button" className="btn" onClick={onClose} data-testid="button-close-instructions">Close</button>}>
    <Tabs.Root defaultValue="instructions" className="instructions-content">
      <Tabs.List className="tabs-list" aria-label={`${skill} sections`}>
        <Tabs.Trigger className="tab" value="instructions" data-testid="tab-instructions">Instructions</Tabs.Trigger>
        <Tabs.Trigger className="tab" value="videos" data-testid="tab-videos">Videos &amp; practice</Tabs.Trigger>
        {practice && <Tabs.Trigger className="tab" value="history" data-testid="tab-history">Feedback &amp; history{saved > 0 && <span className="tab-count">{saved}</span>}</Tabs.Trigger>}
      </Tabs.List>

      <Tabs.Content value="instructions" forceMount>
        {usesSample && <p className="scope-note sample-label" role="note" data-testid="text-sample-content">Editable sample content. This written plan is example text, not taken from the sample clip. The clip has no audio and does not establish the spoken cue or release word.</p>}
        <section><h3>What completion looks like</h3>
          <p>{content.description.trim() || 'Completion objective not added.'}</p>
          {isExampleObjective(content.description) && <p className="hint">Example objective. Trainers should tailor this to each dog.</p>}
        </section>
        <section><h3>Verbal cue</h3><p>{content.command.trim() || 'Not added by the trainer yet.'}</p></section>
        {content.handSignal.trim() && <section><h3>Hand signal</h3><p>{content.handSignal}</p></section>}
        <section><h3>Training instructions</h3><p>{content.instructions.trim() || 'The trainer has not added practice instructions yet.'}</p></section>
      </Tabs.Content>

      <Tabs.Content value="videos" forceMount>
        {scopeNote && onDemoChange && <p className="scope-note" role="note">{scopeNote} Videos and notes never change progress.</p>}
        <section className="video-sections">
          {onDemoChange
            ? <LocalVideoField label="Demonstration video" kind="demonstration" hint="How the trainer shows the skill should be practiced." value={content.videoPath} onChange={onDemoChange} />
            : <div className="video-field video-demonstration"><div className="video-field-head"><h3>Demonstration video</h3><span className="video-kind">Trainer reference</span></div>
                {content.videoPath ? <div style={{ marginTop: 10 }}><AuthorizedVideo value={content.videoPath} token={token} label={`${skill} demonstration`} /></div> : <p className="video-msg quiet">No demonstration video yet.</p>}</div>}
          {practice && <div><h3 style={{ margin: '6px 0 10px' }}>Practice for {who}</h3><PracticePanel api={practice} skill={content} dogName={who} mode="practice" /></div>}
          {sit && <details className="sample-details" data-testid="details-sample-sit"><summary>Optional: bundled Sit example</summary>
            <p className="hint">A supplied clip with prepared observations about that clip only, separate from {who}’s own attempts.</p>
            <SampleSit note={note} previewReason={note ? undefined : 'Preview only. Example notes are saved from a trainer’s dog journey.'} />
          </details>}
        </section>
      </Tabs.Content>

      {practice && <Tabs.Content value="history" forceMount>
        <PracticePanel api={practice} skill={content} dogName={who} mode="history" />
        {sit && note?.value && <div className="sample-note" style={{ marginTop: 14 }}><span className="source-tag">{note.value.source} · bundled Sit example</span><p>{note.value.text}</p><p className="hint" style={{ margin: '6px 0 0' }}>Edit or remove it under Videos &amp; practice.</p></div>}
      </Tabs.Content>}
    </Tabs.Root>
  </Modal>;
}
