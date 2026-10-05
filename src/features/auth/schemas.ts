import { z } from "zod";

import { NAME_MAX_LENGTH, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/auth-rules";

/*
 * Form schemas for instant feedback in the browser. They are a UX convenience, not security:
 * the server (Better Auth + our database hook) re-validates everything it receives.
 */

// Trim and lowercase *before* checking the format: autofill and phone keyboards often add a
// trailing space, which would otherwise make a correct address fail validation.
const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address."));

export const loginSchema = z.object({
  email,
  // On login we only check presence: telling attackers the password rules adds nothing here.
  password: z.string().min(1, "Enter your password."),
});

const newPassword = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(PASSWORD_MAX_LENGTH, `Use at most ${PASSWORD_MAX_LENGTH} characters.`);

const passwordsMatch = {
  check: (values: { password: string; confirmPassword: string }) =>
    values.password === values.confirmPassword,
  params: { message: "Passwords don't match.", path: ["confirmPassword"] },
};

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Enter your name.")
      .max(NAME_MAX_LENGTH, `Name must be at most ${NAME_MAX_LENGTH} characters.`),
    email,
    password: newPassword,
    confirmPassword: z.string(),
  })
  .refine(passwordsMatch.check, passwordsMatch.params);

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password: newPassword, confirmPassword: z.string() })
  .refine(passwordsMatch.check, passwordsMatch.params);

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
