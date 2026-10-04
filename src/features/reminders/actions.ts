"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { runAction } from "@/server/actions";
import { setReminderStatus } from "@/server/services/reminders";
import { requireUser } from "@/server/session";

export async function setReminderStatusAction(id: string, status: unknown) {
  return runAction(async () => {
    const user = await requireUser();
    await setReminderStatus(user.id, id, z.enum(["DONE", "DISMISSED"]).parse(status));
    revalidatePath("/", "layout");
    return undefined;
  });
}
