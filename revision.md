# Weenstone revision and evaluation

Reviewed November 7, 2026. This record concerns the live Replit prototype. A ChatGPT-assisted browser walkthrough used synthetic data; it was not an independent user study. The November 8 GitHub check confirmed that the source was still behind the live app. These documents were added separately; sync the current Replit source before submission.

## User problem and central task

When different handlers teach the same dog in different ways, the training record and expectations can become inconsistent. Weenstone gives the trainer and handler a dog-specific path, agreed instructions, and a record of practice and progress.

The central task is to assign a path, understand what to practice, record progress, and share the plan with a handler who can submit practice. The intended AI role supports reviewing that practice; it does not decide whether the dog is ready or certified.

## Three priority improvements

1. **Shared understanding of each skill.** Add completion objectives, cues and instructions; make individual-dog customizations independent of other dogs. Keep template editing separate from assigned journeys.
2. **A demonstrable feedback loop with user control.** Provide a sample clip and explicitly simulated feedback that can be edited, saved or dismissed. Restore the handler-sharing route and practice-submission controls. Personal-video feedback remains a verification priority.
3. **Clearer progress and actions.** Put status beside the skill name, retain one main progress action, move management controls to a More menu, and confirm saved completion with encouragement. Apply Weenstone branding and the edited Raya portrait as supporting visual improvements.

## Response to peer feedback

| Feedback or observed issue | Decision | What changed or why deferred |
| --- | --- | --- |
| Completing a milestone needed more encouragement. | Acted on | Saved completion now produces a completion message and updated counter. The review observed the message; animation and reduced-motion behavior were not separately measured. |
| “Details to be added” did not explain successful completion. | Acted on | Starter milestones show example objectives. Sit includes a cue and written practice instructions, available through View instructions. Trainers can tailor them. |
| Assign gave no explanation when no path was selected. | Adapted | Assignment requires a selection before its button is enabled. The review confirmed the disabled-to-enabled state after choosing Foundation Skills. |
| AI was explained only in the README; testers could not see an example. | Acted on | The optional bundled Sit example exposes prepared observations, limits, and a next step, with edit/save/dismiss controls. |
| Actual automatic video feedback was not available. | Deferred | The milestone permits simulation. Live analysis needs separate implementation and evaluation; this review makes no model-accuracy claim. |
| User review found videos disappeared and shared edits affected too broad a scope. | Acted on | Video sections are restored. A customization made to Demo Scout did not alter Raya's cue. |
| User review found too many competing buttons and a missing handler link. | Acted on | Status is near the skill name, management actions are in More, and sharing can create a server-backed assignment link. |

Classmate names are omitted. The initial peer evidence came from the three anonymous October 30 reviews supplied by the project owner.

## Evaluation method

The following criteria guided the browser walkthrough. Tests used the public live app, a synthetic dog called Demo Scout, a synthetic handler called Demo Alex, and the existing sample Raya. Expected behavior is stated separately from actual observations. These are functional checks performed with ChatGPT assistance, not results from five human participants.

| Case | Input or action | Expected result / success criterion | Actual result | Result | Implication or next step |
| --- | --- | --- | --- | --- | --- |
| Typical 1 | Add Demo Scout, assign Foundation Skills, start Sit, mark completed, then refresh. | Correct dog saves; selected path appears; status changes and counter reaches 1 of 5; saved state survives refresh. | Dog and path appeared. Start practicing changed Sit to In progress. Mark completed showed “Sit completed! Demo Scout has completed 1 of 5 milestones.” Refresh retained Completed and 1 of 5. The confirmation did not replay on refresh. | Pass | Main guest progress loop works for this input. Test failures and simultaneous updates separately. |
| Typical 2 | Open Demo Scout's Sit instructions; open the bundled example; request sample feedback; replace its note with reviewed text and save; refresh and reopen. | Clear skill guidance and simulated response; editable note saves for this dog and retains its source label after refresh. | Sit showed the objective, cue and instructions. The example showed prepared observations and limits. Saved note “Demo review: the sample shows a sit. Ask the trainer to confirm the agreed standard.” remained after refresh, labeled SIMULATED SAMPLE FEEDBACK. | Pass | Demonstrates review and retention of a prepared output. It does not test a model or prove handlers find the note useful. |
| Challenge | With Raya and Demo Scout assigned Foundation Skills, edit only Scout's Sit cue to “Settle — Demo Scout only.” Compare Raya and reopen Scout after refresh. | Scout's cue changes; Raya keeps its own cue; progress remains independent. | Scout's edited cue persisted and also appeared in the shared handler page. Raya still showed “Sit.” and 0 completed, while Scout retained 1 completed. | Pass for two-dog isolation | Reusable-gallery and reusable-path isolation were not separately rechecked in this run. |
| Invalid or empty | Save a new dog with its name empty. | Clear error; no incomplete dog record. | “Add the dog’s name.” appeared and the form stayed open. No empty-name dog was added; filling the form then created Demo Scout normally. | Pass | Essential validation works. Unsupported and oversized video files remain untested. |
| Risk | With Raya's Sit Not started, open prepared feedback, inspect its limits, dismiss it, then return to the journey. | User can reject the response; positive-looking sample feedback does not mark Raya completed. | The response explicitly said no automated video analysis was running and listed unconfirmed cues. Dismiss removed it. Raya remained Not started with 0 of 5 completed. | Pass for this safeguard | Rejection and progress separation work. Misinterpretation by a human tester still needs checking. |

