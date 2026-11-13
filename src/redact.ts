const secretKeyPattern = /(token|secret|password|api[_-]?key|authorization|cookie|credential)/i;
const secretValuePatterns = [
  /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
  /\b(?:sk|pk)-[A-Za-z0-9_-]{20,}\b/g,
  /\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi
];

function redactString(value: string): string {
  return secretValuePatterns.reduce((redacted, pattern) => redacted.replace(pattern, "[REDACTED]"), value);
}

export function isSecretKey(key: string): boolean {
  return secretKeyPattern.test(key);
}

export function redactValue(value: unknown): unknown {
  if (typeof value === "string") return redactString(value);
  if (Array.isArray(value)) return value.map(redactValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, child]) => [
      key,
      secretKeyPattern.test(key) ? "[REDACTED]" : redactValue(child)
    ]));
  }
  return value;
}
