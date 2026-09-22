# Before/after proof for openclaw/openclaw#149181

One capture spec, run unchanged against upstream `main` @ `05804bcfdad` and against that same
`main` with #149181 rebased on top. The spec asserts its way to each frame and records whether a
confirmation dialog appeared; the difference between the two runs is the proof.

Harness: the repo's own Control UI E2E suite (Vite Control UI + `installMockGateway`), Playwright
Chromium 1243, viewport 1280x900. Fixture is synthetic — nodes "Alpha"/"Beta", agents
"Main"/"Reviewer", `/tmp/openclaw-e2e/exec-approvals.json`. The Gateway was mocked, never real.

| run | confirmation dialog | outcome |
|---|---|---|
| before (`main`) | no | the edited draft is discarded silently |
| after (`main` + #149181) | yes | Cancel keeps the target, the edit and the dirty flag |

Frames: `*-01-loaded-clean`, `*-02-dirty-draft`, before `03-draft-silently-discarded`,
after `03-confirm-dialog`, after `04-cancel-preserved-draft`. Run logs: `*-report.md`.
