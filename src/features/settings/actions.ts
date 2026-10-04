"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { runAction } from "@/server/actions";
import { updateTimeZone } from "@/server/services/users";
import { requireUser } from "@/server/session";

export async function updateTimeZoneAction(values: unknown) {
  return runAction(async () => {
    const user = await requireUser();
    const { timezone } = z.object({ timezone: z.string().min(1).max(100) }).parse(values);
    await updateTimeZone(user.id, timezone);
    revalidatePath("/", "layout");
    return undefined;
  });
}
