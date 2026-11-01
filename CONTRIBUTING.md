# Contributing

Bug reports and pull requests are welcome. Please open an issue first for
larger changes.

## Development

Requires Node.js 18 or later.

```bash
npm install
npm run dev     # rebuild main.js on change
npm run lint
npm test
npm run build   # type-check and production build
```

To try a local build, copy `main.js` and `manifest.json` into
`<vault>/.obsidian/plugins/default-properties/` in a test vault, then reload
Obsidian and enable **Default Properties**.

## Releases

1. Update `version` in `manifest.json` and `package.json`, and add the version
   with its `minAppVersion` to `versions.json`.
2. Commit, then push a tag that matches the version exactly, without a `v`
   prefix (for example `0.1.0`).
3. The release workflow lints, tests, builds, attests, and publishes a GitHub
   release with `main.js` and `manifest.json` (and `styles.css` if present).
