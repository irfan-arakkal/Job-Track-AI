import { expect, test as setup } from "@playwright/test";

import { storageState, USERS } from "./fixtures";

// Log in once per user and save the session cookie, so tests start already signed in.
for (const key of Object.keys(USERS) as (keyof typeof USERS)[]) {
  setup(`sign in as ${key}`, async ({ page }) => {
    const user = USERS[key];
    await page.goto("/login");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password", { exact: true }).fill(user.password);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.context().storageState({ path: storageState(key) });
  });
}
