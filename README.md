# GoodBoy

**GoodBoy is a training journey tool that helps trainers and dog handlers follow the same plan for a service dog in training.**

## What this slice lets a user do

- Add a new dog (name, breed, type, handler). Saving with no name is blocked with a message.
- Assign a training path (for example "Foundation Skills") to that dog.
- Open the dog's journey and set each milestone to Not started, In progress, or Completed. A counter shows how many are completed.
- Read each milestone’s completion objective and open **View instructions** for the trainer’s cue, optional hand signal, and practice instructions.
- Edit reusable originals in the gallery, customize reusable paths in Training Paths, or edit a dog’s independent assigned version from its journey. Reading or editing instructions never marks a milestone complete.
- Select separate demonstration and dog-practice videos, play them locally, and replace/remove each recording without affecting another dog.

## Open the prototype

Live app: https://good-boy-dog-training-platform.replit.app

Open the preview and use **Add New Dog**. The public demo has no sign-in dependency or account prompts. Records stay in this browser, do not sync across devices, and may be lost when browser data is cleared. Existing guest storage keys and records are retained.

Local video selection and playback do not require sign-in. Video files are stored in this browser’s IndexedDB, not localStorage; only opaque references are saved with the records. They do not sync across devices. If browser video storage fails, an explicit temporary-preview option is available and does not change the saved recording.

Cloud-upload and real-sharing controls are not part of this demo round. Existing private backend records, access-controlled media, and previously issued handler links remain protected; the demo never loads account workspaces or turns private videos into public files.

## Editing scopes

1. **Gallery milestone:** the reusable source, edited only in Milestone Gallery.
2. **Reusable-path milestone:** that path’s customization, edited from Training Paths.
3. **Dog-assigned milestone:** independent content copied when the path is assigned. Dog-journey actions change only that assignment, including its added steps, order, demonstration references, progress, and practice videos.

Existing assignments without snapshots are migrated from their currently resolved content. IDs, progress, customizations, and video references are preserved; existing snapshots are never rebuilt from later template/path changes. The storage key and workspace version remain unchanged.

Demonstration videos show the trainer’s reference method. Practice videos belong to a particular dog’s assigned milestone. Selecting a practice video does not analyze it; automated feedback is not implemented.

## Sit sample and simulated feedback

- Fresh workspaces include the supplied Sit cue, objective, and editable example instructions. Existing trainer fields are preserved. “Use sample instructions” fills only blank fields in a dog’s editor draft and still requires review and Save.
- “Sample Sit video” is a separate bundled public asset, never a personal demonstration/practice recording. The supplied 2160×3840 footage was optimized to full-frame 720×1280 H.264, preserving its 12.84-second duration and 25fps. It has no audio; the approximately 2 MB web copy is included in production builds. The large source upload is excluded from deploys/checkpoints going forward.
- “Try sample feedback” displays prepared observations and an explicit simulated/no-analysis disclosure. A trainer can edit, save, dismiss, edit again, or remove the one sample-note record for that assigned milestone. Saved notes retain the “Simulated sample feedback” source. No model or video-analysis service is called.
- Other practice-video instructions offer a separate preview-only Sit sample, never observations presented as analysis of a personal recording.
- Progress uses Start practicing, Continue practicing, Mark completed, Practice again, and a secondary reset. Text labels accompany colors. Only successfully saved new completions trigger a brief checkmark/confetti confirmation; final completion adds “Training path completed. Great teamwork!” Reduced motion suppresses effects without suppressing the confirmation.

Fresh Foundation Skills milestones have example completion objectives that trainers should tailor to each dog. Existing blank objectives are not backfilled: open the editor to review an offered example and save it explicitly. Existing cues, hand signals, instructions, and path customizations are not replaced.

## AI is not active

No AI-analysis controls or confirmations are shown in this demo. No real model is connected.

The planned behavior: the handler (the dog owner, not the trainer) uploads a training video. The AI tells them what they are doing right and what to improve. It also gives suggestions, such as flagging when a milestone is taking longer than usual.

## Earlier live-app test results

These three tests were recorded before the current demo update; they are not a claim that the updated build was tested in production.

