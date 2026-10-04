import "server-only";

type Level = "debug" | "info" | "warn" | "error";
type Fields = Record<string, unknown>;

const levelOrder: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const minLevel: Level =
  (process.env.LOG_LEVEL as Level | undefined) ??
  (process.env.NODE_ENV === "production" ? "info" : "debug");

function serialize(value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  return value;
}

/**
 * Minimal structured logger. In production each line is one JSON object, which log platforms
 * (Vercel, Datadog, CloudWatch…) can search and filter. In development it prints readably.
 * Never log passwords, tokens, resume contents or other personal data.
 */
function log(level: Level, message: string, fields: Fields = {}) {
  if (levelOrder[level] < levelOrder[minLevel]) return;
  const entry = Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, serialize(value)]),
  );
  const write = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  if (process.env.NODE_ENV === "production") {
    write(JSON.stringify({ time: new Date().toISOString(), level, message, ...entry }));
  } else {
    write(`[${level}] ${message}`, Object.keys(entry).length ? entry : "");
  }
}

export const logger = {
  debug: (message: string, fields?: Fields) => log("debug", message, fields),
  info: (message: string, fields?: Fields) => log("info", message, fields),
  warn: (message: string, fields?: Fields) => log("warn", message, fields),
  error: (message: string, fields?: Fields) => log("error", message, fields),
};
