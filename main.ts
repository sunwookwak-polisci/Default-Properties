import {
  AbstractInputSuggest,
  App,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TAbstractFile,
  TFile,
  TFolder
} from "obsidian";
import { addEmptyPropertyFields, normalizePropertyNames } from "./property-fields";
import { isNewlyCreated } from "./new-note";
import {
  PathFilterMode,
  shouldApplyToPath
} from "./path-filter";
import {
  DefaultPropertiesSettings,
  defaultSettings,
  parseSettings
} from "./settings";

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

class FolderSuggest extends AbstractInputSuggest<TFolder> {
  constructor(
    app: App,
    inputEl: HTMLInputElement,
    private readonly onPick: (path: string) => void
  ) {
    super(app, inputEl);
  }

  getSuggestions(query: string): TFolder[] {
    const needle = query.trim().toLowerCase();
    return this.app.vault.getAllLoadedFiles()
      .filter((file): file is TFolder => file instanceof TFolder && !file.isRoot())
      .filter((folder) => folder.path.toLowerCase().includes(needle))
      .sort((a, b) => a.path.localeCompare(b.path))
      .slice(0, 50);
  }

  renderSuggestion(folder: TFolder, el: HTMLElement): void {
    el.setText(folder.path);
  }

  selectSuggestion(folder: TFolder): void {
    this.setValue(folder.path);
    this.onPick(folder.path);
    this.close();
  }
}

class DefaultPropertiesSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: DefaultPropertiesPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("p", {
      text: this.introText()
    });

    this.plugin.settings.properties.forEach((property, index) => {
      const setting = new Setting(containerEl)
        .setName(property.name || "Unnamed property")
        .addToggle((toggle) => toggle
          .setTooltip("Add this field to new notes")
          .setValue(property.enabled)
          .onChange(async (value) => {
            property.enabled = value;
            await this.plugin.saveSettings();
          }))
        .addText((text) => text
          .setPlaceholder("Property name")
          .setValue(property.name)
          .onChange(async (value) => {
            property.name = value;
            setting.setName(value.trim() || "Unnamed property");
            await this.plugin.saveSettings();
          }))
        .addExtraButton((button) => button
          .setIcon("arrow-up")
          .setTooltip("Move property up")
          .setDisabled(index === 0)
          .onClick(async () => {
            const properties = this.plugin.settings.properties;
            [properties[index - 1], properties[index]] = [
              properties[index],
              properties[index - 1]
            ];
            await this.plugin.saveSettings();
            this.refresh();
          }))
        .addExtraButton((button) => button
          .setIcon("arrow-down")
          .setTooltip("Move property down")
          .setDisabled(index === this.plugin.settings.properties.length - 1)
          .onClick(async () => {
            const properties = this.plugin.settings.properties;
            [properties[index], properties[index + 1]] = [
              properties[index + 1],
              properties[index]
            ];
            await this.plugin.saveSettings();
            this.refresh();
          }))
        .addExtraButton((button) => button
          .setIcon("trash")
          .setTooltip("Remove property")
          .onClick(async () => {
            this.plugin.settings.properties.splice(index, 1);
            await this.plugin.saveSettings();
            this.refresh();
          }));
    });

    new Setting(containerEl)
      .addButton((button) => button
        .setButtonText("Add property")
        .setCta()
        .onClick(async () => {
          this.plugin.settings.properties.push({ name: "", enabled: true });
          await this.plugin.saveSettings();
          this.refresh();
        }));

    new Setting(containerEl).setName("Folder scope").setHeading();
    containerEl.createEl("p", {
      text: "Choose which folders receive default properties. Each path is relative to the vault root and includes all of its subfolders."
    });

    new Setting(containerEl)
      .setName("Apply to")
      .setDesc("Choose which new notes get default properties.")
      .addDropdown((dropdown) => dropdown
        .addOption("all", "All notes")
        .addOption("include", "Only in these folders")
        .addOption("exclude", "All notes except these folders")
        .setValue(this.plugin.settings.pathFilterMode)
        .onChange(async (value: string) => {
          this.plugin.settings.pathFilterMode = value as PathFilterMode;
          await this.plugin.saveSettings();
          this.refresh();
        }));

    if (this.plugin.settings.pathFilterMode !== "all") {
      this.plugin.settings.pathFilterPaths.forEach((path, index) => {
        const setting = new Setting(containerEl)
          .setName(path || "Unnamed folder");
        const savePath = async (value: string): Promise<void> => {
          this.plugin.settings.pathFilterPaths[index] = value;
          setting.setName(value.trim() || "Unnamed folder");
          await this.plugin.saveSettings();
        };

        setting
          .addSearch((search) => {
            search
              .setPlaceholder("Folder path")
              .setValue(path)
              .onChange(savePath);
            new FolderSuggest(this.app, search.inputEl, (value) => {
              void savePath(value);
            });
          })
          .addExtraButton((button) => button
            .setIcon("trash")
            .setTooltip("Remove folder")
            .onClick(async () => {
              this.plugin.settings.pathFilterPaths.splice(index, 1);
              await this.plugin.saveSettings();
              this.refresh();
            }));
      });

      new Setting(containerEl)
        .addButton((button) => button
          .setButtonText("Add folder")
          .onClick(async () => {
            this.plugin.settings.pathFilterPaths.push("");
            await this.plugin.saveSettings();
            this.refresh();
          }));
    }
  }

  // display() stays the rendering path while minAppVersion predates the
  // declarative settings API added in Obsidian 1.13.
  private refresh(): void {
    this.display();
  }

  private introText(): string {
    switch (this.plugin.settings.pathFilterMode) {
      case "include":
        return "Enabled names are added to new Markdown notes in the folders listed under Folder scope, in the order shown below. No property values are inserted.";
      case "exclude":
        return "Enabled names are added to new Markdown notes except those in the folders listed under Folder scope, in the order shown below. No property values are inserted.";
      default:
        return "Enabled names are added to every new Markdown note in the order shown below. No property values are inserted.";
    }
  }
}
