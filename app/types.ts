export interface TargetLocation {
  id: string;
  name: string;
  path: string;
  selected: boolean;
  size?: number; // Size in bytes
  sizeFormatted?: string; // Human-readable size (e.g., "1.2 MB")
}

export interface Preset {
  id: string;
  name: string;
  description?: string;
  targetIds: string[];
}

export interface Settings {
  defaultPresetId: string | null;
}

export interface HistoryEntry {
  id: number;
  timestamp: number;
  description: string;
  sourcePath: string;
  version?: string;
  targetLocations: { id?: string; name: string; path: string }[];
  copyResults?: {
    targetId: string;
    targetPath?: string;
    targetName?: string;
    success: boolean;
    error?: string;
    fileSize?: number;
    duration?: number;
    fileName?: string;
    hasDiff?: boolean;
  }[];
}

export interface TargetDirectorySectionProps {
  isUpdating: boolean;
  settings: Settings;
  presets: Preset[];
  targetLocations: TargetLocation[];
  onAddLocation: (name: string, path: string) => Promise<void>;
  onToggleLocation: (id: string) => void;
  onSaveSettings: (settings: Settings) => void;
  onSavePreset: () => void;
  onDeletePreset: (id: string) => void;
  onApplyPreset: (presetId: string) => void;
  onClearPreset: () => void;
  onOpenNewPresetDialog: () => void;
  onOpenEditPresetDialog: (preset: Preset) => void;
  onCreatePresetFromSelection: () => void;
}
