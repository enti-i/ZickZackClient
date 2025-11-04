import { create } from "zustand";
import { persist } from "zustand/middleware";

export type QualityLevel = "low" | "medium" | "high";

interface QualitySettingsState {
  qualityLevel: QualityLevel;
  setQualityLevel: (level: QualityLevel) => void;
  fpsBoosterEnabled: boolean;
  setFpsBoosterEnabled: (enabled: boolean) => void;
}

export const useQualitySettingsStore = create<QualitySettingsState>()(
  persist(
    (set) => ({
      qualityLevel: "medium",
      setQualityLevel: (level) => set({ qualityLevel: level }),
      fpsBoosterEnabled: false,
      setFpsBoosterEnabled: (enabled) => set({ fpsBoosterEnabled: enabled }),
    }),
    {
      name: "norisk-quality-settings-storage",
    },
  ),
);
