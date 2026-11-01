import type { PathFilterMode } from "./path-filter";

export interface PropertyChoice {
  name: string;
  enabled: boolean;
}

export interface DefaultPropertiesSettings {
  properties: PropertyChoice[];
  pathFilterMode: PathFilterMode;
  pathFilterPaths: string[];
}

const PATH_FILTER_MODES: readonly PathFilterMode[] = ["all", "include", "exclude"];

export function defaultSettings(): DefaultPropertiesSettings {
  return {
    properties: [
      { name: "status", enabled: true },
      { name: "tags", enabled: false }
    ],
    pathFilterMode: "all",
    pathFilterPaths: []
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

// Builds fresh settings from saved data, dropping anything malformed.
export function parseSettings(saved: unknown): DefaultPropertiesSettings {
  const settings = defaultSettings();
  if (!isRecord(saved)) return settings;

  if (Array.isArray(saved.properties)) {
    settings.properties = saved.properties
      .filter(isRecord)
      .filter((property) => typeof property.name === "string")
      .map((property) => ({
        name: property.name as string,
        enabled: property.enabled !== false
      }));
  }

  if (PATH_FILTER_MODES.includes(saved.pathFilterMode as PathFilterMode)) {
    settings.pathFilterMode = saved.pathFilterMode as PathFilterMode;
  }

  if (Array.isArray(saved.pathFilterPaths)) {
    settings.pathFilterPaths = saved.pathFilterPaths
      .filter((path): path is string => typeof path === "string");
  }

  return settings;
}
