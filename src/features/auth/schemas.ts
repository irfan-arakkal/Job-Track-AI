import { z } from "zod";

import { NAME_MAX_LENGTH, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/auth-rules";

/*
 * Form schemas for instant feedback in the browser. They are a UX convenience, not security:
 * the server (Better Auth + our database hook) re-validates everything it receives.
 */

const email = z.email("Enter a valid email address.").trim().toLowerCase();

export const loginSchema = z.object({
  email,
  // On login we only check presence: telling attackers the password rules adds nothing here.
  password: z.string().min(1, "Enter your password."),
});

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Enter your name.")
      .max(NAME_MAX_LENGTH, `Name must be at most ${NAME_MAX_LENGTH} characters.`),
    email,
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
      .max(PASSWORD_MAX_LENGTH, `Use at most ${PASSWORD_MAX_LENGTH} characters.`),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
