import "server-only";

import { isValidTimeZone } from "@/lib/timezone";
import { db } from "@/server/db";
import { ValidationError } from "@/server/errors";

export async function updateTimeZone(userId: string, timeZone: string) {
  if (!isValidTimeZone(timeZone)) throw new ValidationError("Choose a valid time zone.");
  await db.user.update({ where: { id: userId }, data: { timezone: timeZone } });
}
