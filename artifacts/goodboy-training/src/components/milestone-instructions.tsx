import type { MilestoneContent } from '@/lib/training';
import { isExampleObjective } from '@/lib/training';
import { Modal } from './shared';

export function MilestoneInstructions({ content, onClose }: { content: MilestoneContent; onClose: () => void }) {
  return <Modal title={`${content.name} instructions`} onClose={onClose} wide>
    <div className="modal-scroll instructions-content">
      <section><h3>What completion looks like</h3>
        <p>{content.description.trim() || 'Add a completion objective in the milestone editor.'}</p>
        {isExampleObjective(content.description) && <p className="hint">Example objective — trainers should tailor this to each dog.</p>}
      </section>
      <section><h3>Verbal cue</h3><p>{content.command.trim() || 'Not added by the trainer yet.'}</p></section>
      {content.handSignal.trim() && <section><h3>Hand signal</h3><p>{content.handSignal}</p></section>}
      <section><h3>Training instructions</h3><p>{content.instructions.trim() || 'The trainer has not added practice instructions yet.'}</p></section>
    </div>
    <div className="form-actions"><button type="button" className="btn" onClick={onClose}>Close</button></div>
  </Modal>;
}
