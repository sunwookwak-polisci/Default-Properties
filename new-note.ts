// Synced, copied, or restored files fire the vault "create" event too, but
// usually keep an older modification time. Only treat recent files as new.
export const NEW_NOTE_WINDOW_MS = 10_000;

export function isNewlyCreated(mtime: number, now: number): boolean {
  return now - mtime <= NEW_NOTE_WINDOW_MS;
}
