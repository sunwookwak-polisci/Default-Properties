import {
  App,
  PluginSettingTab,
  debounce,
  requireApiVersion,
  Setting,
  SettingDefinitionItem
} from "obsidian";
import type DefaultPropertiesPlugin from "./main";
import type { PathFilterMode } from "./path-filter";

const PATH_FILTER_OPTIONS: Record<PathFilterMode, string> = {
  all: "All notes",
  include: "Only in these folders",
  exclude: "All notes except these folders"
};

const FOLDER_SCOPE_DESC = "Choose which folders receive default properties. Each path is relative to the vault root and includes all of its subfolders.";

export class DefaultPropertiesSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: DefaultPropertiesPlugin) {
    super(app, plugin);
  }

  // Obsidian 1.13 and later render the tab from these definitions, which
  // also makes every setting searchable. Earlier versions call display().
  getSettingDefinitions(): SettingDefinitionItem[] {
    const settings = this.plugin.settings;
    const seenNames = new Set<string>();

    return [
      {
        name: "",
        desc: this.introText(),
        searchable: false,
        // Items without a control are skipped, so render the text row itself.
        render: () => undefined
      },
      {
        type: "list",
        heading: "Properties",
        emptyState: "No properties yet.",
        addItem: {
          name: "Add property",
          action: () => void this.addProperty().then(() => this.refreshDefinitions())
        },
        onReorder: (from, to) => {
          void this.moveProperty(from, to).then(() => this.refreshDefinitions());
        },
        onDelete: (index) => {
          void this.removeProperty(index).then(() => this.refreshDefinitions());
        },
        items: settings.properties.map((property, index) => {
          const label = property.name.trim() || "Unnamed property";
          // Rows are matched by name between renders, so keep names unique.
          const name = seenNames.has(label) ? `${label} (${index + 1})` : label;
          seenNames.add(name);

          return {
            name,
            render: (setting: Setting) => this.addPropertyControls(setting, index)
          };
        })
      },
      {
        type: "group",
        heading: "Folder scope",
        items: [
          {
            name: "Apply to",
            desc: FOLDER_SCOPE_DESC,
            control: {
              type: "dropdown",
              key: "pathFilterMode",
              options: PATH_FILTER_OPTIONS
            }
          }
        ]
      },
      {
        type: "list",
        heading: "Folders",
        visible: () => this.plugin.settings.pathFilterMode !== "all",
        emptyState: settings.pathFilterMode === "include"
          ? "No folders yet. No notes receive properties until you add one."
          : "No folders yet.",
        addItem: {
          name: "Add folder",
          action: () => void this.addFolder().then(() => this.refreshDefinitions())
        },
        onDelete: (index) => {
          void this.removeFolder(index).then(() => this.refreshDefinitions());
        },
        items: settings.pathFilterPaths.map((path, index) => ({
          name: "Folder",
          aliases: path ? [path] : [],
          control: {
            type: "folder",
            key: `pathFilterPaths.${index}`,
            placeholder: "Folder path"
          }
        }))
      }
    ];
  }

  getControlValue(key: string): unknown {
    const index = folderIndex(key);
    if (index !== undefined) return this.plugin.settings.pathFilterPaths[index];
    if (key === "pathFilterMode") return this.plugin.settings.pathFilterMode;
    return undefined;
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    const index = folderIndex(key);
    if (index !== undefined && typeof value === "string") {
      this.plugin.settings.pathFilterPaths[index] = value;
      await this.plugin.saveSettings();
      // Keeps search aliases current; the focused row is not re-rendered.
      this.requestRefreshDefinitions();
      return;
    }

    if (key === "pathFilterMode" && isPathFilterMode(value)) {
      this.plugin.settings.pathFilterMode = value;
      await this.plugin.saveSettings();
      // The intro text and folder list depend on the mode.
      this.refreshDefinitions();
    }
  }

  // Rebuilds the declarative definitions after a structural change. Only
  // reachable from declarative callbacks, which exist on 1.13 and later.
  private refreshDefinitions(): void {
    if (requireApiVersion("1.13.0")) this.update();
  }

  private readonly requestRefreshDefinitions = debounce(
    () => this.refreshDefinitions(),
    500,
    true
  );

  // Fallback for Obsidian versions before 1.13.
  display(): void {
    this.renderLegacy();
  }

  private renderLegacy(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("p", { text: this.introText() });

    const rerender = () => this.renderLegacy();
    const properties = this.plugin.settings.properties;

    properties.forEach((_, index) => {
      const setting = new Setting(containerEl);
      this.addPropertyControls(setting, index);
      setting
        .addExtraButton((button) => button
          .setIcon("arrow-up")
          .setTooltip("Move property up")
          .setDisabled(index === 0)
          .onClick(() => void this.moveProperty(index, index - 1).then(rerender)))
        .addExtraButton((button) => button
          .setIcon("arrow-down")
          .setTooltip("Move property down")
          .setDisabled(index === properties.length - 1)
          .onClick(() => void this.moveProperty(index, index + 1).then(rerender)))
        .addExtraButton((button) => button
          .setIcon("trash")
          .setTooltip("Remove property")
          .onClick(() => void this.removeProperty(index).then(rerender)));
    });

    new Setting(containerEl)
      .addButton((button) => button
        .setButtonText("Add property")
        .setCta()
        .onClick(() => void this.addProperty().then(rerender)));

    new Setting(containerEl).setName("Folder scope").setHeading();

    new Setting(containerEl)
      .setName("Apply to")
      .setDesc(FOLDER_SCOPE_DESC)
      .addDropdown((dropdown) => dropdown
        .addOptions(PATH_FILTER_OPTIONS)
        .setValue(this.plugin.settings.pathFilterMode)
        .onChange(async (value) => {
          if (!isPathFilterMode(value)) return;
          this.plugin.settings.pathFilterMode = value;
          await this.plugin.saveSettings();
          rerender();
        }));

    if (this.plugin.settings.pathFilterMode === "all") return;

    this.plugin.settings.pathFilterPaths.forEach((path, index) => {
      const setting = new Setting(containerEl)
        .setName(path.trim() || "Unnamed folder");
      setting
        .addText((text) => text
          .setPlaceholder("Folder path")
          .setValue(path)
          .onChange(async (value) => {
            this.plugin.settings.pathFilterPaths[index] = value;
            setting.setName(value.trim() || "Unnamed folder");
            await this.plugin.saveSettings();
          }))
        .addExtraButton((button) => button
          .setIcon("trash")
          .setTooltip("Remove folder")
          .onClick(() => void this.removeFolder(index).then(rerender)));
    });

    new Setting(containerEl)
      .addButton((button) => button
        .setButtonText("Add folder")
        .onClick(() => void this.addFolder().then(rerender)));
  }

  private addPropertyControls(setting: Setting, index: number): void {
    const property = this.plugin.settings.properties[index];

    setting
      .setName(property.name.trim() || "Unnamed property")
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
        })
        // Refresh row names and search once editing is finished, so the
        // input does not lose focus while typing.
        .then((text) => {
          text.inputEl.addEventListener("change", () => this.refreshDefinitions());
        }));
  }

  private async addProperty(): Promise<void> {
    this.plugin.settings.properties.push({ name: "", enabled: true });
    await this.plugin.saveSettings();
  }

  private async moveProperty(from: number, to: number): Promise<void> {
    const properties = this.plugin.settings.properties;
    const inRange = (index: number) => index >= 0 && index < properties.length;
    if (!inRange(from) || !inRange(to) || from === to) return;
    const [moved] = properties.splice(from, 1);
    properties.splice(to, 0, moved);
    await this.plugin.saveSettings();
  }

  private async removeProperty(index: number): Promise<void> {
    this.plugin.settings.properties.splice(index, 1);
    await this.plugin.saveSettings();
  }

  private async addFolder(): Promise<void> {
    this.plugin.settings.pathFilterPaths.push("");
    await this.plugin.saveSettings();
  }

  private async removeFolder(index: number): Promise<void> {
    this.plugin.settings.pathFilterPaths.splice(index, 1);
    await this.plugin.saveSettings();
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

function folderIndex(key: string): number | undefined {
  const match = /^pathFilterPaths\.(\d+)$/.exec(key);
  return match ? Number(match[1]) : undefined;
}

function isPathFilterMode(value: unknown): value is PathFilterMode {
  return typeof value === "string" && Object.keys(PATH_FILTER_OPTIONS).includes(value);
}
