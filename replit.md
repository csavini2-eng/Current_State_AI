# GoodBoy Training

A trainer-facing dog-training website for managing Raya’s information, structured training paths, and consistent skill guidance.

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

- `artifacts/goodboy-training/src/App.tsx` — dog directory, profile, paths, journeys, and skill editor
- `artifacts/goodboy-training/src/index.css` — app visual system and responsive styling
- `artifacts/goodboy-training/src/assets/raya-sample.jpg` — replaceable generated sample portrait
- `artifacts/api-server/` and `lib/` — shared workspace scaffolding; not used by GoodBoy’s local-only data flow

## Architecture decisions

- Keep this first prototype local to one browser: cross-device sharing, accounts, and backend sync are out of scope. The current experience is trainer-only.
- Persist text and training progress locally; treat uploaded demonstration videos as temporary previews.
- Seed milestones as illustrative and not started; trainers alone control status changes.
- Keep the simulated skill example distinct from live AI behavior.

## Product

Trainers can edit Raya’s profile, create or assign training paths, manage ordered skills and their status, and enter precise cues and instructions. Handler-facing screens are deferred.

## User preferences

- The user rejected the formal editorial appearance as depressing. Use brighter, friendly colors and approachable typography, with clear dog-information areas and a Duolingo-inspired connected training path.
- The user approved the brighter playful workspace. Use “Dogs” navigation with a profile directory; only Raya’s profile should be functional for now.
- Keep GoodBoy as the prototype’s working name while exploring alternatives.

## Gotchas

- A selected video does not persist after refresh.
- This is currently a trainer-only website, not a native mobile app or an external handler-sharing system.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `README.md` for the product flow, simulated AI boundaries, known limitations, and pending interaction-test cases
