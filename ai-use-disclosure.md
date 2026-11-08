# Draft AI use disclosure

This draft reflects the recorded project conversation and the November 7 prototype review. Catherine should review the wording against her own work and add any other tools or prompts used outside that conversation before submission.

## Tools used

- **ChatGPT:** product framing, peer-feedback synthesis, interface critique, Replit prompts, sample feedback wording, documentation drafts, and assisted browser verification.
- **Replit Agent:** implementation assistance for the existing app, debugging, and reported checks. Exact underlying model/version was not recorded; no model name is inferred.
- **ChatGPT image generation:** an edited profile portrait based on the supplied photograph of Raya, with brighter lighting, a simplified background and improved framing. This is an AI-edited image, not an untouched original photograph.

A Gemini video-generation prompt was drafted, but no Gemini-generated clip was supplied or verified in this conversation. An attempted Canva video-generation workflow was unavailable on the connected plan; no Canva-generated video was used. The supplied Sit footage is not labeled AI-generated.

## Development assistance

ChatGPT helped group revisions into clearer milestones, a visible simulated-feedback experience and clearer progress controls. It helped write instructions for Replit Agent, review UI states, identify overly broad edits and removed features, and prepare the evaluation and disclosure. Replit Agent assisted with code changes. AI output was treated as a proposal to inspect, not proof that the implementation worked.

## Representative prompts and human revisions

| Prompt excerpt | What it produced or requested | Human judgment and revision |
| --- | --- | --- |
| “Replace ‘Details to be added’ ... use the existing milestone description field” and “remove sign-in barriers.” | A Replit implementation with clearer objectives and guest access; the agent reported 11 regression tests, type checks and a build passing at that stage. | Catherine noticed that video controls and handler sharing had disappeared. She required their restoration. Those earlier check reports are not treated as proof of later releases. |
| “When a reusable path is assigned to a dog, create an independent snapshot” and “Edit for [dog name].” | A requirement for dog-specific assigned content and a separate template-editing scope. | Catherine corrected the earlier design, which separated path edits but did not adequately distinguish two dogs using the same path. A later browser check confirmed different cues for Scout and Raya. |
| “The current buttons compete too much” and “skill name ... status badge ... one main action.” | A quieter card with status near the name, one progress action and a More menu; branding and sharing requirements were consolidated into the implementation prompt. | Catherine kept the existing overall look and the exact View instructions label, rather than accepting a broader redesign or renamed action. |

## Human judgment

Catherine challenged changes that made testing easier at the expense of the central product experience: hiding videos and removing sharing were corrected. She also required per-dog customization, reduced the competing buttons, kept the View instructions wording, selected supplied footage, and requested use of the real Raya photograph. The project did not adopt the first AI proposal unchanged.

## Verification

The November 7 assisted browser walkthrough checked dog creation, empty-name validation, assignment, progress persistence, sample-note editing and persistence, two-dog customization, feedback dismissal, handler-link opening and revocation. These actual observations are documented in revision.md.

The personal-video picker could not be completed by the browser tool, so upload, arbitrary personal-recording feedback and trainer-side receipt remain unverified. The public GitHub snapshot was still older than the live app. Previous Replit Agent test reports and an earlier local patch build are development records, not current end-to-end evidence. Current source checks must be rerun after syncing the latest code.

## AI inside the product

**Intended task:** help a handler review practice against the selected milestone and trainer instructions between sessions.

**Intended future inputs:** the selected dog's plan, milestone criteria and practice video.

**Intended future outputs:** observations about practice, clear uncertainty, and suggested points to review with the trainer.

**Current demonstrated behavior:** the bundled Sit example returns prepared observations and limits; users can edit, save or dismiss the note. No live model or automatic interpretation of footage was demonstrated. A description-based simulation was requested for personal attempts, using the selected skill and what the handler reports; its actual implementation and outputs still need verification against the current Replit code.

**Value being tested:** whether feedback in the context of the shared plan is understandable and helps users choose a useful next action. The current tests do not establish model accuracy, faster dog learning or professional readiness.

**Human control:** notes do not automatically change milestone status. Trainers define the plan, and the user records completion separately.
