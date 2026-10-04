/** Users created by global-setup. Each test file signs in as one of them via saved state. */
export const USERS = {
  alice: {
    id: "e2e-alice",
    name: "Alice Tester",
    email: "alice@e2e.test",
    password: "alice-password-123",
  },
  bob: { id: "e2e-bob", name: "Bob Tester", email: "bob@e2e.test", password: "bob-password-123" },
} as const;

export const storageState = (user: keyof typeof USERS) => `tests/e2e/.auth/${user}.json`;
