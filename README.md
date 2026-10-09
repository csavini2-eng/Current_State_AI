# GoodBoy — shared dog training journey

GoodBoy is a responsive trainer-facing website for managing Raya’s information, defining a consistent method, and organizing skills along a connected training journey.

## The problem

When several people train the same dog, cues and expectations can diverge, while important context is scattered across messages, videos, and notes. GoodBoy keeps the training path and trainer-written skill guidance together so each handler can follow the same method.

## Main flow

1. Open Raya’s profile and assigned Foundation Skills path.
2. Open a path to see its milestones and status.
3. Add or edit a skill’s name, verbal command, hand signal, and practice instructions.
4. Optionally choose a demonstration video for a temporary in-browser preview.
5. Save the skill and return to the connected training journey.
6. The trainer can update the skill’s status in the journey.

Profile, paths, skills, and status are saved in this browser’s local storage. This version focuses only on trainers; handler-facing screens and cross-device sharing are deferred.

## Run and open the prototype

Open the **GoodBoy Training** web preview in Replit. Its managed web workflow runs the Vite app. To check the TypeScript build, run:

```sh
pnpm --filter @workspace/goodboy-training run typecheck
```

## AI behavior

The longer-term product direction is for an assistant to organize trainer notes, summarize recent progress, and surface possible differences in cues or methods. A trainer should review any future suggestions and retain control of training decisions.

This prototype has no live AI model. The skill form includes a predefined example that fills editable sample content and states that it is simulated. It does not make training decisions or mark skills complete.

## Test cases

These interaction tests have **not been run yet**. The first-build check confirmed the app preview loads and the TypeScript typecheck passes; those checks do not establish the outcomes below.

| Case | Check | Recorded result |
| --- | --- | --- |
| Typical | Create a skill named “Retrieve” with the command “Fetch,” save it, then confirm it appears in the journey and can be reopened for editing. | Not run yet. |
| Long text | Save a long skill name and multi-sentence instructions, then confirm they remain readable and persist after refresh. | Not run yet. |
| Invalid | Try to save without a command or instructions and confirm the app blocks the save with a helpful message. | Not run yet. |

## Known limitations

- Data is local to one browser; there are no accounts, invitations, cross-device sharing, or multi-user sync.
- A selected video is previewed locally and is not saved; it disappears when the page is refreshed.
- Raya’s portrait is generated sample imagery, not a photo of the actual dog.

## Brand directions

GoodBoy is the working name. Early alternatives to explore are **Waymark** (a professional record that follows a journey), **OnePath** (emphasizes one shared training sequence), and **Cuekeeper** (emphasizes consistent commands). These are creative directions, not trademark or domain checks.
