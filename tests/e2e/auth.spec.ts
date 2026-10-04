import { expect, test } from "@playwright/test";

import { USERS } from "./fixtures";

test.describe("authentication", () => {
  test("sends visitors to login and back to where they were going", async ({ page }) => {
    await page.goto("/applications?status=OFFER");
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fapplications%3Fstatus%3DOFFER/);
    await page.getByLabel("Email").fill(USERS.bob.email);
    await page.getByLabel("Password").fill(USERS.bob.password);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/applications\?status=OFFER$/);
  });

  test("register → empty dashboard → log out → protected again", async ({ page }) => {
    const email = `new-${Date.now()}@e2e.test`;
    await page.goto("/register");

    // Client-side validation first.
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Enter your name.")).toBeVisible();

    await page.getByLabel("Name").fill("Nina Newcomer");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("a-strong-password");
    await page.getByLabel("Confirm password").fill("a-strong-password");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Welcome, Nina" })).toBeVisible();
    await expect(page.getByText("Your dashboard is waiting for data")).toBeVisible();

    await page.getByRole("button", { name: "Open account menu" }).click();
    await page.getByRole("menuitem", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("shows a generic error for a wrong password", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(USERS.alice.email);
    await page.getByLabel("Password").fill("definitely-wrong");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByRole("alert")).toContainText("Invalid email or password.");
    await expect(page).toHaveURL(/\/login$/);
  });
});
