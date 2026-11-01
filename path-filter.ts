export type PathFilterMode = "all" | "include" | "exclude";

export function normalizeFolderPaths(paths: string[]): string[] {
  const seen = new Set<string>();

  return paths
    .map((path) => path.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, ""))
    .filter((path) => {
      if (!path || seen.has(path)) return false;
      seen.add(path);
      return true;
    });
}

export function isInFolder(filePath: string, folderPrefix: string): boolean {
  const normalizedFile = filePath.replace(/\\/g, "/");
  return (
    normalizedFile === folderPrefix ||
    normalizedFile.startsWith(`${folderPrefix}/`)
  );
}

export function shouldApplyToPath(
  filePath: string,
  mode: PathFilterMode,
  paths: string[]
): boolean {
  if (mode === "all") return true;

  const normalized = normalizeFolderPaths(paths);
  const matches = normalized.some((prefix) => isInFolder(filePath, prefix));

  if (mode === "include") {
    return normalized.length > 0 && matches;
  }

  // exclude
  return !matches;
}
