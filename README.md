# GoodBoy

**GoodBoy is a training journey tool that helps trainers and dog handlers follow the same plan for a service dog in training.**

## What this slice lets a user do

- Add a new dog (name, breed, type, handler). Saving with no name is blocked with a message.
- Assign a training path (for example "Foundation Skills") to that dog.
- Open the dog's journey and set each milestone to Not started, In progress, or Completed. A counter shows how many are completed.
- Read each milestone’s completion objective and open **View instructions** for the trainer’s cue, optional hand signal, and practice instructions.
- Edit the reusable original or customize a milestone for just one path. Reading or editing instructions never marks a milestone complete.

## Open the prototype

Live app: https://good-boy-dog-training-platform.replit.app

Open the preview and use **Add New Dog**. The public demo has no sign-in dependency or account prompts. Records stay in this browser, do not sync across devices, and may be lost when browser data is cleared. Existing guest storage keys and records are retained.

Persistent video-upload and real-sharing controls are not part of this demo round. Existing private backend records, access-controlled media, and previously issued handler links remain protected; the demo never loads account workspaces.

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
2. There is no video analysis, persistent video upload, or real sharing control in the guest demo.
3. Trainers must supply missing cues and practice instructions; the app does not invent them or enforce milestone order. Foundation Skills objectives and Raya are sample data.

## Local checks

```sh
pnpm run typecheck
pnpm --filter @workspace/goodboy-training run test
PORT=22351 BASE_PATH=/ pnpm --filter @workspace/goodboy-training run build
```

## Current demo verification

- Full workspace type checks passed; all 11 helper regression tests passed.
- The production frontend build passed with authentication publishable-key variables unset. Vite still emits a nonblocking source-map warning for the existing tooltip component.
- A signed-out browser completed: empty-name validation, dog creation, Foundation Skills assignment, instruction viewing, progress update, and reload persistence.
- Keyboard checks confirmed Tab/Shift+Tab containment, Escape dismissal, and focus restoration to the same instruction button. The visible Close button also worked without changing progress.
- A path-specific edit displayed all trainer-provided instruction fields and left the reusable original and progress unchanged.
- A separate saved-record fixture retained IDs, blank objectives, existing cues/signals/instructions, completed progress, and another step’s customization. Example adoption changed only the draft until explicit Save.
- At 390×844 the instruction dialog wrapped correctly, its Close button was accessible, and it had no horizontal overflow. The test content fit vertically; unusually long-content scrolling was not separately exercised.
- Guest request monitoring showed no private API requests or external authentication-service traffic. Unsigned private workspace and upload requests still returned HTTP 401. Backend authorization code was not changed.

These current checks ran against the development preview, not the published production site.
