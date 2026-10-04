/**
 * What every Server Action returns. The client checks `ok` and either continues or shows the
 * message (and field errors next to the right inputs).
 */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; message: string; fieldErrors?: Record<string, string[] | undefined> };
