import assert from "node:assert/strict";
import test from "node:test";
import {
  isInFolder,
  normalizeFolderPaths,
  shouldApplyToPath
} from "../path-filter";

test("normalizeFolderPaths trims, strips slashes, and dedupes", () => {
  assert.deepEqual(
    normalizeFolderPaths([" Daily ", "/Projects/Work/", "Daily", "", "\\Inbox\\"]),
    ["Daily", "Projects/Work", "Inbox"]
  );
});

test("isInFolder matches folder and subfolders with path boundaries", () => {
  assert.equal(isInFolder("Daily/note.md", "Daily"), true);
  assert.equal(isInFolder("Daily/sub/note.md", "Daily"), true);
  assert.equal(isInFolder("Daily", "Daily"), true);
  assert.equal(isInFolder("Projects/Work/note.md", "Projects/Work"), true);
  assert.equal(isInFolder("Projects/note.md", "Pro"), false);
  assert.equal(isInFolder("Other/note.md", "Daily"), false);
});

test("all mode always applies", () => {
  assert.equal(shouldApplyToPath("any/note.md", "all", []), true);
  assert.equal(shouldApplyToPath("Daily/note.md", "all", ["Daily"]), true);
});

test("include mode applies only to listed folders", () => {
  assert.equal(shouldApplyToPath("Daily/note.md", "include", []), false);
  assert.equal(shouldApplyToPath("Daily/note.md", "include", ["Daily"]), true);
  assert.equal(shouldApplyToPath("Daily/sub/note.md", "include", ["Daily"]), true);
  assert.equal(shouldApplyToPath("Other/note.md", "include", ["Daily"]), false);
  assert.equal(
    shouldApplyToPath("Projects/Work/a.md", "include", ["Daily", "Projects/Work"]),
    true
  );
});

test("exclude mode skips listed folders", () => {
  assert.equal(shouldApplyToPath("any/note.md", "exclude", []), true);
  assert.equal(shouldApplyToPath("Daily/note.md", "exclude", ["Daily"]), false);
  assert.equal(shouldApplyToPath("Daily/sub/note.md", "exclude", ["Daily"]), false);
  assert.equal(shouldApplyToPath("Other/note.md", "exclude", ["Daily"]), true);
});
