import { expect, test } from "@playwright/test";

import { storageState } from "./fixtures";

test.use({ storageState: storageState("alice") });

test("create application → update status → see it on the dashboard → edit → delete", async ({
  page,
}) => {
  const title = `Staff Engineer ${Date.now()}`;

  // Create — first submit empty to see validation.
  await page.goto("/applications/new");
  await page.getByRole("button", { name: "Add application" }).click();
  await expect(page.getByText("Enter the company name.")).toBeVisible();

  await page.getByLabel("Company *").fill("Playwright Labs");
  await page.getByLabel("Job title *").fill(title);
  await page.getByLabel("Location").fill("Remote");
  await page.getByLabel("Minimum").fill("90,000");
  await page.getByLabel("Maximum").fill("120000");
  await page.getByLabel("Currency").selectOption("EUR");
  await page.getByRole("button", { name: "Add application" }).click();

  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText("€90,000 – €120,000")).toBeVisible();
  const detailUrl = page.url();

  // Update status (optimistic select) — history records it.
  await page.getByLabel("Application status").selectOption("INTERVIEW");
  await expect(page.getByText("Applied → Interview")).toBeVisible();

  // Add a note.
  await page.getByLabel("New note").fill("Hiring manager call booked");
  await page.getByRole("button", { name: "Add note" }).click();
  await expect(page.getByText("Hiring manager call booked")).toBeVisible();

  // Dashboard reflects it.
  await page.goto("/dashboard");
  await expect(page.getByText(title)).toBeVisible();
  await expect(page.getByRole("region", { name: "Key numbers" })).toContainText("Applications");

  // List: search finds it.
  await page.goto("/applications");
  await page.getByLabel("Search applications").fill("Playwright Labs");
  await expect(page).toHaveURL(/q=Playwright/);
  await expect(page.getByRole("link", { name: title }).first()).toBeVisible();

  // Edit.
  await page.goto(`${detailUrl}/edit`);
  await page.getByLabel("Job title *").fill(`${title} (edited)`);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("heading", { name: `${title} (edited)` })).toBeVisible();

  // Delete (with confirmation).
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page).toHaveURL(/\/applications$/);
  await page.goto(detailUrl);
  await expect(page.getByText("Application not found")).toBeVisible();
});

test("AI features explain how to enable them when no API key is set", async ({ page }) => {
  await page.goto("/assistant");
  await expect(page.getByText("AI isn't set up yet")).toBeVisible();
});
