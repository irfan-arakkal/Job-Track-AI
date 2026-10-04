"use server";

import { revalidatePath } from "next/cache";

import {
  applicationInputSchema,
  noteInputSchema,
  statusChangeSchema,
} from "@/features/applications/schemas";
import { runAction } from "@/server/actions";
import {
  addNote,
  changeApplicationStatus,
  createApplication,
  deleteApplication,
  deleteNote,
  updateApplication,
} from "@/server/services/applications";
import { requireUser } from "@/server/session";

/*
 * Server Actions for the application screens. Each one:
 *  1. authenticates (requireUser) — actions are public HTTP endpoints under the hood,
 *  2. validates its input with Zod (never trust the browser),
 *  3. calls the service with the session's user id,
 *  4. revalidates the pages whose data changed.
 * Next.js also checks the request's Origin header for actions, which protects against CSRF.
 */

function revalidateApplicationPages(id?: string) {
  revalidatePath("/applications");
  revalidatePath("/dashboard");
  if (id) revalidatePath(`/applications/${id}`);
}

export async function createApplicationAction(values: unknown) {
  return runAction(async () => {
    const user = await requireUser();
    const input = applicationInputSchema.parse(values);
    const application = await createApplication(user.id, input);
    revalidateApplicationPages();
    return { id: application.id };
  });
}

export async function updateApplicationAction(id: string, values: unknown) {
  return runAction(async () => {
    const user = await requireUser();
    const input = applicationInputSchema.parse(values);
    await updateApplication(user.id, id, input);
    revalidateApplicationPages(id);
    return { id };
  });
}

export async function changeStatusAction(id: string, values: unknown) {
  return runAction(async () => {
    const user = await requireUser();
    const { status } = statusChangeSchema.parse(values);
    await changeApplicationStatus(user.id, id, status);
    revalidateApplicationPages(id);
    return undefined;
  });
}

export async function deleteApplicationAction(id: string) {
  return runAction(async () => {
    const user = await requireUser();
    await deleteApplication(user.id, id);
    revalidateApplicationPages();
    return undefined;
  });
}

export async function addNoteAction(applicationId: string, values: unknown) {
  return runAction(async () => {
    const user = await requireUser();
    const { content } = noteInputSchema.parse(values);
    await addNote(user.id, applicationId, content);
    revalidatePath(`/applications/${applicationId}`);
    return undefined;
  });
}

export async function deleteNoteAction(applicationId: string, noteId: string) {
  return runAction(async () => {
    const user = await requireUser();
    await deleteNote(user.id, noteId);
    revalidatePath(`/applications/${applicationId}`);
    return undefined;
  });
}