| Test | Input | Expected | Result |
| --- | --- | --- | --- |
| Typical | Add dog "Biscuit" (Labrador, Service dog in training, handler Maria), assign the Foundation Skills path, set Sit to Completed | Dog saved, journey shows 5 milestones, counter updates | Pass. The profile saved, 5 milestones showed, and the completed counter updated. |
| Challenge | Mark Retrieve as Completed while Stay is still Not started | App handles an out-of-order milestone sensibly | Partial. It allowed the change and updated the counter, with no warning about the order. |
| Invalid / empty | Save a new dog with an empty name | Dog is not saved and the user sees an error | Pass. "Add the dog's name." appeared and nothing was saved. |

## Known limitations

1. Demo records are browser-local, with no cross-device sync or automatic backup.
2. There is no video analysis, cloud video upload, or real sharing control in the guest demo. Browser-stored videos may be lost if browser data is cleared or the browser removes local storage.
3. Trainers must supply missing cues and practice instructions; the app does not invent them or enforce milestone order. Foundation Skills objectives and Raya are sample data.

## Local checks

```sh
pnpm run typecheck
pnpm --filter @workspace/goodboy-training run test
PORT=22351 BASE_PATH=/ pnpm --filter @workspace/goodboy-training run build
```

## Previous instruction-dialog verification

- Full workspace type checks passed; all 11 helper regression tests passed.
- The production frontend build passed with authentication publishable-key variables unset. Vite still emits a nonblocking source-map warning for the existing tooltip component.
- A signed-out browser completed: empty-name validation, dog creation, Foundation Skills assignment, instruction viewing, progress update, and reload persistence.
- Keyboard checks confirmed Tab/Shift+Tab containment, Escape dismissal, and focus restoration to the same instruction button. The visible Close button also worked without changing progress.
- A path-specific edit displayed all trainer-provided instruction fields and left the reusable original and progress unchanged.
- A separate saved-record fixture retained IDs, blank objectives, existing cues/signals/instructions, completed progress, and another step’s customization. Example adoption changed only the draft until explicit Save.
- At 390×844 the instruction dialog wrapped correctly, its Close button was accessible, and it had no horizontal overflow. The test content fit vertically; unusually long-content scrolling was not separately exercised.
- Guest request monitoring showed no private API requests or external authentication-service traffic. Unsigned private workspace and upload requests still returned HTTP 401. Backend authorization code was not changed.

These current checks ran against the development preview, not the published production site.

## Current scope and video verification

- Workspace type checks pass; the production web build passes (the pre-existing tooltip sourcemap warning remains non-blocking).
- All 16 model regression tests pass, including independent dog snapshots, additive migration, preserved IDs/progress/video references, and intentionally empty assignments.
- One isolated browser pass verified Raya/Doug edits, gallery/path independence, dog-only additions, progress and URL selection after reload, and legacy-v2 snapshot migration.
- Real browser-recorded WebM files played successfully before and after reload. Practice replacement/removal affected only the intended dog; other practice and demonstration clips remained playable.
- The browser pass verified opaque references in localStorage, actual video Blobs in IndexedDB, explicit storage-failure/temporary-preview behavior, and mobile dialog scrolling plus Escape/focus restoration.
- Unauthenticated private workspace and upload requests still return 401. No real user or production records were modified during verification. Signed-in cloud-media flows were not re-tested; no cloud-video upload feature was added.

## Sit sample and progress verification

- All 23 model regression tests pass, as do workspace type checks and the production build. The existing non-blocking tooltip sourcemap warning remains.
- The supplied sample played for a fresh guest with controls, no autoplay, and full-frame `contain` styling. The built copy has no audio stream (verified with ffprobe). At 390×844, the entire paused portrait player and its controls were visible without horizontal overflow.
- Isolated browser checks verified the exact simulated disclosure, edited-note persistence, repeated Try without duplicates, dismiss/remove/re-save behavior, and retained source attribution.
- Existing personal demonstration/practice references remained unchanged across note edits, sample-plan saves, and progress changes. Sample fields filled only blanks after review; cancelling discarded the draft, and saving affected only Raya.
- Doug, reusable Foundation, and the gallery stayed independent. Dog journeys offered no reusable-path switch; Training Paths still opened the reusable editor.
- A deliberately failed storage write preserved In progress and its counter and showed no celebration. Successful completion updated counts and announced the required text; reload did not replay it. Practice again and reset worked.
- Reduced-motion keyboard completion produced the final 5-of-5 message without animation/confetti or scrolling. Escape restored focus. Non-Sit sample previews explicitly described only the sample clip and did not save observations against the other skill.
- These checks used isolated development-browser data. The published site and signed-in cloud-media flows were not re-tested.
