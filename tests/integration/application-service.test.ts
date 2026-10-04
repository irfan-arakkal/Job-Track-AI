import { beforeEach, describe, expect, it } from "vitest";

import { applicationInputSchema } from "@/features/applications/schemas";
import {
  addNote,
  changeApplicationStatus,
  createApplication,
  deleteApplication,
  deleteNote,
  getApplication,
  listApplications,
  updateApplication,
  updateNote,
} from "@/server/services/applications";
import { NotFoundError, ValidationError } from "@/server/errors";

import { db, factory, resetDatabase } from "../support/db";

const input = (overrides: Record<string, unknown> = {}) =>
  applicationInputSchema.parse({
    companyName: "Acme",
    jobTitle: "Frontend Engineer",
    status: "APPLIED",
    ...overrides,
  });

describe("application service", () => {
  beforeEach(resetDatabase);

  describe("createApplication", () => {
    it("creates the application, its company and the first history entry", async () => {
      const alice = await factory.user();
      const app = await createApplication(
        alice.id,
        input({ salaryMin: "50,000", salaryMax: "70000", salaryCurrency: "usd" }),
      );

      expect(app.company.name).toBe("Acme");
      expect(app.salaryMin).toBe(50000);
      expect(app.salaryCurrency).toBe("USD");
      const history = await db.statusChange.findMany({ where: { applicationId: app.id } });
      expect(history).toMatchObject([{ fromStatus: null, toStatus: "APPLIED" }]);
    });

    it("reuses an existing company regardless of letter case", async () => {
      const alice = await factory.user();
      await createApplication(alice.id, input({ companyName: "Acme" }));
      await createApplication(alice.id, input({ companyName: "ACME", jobTitle: "Backend" }));

      expect(await db.company.count({ where: { userId: alice.id } })).toBe(1);
    });

    it("never reuses another user's company", async () => {
      const alice = await factory.user();
      const bob = await factory.user();
      await createApplication(bob.id, input());
      const app = await createApplication(alice.id, input());

      const company = await db.company.findUniqueOrThrow({ where: { id: app.companyId } });
      expect(company.userId).toBe(alice.id);
    });

    it("defaults the applied date to today, except on the wishlist", async () => {
      const alice = await factory.user();
      const applied = await createApplication(alice.id, input());
      const wish = await createApplication(alice.id, input({ status: "WISHLIST" }));

      expect(applied.appliedAt?.toISOString().slice(0, 10)).toBe(
        new Date().toISOString().slice(0, 10),
      );
      expect(wish.appliedAt).toBeNull();
    });
  });

  describe("updateApplication / changeApplicationStatus", () => {
    it("records a history entry only when the status actually changes", async () => {
      const alice = await factory.user();
      const app = await createApplication(alice.id, input());

      await changeApplicationStatus(alice.id, app.id, "INTERVIEW");
      await updateApplication(alice.id, app.id, { jobTitle: "Senior Frontend Engineer" });
      await changeApplicationStatus(alice.id, app.id, "INTERVIEW"); // same status → no entry

      const detail = await getApplication(alice.id, app.id);
      expect(detail?.jobTitle).toBe("Senior Frontend Engineer");
      expect(detail?.statusChanges.map((c) => [c.fromStatus, c.toStatus])).toEqual([
        [null, "APPLIED"],
        ["APPLIED", "INTERVIEW"],
      ]);
    });

    it("sets the applied date when moving off the wishlist", async () => {
      const alice = await factory.user();
      const app = await createApplication(alice.id, input({ status: "WISHLIST" }));
      const updated = await changeApplicationStatus(alice.id, app.id, "APPLIED");
      expect(updated.appliedAt).not.toBeNull();
    });

    it("rejects a salary range that becomes invalid after merging with stored values", async () => {
      const alice = await factory.user();
      const app = await createApplication(
        alice.id,
        input({ salaryMin: 50000, salaryMax: 60000, salaryCurrency: "EUR" }),
      );
      await expect(
        updateApplication(alice.id, app.id, { salaryMin: 90000 }),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it("refuses to update or change the status of someone else's application", async () => {
      const alice = await factory.user();
      const bob = await factory.user();
      const bobsApp = await createApplication(bob.id, input());

      await expect(
        updateApplication(alice.id, bobsApp.id, { jobTitle: "Hacked" }),
      ).rejects.toBeInstanceOf(NotFoundError);
      await expect(
        changeApplicationStatus(alice.id, bobsApp.id, "REJECTED"),
      ).rejects.toBeInstanceOf(NotFoundError);

      const unchanged = await getApplication(bob.id, bobsApp.id);
      expect(unchanged?.jobTitle).toBe("Frontend Engineer");
      expect(unchanged?.status).toBe("APPLIED");
    });
  });

  describe("deleteApplication", () => {
    it("deletes the owner's application", async () => {
      const alice = await factory.user();
      const app = await createApplication(alice.id, input());
      await deleteApplication(alice.id, app.id);
      expect(await getApplication(alice.id, app.id)).toBeNull();
    });

    it("refuses to delete someone else's application", async () => {
      const alice = await factory.user();
      const bob = await factory.user();
      const bobsApp = await createApplication(bob.id, input());

      await expect(deleteApplication(alice.id, bobsApp.id)).rejects.toBeInstanceOf(NotFoundError);
      expect(await getApplication(bob.id, bobsApp.id)).not.toBeNull();
    });
  });

  describe("listApplications", () => {
    it("searches, filters, sorts and paginates", async () => {
      const alice = await factory.user();
      await createApplication(alice.id, input({ companyName: "Zeta", jobTitle: "Data Engineer" }));
      await createApplication(
        alice.id,
        input({ companyName: "Alpha", jobTitle: "React Developer", status: "INTERVIEW" }),
      );
      await createApplication(
        alice.id,
        input({ companyName: "Beta", jobTitle: "React Native Dev" }),
      );

      const search = await listApplications(alice.id, { q: "react" });
      expect(search.total).toBe(2);

      const interviewing = await listApplications(alice.id, { status: "INTERVIEW" });
      expect(interviewing.items.map((a) => a.company.name)).toEqual(["Alpha"]);

      const byCompany = await listApplications(alice.id, { sort: "company" });
      expect(byCompany.items.map((a) => a.company.name)).toEqual(["Alpha", "Beta", "Zeta"]);

      const page2 = await listApplications(alice.id, { sort: "company", page: 2, pageSize: 2 });
      expect(page2.items.map((a) => a.company.name)).toEqual(["Zeta"]);
      expect(page2.pageCount).toBe(2);
    });
  });

  describe("notes", () => {
    it("adds, edits and deletes the owner's notes", async () => {
      const alice = await factory.user();
      const app = await createApplication(alice.id, input());

      const note = await addNote(alice.id, app.id, "Recruiter called");
      await updateNote(alice.id, note.id, "Recruiter called back");
      expect((await getApplication(alice.id, app.id))?.notes.map((n) => n.content)).toEqual([
        "Recruiter called back",
      ]);

      await deleteNote(alice.id, note.id);
      expect((await getApplication(alice.id, app.id))?.notes).toEqual([]);
    });

    it("refuses to add notes to, or edit/delete notes of, another user", async () => {
      const alice = await factory.user();
      const bob = await factory.user();
      const bobsApp = await createApplication(bob.id, input());
      const bobsNote = await addNote(bob.id, bobsApp.id, "private");

      await expect(addNote(alice.id, bobsApp.id, "hi")).rejects.toBeInstanceOf(NotFoundError);
      await expect(updateNote(alice.id, bobsNote.id, "changed")).rejects.toBeInstanceOf(
        NotFoundError,
      );
      await expect(deleteNote(alice.id, bobsNote.id)).rejects.toBeInstanceOf(NotFoundError);
      expect((await db.note.findUniqueOrThrow({ where: { id: bobsNote.id } })).content).toBe(
        "private",
      );
    });
  });
});
