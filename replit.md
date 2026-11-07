# Weenstone

A trainer-facing dog-training prototype with browser-local workspaces and explicit server-backed sharing of one dog’s assignment. Existing private-account workspaces and their access controls remain separate.

## Run & Operate

- Open the **Weenstone** web preview; its managed workflow runs the frontend. Internal artifact, package, record IDs, and storage keys intentionally keep their existing names.
- `pnpm --filter @workspace/goodboy-training run typecheck` — typecheck the app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- The public demo always uses guest browser storage, without mounting authentication or loading private account records, even if the browser has an existing signed-in session. It must work without authentication configuration.
- The API retains PostgreSQL, managed authentication, App Storage, and its existing private access controls. Do not weaken these to enable demo interactions.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React, Vite, TypeScript, Wouter
- Signed-in dog profiles, paths, templates, and per-dog progress: PostgreSQL, scoped to the signed-in trainer
- Anonymous prototype: browser local storage, with legacy Raya data preserved and migrated
- Unshared guest photographs and videos: localStorage / IndexedDB. Explicitly shared assignment copies and media: PostgreSQL / App Storage with separate handler and management capabilities.

## Where things live

- `artifacts/goodboy-training/src/App.tsx` — dog directory, profile, paths, journeys, and skill editor
- `artifacts/goodboy-training/src/index.css` — app visual system and responsive styling
- `artifacts/goodboy-training/src/assets/raya-sample.jpg` — user-supplied edited default portrait; never replace a dog’s explicitly uploaded photo
- `artifacts/api-server/` and `lib/` — protected account services and the separately scoped guest-sharing service

## Architecture decisions

- The public demo has no account prompts. Unshared records remain local. Only explicit Create handler link / Update shared assignment copies the selected dog, assigned snapshot, and required media to the server.
- Guest sharing uses distinct unguessable handler and management capabilities. Never expose the management capability in a URL or a shared snapshot. Retain it only in the trainer browser; do not log either capability.
- Handlers may read the selected assignment and append practice attempts / simulated notes. They may not edit trainer instructions, dog details, progress, reusable paths, or gallery originals. Revocation must block reads and submissions, without cached handler fallbacks.
- Importing shared submissions must preserve local content and progress. Publishing updated instructions must not overwrite newer handler reports or notes.
- Existing private workspaces stay private; existing capability links still grant read-only access to one assigned dog/path.
- Editing has three distinct scopes: gallery original, reusable-path customization, and dog-assigned snapshot. A dog’s journey defaults to editing only that dog’s assignment; never offer an ambiguous original-edit action there.
- Individual dog journeys must not offer a reusable-path editing switch. Reusable paths are managed from Training Paths, and gallery originals from Milestone Gallery.
- Snapshot currently resolved milestone content when assigning a path and when migrating older assignments. Preserve content, IDs, progress, and video references; reusable template/path changes must never silently overwrite existing dog snapshots.
- Adding, removing, or reordering milestones in a dog’s journey affects only that assignment, not its source path or another dog.
- Progress belongs to a dog’s path assignment, keyed by path step, never to a global milestone template.
- Private workspace saves retain revision checks. Guest records keep their existing storage keys and are never reset or replaced during this update.
- Seed milestones as illustrative and not started; trainers alone control status changes.
- Use the description field as the completion objective. New Foundation samples use the user-supplied example objectives, clearly labeled for tailoring; existing blank objectives require explicit trainer review/save, never silent backfilling.
- Instruction dialogs are read-only, keyboard accessible, Escape-dismissable, and restore focus. Neither viewing nor editing instructions changes progress.
- Local video blobs belong in IndexedDB, never localStorage or database JSON. Demonstration references belong to their editing scope; practice references belong only to a dog-assigned milestone.
- If local video persistence fails, show an explicit error and offer a temporary preview that does not change the saved reference. Never imply that selecting a practice recording analyzes it.
- Do not invent hand signals or show fake sharing, upload, or AI-analysis confirmations.
- The Sit video is supplied sample footage, not generated footage. Keep it separate from personal demonstration/practice references and display the full portrait frame with controls and no autoplay.
- Existing blank Sit fields can be filled only through explicit sample review and save for that dog; never overwrite trainer content or populate saved records automatically.
- Sample feedback is prepared and simulated, never automated analysis. Retain the “Simulated sample feedback” source on editable notes and scope each note to its assigned dog and milestone.
- Viewing videos/feedback or saving notes must never change progress. Celebrate only after a successful incomplete-to-completed save, never on reload or failed saves, and respect reduced motion.
- Personal practice recordings form append-only attempt history. Keep original videos and reports independent of progress. Notes remain editable/removable while retaining simulated source attribution and the original report.
- Simulated personal feedback is deterministic, based only on the actual selected milestone and handler report/outcome. Missing, unrelated, contradictory, or unsupported reports require clarification. Never infer observations from video bytes or filenames.
- Use the exact prototype disclosure once per feedback input/result area. Keep the bundled Sit sample separate from personal attempts.

## Product

In the guest demo trainers manage dog profiles, combine reusable milestones into paths, assign paths to dogs, review completion criteria and instructions, and track each dog’s progress without signing in.

## User preferences

- The user rejected the formal editorial appearance as depressing. Use brighter, friendly colors and approachable typography, with clear dog-information areas and a Duolingo-inspired connected training path.
- Preserve the friendly typography, rounded cards, and winding journey. Apply approved Weenstone branding: forest #193D32, white #FFFFFF, mist #EDF1EF, navy #0C2340, olive #647332, restrained shadows, and the approved W-dog mark extracted from the supplied guide. Do not substitute a generic paw or invent a new logo.

## Gotchas

- Anyone holding a handler link can read that specific dog/path; names label the intended handler but do not authenticate their identity. Trainers can revoke links.
- A shared link is not a full workspace backup. Changes remain local until the trainer updates that shared assignment. Clearing browser data can lose unshared records and management capabilities.
- Sharing has prototype limits: supported image/video formats, 50 MB per file, 200 MB / 100 upload reservations per assignment, bounded creation/submission rates. A failed/interrupted upload must not activate a new handler link.
- Do not substitute an unrelated dog for Raya or invent her birthday. Use the supplied edited Raya photograph as the default everywhere, but preserve explicit user-uploaded photos.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `README.md` for the product flow, simulated AI boundaries, known limitations, and pending interaction-test cases
