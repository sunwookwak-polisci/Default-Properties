import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
  {
    ignores: ["main.js", "node_modules/", "esbuild.config.mjs"]
  },
  ...obsidianmd.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.mjs"]
        }
      }
    },
    rules: {
      // The declarative settings API needs Obsidian 1.13; minAppVersion is 1.5.0.
      "obsidianmd/settings-tab/prefer-setting-definitions": "off"
    }
  },
  {
    files: ["tests/**/*.ts"],
    rules: {
      "obsidianmd/no-nodejs-modules": "off",
      "@typescript-eslint/no-floating-promises": "off"
    }
  }
]);
