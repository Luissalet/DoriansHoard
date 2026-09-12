import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
const review = resolve("..", ".impeccable", "review");
mkdirSync(review, { recursive: true });

test("personal archive lifecycle and both languages", async ({ page }) => {
  const faults: string[] = [];
  page.on("pageerror", (e) => faults.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Mi archivo", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Una memoria que puedes entender y corregir.",
    }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Language / Idioma" })
    .selectOption("en");
  await expect(
    page.getByRole("heading", {
      name: "A memory you can understand and correct.",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "New source", exact: true }).click();
  await page
    .getByLabel("Title", { exact: true })
    .fill("Synthetic browser lifecycle");
  await page
    .getByLabel("Original text", { exact: true })
    .fill("I prefer quiet mornings to noisy evenings.");
  await page.getByRole("button", { name: "Save source", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Synthetic browser lifecycle",
      exact: true,
      level: 2,
    }),
  ).toBeVisible();
  await page
    .getByLabel("Verbatim quote from this source")
    .fill("I prefer quiet mornings to noisy evenings.");
  await page.getByRole("button", { name: "Send for review" }).click();
  await expect(page.locator(".success-text")).toContainText("Proposal saved");
  await page.getByRole("button", { name: "My archive" }).click();
  await page
    .getByRole("button", { name: /I prefer quiet mornings to noisy evenings/ })
    .click();
  await expect(page.locator(".memory-row")).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.locator(".evidence-panel .status")).toHaveText("Confirmed");
  await page.getByRole("textbox", { name: "Search evidence" }).fill("quiet");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.locator(".memory-row")).toHaveCount(1);
  await page.locator(".memory-row").click();
  await page.getByRole("button", { name: "Correct", exact: true }).click();
  await page
    .getByLabel("What was misunderstood?")
    .fill("I was describing a fictional character.");
  await page.getByRole("button", { name: "Save correction" }).click();
  await expect(page.locator(".evidence-panel .status")).toHaveText("Rejected");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "I have no evidence for that search." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "My data", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON" }).click();
  expect((await download).suggestedFilename()).toContain("personal.json");
  await page.getByRole("button", { name: "Sources", exact: true }).click();
  await page
    .getByRole("button", { name: /Synthetic browser lifecycle/ })
    .click();
  await page.getByRole("button", { name: "Review source deletion" }).click();
  await page.getByRole("button", { name: "Delete permanently" }).click();
  await expect(
    page.getByRole("heading", { name: "It all starts with your words." }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "Language / Idioma" }),
  ).toHaveValue("en");
  expect(faults).toEqual([]);
});

test("blind activity demo and review captures on desktop and mobile", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.goto("/");
  await page.getByRole("button", { name: /Explorar una demo/ }).click();
  await page.getByRole("button", { name: "Mi archivo", exact: true }).click();
  await expect(
    page.getByText("Espacio de demostración.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /objetivos claros y libertad/ })
    .click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: resolve(review, "desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("combobox", { name: "Language / Idioma" })
    .selectOption("en");
  await page.getByRole("button", { name: "Back to the claim" }).click();
  await expect(
    page.getByRole("button", { name: /objetivos claros y libertad/ }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: /objetivos claros y libertad/ })
    .click();
  await expect(page.locator(".evidence-panel")).toBeFocused();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: resolve(review, "mobile.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Laboratory", exact: true }).click();
  await page.getByRole("button", { name: "Start blind comparison" }).click();
  await expect(
    page.getByText("Prediction saved and hidden", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".trial-result")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Walk in the garden", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "You chose different activities." }),
  ).toBeVisible();
  await expect(page.locator(".agent-studio")).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: resolve(review, "lab-mobile.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page
    .getByRole("combobox", { name: "Language / Idioma" })
    .selectOption("es");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: resolve(review, "lab-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Neurociencia", exact: true }).click();
  await page.getByRole("button", { name: "Dinámica", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Dinámica", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: resolve(review, "neuro-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("combobox", { name: "Language / Idioma" })
    .selectOption("en");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: resolve(review, "neuro-mobile.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    requests.filter((url) => !url.startsWith("http://127.0.0.1:8742/")),
  ).toEqual([]);
});

test("history displays the saved policy rather than current draft", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("combobox", { name: "Language / Idioma" })
    .selectOption("en");
  await page.getByRole("button", { name: "Laboratory", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Scenario", exact: true })
    .selectOption("learning");
  await page
    .getByRole("combobox", { name: "Available time", exact: true })
    .selectOption("20");
  await page.getByRole("slider", { name: /Curiosity/ }).press("End");
  await page.getByRole("button", { name: "Start blind comparison" }).click();
  await page
    .getByRole("button", { name: "Read at your own pace", exact: true })
    .click();
  await page.getByRole("button", { name: "Try another context" }).click();
  await page
    .getByRole("combobox", { name: "Scenario", exact: true })
    .selectOption("afternoon");
  await page
    .getByRole("combobox", { name: "Available time", exact: true })
    .selectOption("60");
  await page.getByRole("slider", { name: /Curiosity/ }).press("Home");
  await page.getByRole("slider", { name: /Curiosity/ }).press("ArrowRight");
  await page.getByRole("button", { name: "Start blind comparison" }).click();
  await page
    .getByRole("button", { name: "Walk in the garden", exact: true })
    .click();
  await page
    .locator(".trial-row")
    .filter({ hasText: "Something new to learn" })
    .first()
    .click();
  await expect(
    page.getByRole("combobox", { name: "Scenario", exact: true }),
  ).toHaveValue("learning");
  await expect(
    page.getByRole("combobox", { name: "Available time", exact: true }),
  ).toHaveValue("20");
  await expect(page.getByRole("slider", { name: /Curiosity/ })).toHaveValue(
    "5",
  );
  await page
    .getByRole("button", { name: "Delete records", exact: true })
    .click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
});
