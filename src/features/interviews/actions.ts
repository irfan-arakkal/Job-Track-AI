"use server";

import { revalidatePath } from "next/cache";

import { interviewInputSchema } from "@/features/interviews/schemas";
import { runAction } from "@/server/actions";
import { createInterview, deleteInterview, updateInterview } from "@/server/services/interviews";
import { requireUser } from "@/server/session";

function revalidate(applicationId?: string) {
  revalidatePath("/interviews");
  revalidatePath("/dashboard");
  if (applicationId) revalidatePath(`/applications/${applicationId}`);
}

export async function createInterviewAction(values: unknown) {
  return runAction(async () => {
    const user = await requireUser();
    const input = interviewInputSchema.parse(values);
    const interview = await createInterview(user.id, user.timezone ?? "UTC", input);
    revalidate(interview.applicationId);
    return { id: interview.id };
  });
}

export async function updateInterviewAction(id: string, values: unknown) {
  return runAction(async () => {
    const user = await requireUser();
    const input = interviewInputSchema.parse(values);
    const interview = await updateInterview(user.id, user.timezone ?? "UTC", id, input);
    revalidate(interview.applicationId);
    return { id };
  });
}

export async function deleteInterviewAction(id: string) {
  return runAction(async () => {
    const user = await requireUser();
    await deleteInterview(user.id, id);
    revalidate();
    return undefined;
  });
}
