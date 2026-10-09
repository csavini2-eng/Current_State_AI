# GoodBoy Training

A mobile-first dog-training notebook where trainers define one consistent method and handlers can preview the same guidance for Raya.

## Run & Operate

- Open the **GoodBoy Training** web preview; its managed workflow runs the frontend.
- `pnpm --filter @workspace/goodboy-training run typecheck` — typecheck the app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- The GoodBoy prototype does not require a database or secrets.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React, Vite, TypeScript, Wouter
- GoodBoy profile, path, skill, and status data: browser local storage
- Video preview: browser object URL only; no persistent media storage

## Where things live

- `artifacts/goodboy-training/src/App.tsx` — profile, paths, journeys, skill editor, and handler view
- `artifacts/goodboy-training/src/index.css` — app visual system and responsive styling
- `artifacts/goodboy-training/src/assets/raya-sample.jpg` — replaceable generated sample portrait
- `artifacts/api-server/` and `lib/` — shared workspace scaffolding; not used by GoodBoy’s local-only data flow

## Architecture decisions

- Keep this first prototype local to one browser: cross-device sharing, accounts, and backend sync are out of scope.
- Persist text and training progress locally; treat uploaded demonstration videos as temporary previews.
- Seed milestones as illustrative and not started; trainers alone control status changes.
- Keep the simulated skill example distinct from live AI behavior.

## Product

Trainers can edit Raya’s profile, create or assign training paths, manage ordered skills and their status, enter precise cues and instructions, and preview those details in a read-only Handler View.

## User preferences

- Use a warm, photo-led editorial direction with cream, charcoal, and sage tones.
- Keep GoodBoy as the prototype’s working name while exploring alternatives.

## Gotchas

- A selected video does not persist after refresh.
- The handler screen is a same-browser preview, not an external share link.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `README.md` for the product flow, simulated AI boundaries, known limitations, and pending interaction-test cases
