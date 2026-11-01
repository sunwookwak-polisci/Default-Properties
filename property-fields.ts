export function normalizePropertyNames(names: string[]): string[] {
  const seen = new Set<string>();

  return names
    .map((name) => name.trim())
    .filter((name) => {
      if (!name || seen.has(name)) return false;
      seen.add(name);
      return true;
    });
}

const PLAIN_KEY = /^[\p{L}_][\p{L}\p{N}_ .-]*$/u;
const RESERVED_SCALARS = new Set([
  "true", "false", "null", "yes", "no", "on", "off", "y", "n", "~"
]);

function yamlKey(name: string): string {
  if (PLAIN_KEY.test(name) && !RESERVED_SCALARS.has(name.toLowerCase())) {
    return `${name}:`;
  }
  // JSON strings are valid YAML strings and safely handle punctuation.
  return `${JSON.stringify(name)}:`;
}

function isFence(line: string): boolean {
  return /^---[ \t]*\r?$/.test(line);
}

function topLevelKey(line: string): string | undefined {
  const match = line.match(/^(?:"((?:\\.|[^"])*)"|'((?:''|[^'])*)'|([^\s#\-"'][^:]*?))\s*:(?:\s|$)/);
  if (!match) return undefined;
  if (match[1] !== undefined) return JSON.parse(`"${match[1]}"`) as string;
  if (match[2] !== undefined) return match[2].replace(/''/g, "'");
  return match[3].trim();
}

export function addEmptyPropertyFields(
  content: string,
  propertyNames: string[]
): string {
  const names = normalizePropertyNames(propertyNames);
  if (names.length === 0) return content;

  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = content.split("\n");
  const closing = isFence(lines[0])
    ? lines.findIndex((line, index) => index > 0 && isFence(line))
    : -1;

  if (closing === -1) {
    return `---${eol}${names.map(yamlKey).join(eol)}${eol}---${eol}${content}`;
  }

  const existingKeys = new Set<string>();
  for (const line of lines.slice(1, closing)) {
    const key = topLevelKey(line.replace(/\r$/, ""));
    if (key !== undefined) existingKeys.add(key);
  }

  const missing = names.filter((name) => !existingKeys.has(name));
  if (missing.length === 0) return content;

  const lineEnd = eol === "\r\n" ? "\r" : "";
  const insertion = missing.map((name) => `${yamlKey(name)}${lineEnd}`);
  lines.splice(closing, 0, ...insertion);
  return lines.join("\n");
}
