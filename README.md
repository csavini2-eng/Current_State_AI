# Weenstone

Weenstone helps trainers and handlers follow the same dog-specific training plan, record practice, and understand progress. It is designed for trainers coordinating with handlers of working or service dogs in training.

**Submission status:** documentation draft added; current Replit source/assets and the demo video still need to be synchronized or added before submission.

## Try the prototype

[Open Weenstone](https://good-boy-dog-training-platform.replit.app/). No account is required for the guest demo. Open Raya or add a sample dog, assign Foundation Skills, and choose View instructions. Use only sample information during evaluation.

Unshared records remain in the current browser. Creating a handler link saves a shared copy to the server. Later trainer edits require Update shared assignment. Keep the management browser available to update or revoke the link.

## Current functionality and AI status

The November 7, 2026 browser review observed that the live app supports dog profiles, assigned paths, dog-specific editing, progress actions, and a clearly labeled prepared Sit-feedback example. The review verified creating, opening and revoking a handler link. Practice-video controls and a handler submission flow are present, but personal uploads and trainer-side receipt still need an end-to-end check.

The intended AI feature would help handlers review practice against the trainer's plan. The demonstrated feedback is simulated; the reviewed Sit example uses prepared observations. These tests do not establish video-analysis accuracy, model reliability, or training effectiveness.

## Code and assets

Prototype source is organized under `artifacts/goodboy-training`, backend source under `artifacts/api-server`, and shared packages under `lib`. Internal GoodBoy package and folder names may remain for compatibility.

**Before submission: sync the revised Replit code and required assets into this repository.** The November 8 repository check still found the earlier GoodBoy implementation. The browser observations in these documents concern the live Replit app reviewed November 7, not the older source currently in this repository. Documentation alone does not resolve this mismatch.

## Revision and evaluation

- [Priority improvements, peer response, tests, comparison, risk, and next priorities](revision.md)
- [Draft AI-use disclosure](ai-use-disclosure.md)
- [Demo speaking notes](demo-script.md)
- [Submission checklist](submission-checklist.md)
- [Historical First Working Slice README and original tests](docs/first-working-slice.md)

## Demo Video

**Not yet added.** Record a narrated 2–3 minute draft, upload it to Google Drive, and replace this paragraph with its viewing link. Grant viewer access to Emelia Hughes (ehughes8@nd.edu) and Samuel Huang (ghuang3@nd.edu). Upload the same video file directly to Canvas with the repository URL.
