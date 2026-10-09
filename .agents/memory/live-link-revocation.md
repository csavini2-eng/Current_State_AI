---
name: Live-link revocation
description: Revocation must override cached guide data, and link management must survive page navigation.
---

A revoked handler guide must stop displaying cached content even when the client retains its last successful response.

**Why:** Background-query failures can leave successful data in cache. Treating that data as sufficient would continue presenting private guidance after the trainer has revoked access.

**How to apply:** Treat explicit missing/revoked/forbidden responses as authoritative and hide the cached guide. Recover active links from persisted trainer-owned records when opening sharing controls; never rely only on a dialog's transient state for revocation.
