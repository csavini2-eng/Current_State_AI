import type { MilestoneContent } from '@/lib/training';
import { isExampleObjective } from '@/lib/training';
import { Modal } from './shared';
import { LocalVideoField } from './local-video-field';

export function MilestoneInstructions({ content, onClose, scopeNote, onDemoChange, practice }: {
  content: MilestoneContent; onClose: () => void; scopeNote?: string;
  onDemoChange?: (ref: string) => Promise<boolean>;
  practice?: { dogName: string; value: string; onChange: (ref: string) => Promise<boolean> };
}) {
  return <Modal title={`${content.name} instructions`} onClose={onClose} wide>
    <div className="modal-scroll instructions-content">
      <section><h3>What completion looks like</h3>
        <p>{content.description.trim() || 'Add a completion objective in the milestone editor.'}</p>
        {isExampleObjective(content.description) && <p className="hint">Example objective — trainers should tailor this to each dog.</p>}
      </section>
      <section><h3>Verbal cue</h3><p>{content.command.trim() || 'Not added by the trainer yet.'}</p></section>
      {content.handSignal.trim() && <section><h3>Hand signal</h3><p>{content.handSignal}</p></section>}
      <section><h3>Training instructions</h3><p>{content.instructions.trim() || 'The trainer has not added practice instructions yet.'}</p></section>
      <section className="video-sections">
        {scopeNote && (onDemoChange || practice) && <div className="assist-box" role="note"><span>{scopeNote} Viewing or changing videos does not change progress.</span></div>}
        {onDemoChange
          ? <LocalVideoField label="Demonstration video" kind="demonstration" hint="How the trainer shows the skill should be practiced." value={content.videoPath} onChange={onDemoChange} />
          : <ReadOnlyDemo value={content.videoPath} />}
        {practice && <LocalVideoField label={`Practice video for ${practice.dogName}`} kind="practice" hint={`A recording of ${practice.dogName} practicing this milestone, kept for reference.`} value={practice.value} onChange={practice.onChange} />}
      </section>
    </div>
    <div className="form-actions"><button type="button" className="btn" onClick={onClose}>Close</button></div>
  </Modal>;
}

function ReadOnlyDemo({ value }: { value: string }) {
  if (!value) return <div className="video-field video-demonstration"><div className="video-field-head"><h3>Demonstration video</h3><span className="video-kind">Trainer reference</span></div><p className="video-msg quiet">No demonstration video yet.</p></div>;
  return <LocalVideoFieldReadOnly value={value} />;
}

function LocalVideoFieldReadOnly({ value }: { value: string }) {
  // Without a writable scope, show the player but no change actions.
  return <div className="video-readonly"><LocalVideoField label="Demonstration video" kind="demonstration" value={value} onChange={() => undefined} /></div>;
}