### Supplemental checks and unresolved tests

| Check | Criterion | Actual observation | Result |
| --- | --- | --- | --- |
| Create and open sharing | Synthetic assignment link opens with the intended dog, path and customized instructions. | Link creation succeeded. The handler page opened in another tab, displayed Demo Scout, Foundation Skills, 1 of 5 progress, and Scout's customized cue. It showed no trainer progress-edit controls in the inspected view. | Pass for observed same-browser flow; independent-device isolation remains untested. |
| Revoke sharing | Revoked link no longer opens its plan. | After revocation, refreshing the handler tab showed “This shared plan is not available.” Local Scout records remained. | Pass for reviewed access path. |
| Personal practice-video upload | Select sample MP4, play it, describe practice, request simulated feedback, and save an entry. | Browser file-chooser automation timed out before file selection could complete. No personal upload or personal-video feedback was verified. The cause is unresolved and may involve the testing tool. | Not verified; do not count as an app failure or a pass. |

The generated test handler link was revoked. No access token or management key is included in these public notes.

## Before and after using the same task

**Task:** Open Sit and find the standard for marking it completed.

**Before:** The October 30 peer review and the earlier browser inspection found “Details to be added.” A handler could see the status selector but lacked a clear written standard.

**After:** The revised Sit card shows “Responds to the agreed sit cue and remains seated until released.” View instructions shows the objective, the sample cue and practice instructions. The plan says that trainers should tailor the example.

**Interpretation:** The interface now provides information that was missing. This supports clearer guidance structurally, but a human tester has not yet demonstrated that they interpret or apply the standard consistently. The earlier result is historical evidence; the old deployment was not rerun during this evaluation.

## What the evidence tells us

The reviewed guest flow reasonably supports creating a dog, assigning a path, recording progress, tailoring a cue, and reviewing a prepared feedback note. Separate dog records remained independent, and a generated handler link could be opened and revoked. These checks support the narrower claim that Weenstone organizes shared instructions and records; they do not show faster training, consistent handler behavior, effective coaching, or model accuracy. Personal-video upload, description-based feedback, handler-to-trainer video receipt, independent-device access, mobile use and human understanding remain unverified in this run. The next evaluation should complete one real handler submission with sample footage and ask a trainer or handler what they would do with the note.

## Concrete risk and response

A handler could mistake prepared positive-looking feedback for an expert assessment and mark a dog ready to move on. The implemented response makes the sample source visible, states what cannot be confirmed, allows editing and dismissal, and keeps completion under separate user control. The risk test demonstrated that dismissing the response left Raya Not started. This addresses over-reliance on AI and human agency through an interaction safeguard, beyond a generic disclaimer. A user may still over-trust the text or manually mark completion too early, so trainer-defined criteria and human review remain necessary. This test does not establish real-world training safety.

A secondary privacy limitation is that anyone holding a handler link can access that shared assignment and submit practice. The UI explains this and permits revocation, which passed the supplemental check. Wider privacy/security review is outside this walkthrough.

## Current status and limitations

| Capability | Status supported by this review |
| --- | --- |
| Guest dog setup, path assignment and progress | Functional for tested inputs. |
| Dog-specific cue editing | Functional for the two compared dogs. |
| Sample Sit video and prepared feedback UI | Present; prepared note edit/save/dismiss and persistence verified. Full video playback not verified in this run. |
| Handler-link creation, opening and revocation | Functional in reviewed tabs; separate browser/device test remains. |
| Personal-video storage, submissions and description-based simulated feedback | Controls present; end-to-end behavior not verified. |
| Automatic interpretation of uploaded footage | Not demonstrated; do not claim implemented. |
| Training outcomes, certification or readiness | Not evaluated or guaranteed. |
| Live app source in public GitHub | Not current at review time. |

## Ranked next priorities

1. Sync the revised code/assets to the same public GitHub repository and verify personal-video submission, feedback and trainer receipt using a second browser/device.
2. Ask one intended user to perform the central task and explain what the simulated note means. Record the result, including confusion or failure.
3. Record the 2–3 minute demo, add the Drive link and required viewer access, and submit the video file plus repository URL in Canvas.
