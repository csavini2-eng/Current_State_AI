# Weenstone

Weenstone helps trainers and handlers follow the same dog-specific training plan, record practice, and understand progress. It is designed for trainers coordinating with handlers of working or service dogs in training.

**Submission status:** revised source/assets, documentation and demo video link are in GitHub. Source synchronization was verified November 19, 2026. Remaining checks and Canvas submission are listed in the [checklist](submission-checklist.md).

## Try the prototype

[Open Weenstone](https://good-boy-dog-training-platform.replit.app/). No account is required for the guest demo. Open Raya or add a sample dog, assign Foundation Skills, and choose View instructions. Use only sample information during evaluation.

Unshared records remain in the current browser. Creating a handler link saves a shared copy to the server. Later trainer edits require Update shared assignment. Keep the management browser available to update or revoke the link.

## Current functionality and AI status

The November 7, 2026 browser review observed that the live app supports dog profiles, assigned paths, dog-specific editing, progress actions, and a clearly labeled prepared Sit-feedback example. The review verified creating, opening and revoking a handler link. Practice-video controls and a handler submission flow are present, but personal uploads and trainer-side receipt still need an end-to-end check.

The intended AI feature would help handlers review practice against the trainer's plan. The demonstrated feedback is simulated; the reviewed Sit example uses prepared observations. These tests do not establish video-analysis accuracy, model reliability, or training effectiveness.

## Code and assets

Prototype source is organized under `artifacts/goodboy-training`, backend source under `artifacts/api-server`, and shared packages under `lib`. Internal GoodBoy package and folder names may remain for compatibility.

The revised Weenstone source and assets were merged into `main` on November 19, 2026 at [2d870ae](https://github.com/csavini2-eng/Current_State_AI/commit/2d870aefc60a5500d9d99595788ffce12dedadfe). Repository inspection confirmed the branding, Raya image, Sit clip, handler route, guest sharing and practice-submission code. The five existing submission documents and demo link were preserved unchanged by that merge.

Replit reported passing type checks, 27 regression tests, and frontend/API builds for the merge; these checks were not independently rerun in this documentation review. The browser evaluation below remains dated November 7 and does not establish end-to-end behavior of every feature in the newer source. No publication or database migration was performed as part of the reported sync.

## Revision and evaluation

- [Priority improvements, peer response, tests, comparison, risk, and next priorities](revision.md)
- [Draft AI-use disclosure](ai-use-disclosure.md)
- [Demo speaking notes](demo-script.md)
- [Submission checklist](submission-checklist.md)
- [Historical First Working Slice README and original tests](docs/first-working-slice.md)

## Demo Video

[Watch the Weenstone draft demo](https://drive.google.com/file/d/1DPQXHsJ1sobgcabI_27ognZXAfjHWPTW/view?usp=sharing)

Google Drive access for Emelia Hughes and Samuel Huang was confirmed on November 19, 2026. The same video file must also be uploaded directly to Canvas alongside the repository URL; the Drive link alone does not complete the Canvas submission.
