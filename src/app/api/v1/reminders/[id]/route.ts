import { z } from "zod";

import { readJson, withAuth } from "@/server/http";
import { setReminderStatus } from "@/server/services/reminders";

/** PATCH /api/v1/reminders/:id — { "status": "DONE" | "DISMISSED" } */
export const PATCH = withAuth<RouteContext<"/api/v1/reminders/[id]">>(
  async ({ request, user, context }) => {
    const { id } = await context.params;
    const { status } = z
      .object({ status: z.enum(["DONE", "DISMISSED"]) })
      .parse(await readJson(request));
    await setReminderStatus(user.id, id, status);
    return new Response(null, { status: 204 });
  },
);
