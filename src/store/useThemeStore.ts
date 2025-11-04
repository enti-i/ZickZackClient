import { create } from "zustand";
import { persist } from "zustand/middleware";
import { setProfileGroupingPreference } from "../services/launcher-config-service";
import { ModPlatform } from "../types/unified";

export type AccentColor = {
  name: string;
  value: string;
  hoverValue: string;
  shadowValue: string;
  light: string;
  dark: string;
  hslValue?: string;
  isCustom?: boolean;
};

export const ACCENT_COLORS: Record<string, AccentColor> = {
  zickzackNeon: {
    name: "ZickZack Neon",
    value: "#00ff66",
    hoverValue: "#00cc52",
    shadowValue: "rgba(0, 255, 102, 0.5)",
    light: "#33ff85",
    dark: "#009944",
    hslValue: "150 100% 52%",
  },
};

const calculateColorVariants = (baseColor: string): Partial<AccentColor> => {
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: Number.parseInt(result[1], 16),
          g: Number.parseInt(result[2], 16),
          b: Number.parseInt(result[3], 16),
        }
      : null;
  };

  const rgbToHex = (r: number, g: number, b: number) =>
    "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);

  const darken = (hex: string, amount: number) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;

    return rgbToHex(
      Math.max(0, Math.floor(rgb.r * (1 - amount))),
      Math.max(0, Math.floor(rgb.g * (1 - amount))),
      Math.max(0, Math.floor(rgb.b * (1 - amount))),
    );
  };

  const lighten = (hex: string, amount: number) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;

    return rgbToHex(
      Math.min(255, Math.floor(rgb.r + (255 - rgb.r) * amount)),
      Math.min(255, Math.floor(rgb.g + (255 - rgb.g) * amount)),
      Math.min(255, Math.floor(rgb.b + (255 - rgb.b) * amount)),
    );
  };

  const calculateShadow = (hex: string) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return `rgba(0, 40, 24, 0.5)`;

    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`;
  };

  const rgbToHsl = (r: number, g: number, b: number) => {
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;

    const max = Math.max(rNorm, gNorm, bNorm);
    const min = Math.min(rNorm, gNorm, bNorm);
    const delta = max - min;

    let h = 0;
    if (delta !== 0) {
      if (max === rNorm) {
        h = ((gNorm - bNorm) / delta) % 6;
      } else if (max === gNorm) {
        h = (bNorm - rNorm) / delta + 2;
      } else {
        h = (rNorm - gNorm) / delta + 4;
      }
      h *= 60;
      if (h < 0) {
        h += 360;
      }
    }

    const l = (max + min) / 2;
    const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

    return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  const hslValue = (() => {
    const rgb = hexToRgb(baseColor);
    if (!rgb) return undefined;
    return rgbToHsl(rgb.r, rgb.g, rgb.b);
  })();

  return {
    value: baseColor,
    hoverValue: darken(baseColor, 0.1),
    shadowValue: calculateShadow(baseColor),
    light: lighten(baseColor, 0.2),
    dark: darken(baseColor, 0.2),
    hslValue,
    isCustom: true,
  };
};

export const DEFAULT_BORDER_RADIUS = 0; 
export const MIN_BORDER_RADIUS = 0;
export const MAX_BORDER_RADIUS = 32;

interface ThemeState {
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
  setCustomAccentColor: (hexColor: string) => void;
  applyAccentColorToDOM: () => void;
  customColorHistory: string[];
  addToCustomColorHistory: (hexColor: string) => void;
  clearCustomColorHistory: () => void;
  isBackgroundAnimationEnabled: boolean;
  isDetailViewSidebarOnLeft: boolean;
  toggleDetailViewSidebarPosition: () => void;
  profileGroupingCriterion: string;
  setProfileGroupingCriterion: (criterion: string) => Promise<void>;
  staticBackground: boolean;
  toggleStaticBackground: () => void;
  toggleBackgroundAnimation: () => void;
  hasAcceptedTermsOfService: boolean;
  acceptTermsOfService: () => void;
  borderRadius: number;
  setBorderRadius: (radius: number) => void;
  applyBorderRadiusToDOM: () => void;
  collapsedProfileGroups: string[];
  setCollapsedProfileGroups: (groups: string[]) => void;
  toggleCollapsedProfileGroup: (groupKey: string) => void;
  // ProfilesTabV2 persistent filters
  profilesTabActiveGroup: string;
  profilesTabSortBy: string;
  profilesTabVersionFilter: string;
  profilesTabLayoutMode: "list" | "grid" | "compact";
  setProfilesTabActiveGroup: (group: string) => void;
  setProfilesTabSortBy: (sortBy: string) => void;
  setProfilesTabVersionFilter: (filter: string) => void;
  setProfilesTabLayoutMode: (mode: "list" | "grid" | "compact") => void;
  // Global context menu management
  openContextMenuId: string | null;
  setOpenContextMenuId: (id: string | null) => void;
  // Mod source selection
  modSource: ModPlatform;
  setModSource: (source: ModPlatform) => void;
  // News section width
  newsSectionWidth: number;
  setNewsSectionWidth: (width: number) => void;
  // Featured profile mode
  featureMode: boolean;
  setFeatureMode: (enabled: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      accentColor: ACCENT_COLORS.zickzackNeon,
      isBackgroundAnimationEnabled: false,
      isDetailViewSidebarOnLeft: true,
      profileGroupingCriterion: "group",
      staticBackground: true,
      hasAcceptedTermsOfService: false,
      customColorHistory: [],
      borderRadius: DEFAULT_BORDER_RADIUS,
      collapsedProfileGroups: [],
      // ProfilesTabV2 persistent filters - defaults
      profilesTabActiveGroup: "all",
      profilesTabSortBy: "last_played",
      profilesTabVersionFilter: "all",
      profilesTabLayoutMode: "list",
      // Global context menu management - defaults
      openContextMenuId: null,
      // Mod source selection - defaults
      modSource: ModPlatform.Modrinth,
      // News section width - defaults
      newsSectionWidth: 375,
      // Featured profile mode - defaults
      featureMode: false,

      setAccentColor: (color: AccentColor) => {
        set({ accentColor: color });
        get().applyAccentColorToDOM();
      },

      setBorderRadius: (radius: number) => {
        const clampedRadius = Math.max(MIN_BORDER_RADIUS, Math.min(MAX_BORDER_RADIUS, radius));
        set({ borderRadius: clampedRadius });
        get().applyBorderRadiusToDOM();
      },

      setCustomAccentColor: (hexColor: string) => {
        const colorVariants = calculateColorVariants(hexColor);
        const customColor: AccentColor = {
          name: "Custom",
          ...colorVariants,
        } as AccentColor;

        set({ accentColor: customColor });
        get().applyAccentColorToDOM();
        get().addToCustomColorHistory(hexColor);
      },

      addToCustomColorHistory: (hexColor: string) => {
        set((state) => {
          const newHistory = [...state.customColorHistory];
          
          const existingIndex = newHistory.indexOf(hexColor);
          if (existingIndex > -1) {
            newHistory.splice(existingIndex, 1);
          }
          
          newHistory.unshift(hexColor);
          
          if (newHistory.length > 10) {
            newHistory.pop();
          }
          
          return { customColorHistory: newHistory };
        });
      },

      clearCustomColorHistory: () => {
        set({ customColorHistory: [] });
      },

      toggleBackgroundAnimation: () => {
        set((state) => ({
          isBackgroundAnimationEnabled: !state.isBackgroundAnimationEnabled,
        }));
      },

      toggleDetailViewSidebarPosition: () => {
        set((state) => ({
          isDetailViewSidebarOnLeft: !state.isDetailViewSidebarOnLeft,
        }));
      },

      setProfileGroupingCriterion: async (criterion: string) => {
        try {
          await setProfileGroupingPreference(criterion);
          set({ profileGroupingCriterion: criterion });
        } catch (error) {
          console.error("Failed to save grouping preference:", error);
          set({ profileGroupingCriterion: criterion });
          throw error;
        }
      },

      toggleStaticBackground: () => {
        set((state) => ({ staticBackground: !state.staticBackground }));
      },

      acceptTermsOfService: () => {
        set({ hasAcceptedTermsOfService: true });
      },

      applyAccentColorToDOM: () => {
        const { accentColor } = get();

        const hexToRgb = (hex: string) => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result
            ? `${Number.parseInt(result[1], 16)}, ${Number.parseInt(result[2], 16)}, ${Number.parseInt(result[3], 16)}`
            : null;
        };

        const hexToHsl = (hex: string) => {
          const rgbMatch = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          if (!rgbMatch) return null;

          const r = Number.parseInt(rgbMatch[1], 16) / 255;
          const g = Number.parseInt(rgbMatch[2], 16) / 255;
          const b = Number.parseInt(rgbMatch[3], 16) / 255;

          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const delta = max - min;

          let h = 0;
          if (delta !== 0) {
            if (max === r) {
              h = ((g - b) / delta) % 6;
            } else if (max === g) {
              h = (b - r) / delta + 2;
            } else {
              h = (r - g) / delta + 4;
            }
            h *= 60;
            if (h < 0) {
              h += 360;
            }
          }

          const l = (max + min) / 2;
          const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

          return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
        };

        document.documentElement.style.setProperty(
          "--accent",
          accentColor.value,
        );
        document.documentElement.style.setProperty(
          "--accent-hover",
          accentColor.hoverValue,
        );
        document.documentElement.style.setProperty(
          "--accent-shadow",
          accentColor.shadowValue,
        );
        document.documentElement.style.setProperty(
          "--accent-light",
          accentColor.light,
        );
        document.documentElement.style.setProperty(
          "--accent-dark",
          accentColor.dark,
        );

        const hslValue = accentColor.hslValue ?? hexToHsl(accentColor.value);
        if (hslValue) {
          document.documentElement.style.setProperty("--accent-hsl", hslValue);
        }

        const rgbValue = hexToRgb(accentColor.value);
        if (rgbValue) {
          document.documentElement.style.setProperty("--accent-rgb", rgbValue);
        }
      },

      applyBorderRadiusToDOM: () => {
        const { borderRadius } = get();

        document.documentElement.style.setProperty("--border-radius", `${borderRadius}px`);

        document.documentElement.setAttribute("data-border-radius", borderRadius.toString());
        if (borderRadius === 0) {
          document.documentElement.classList.add("radius-flat");
        } else {
          document.documentElement.classList.remove("radius-flat");
        }
      },

      setCollapsedProfileGroups: (groups: string[]) => {
        set({ collapsedProfileGroups: [...groups] });
      },

      toggleCollapsedProfileGroup: (groupKey: string) => {
        set((state) => {
          const isCollapsed = state.collapsedProfileGroups.includes(groupKey);
          const next = isCollapsed
            ? state.collapsedProfileGroups.filter((g) => g !== groupKey)
            : [...state.collapsedProfileGroups, groupKey];
          return { collapsedProfileGroups: next };
        });
      },

      // ProfilesTabV2 persistent filters setters
      setProfilesTabActiveGroup: (group: string) => {
        set({ profilesTabActiveGroup: group });
      },

      setProfilesTabSortBy: (sortBy: string) => {
        set({ profilesTabSortBy: sortBy });
      },

      setProfilesTabVersionFilter: (filter: string) => {
        set({ profilesTabVersionFilter: filter });
      },

      setProfilesTabLayoutMode: (mode: "list" | "grid" | "compact") => {
        set({ profilesTabLayoutMode: mode });
      },

      // Global context menu management
      setOpenContextMenuId: (id: string | null) => {
        set({ openContextMenuId: id });
      },

      // Mod source selection
      setModSource: (source: ModPlatform) => {
        set({ modSource: source });
      },

      // News section width
      setNewsSectionWidth: (width: number) => {
        set({ newsSectionWidth: width });
      },

      // Featured profile mode
      setFeatureMode: (enabled: boolean) => {
        set({ featureMode: enabled });
      },
    }),
    {
      name: "norisk-theme-storage",
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Migration: Replace old "none" grouping criterion with "group"
          if (state.profileGroupingCriterion === "none") {
            state.profileGroupingCriterion = "group";
          }

          state.applyAccentColorToDOM();
          state.applyBorderRadiusToDOM();
          // Ensure collapsedProfileGroups exists after rehydrate
          if (!Array.isArray(state.collapsedProfileGroups)) {
            state.collapsedProfileGroups = [];
          }
        }
      },
    },
  ),
);
