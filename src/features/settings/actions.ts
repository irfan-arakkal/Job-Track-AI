"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createTokenSchema } from "@/features/settings/token-schemas";
import { runAction } from "@/server/actions";
import { createApiToken, revokeApiToken } from "@/server/services/api-tokens";
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

export async function createApiTokenAction(values: unknown) {
  return runAction(async () => {
    const user = await requireUser();
    const { name, expiresInDays } = createTokenSchema.parse(values);
    const created = await createApiToken(user.id, name, expiresInDays);
    revalidatePath("/settings");
    // Returned once so the UI can show it; it is not stored anywhere in plaintext.
    return { token: created.token };
  });
}

export async function revokeApiTokenAction(id: string) {
  return runAction(async () => {
    const user = await requireUser();
    await revokeApiToken(user.id, id);
    revalidatePath("/settings");
    return undefined;
  });
}
