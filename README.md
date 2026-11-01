# Default Properties

Default Properties automatically adds your chosen property fields to new
Markdown notes. It adds only the property names and leaves the values empty for
you to fill in.

## Usage

1. Open **Settings → Community plugins → Default Properties**.
2. Add the property names you want on new notes.
3. Turn on the toggle beside each property that should be added.
4. Drag the handles (or use the arrow buttons on older Obsidian versions) to set
   the order.
5. Optionally limit which folders are affected under **Folder scope**.
6. Create a note. The enabled fields appear in its Properties view with empty
   values.

For example, enabling `status` and `due date` produces:

```yaml
---
status:
due date:
---
```

If a new note already has frontmatter, for example from a template, missing
fields are added after the existing ones. Keys that already exist are never
duplicated or changed. Non-Markdown files are ignored.

Only notes you create are changed. Files that appear in your vault through
sync, copying, or restoring keep their content untouched.

## Folder scope

By default, every new Markdown note gets the enabled properties. Under
**Folder scope** you can choose:

- **All notes**: apply everywhere (default).
- **Only in these folders**: apply only to notes created in the listed folders.
- **All notes except these folders**: apply everywhere except the listed
  folders.

Folder paths are relative to the vault root, such as `Daily` or
`Projects/Work`, and include all subfolders. If **Only in these folders** is
selected with no folders listed, no notes receive properties.

On Obsidian 1.13 and later, matching folders are suggested as you type, and
these settings appear in the settings search.

## License

[MIT](LICENSE)
