# GoodBoy Training

A trainer-facing dog-training website for managing multiple dogs, reusable milestone templates, structured training paths, and live read-only handler guides.

## Run & Operate

- Open the **GoodBoy Training** web preview; its managed workflow runs the frontend.
- `pnpm --filter @workspace/goodboy-training run typecheck` — typecheck the app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- The API uses PostgreSQL, managed sign-in, and App Storage. Anonymous trainer records remain browser-local; sign-in enables private cloud records, persistent videos, and live sharing.

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

- The trainer workspace is private; handlers open a live, read-only link for one assigned dog/path without signing in.
- Milestones are reusable templates. Editing an original affects linked steps; customizing for one path stores an independent override on that path.
- Progress belongs to a dog’s path assignment, keyed by path step, never to a global milestone template.
- Workspace saves use revision checks to prevent stale tabs overwriting newer records. Anonymous records stay local until saved after sign-in.
- Seed milestones as illustrative and not started; trainers alone control status changes.
- Keep the simulated skill example distinct from live AI behavior.

## Product

Trainers manage dog profiles (including date of birth, calculated age, and assigned handler), combine reusable milestones into paths, assign paths to dogs, track each dog’s progress, and share live approved guidance with handlers.

## User preferences

- The user rejected the formal editorial appearance as depressing. Use brighter, friendly colors and approachable typography, with clear dog-information areas and a Duolingo-inspired connected training path.
- The user approved the current brighter playful workspace and explicitly requested preserving its typography, colors, style, and layout while extending functionality.
- Keep GoodBoy as the prototype’s working name while exploring alternatives.

## Gotchas

- Anyone holding a handler link can read that specific dog/path; names label the intended handler but do not authenticate their identity. Trainers can revoke links.
- Anonymous photograph uploads are local; persistent videos and live sharing require sign-in. Imported photographs are moved to App Storage before cloud save.
- Do not substitute an unrelated dog for Raya or invent her birthday. Keep her current photograph until the trainer uploads a replacement.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `README.md` for the product flow, simulated AI boundaries, known limitations, and pending interaction-test cases
