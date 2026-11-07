---
name: Local video lifetimes
description: Why immutable browser video files may be shared across independent milestone snapshots.
---

Video replacement/removal unlinks only the selected milestone's reference; it must not delete the underlying stored blob while another scope may still reference it.

**Why:** Dog assignments snapshot demonstration-video references as well as text. Multiple independent assignments can legitimately point to the same immutable browser video. Deleting the blob when one dog replaces its recording would break another dog's unchanged version.

**How to apply:** Always create a new reference for a newly selected file. Any future storage cleanup must scan all gallery, reusable-path, and dog-assignment references before deleting an unreferenced blob. Temporary previews remain session-local and never replace persisted references.
