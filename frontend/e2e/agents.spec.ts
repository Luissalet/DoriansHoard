import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const root = resolve("..");

test("real MCP to owner UI to second AI, controls and blind lab", async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page
    .getByRole("button", { name: "Conexiones IA", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Conexiones en pausa" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Habilitar conexiones" }).click();
  await page.getByLabel("Nombre de la IA").fill("Synthetic MCP sender");
  await page.getByLabel("Proponer actividades", { exact: false }).check();
  await page.getByLabel("Leer fuentes completas", { exact: false }).check();
  await page
    .getByRole("button", { name: "Crear conexión", exact: true })
    .click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Descargar configuración MCP" })
    .click();
  const config = JSON.parse(
    readFileSync((await (await download).path())!, "utf8"),
  ).mcpServers.selfhoard;
  await page.getByRole("button", { name: "Ya la he guardado" }).click();
  const mcp = (tool: string, args: object = {}, env = config.env) =>
    JSON.parse(
      execFileSync(
        resolve(root, ".venv/Scripts/python.exe"),
        [resolve(root, "scripts/mcp_call.py")],
        {
          env: { ...process.env, ...env, PYTHONIOENCODING: "utf-8" },
          input: JSON.stringify({ tool, arguments: args }),
          encoding: "utf8",
          windowsHide: true,
          timeout: 20000,
        },
      ),
    );
  const unpack = (r: any) => {
    expect(r.isError).toBe(false);
    return r.structuredContent ?? JSON.parse(r.content[0].text);
  };
  const discovered = mcp("__list_tools__");
  expect(discovered.tools).toHaveLength(9);
  expect(
    discovered.tools.find((t: any) => t.name === "read_context").annotations
      .readOnlyHint,
  ).toBe(true);
  expect(unpack(mcp("connection_status")).agent).toBe("Synthetic MCP sender");
  const initial = unpack(mcp("read_context"));
  expect(initial.ai_reports).toEqual([]);
  const ownerHeaders = { "X-Hoard-Request": "1", "X-Hoard-Space": "personal" };
  const raw = await (
    await page.request.post("/api/sources", {
      headers: ownerHeaders,
      data: {
        title: "Synthetic MCP evidence",
        text: "A synthetic original source.",
      },
    })
  ).json();
  expect(unpack(mcp("read_evidence", { id: raw.id })).source.text).toBe(
    raw.text,
  );
  const payload = {
    request_id: "mcp-ui-approval-001",
    title: "Interés por simulaciones con actividades",
    text: "Ejemplo sintético: podría interesarle explorar decisiones en entornos interactivos.",
    kind: "inference",
    source_reference: "Prueba automatizada. No describe a la persona real.",
  };
  const submitted = unpack(mcp("submit_update", payload));
  expect(submitted.update.state).toBe("pending");
  expect(unpack(mcp("submit_update", payload)).duplicate).toBe(true);
  expect(unpack(mcp("list_my_updates")).updates).toHaveLength(1);
  expect(mcp("read_evidence", { id: "anything" }).isError).toBe(true);
  await page.getByRole("button", { name: "Actualizar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: payload.title }),
  ).toBeVisible();
  await page.getByText("Ver procedencia", { exact: true }).click();
  await page.evaluate(() => {
    (document.activeElement as HTMLElement)?.blur();
    window.scrollTo(0, 0);
  });
  await page.screenshot({
    path: resolve(root, ".impeccable/review/agents-desktop-es.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Aceptar aportación", exact: true })
    .click();
  await page.getByRole("button", { name: "Aceptada", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: payload.title }),
  ).toBeVisible();
  await page.getByLabel("Nombre de la IA").fill("Synthetic MCP reader");
  await page.getByLabel("Aportar novedades", { exact: false }).uncheck();
  await page.getByLabel("Proponer actividades", { exact: false }).uncheck();
  await page.getByLabel("Leer fuentes completas", { exact: false }).uncheck();
  await page
    .getByRole("button", { name: "Crear conexión", exact: true })
    .click();
  const readDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Descargar configuración MCP" })
    .click();
  const reader = JSON.parse(
    readFileSync((await (await readDownload).path())!, "utf8"),
  ).mcpServers.selfhoard.env;
  await page.getByRole("button", { name: "Ya la he guardado" }).click();
  const shared = unpack(mcp("read_context", {}, reader));
  expect(mcp("read_evidence", { id: raw.id }, reader).isError).toBe(true);
  expect(shared.ai_reports[0].agent_name).toBe("Synthetic MCP sender");
  expect(shared.ai_reports[0].kind).toBe("inference");
  expect(shared.own_statements).toEqual([]);
  expect(
    unpack(mcp("get_changes", { revision: initial.revision }, reader)).changed,
  ).toBe(true);
  expect(
    mcp("submit_update", { ...payload, request_id: "denied-write-001" }, reader)
      .isError,
  ).toBe(true);
  const scenarios = unpack(mcp("list_scenarios"));
  expect(scenarios.personal_model).toBe(false);
  const sealed = unpack(
    mcp("start_trial", {
      scenario: "afternoon",
      minutes: 60,
      weights: { calm: 3, autonomy: 3, curiosity: 3, connection: 2 },
    }),
  );
  expect(sealed.payload).toBeUndefined();
  expect(unpack(mcp("read_trial", { id: sealed.id })).answered).toBe(false);
  await page
    .getByRole("combobox", { name: "Language / Idioma" })
    .selectOption("en");
  await page.getByRole("button", { name: "Laboratory", exact: true }).click();
  await page.locator(".trial-row").first().click();
  await page
    .getByRole("button", { name: "Walk in the garden", exact: true })
    .click();
  const answered = unpack(mcp("read_trial", { id: sealed.id }));
  expect(answered.answered).toBe(true);
  const { createHash } = await import("node:crypto");
  expect(
    createHash("sha256").update(answered.canonical_payload).digest("hex"),
  ).toBe(sealed.digest);
  await page
    .getByRole("button", { name: "AI connections", exact: true })
    .click();
  await page.getByRole("button", { name: "Accepted", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your AI, with context" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: resolve(root, ".impeccable/review/agents-mobile-en.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Remove from context", exact: true })
    .click();
  expect(unpack(mcp("read_context", {}, reader)).ai_reports).toEqual([]);
  expect(
    unpack(mcp("get_changes", { revision: shared.revision }, reader)).changed,
  ).toBe(true);
  await page.getByRole("button", { name: "Pause all", exact: true }).click();
  expect(mcp("read_context", {}, reader).isError).toBe(true);
  await page
    .getByRole("button", { name: "Enable connections", exact: true })
    .click();
  await page
    .locator(".agent-grant")
    .filter({ hasText: "Synthetic MCP reader" })
    .getByRole("button", { name: "Revoke access" })
    .click();
  expect(mcp("read_context", {}, reader).isError).toBe(true);
  await page.getByRole("button", { name: "Rejected", exact: true }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page
    .getByRole("button", { name: "Delete permanently", exact: true })
    .click();
  expect(unpack(mcp("list_my_updates")).updates).toEqual([]);
  expect(mcp("submit_update", payload).isError).toBe(true);
  await page
    .locator(".agent-grant")
    .filter({ hasText: "Synthetic MCP sender" })
    .getByRole("button", { name: "Revoke access" })
    .click();
  await page.getByRole("button", { name: "Pause all", exact: true }).click();
  await page.request.delete("/api/sources/" + raw.id, {
    headers: ownerHeaders,
  });
  expect(errors).toEqual([]);
});
