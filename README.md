# Weenstone

Weenstone helps dog trainers and handlers follow the same dog-specific training plan. The trainer workspace remains usable without sign-in.

## Current prototype

- Manage dogs, reusable gallery milestones, reusable paths, and independent dog-assigned journeys.
- Cards have a status badge, a keyboard-accessible More menu, a quiet **View instructions** action, and one main progress action.
- Instructions open in one scrolling dialog with **Instructions**, **Videos & practice**, and **Feedback & history** tabs.
- Add multiple personal practice attempts without replacing earlier videos. Each attempt retains its handler report, selected outcome, editable simulated note, and source.
- Create a real cross-device handler link for one selected assignment. Handlers can view instructions and videos and submit attempts and notes; only trainers control instructions, profiles, templates, and progress.
- The approved Weenstone W-dog mark and palette are applied without replacing the friendly typography, rounded cards, or winding journey.

The user-supplied edited Raya portrait is the default. Explicitly uploaded dog photographs are preserved.

## Local records versus sharing

Unshared workspace records stay in browser localStorage and videos in IndexedDB. Existing record IDs, storage keys, workspace version, customizations, notes, and references are retained. Local video selection and playback do not require sign-in. Clearing browser data may lose these records.

**Share with handler** is available from the dog profile and assigned journey:

1. **Create handler link** prepares a server copy of that dog, path assignment, progress, instructions, and required media.
2. Required files upload and are checked before a new link activates. Failed uploads show errors rather than a pretend successful link.
3. Copy or open the link on another device. Handler submissions are saved to that shared assignment.
4. **Refresh submissions** in the trainer browser imports new attempts and notes without changing local instructions or progress.
5. **Update shared assignment** explicitly publishes subsequent trainer changes. Local edits are not silently synchronized.
6. **Revoke link** blocks handler reads, media access, uploads, and submissions. The management capability can still retrieve already-submitted history.

Anyone holding the handler link can view and submit to that specific assignment. The handler name is a label, not identity verification. Do not share sensitive information through these prototype links.

Management and handler capabilities are different random secrets; only their hashes are stored on the server. Management credentials stay in a separate trainer-browser storage record, never in the handler URL or shared snapshot. Clearing that browser’s storage loses management access: this prototype has no identity-based capability recovery.

Private account workspaces, existing private media, and older read-only `/handler/...` links keep their existing authentication/access checks. Guest sharing uses separate records and endpoints and does not load or expose an account workspace.

## Upload and storage boundaries

- Supported images: JPEG, PNG, WebP; videos: MP4, WebM, MOV. Browser codec support still determines playback.
- Each file must be nonempty and at most 50 MB. The server validates declared metadata, uploaded byte count, content type, and file signature before confirmation.
- An assignment has a 200 MB / 100-reservation lifetime upload quota, including interrupted reservations, and a 200-attempt bound.
- Guest creation is rate-limited to five requests per hour per server-observed IP and fifty shares per day across this prototype. Forwarded IP headers are deliberately not trusted, so this is a conservative per-gateway limit behind a proxy, not a per-person allowance. Upload and entry/note endpoints have additional rate limits.
- Every shared-assignment read, upload, and mutation requires a scoped capability; only draft creation is rate-limited without a preexisting capability. Cross-assignment media references are rejected; handlers cannot issue image uploads or trainer mutations. Media reads recheck size/type, pin the validated storage generation, and bound the stream.
- Upload URLs expire after fifteen minutes. An already-issued URL can finish writing a private blob after revocation, but a revoked handler cannot confirm, submit, or read it. Pending/orphan storage cleanup and durable distributed abuse monitoring are future production work.
- Shared media is fetched with authorization into short-lived browser playback URLs; it is not made public through the legacy object route.

This is bounded prototype sharing, not a production identity, moderation, or backup system. Server rate counters are process-local; production scale requires durable abuse controls and storage lifecycle cleanup.

## Editing and progress

Gallery originals, reusable-path customizations, and dog-assigned snapshots are separate. Assignments snapshot the resolved content once. Editing a reusable source never silently changes an existing dog’s plan.

All dog-journey edits, moves, removals, notes, demonstrations, and progress changes affect only that assignment. Progress belongs to the assigned step, not the gallery original. Viewing instructions, watching recordings, and saving feedback never change progress.

Only a successfully saved new completion triggers the existing checkmark/confetti message; completing the final assigned step adds “Training path completed. Great teamwork!” Reloads and failed saves do not replay it. Reduced motion suppresses animation without suppressing the announcement.

## Simulated feedback, not video analysis

No model or video-analysis service is connected. Personal feedback is generated by the documented deterministic rules in `lib/api-zod/src/simulation.ts`:

1. Use only the actual selected milestone’s objective, cue, instructions, and the handler’s written report/outcome.
2. Request clarification for missing/short, unrelated, ambiguous, contradictory, or unsupported reports, or a missing trainer plan.
3. For a supported report, produce a different consideration for Responded, Additional prompting, or Did not complete, quoting the real trainer objective/instructions and explicitly identifying the handler’s report.
4. Never inspect the recording or filename, invent timings/repetitions/observations, certify success, or change progress.

The personal-feedback area displays this disclosure once:

> Prototype: simulated AI feedback. This note is based on the selected skill and your description. The video has not been automatically analyzed. Review suggestions against your trainer’s instructions.

Saved notes retain **Simulated handler-reported feedback**, the original report, and outcome even when their editable note text is removed. The bundled, silent portrait Sit sample and its prepared sample feedback remain separately labeled and optional; they are not personal recordings or live analysis.

## Run and checks

Open the managed **Weenstone** preview. Internal artifact/package names intentionally remain unchanged.

```sh
pnpm run typecheck
pnpm --filter @workspace/goodboy-training run test
PORT=22351 BASE_PATH=/ pnpm --filter @workspace/goodboy-training run build
# Running development frontend and API required:
node artifacts/api-server/src/guest-sharing.test.mjs
```

The shared contract is `lib/api-spec/openapi.yaml`; regenerate clients/validators with `pnpm --filter @workspace/api-spec run codegen`. Database additions are additive guest-sharing tables, not replacements for existing private tables.

### Verification for this update

- Full workspace type checks and production frontend build pass. Vite reports the existing nonblocking tooltip sourcemap warning and a bundle-size advisory.
- All 27 helper/rule regression tests pass: independent assignments, additive migration, preserved original references, progress events, sample boundaries, varied report-based feedback, clarification cases, and custom trainer plans.
- All 48 development HTTP checks pass, covering actual App Storage upload/byte-for-byte media retrieval, interrupted-upload rejection, draft invisibility, scoped permissions, cross-assignment denial, private workspace/upload 401s, retry idempotency, retained reports/source, revoked reads/submissions, and retained trainer management of archived notes.
- One independent trainer/handler browser pass verified real media playback, appended attempts, report/source/note persistence, trainer refresh, explicit shared updates without note loss, and revocation with no cached fallback. It also verified one-time completion persistence, keyboard menu/Escape/focus return, and reduced-motion suppression.
- The browser pass found mobile tab visibility, horizontal tab scrolling, and intermittent dialog-background defects. After correction, a focused 390×844 check passed: exactly one matching panel, no horizontal scroller, one vertical modal-body scroll owner, retained unsaved report across tabs, opaque instruction/share dialogs, and Escape/focus restoration.
- The storage SDK emitted nonblocking listener-limit warnings during media reads; byte-for-byte retrieval and browser playback still passed. Long-running production resource behavior has not been tested.
- These checks concern the development preview. This update has not been published or verified in production; private signed-in flows were not re-tested.
