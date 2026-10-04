import { expect, test } from "@playwright/test";

import { storageState } from "./fixtures";

/** The core security promise, checked through the real UI and API: users can't see each other's data. */
test("one user can't see or change another user's application", async ({ browser }) => {
  const alice = await browser.newContext({ storageState: storageState("alice") });
  const bob = await browser.newContext({ storageState: storageState("bob") });
  const title = `Secret Role ${Date.now()}`;

  // Alice creates an application through the API (same session cookie as the UI).
  const created = await alice.request.post("/api/v1/applications", {
    data: { companyName: "Alice Private Co", jobTitle: title },
  });
  expect(created.status()).toBe(201);
  const { id } = (await created.json()) as { id: string };

  // Bob opens the URL directly → not found, and it doesn't appear in his list.
  const bobPage = await bob.newPage();
  await bobPage.goto(`/applications/${id}`);
  await expect(bobPage.getByText("Application not found")).toBeVisible();
  await bobPage.goto("/applications");
  await expect(bobPage.getByText(title)).toHaveCount(0);

  // Bob's API calls get 404, and his delete attempt changes nothing.
  expect((await bob.request.get(`/api/v1/applications/${id}`)).status()).toBe(404);
  expect((await bob.request.delete(`/api/v1/applications/${id}`)).status()).toBe(404);
  expect((await alice.request.get(`/api/v1/applications/${id}`)).status()).toBe(200);

  // Without any session: 401.
  const anonymous = await browser.newContext();
  expect((await anonymous.request.get(`/api/v1/applications/${id}`)).status()).toBe(401);

  await Promise.all([alice.close(), bob.close(), anonymous.close()]);
});
