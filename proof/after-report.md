# Exec approvals dirty target switch — after

Confirmation dialog observed: **yes**

- step 1 — Gateway target loaded, Mode=deny, Save disabled (clean draft)
- step 2 — edited Mode deny→full on the Gateway target; Save enabled = draft is dirty
- step 3 — switching Host to a node RAISES A CONFIRMATION before anything is discarded
- step 4 — Cancel keeps Host=gateway, Mode=full and Save enabled: the edit survives, and no exec.approvals.node.get was sent
