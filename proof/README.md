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
The spec itself is `capture-spec.e2e.test.ts` — drop it in `ui/src/e2e/` and run it once on each
tree to reproduce every frame here.

Contents of this branch, in full: `README.md`, `capture-spec.e2e.test.ts`, `before-report.md`,
`after-report.md`, and the seven `*.png` frames.

## Seven files, four distinct images

`sha256` over the frames here:

| hash (12) | files |
|---|---|
| `6d2c23e607af` | `before-01-loaded-clean.png`, `after-01-loaded-clean.png` |
| `b49b2c1ba5f3` | `before-02-dirty-draft.png`, `after-02-dirty-draft.png`, `after-04-cancel-preserved-draft.png` |
| `e5f2676b8a51` | `before-03-draft-silently-discarded.png` |
| `f7267e85d5ee` | `after-03-confirm-dialog.png` |

Each identity is part of the claim, not padding. `01` and `02` are byte-identical across the two
runs because everything up to the target switch is unchanged by the PR, which is what makes the
next frame the only difference. And `after-04` is byte-identical to `after-02`: after Cancel the
page is not merely similar to its pre-switch state, it is pixel-for-pixel the same image — nothing
was dropped, re-fetched or re-rendered.
