/**
 * Turns an error from the auth client into a message that is safe and helpful to show.
 * We map known codes to our own wording and never display raw server output.
 */
export function getAuthErrorMessage(error: { status?: number; code?: string; message?: string }) {
  if (error.status === 429) {
    return "Too many attempts. Please wait a minute and try again.";
  }
  switch (error.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      // Deliberately vague: don't reveal whether the email has an account.
      return "Invalid email or password.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "An account with this email already exists. Try logging in instead.";
    case "PASSWORD_TOO_SHORT":
    case "PASSWORD_TOO_LONG":
    case "INVALID_EMAIL":
      return error.message ?? "Please check your details and try again.";
  }
  if (error.status === 400 && error.message) {
    // Our own validation errors (e.g. the name hook) are written to be user-facing.
    return error.message;
  }
  return "Something went wrong. Please try again.";
}
