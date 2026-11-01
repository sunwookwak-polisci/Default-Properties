import {
  Notice,
  Plugin,
  TAbstractFile,
  TFile
} from "obsidian";
import { addEmptyPropertyFields, normalizePropertyNames } from "./property-fields";
import { isNewlyCreated } from "./new-note";
import { shouldApplyToPath } from "./path-filter";
import {
  DefaultPropertiesSettings,
  defaultSettings,
  parseSettings
} from "./settings";
import { DefaultPropertiesSettingTab } from "./settings-tab";

export default class DefaultPropertiesPlugin extends Plugin {
  settings: DefaultPropertiesSettings = defaultSettings();

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addSettingTab(new DefaultPropertiesSettingTab(this.app, this));

    this.app.workspace.onLayoutReady(() => {
      this.registerEvent(this.app.vault.on("create", (file) => {
        void this.addPropertiesToNewNote(file);
      }));
    });
  }

  private async addPropertiesToNewNote(file: TAbstractFile): Promise<void> {
    if (!(file instanceof TFile) || file.extension !== "md") return;
    if (!isNewlyCreated(file.stat.mtime, Date.now())) return;

    if (!shouldApplyToPath(
      file.path,
      this.settings.pathFilterMode,
      this.settings.pathFilterPaths
    )) {
      return;
    }

    const names = normalizePropertyNames(
      this.settings.properties
        .filter((property) => property.enabled)
        .map((property) => property.name)
    );
    if (names.length === 0) return;

    try {
      await this.app.vault.process(file, (content) =>
        addEmptyPropertyFields(content, names)
      );
    } catch (error) {
      console.error("Default Properties: could not update new note", error);
      new Notice(`Default Properties could not update ${file.basename}.`);
    }
  }

  async loadSettings(): Promise<void> {
    this.settings = parseSettings(await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
