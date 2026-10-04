"use server";

import { revalidatePath } from "next/cache";

import { runAction } from "@/server/actions";
import { deleteResume, setPrimaryResume } from "@/server/services/resumes";
import { requireUser } from "@/server/session";

export async function setPrimaryResumeAction(id: string) {
  return runAction(async () => {
    const user = await requireUser();
    await setPrimaryResume(user.id, id);
    revalidatePath("/resumes");
    return undefined;
  });
}

export async function deleteResumeAction(id: string) {
  return runAction(async () => {
    const user = await requireUser();
    await deleteResume(user.id, id);
    revalidatePath("/resumes");
    return undefined;
  });
}
