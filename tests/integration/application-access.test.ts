import { beforeEach, describe, expect, it } from "vitest";

import { getApplication, listApplications } from "@/server/services/applications";

import { factory, resetDatabase } from "../support/db";

/**
 * The most important property of the app: one user can never see another user's data.
 * These tests go through the real service functions and a real Postgres database.
 */
describe("application access is scoped to the owner", () => {
  beforeEach(resetDatabase);

  async function twoUsersWithOneApplicationEach() {
    const alice = await factory.user({ name: "Alice" });
    const bob = await factory.user({ name: "Bob" });
    const aliceApp = await factory.application(
      alice.id,
      (await factory.company(alice.id, "Acme")).id,
      "Alice's job",
    );
    const bobApp = await factory.application(
      bob.id,
      (await factory.company(bob.id, "Acme")).id,
      "Bob's job",
    );
    return { alice, bob, aliceApp, bobApp };
  }

  it("lists only the caller's applications", async () => {
    const { alice, bob } = await twoUsersWithOneApplicationEach();

    const aliceList = await listApplications(alice.id);
    const bobList = await listApplications(bob.id);

    expect(aliceList.items.map((a) => a.jobTitle)).toEqual(["Alice's job"]);
    expect(bobList.items.map((a) => a.jobTitle)).toEqual(["Bob's job"]);
    expect(aliceList.total).toBe(1);
  });

  it("returns the owner's application by id", async () => {
    const { alice, aliceApp } = await twoUsersWithOneApplicationEach();

    const result = await getApplication(alice.id, aliceApp.id);

    expect(result?.id).toBe(aliceApp.id);
    expect(result?.company.name).toBe("Acme");
  });

  it("returns null when asking for someone else's application by id", async () => {
    const { alice, bobApp } = await twoUsersWithOneApplicationEach();

    // Alice knows (or guessed) Bob's application id — she still gets nothing.
    expect(await getApplication(alice.id, bobApp.id)).toBeNull();
  });

  it("returns null for an id that doesn't exist", async () => {
    const { alice } = await twoUsersWithOneApplicationEach();
    expect(await getApplication(alice.id, "does-not-exist")).toBeNull();
  });

  it("returns an empty list for a new user", async () => {
    await twoUsersWithOneApplicationEach();
    const newcomer = await factory.user();
    expect((await listApplications(newcomer.id)).items).toEqual([]);
  });
});
