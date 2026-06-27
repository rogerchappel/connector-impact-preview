const secretKeyPattern = /(token|secret|password|api[_-]?key|authorization|cookie|credential)/i;

export function isSecretKey(key: string): boolean {
  return secretKeyPattern.test(key);
}

export function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, child]) => [
      key,
      secretKeyPattern.test(key) ? "[REDACTED]" : redactValue(child)
    ]));
  }
  return value;
}
