/**
 * Auth limits shared by the server config (src/server/auth.ts) and the browser forms
 * (src/features/auth/schemas.ts), so the two can never disagree.
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const NAME_MAX_LENGTH = 100;
