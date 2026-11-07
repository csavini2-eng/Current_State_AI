# GoodBoy Training

A trainer-facing dog-training demo for managing multiple dogs, reusable milestones, consistent instructions, and structured training paths. Existing private backend and live handler links remain available separately.

## Run & Operate

- Open the **GoodBoy Training** web preview; its managed workflow runs the frontend.
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
- Photographs and demonstration videos: App Storage, with authenticated uploads and access-checked serving

## Where things live

- `artifacts/goodboy-training/src/App.tsx` — dog directory, profile, paths, journeys, and skill editor
- `artifacts/goodboy-training/src/index.css` — app visual system and responsive styling
- `artifacts/goodboy-training/src/assets/raya-sample.jpg` — replaceable generated sample portrait
- `artifacts/api-server/` and `lib/` — shared workspace scaffolding; not used by GoodBoy’s local-only data flow

## Architecture decisions

- The public demo has no account prompts, real-sharing controls, or cloud-upload controls. Local demonstration and practice video selection/playback remain visible without sign-in.
- Existing private workspaces stay private; existing capability links still grant read-only access to one assigned dog/path.
- Editing has three distinct scopes: gallery original, reusable-path customization, and dog-assigned snapshot. A dog’s journey defaults to editing only that dog’s assignment; never offer an ambiguous original-edit action there.
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

## Product

In the guest demo trainers manage dog profiles, combine reusable milestones into paths, assign paths to dogs, review completion criteria and instructions, and track each dog’s progress without signing in.

## User preferences

- The user rejected the formal editorial appearance as depressing. Use brighter, friendly colors and approachable typography, with clear dog-information areas and a Duolingo-inspired connected training path.
- The user approved the current brighter playful workspace and explicitly requested preserving its typography, colors, style, and layout while extending functionality.
- Keep GoodBoy as the prototype’s working name while exploring alternatives.

## Gotchas

- Anyone holding a handler link can read that specific dog/path; names label the intended handler but do not authenticate their identity. Trainers can revoke links.
- Guest photographs and local videos stay in this browser. Cloud video upload and real-sharing controls are deferred from the public demo; do not replace them with fake successes.
- Do not substitute an unrelated dog for Raya or invent her birthday. Keep her current photograph until the trainer uploads a replacement.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `README.md` for the product flow, simulated AI boundaries, known limitations, and pending interaction-test cases
