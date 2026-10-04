import { beforeEach, describe, expect, it } from "vitest";

import { db, factory, resetDatabase } from "../support/db";

/**
 * The database's own safety nets: constraints that hold even if application code has a bug.
 */
describe("database constraints", () => {
  beforeEach(resetDatabase);

  describe("cross-user integrity (composite foreign keys)", () => {
    it("rejects an application that points at another user's company", async () => {
      const alice = await factory.user();
      const bob = await factory.user();
      const bobsCompany = await factory.company(bob.id);

      await expect(
        db.application.create({
          data: { userId: alice.id, companyId: bobsCompany.id, jobTitle: "Sneaky" },
        }),
      ).rejects.toThrow(/foreign key/i);
    });

    it("rejects an interview attached to another user's application", async () => {
      const alice = await factory.user();
      const bob = await factory.user();
      const bobsApp = await factory.application(bob.id, (await factory.company(bob.id)).id);

      await expect(
        db.interview.create({
          data: { userId: alice.id, applicationId: bobsApp.id, scheduledAt: new Date() },
        }),
      ).rejects.toThrow(/foreign key/i);
    });

    it("rejects a note attached to another user's application", async () => {
      const alice = await factory.user();
      const bob = await factory.user();
      const bobsApp = await factory.application(bob.id, (await factory.company(bob.id)).id);

      await expect(
        db.note.create({
          data: { userId: alice.id, applicationId: bobsApp.id, content: "hi" },
        }),
      ).rejects.toThrow(/foreign key/i);
    });
  });

  describe("companies", () => {
    it("allows the same company name for different users", async () => {
      const alice = await factory.user();
      const bob = await factory.user();
      await factory.company(alice.id, "Acme");
      await expect(factory.company(bob.id, "Acme")).resolves.toBeDefined();
    });

    it("rejects a duplicate company name for the same user", async () => {
      const alice = await factory.user();
      await factory.company(alice.id, "Acme");
      await expect(factory.company(alice.id, "Acme")).rejects.toThrow(/unique/i);
    });

    it("can't be deleted while applications use it", async () => {
      const alice = await factory.user();
      const company = await factory.company(alice.id);
      await factory.application(alice.id, company.id);

      await expect(db.company.delete({ where: { id: company.id } })).rejects.toThrow();
    });
  });

  describe("deletes", () => {
    it("deleting a user removes all of their data", async () => {
      const alice = await factory.user();
      const company = await factory.company(alice.id);
      const app = await factory.application(alice.id, company.id);
      await db.interview.create({
        data: { userId: alice.id, applicationId: app.id, scheduledAt: new Date() },
      });
      await db.note.create({ data: { userId: alice.id, applicationId: app.id, content: "x" } });
      await db.statusChange.create({ data: { applicationId: app.id, toStatus: "APPLIED" } });
      await factory.resume(alice.id);

      await db.user.delete({ where: { id: alice.id } });

      const counts = await Promise.all([
        db.company.count(),
        db.application.count(),
        db.interview.count(),
        db.note.count(),
        db.statusChange.count(),
        db.resume.count(),
      ]);
      expect(counts).toEqual([0, 0, 0, 0, 0, 0]);
    });

    it("deleting an application removes its interviews, notes and history", async () => {
      const alice = await factory.user();
      const app = await factory.application(alice.id, (await factory.company(alice.id)).id);
      await db.interview.create({
        data: { userId: alice.id, applicationId: app.id, scheduledAt: new Date() },
      });
      await db.note.create({ data: { userId: alice.id, applicationId: app.id, content: "x" } });
      await db.statusChange.create({ data: { applicationId: app.id, toStatus: "APPLIED" } });

      await db.application.delete({ where: { id: app.id } });

      expect(await db.interview.count()).toBe(0);
      expect(await db.note.count()).toBe(0);
      expect(await db.statusChange.count()).toBe(0);
      expect(await db.company.count()).toBe(1); // the company stays
    });

    it("deleting a resume keeps the application and clears its resume link", async () => {
      const alice = await factory.user();
      const resume = await factory.resume(alice.id);
      const app = await db.application.create({
        data: {
          userId: alice.id,
          companyId: (await factory.company(alice.id)).id,
          jobTitle: "Engineer",
          resumeId: resume.id,
        },
      });

      await db.resume.delete({ where: { id: resume.id } });

      const reloaded = await db.application.findUniqueOrThrow({ where: { id: app.id } });
      expect(reloaded.resumeId).toBeNull();
    });
  });

  describe("resumes", () => {
    it("allows only one primary resume per user", async () => {
      const alice = await factory.user();
      await factory.resume(alice.id, true);
      await expect(factory.resume(alice.id, true)).rejects.toThrow(/unique/i);
    });

    it("allows many non-primary resumes, and a primary for each user", async () => {
      const alice = await factory.user();
      const bob = await factory.user();
      await factory.resume(alice.id, true);
      await factory.resume(alice.id, false);
      await factory.resume(alice.id, false);
      await expect(factory.resume(bob.id, true)).resolves.toBeDefined();
    });
  });

  describe("check constraints", () => {
    it("rejects a salary range where min is greater than max", async () => {
      const alice = await factory.user();
      const company = await factory.company(alice.id);
      await expect(
        db.application.create({
          data: {
            userId: alice.id,
            companyId: company.id,
            jobTitle: "Engineer",
            salaryMin: 90000,
            salaryMax: 50000,
          },
        }),
      ).rejects.toThrow(/salary_range/);
    });

    it("rejects a negative salary", async () => {
      const alice = await factory.user();
      const company = await factory.company(alice.id);
      await expect(
        db.application.create({
          data: { userId: alice.id, companyId: company.id, jobTitle: "x", salaryMin: -1 },
        }),
      ).rejects.toThrow(/salary_non_negative/);
    });
  });
});
