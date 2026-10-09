# GoodBoy — shared dog training journey

GoodBoy is a responsive trainer website for managing multiple dogs, reusing training milestones, tracking each dog’s progress, and sharing live approved guidance with handlers.

## The problem

When several people train the same dog, cues and expectations can diverge, while important context is scattered across messages, videos, and notes. GoodBoy keeps the training path and trainer-written skill guidance together so each handler can follow the same method.

## Main flow

1. Create or edit dog profiles in **My Dogs**, including birthday, handler, and photograph.
2. Create, edit, search, or duplicate reusable skills in **Milestone Gallery**.
3. Select several milestones and add them to a **Training Path**.
4. Assign the path to one or more dogs. Each dog has independent progress.
5. Edit an original milestone to update its linked paths, or **Customize for this path** to keep a path-specific version.
6. Sign in, save the records, and use **Share With Handler** to create a live read-only guide.
7. Save instruction or progress updates; the same handler link shows the latest version. Revoke a link to stop access.

The signed-out prototype saves records only in the current browser. Signing in enables private PostgreSQL records and persistent App Storage uploads. Handlers do not need an account; anyone with their link can read that one dog/path, but cannot edit it. Handler names label the intended recipient rather than authenticate their identity.

Legacy Raya records are migrated without deleting the original browser-local data. Existing cues and progress are retained. Older temporary demonstration videos cannot be recovered after refresh; upload them again for permanent sharing. Raya keeps her existing photograph until a replacement is uploaded, with no sample-portrait badge.

## Run and open the prototype

Open the **GoodBoy Training** web preview in Replit. Its managed web and API workflows must both run. To check types and helper regressions:

```sh
pnpm run typecheck
pnpm --filter @workspace/goodboy-training run test
```

## AI behavior

The longer-term product direction is for an assistant to organize trainer notes, summarize recent progress, and surface possible differences in cues or methods. A trainer should review any future suggestions and retain control of training decisions.

This prototype has no live AI model. The skill form includes a predefined example that fills editable sample content and states that it is simulated. It does not make training decisions or mark skills complete.

## Test cases

TypeScript checks and seven helper regression tests pass. The following browser flows were verified with an isolated signed-in trainer account and a separate signed-out handler browser.

| Case | Check | Recorded result |
| --- | --- | --- |
| Profiles | Create a dog with birthday and handler; upload a photograph; reload saved records. | Passed. |
| Reuse and customization | Use one milestone in two paths; edit the original and customize only one path. | Passed; customization persisted after reload. |
| Independent progress | Assign the same path to two dogs and complete a milestone for only one. | Passed. |
| Live sharing | Open a guide without signing in; save changed guidance; read the update at the same URL. | Passed; no trainer editing controls. |
| Persistent media | Upload a photograph and playable WebM, then view them in the signed-out handler guide. | Passed. |
| Link management | Recover the same link after navigation/reload; revoke it from the reopened dialog. | Passed; the already-open guide became unavailable on polling. |
| Privacy | Attempt unsigned workspace writes and upload requests. | Rejected with HTTP 401. |
| Phone layout | Check trainer profile and journey at 390px. | Passed; no horizontal overflow. |

## Known limitations

- Anonymous data is browser-local. Sign-in is required for persistent videos and handler links.
- Shared links grant read-only access to anyone holding the link; they are not emailed invitations or handler-authenticated accounts.
- Live guides check for updates every 15 seconds. Revocation prevents further requests immediately, but cannot retract copies a recipient already downloaded.
- Simultaneous trainer edits use revision checks; a stale tab must reload before saving.
- Raya’s portrait is generated sample imagery, not a photo of the actual dog.

## Brand directions

GoodBoy is the working name. Early alternatives to explore are **Waymark** (a professional record that follows a journey), **OnePath** (emphasizes one shared training sequence), and **Cuekeeper** (emphasizes consistent commands). These are creative directions, not trademark or domain checks.
