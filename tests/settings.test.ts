import assert from "node:assert/strict";
import test from "node:test";
import { isNewlyCreated, NEW_NOTE_WINDOW_MS } from "../new-note";
import { defaultSettings, parseSettings } from "../settings";

test("returns independent defaults for missing data", () => {
  const first = parseSettings(null);
  first.properties.push({ name: "extra", enabled: true });
  assert.deepEqual(parseSettings(undefined), defaultSettings());
  assert.equal(defaultSettings().properties.length, 2);
});

test("keeps valid saved settings", () => {
  assert.deepEqual(
    parseSettings({
      properties: [{ name: "due", enabled: false }],
      pathFilterMode: "exclude",
      pathFilterPaths: ["Daily"]
    }),
    {
      properties: [{ name: "due", enabled: false }],
      pathFilterMode: "exclude",
      pathFilterPaths: ["Daily"]
    }
  );
});

test("drops malformed saved values", () => {
  assert.deepEqual(
    parseSettings({
      properties: [{ name: "ok" }, { enabled: true }, "bad", null],
      pathFilterMode: "sometimes",
      pathFilterPaths: ["Daily", 3]
    }),
    {
      properties: [{ name: "ok", enabled: true }],
      pathFilterMode: "all",
      pathFilterPaths: ["Daily"]
    }
  );
});

test("treats only recently modified files as new notes", () => {
  const now = 1_000_000;
  assert.equal(isNewlyCreated(now, now), true);
  assert.equal(isNewlyCreated(now - NEW_NOTE_WINDOW_MS, now), true);
  assert.equal(isNewlyCreated(now - NEW_NOTE_WINDOW_MS - 1, now), false);
});
