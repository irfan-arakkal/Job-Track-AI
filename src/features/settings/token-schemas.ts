import { z } from "zod";

export const createTokenSchema = z.object({
  name: z.string().trim().min(1, "Give the token a name.").max(100),
  expiresInDays: z.preprocess(
    (v) => (v === "" || v === "never" || v == null ? null : Number(v)),
    z.union([z.literal(7), z.literal(30), z.literal(90), z.literal(365)]).nullable(),
  ),
});
