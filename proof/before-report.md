# Exec approvals dirty target switch — before

Confirmation dialog observed: **no**

- step 1 — Gateway target loaded, Mode=deny, Save disabled (clean draft)
- step 2 — edited Mode deny→full on the Gateway target; Save enabled = draft is dirty
- step 3 — NO confirmation appeared: Host switched to node and the edited draft is gone, replaced by the unloaded hint. Nothing threw and nothing was sent; the edit is simply lost.
