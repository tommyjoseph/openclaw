// The capture spec behind the before/after frames in openclaw/openclaw#149181.
// It is published here for reproducibility, not proposed for the repo: drop it in
// ui/src/e2e/ and run it once on main and once with the PR applied.
//
//   node scripts/run-vitest.mjs run --config test/vitest/vitest.ui-e2e.config.ts \
//     --configLoader runner ui/src/e2e/capture-spec.e2e.test.ts
//
// PROOF_LABEL ("before" | "after") only names the output files. The spec is byte
// identical across both runs and records whether a confirmation dialog appeared,
// so the difference between the two runs is the evidence.
import { expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { installMockGateway } from "../test-helpers/control-ui-e2e.ts";
import { createControlUiE2eArtifactDir } from "../test-helpers/control-ui-e2e-artifacts.ts";
import {
  createControlUiE2eContextOptions,
  createControlUiE2eSuite,
} from "./control-ui-e2e-suite.test-support.ts";

const LABEL = process.env.PROOF_LABEL === "after" ? "after" : "before";

const suite = createControlUiE2eSuite({
  name: `Control UI exec approvals dirty target switch proof (${LABEL})`,
  startServerBeforeBrowser: true,
  unavailableMessage: (executablePath) =>
    `Playwright Chromium is not installed or cannot start at ${executablePath}.`,
});

const operatorConfig = {
  agents: { entries: { main: { default: true, name: "Main" }, reviewer: { name: "Reviewer" } } },
};

function approvals(security: string, hash: string) {
  return {
    path: "/tmp/openclaw-e2e/exec-approvals.json",
    exists: true,
    hash,
    file: {
      defaults: { security, ask: "on-miss", askFallback: "deny", autoAllowSkills: false },
      agents: { reviewer: { security: "allowlist", ask: "on-miss", askFallback: "deny" } },
    },
  };
}

const execApprovalsNode = (nodeId: string, displayName: string) => ({
  nodeId,
  displayName,
  commands: ["system.run", "system.execApprovals.get", "system.execApprovals.set"],
});

function gatewayOptions() {
  return {
    featureMethods: [
      "agents.list",
      "chat.metadata",
      "chat.startup",
      "config.get",
      "device.pair.list",
      "exec.approvals.get",
      "exec.approvals.set",
      "exec.approvals.node.get",
      "exec.approvals.node.set",
      "node.list",
    ],
    methodResponses: {
      "config.get": {
        config: operatorConfig,
        sourceConfig: operatorConfig,
        hash: "config-hash-1",
        issues: [],
        raw: JSON.stringify(operatorConfig),
        valid: true,
      },
      "device.pair.list": { paired: [], pending: [] },
      "exec.approvals.get": approvals("deny", "gateway-hash-1"),
      "exec.approvals.set": { ok: true },
      "exec.approvals.node.get": approvals("deny", "node-hash-1"),
      "exec.approvals.node.set": { ok: true },
      "node.list": {
        nodes: [execApprovalsNode("node-alpha", "Alpha"), execApprovalsNode("node-beta", "Beta")],
      },
      "system-presence": [],
      "environments.list": { environments: [] },
    },
  };
}

suite.define(() => {
  it(`captures the dirty target switch (${LABEL})`, async () => {
    const dir = createControlUiE2eArtifactDir(`exec-approvals-dirty-target-switch-${LABEL}`);
    const lines: string[] = [];
    const note = (s: string) => {
      lines.push(s);
      console.log(`[proof:${LABEL}] ${s}`);
    };
    note(`artifact dir: ${dir}`);

    await suite.withPage(createControlUiE2eContextOptions(), async ({ page }) => {
      page.on("console", (m) => {
        if (m.type() === "error" || m.type() === "warning") console.log(`[console:${m.type()}] ${m.text()}`);
      });
      page.on("pageerror", (e) => console.log(`[pageerror] ${e.message}`));
      const gateway = await installMockGateway(page, gatewayOptions());
      const shot = async (name: string) =>
        await page.screenshot({ path: path.join(dir, `${LABEL}-${name}.png`) });

      await page.goto(`${suite.server.baseUrl}nodes`);
      await gateway.waitForRequest("exec.approvals.get");

      const section = page.locator(".settings-section", { hasText: "Exec approvals" });
      const hostSelect = section.getByRole("combobox", { name: "Host" });
      const saveButton = section.getByRole("button", { name: "Save", exact: true });
      const defaultsMode = section.getByRole("combobox", { name: "Mode" }).first();
      const unloadedHint = section.getByText("Load exec approvals to edit allowlists.");
      const dialog = page.locator("openclaw-modal-dialog").last();

      await expect.poll(() => defaultsMode.inputValue()).toBe("deny");
      expect(await saveButton.isEnabled()).toBe(false);
      await section.scrollIntoViewIfNeeded();
      await shot("01-loaded-clean");
      note("step 1 — Gateway target loaded, Mode=deny, Save disabled (clean draft)");

      await defaultsMode.selectOption("full");
      await expect.poll(() => saveButton.isEnabled()).toBe(true);
      expect(await hostSelect.inputValue()).toBe("gateway");
      await shot("02-dirty-draft");
      note("step 2 — edited Mode deny→full on the Gateway target; Save enabled = draft is dirty");

      const nodeGetsBefore = (await gateway.getRequests("exec.approvals.node.get")).length;
      await hostSelect.selectOption("node");

      let sawDialog = true;
      try {
        await dialog.waitFor({ timeout: 4000 });
      } catch {
        sawDialog = false;
      }

      if (sawDialog) {
        // Let the dialog's entry transition settle so the frame is legible.
        await dialog.getByRole("button", { name: "Cancel" }).waitFor();
        await page.waitForTimeout(600);
        await shot("03-confirm-dialog");
        note("step 3 — switching Host to a node RAISES A CONFIRMATION before anything is discarded");
        await dialog.getByRole("button", { name: "Cancel" }).click();
        await dialog.waitFor({ state: "hidden" });
        await page.waitForTimeout(400);
        await expect.poll(() => hostSelect.inputValue()).toBe("gateway");
        expect(await defaultsMode.inputValue()).toBe("full");
        expect(await saveButton.isEnabled()).toBe(true);
        expect(await gateway.getRequests("exec.approvals.node.get")).toHaveLength(nodeGetsBefore);
        await shot("04-cancel-preserved-draft");
        note(
          "step 4 — Cancel keeps Host=gateway, Mode=full and Save enabled: the edit survives, and no exec.approvals.node.get was sent",
        );
      } else {
        await expect.poll(() => hostSelect.inputValue()).toBe("node");
        await unloadedHint.waitFor();
        await page.waitForTimeout(400);
        await shot("03-draft-silently-discarded");
        note(
          "step 3 — NO confirmation appeared: Host switched to node and the edited draft is gone, replaced by the unloaded hint. Nothing threw and nothing was sent; the edit is simply lost.",
        );
      }

      writeFileSync(
        path.join(dir, `${LABEL}-report.md`),
        `# Exec approvals dirty target switch — ${LABEL}\n\n` +
          `Confirmation dialog observed: **${sawDialog ? "yes" : "no"}**\n\n` +
          lines.map((l) => `- ${l}`).join("\n") +
          "\n",
      );
      note(`confirmation dialog observed: ${sawDialog ? "yes" : "no"}`);
    });
  });
});
