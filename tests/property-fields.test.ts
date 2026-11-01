import assert from "node:assert/strict";
import test from "node:test";
import { addEmptyPropertyFields, normalizePropertyNames } from "../property-fields";

test("adds empty fields without values to a note", () => {
  assert.equal(
    addEmptyPropertyFields("Hello\n", ["status", "due date"]),
    "---\nstatus:\ndue date:\n---\nHello\n"
  );
});

test("appends missing fields to existing frontmatter without replacing content", () => {
  assert.equal(
    addEmptyPropertyFields("---\ntitle: Existing\n---\nBody", ["title", "status"]),
    "---\ntitle: Existing\nstatus:\n---\nBody"
  );
});

test("fills empty frontmatter instead of adding a second block", () => {
  assert.equal(
    addEmptyPropertyFields("---\n---\nBody", ["status"]),
    "---\nstatus:\n---\nBody"
  );
  assert.equal(addEmptyPropertyFields("---\n---", ["status"]), "---\nstatus:\n---");
});

test("preserves CRLF line endings", () => {
  assert.equal(
    addEmptyPropertyFields("---\r\ntitle: A\r\n---\r\nBody", ["status"]),
    "---\r\ntitle: A\r\nstatus:\r\n---\r\nBody"
  );
  assert.equal(
    addEmptyPropertyFields("Body\r\n", ["status"]),
    "---\r\nstatus:\r\n---\r\nBody\r\n"
  );
});

test("quotes only keys that need it", () => {
  assert.equal(
    addEmptyPropertyFields("", ["status", "créé le", "a: b", "#tag", "true", "2024"]),
    "---\nstatus:\ncréé le:\n\"a: b\":\n\"#tag\":\n\"true\":\n\"2024\":\n---\n"
  );
});

test("supports empty notes and removes duplicate settings", () => {
  assert.equal(addEmptyPropertyFields("", [" status ", "status", ""]), "---\nstatus:\n---\n");
  assert.deepEqual(normalizePropertyNames([" a ", "a", "b"]), ["a", "b"]);
});

test("does not alter a note when every field already exists", () => {
  const content = "---\n\"due date\":\nstatus: done\n'it''s':\n---\n";
  assert.equal(addEmptyPropertyFields(content, ["due date", "status", "it's"]), content);
});

test("ignores nested keys and list items when detecting existing fields", () => {
  assert.equal(
    addEmptyPropertyFields("---\nmeta:\n  status: x\naliases:\n  - status: y\n---\n", ["status"]),
    "---\nmeta:\n  status: x\naliases:\n  - status: y\nstatus:\n---\n"
  );
});
