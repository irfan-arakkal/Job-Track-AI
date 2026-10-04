import { z } from "zod";

import { withAuth } from "@/server/http";
import { listReminders, syncRemindersForUser } from "@/server/services/reminders";

/** GET /api/v1/reminders?status=PENDING|DONE|DISMISSED — refreshes, then lists. */
export const GET = withAuth(async ({ request, user }) => {
  const status = z
    .enum(["PENDING", "DONE", "DISMISSED"])
    .catch("PENDING")
    .parse(new URL(request.url).searchParams.get("status") ?? "PENDING");
  await syncRemindersForUser(user.id);
  return Response.json(await listReminders(user.id, status));
});
