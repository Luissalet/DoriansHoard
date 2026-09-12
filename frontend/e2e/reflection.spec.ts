import { test, expect } from "@playwright/test";
import { resolve } from "node:path";
import { createServer } from "node:http";
import { execFileSync } from "node:child_process";
const review = resolve("..", ".impeccable", "review");

test("portrait, attributed mannerism review, exact preview and bilingual reflection", async ({
  page,
}) => {
  test.setTimeout(90000);
  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      const payload = JSON.parse(JSON.parse(body).messages[1].content);
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  text: "Synthetic test response: Bueno, vamos por partes.",
                  kind: "reflection",
                  citations: [payload.evidence[0].id],
                  uncertainty:
                    "Synthetic transport fixture, not a fidelity measurement.",
                }),
              },
            },
          ],
        }),
      );
    });
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address();
  if (!address || typeof address === "string")
    throw Error("Test server address missing");
  try {
    page.setDefaultTimeout(10000);
    await page.request.get("/api/session");
    const setupHeaders = {
      "X-Hoard-Request": "1",
      "X-Hoard-Space": "personal",
    };
    const state = await (
      await page.request.get("/api/reflection", { headers: setupHeaders })
    ).json();
    for (const c of state.cards.filter(
      (c: any) => c.title === "Una frase reconocible · sintético",
    )) {
      await page.request.delete("/api/sources/" + c.source_id, {
        headers: setupHeaders,
      });
    }
    await page.request.post("/api/reflection/persona", {
      headers: setupHeaders,
      data: { consent: false },
    });
    const configured = await (await page.request.get("/api/providers")).json();
    for (const p of configured.providers.filter(
      (p: any) => p.name === "Synthetic UI transport",
    )) {
      await page.request.delete("/api/providers/" + p.id, {
        headers: setupHeaders,
      });
    }
    const faults: string[] = [];
    page.on("pageerror", (e) => faults.push(e.message));
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /Un reflejo.*Su manera de ser/ }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Preparar el retrato" }).click();
    await page
      .getByLabel("Nombre de la persona")
      .fill("Alba · ejemplo sintético");
    await page
      .getByLabel("Manera de expresarse: ritmo, humor, muletillas")
      .fill("Frases claras. Humor suave.");
    await page.getByLabel("Tengo autorización", { exact: false }).check();
    await page
      .getByRole("button", { name: "Guardar retrato", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Recuerdos y expresión", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Añadir recuerdo o expresión" })
      .click();
    await page.getByLabel("Tipo de recuerdo").selectOption("voice");
    await page
      .getByLabel("Título", { exact: true })
      .fill("Una frase reconocible · sintético");
    await page
      .getByLabel("Texto original o relato atribuido")
      .fill(
        "Alba decía: Bueno, vamos por partes. Lo decía al comparar planes.",
      );
    await page.getByLabel("De dónde procede").selectOption("attributed");
    await page.getByLabel("Autor", { exact: true }).fill("Familiar sintético");
    await page
      .getByLabel("Fragmentos literales", { exact: false })
      .fill("Bueno, vamos por partes");
    await page
      .getByLabel("Cuándo lo usa", { exact: true })
      .fill("Al comparar planes");
    await page
      .getByLabel("Cuándo no encaja", { exact: true })
      .fill("Durante el duelo");
    await page.getByLabel("Con quién habla así").fill("Amigos");
    await page.getByLabel("Frecuencia observada").selectOption("sometimes");
    await page.getByLabel("Idioma del ejemplo").fill("Español");
    await page.getByRole("button", { name: "Guardar para revisar" }).click();
    const item = page
      .locator(".reflection-memory")
      .filter({ hasText: "Una frase reconocible" });
    await expect(item).toContainText("Por revisar");
    await item
      .getByText("Revisar autor y detalles guardados", { exact: true })
      .click();
    await expect(item).toContainText("Familiar sintético");
    await expect(item).toContainText("A veces");
    await expect(item.locator("blockquote")).toHaveText(
      "Bueno, vamos por partes",
    );
    await item
      .getByRole("button", { name: "Confirmar para el reflejo" })
      .click();
    await expect(item).toContainText("Confirmada");
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: resolve(review, "reflection-expression-desktop-es.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByLabel("Language / Idioma").selectOption("en");
    await expect(item).toContainText("Attributed text");
    await expect(item).toContainText("Durante el duelo");
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: resolve(review, "reflection-expression-mobile-en.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Model", exact: true }).click();
    await page
      .getByRole("combobox", { name: /^Service/ })
      .selectOption("openai_local");
    await page.getByLabel("Connection name").fill("Synthetic UI transport");
    await page
      .getByLabel("Service address")
      .fill("http://127.0.0.1:" + address.port);
    await page.getByLabel("Model identifier").fill("synthetic-model");
    await page
      .getByRole("button", { name: "Save connection", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Synthetic UI transport",
        exact: true,
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Talk", exact: true }).click();
    await page
      .getByRole("button", {
        name: "In this situation, what would they say?",
        exact: true,
      })
      .click();
    await page
      .getByLabel("Your situation or question")
      .fill("How would Alba introduce a comparison?");
    await page
      .getByLabel("Selected model")
      .selectOption({ label: "Synthetic UI transport · Local" });
    await page.getByRole("button", { name: "Review before sending" }).click();
    await page
      .getByText("See the exact content and instructions", { exact: true })
      .click();
    await expect(page.locator(".reflection-preview pre").first()).toContainText(
      '"avoid_when": "Durante el duelo"',
    );
    await expect(page.locator(".reflection-preview pre").first()).toContainText(
      '"attribution": "attributed"',
    );
    await page
      .getByRole("button", { name: "Send and talk", exact: true })
      .click();
    await expect(page.locator(".reflection-answer")).toHaveText(
      "Synthetic test response: Bueno, vamos por partes.",
    );
    await page
      .getByText("See the supporting memories", { exact: true })
      .click();
    await expect(page.locator(".reflection-turn blockquote")).toContainText(
      "Attributed text",
    );
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: resolve(review, "reflection-dialogue-mobile-en.png"),
      fullPage: true,
    });
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
    await page.setViewportSize({ width: 1440, height: 1050 });
    await page.getByLabel("Language / Idioma").selectOption("es");
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: resolve(review, "reflection-dialogue-desktop-es.png"),
      fullPage: true,
    });
    const headers = { "X-Hoard-Request": "1", "X-Hoard-Space": "personal" };
    await page.request.post("/api/agents/switch", {
      headers,
      data: { enabled: true },
    });
    const grant = await (
      await page.request.post("/api/agents/grants", {
        headers,
        data: {
          name: "Synthetic expression MCP reader",
          scopes: ["reflection.read"],
        },
      })
    ).json();
    const readMcp = () => {
      const raw = JSON.parse(
        execFileSync(
          resolve("..", ".venv/Scripts/python.exe"),
          [resolve("..", "scripts/mcp_call.py")],
          {
            env: {
              ...process.env,
              ...grant.mcp_config.mcpServers.selfhoard.env,
              PYTHONIOENCODING: "utf-8",
            },
            input: JSON.stringify({ tool: "read_reflection", arguments: {} }),
            encoding: "utf8",
            windowsHide: true,
            timeout: 20000,
          },
        ),
      );
      return raw;
    };
    const rawBefore = readMcp();
    expect(rawBefore.isError).toBe(false);
    const before =
      rawBefore.structuredContent ?? JSON.parse(rawBefore.content[0].text);
    expect(before.memories[0].expression.avoid_when).toBe("Durante el duelo");
    expect(before.memories[0].attribution).toBe("attributed");
    expect(before.conversations).toBeUndefined();
    await page
      .getByRole("button", { name: "Recuerdos y expresión", exact: true })
      .click();
    await page
      .locator(".reflection-memory")
      .filter({ hasText: "Una frase reconocible" })
      .getByRole("button", { name: "Retirar del reflejo" })
      .click();
    await page.getByRole("button", { name: "Conversar", exact: true }).click();
    await expect(page.locator(".reflection-turn")).toHaveCount(0);
    await expect(page.locator(".reflection-history-row")).toHaveCount(0);
    const rawAfter = readMcp();
    expect(rawAfter.isError).toBe(false);
    const after =
      rawAfter.structuredContent ?? JSON.parse(rawAfter.content[0].text);
    expect(after.memories).toEqual([]);
    expect(after.revision).not.toBe(before.revision);
    await page.request.delete("/api/agents/grants/" + grant.id, { headers });
    expect(readMcp().isError).toBe(true);
    expect(faults).toEqual([]);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((done) => server.close(() => done()));
  }
});
