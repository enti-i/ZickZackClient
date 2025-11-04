"use client";

import type React from "react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Icon } from "@iconify/react";

import { VerticalNavbar } from ".././navigation/VerticalNavbar";
import { UserProfileBar } from ".././header/UserProfileBar";
import { NavigationHistory } from "../ui/NavigationHistory";
import { useThemeStore } from "../../store/useThemeStore";
import {
  BACKGROUND_EFFECTS,
  useBackgroundEffectStore,
} from "../../store/background-effect-store";
import { useQualitySettingsStore } from "../../store/quality-settings-store";
import { MatrixRainEffect } from ".././effects/MatrixRainEffect";
import { EnchantmentParticlesEffect } from ".././effects/EnchantmentParticlesEffect";
import { NebulaWaves } from ".././effects/NebulaWaves";
import { NebulaParticles } from ".././effects/NebulaParticles";
import { NebulaGrid } from ".././effects/NebulaGrid";
import { NebulaVoxels } from ".././effects/NebulaVoxels";
import { NebulaLightning } from ".././effects/NebulaLightning";
import { NebulaLiquidChrome } from ".././effects/NebulaLiquidChrome";
import { RetroGridEffect } from "../effects/RetroGridEffect";
import PlainBackground from "../effects/PlainBackground";
import * as ConfigService from "../../services/launcher-config-service";
import { SocialsModal } from "../modals/SocialsModal";
import { checkUpdateAvailable, downloadAndInstallUpdate } from "../../services/nrc-service";
import type { UpdateInfo } from "../../types/updater";
import { ProfileWizardV2Modal } from "../modals/ProfileWizardV2Modal";
import { ProfileSettingsModal } from "../modals/ProfileSettingsModal";
import { ProfileDuplicateModal } from "../modals/ProfileDuplicateModal";
import { exit } from "@tauri-apps/plugin-process";
import { Tooltip } from "../ui/Tooltip";
import { toast } from 'react-hot-toast';

const navItems = [
  { id: "play", icon: "solar:play-bold", label: "Play" },
  { id: "profiles", icon: "solar:user-id-bold", label: "Profiles" },
  { id: "mods", icon: "solar:widget-bold", label: "Mods" },
  { id: "skins", icon: "solar:emoji-funny-circle-bold", label: "Skins" },
  { id: "capes", icon: "solar:shop-bold", label: "Capes" },
  { id: "settings", icon: "solar:settings-bold", label: "Settings" },
];

const appConfig = {
  version: "v0.5.22",
};

interface AppLayoutProps {
  children: ReactNode;
  activeTab: string;
  onNavChange: (tabId: string) => void;
}

export function AppLayout({
  children,
  activeTab,
  onNavChange,
}: AppLayoutProps) {
  const launcherRef = useRef<HTMLDivElement>(null);
  const backgroundPatternRef = useRef<HTMLDivElement>(null);
  const minimizeRef = useRef<HTMLDivElement>(null);
  const maximizeRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLDivElement>(null);
  const { currentEffect } = useBackgroundEffectStore();
  const qualityLevel = useQualitySettingsStore((state) =>
    state.fpsBoosterEnabled ? "low" : state.qualityLevel,
  );
  const fpsBoosterEnabled = useQualitySettingsStore(
    (state) => state.fpsBoosterEnabled,
  );
  const { isBackgroundAnimationEnabled, accentColor: themeAccentColor, accentColor } =
    useThemeStore();

  const accentLight = themeAccentColor.light ?? themeAccentColor.value;
  const accentDark = themeAccentColor.dark ?? themeAccentColor.value;

  const hexToRgba = (hex: string, alpha: number) => {
    const sanitized = hex.replace('#', '');
    if (sanitized.length !== 6) {
      return `rgba(0, 255, 102, ${alpha})`;
    }

    const bigint = Number.parseInt(sanitized, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const getComplementaryBackground = () => {
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? {
            r: Number.parseInt(result[1], 16),
            g: Number.parseInt(result[2], 16),
            b: Number.parseInt(result[3], 16),
          }
        : { r: 6, g: 20, b: 12 };
    };

    const rgb = hexToRgb(accentDark);

    const mix = (channel: number, fallback: number) => {
      const darkened = Math.floor(channel * 0.18);
      return Math.max(fallback, Math.min(45, darkened));
    };

    const finalR = mix(rgb.r, 4);
    const finalG = mix(rgb.g, 18);
    const finalB = mix(rgb.b, 10);

    return `rgba(${finalR}, ${finalG}, ${finalB}, 0.92)`;
  };

  const backgroundColor = getComplementaryBackground();

  const getQualityParams = () => {
    const baseParams = (() => {
      switch (qualityLevel) {
        case "low":
          return { particleCount: 30, opacity: 0.2, speed: 0.5 };
        case "high":
          return { particleCount: 80, opacity: 0.4, speed: 1.5 };
        default:
          return { particleCount: 50, opacity: 0.3, speed: 1 };
      }
    })();

    if (!fpsBoosterEnabled) {
      return baseParams;
    }

    return {
      particleCount: Math.max(12, Math.floor(baseParams.particleCount * 0.5)),
      opacity: baseParams.opacity * 0.65,
      speed: baseParams.speed * 0.75,
    };
  };

  const qualityParams = getQualityParams();

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(launcherRef.current, {
        opacity: 0,
        scale: 0.95,
        duration: 0.8,
        ease: "power3.out",
      });

      if (backgroundPatternRef.current) {
        gsap.to(backgroundPatternRef.current, {
          backgroundPosition: "100% 100%",
          duration: 120,
          repeat: -1,
          ease: "none",
        });
      }
    });

    const setupWindowControls = async () => {
      try {
        const tauriModule = await import("@tauri-apps/api/window").catch(
          () => null,
        );

        if (tauriModule) {
          const { Window } = tauriModule;
          const currentWindow = Window.getCurrent();

          if (minimizeRef.current) {
            minimizeRef.current.addEventListener("click", () =>
              currentWindow.minimize(),
            );
          }

          if (maximizeRef.current) {
            maximizeRef.current.addEventListener("click", () =>
              currentWindow.toggleMaximize(),
            );
          }

          if (closeRef.current) {
            closeRef.current.addEventListener("click", () =>
              exit(0),
            );
          }
        } else {
          console.log(
            "Tauri API not available, window controls will be decorative only",
          );
        }
      } catch (error) {
        console.error("Failed to initialize window controls:", error);
      }
    };

    setupWindowControls();

    return () => ctx.revert();
  }, []);

  const renderBackgroundEffect = () => {
    switch (currentEffect) {
      case BACKGROUND_EFFECTS.MATRIX_RAIN:
        return (
          <MatrixRainEffect
            speed={qualityParams.speed}
            opacity={qualityParams.opacity}
            forceEnable={false}
          />
        );
      case BACKGROUND_EFFECTS.ENCHANTMENT_PARTICLES:
        return (
          <EnchantmentParticlesEffect
            opacity={qualityParams.opacity}
            particleCount={qualityParams.particleCount}
            speed={qualityParams.speed}
            forceEnable={false}
          />
        );
      case BACKGROUND_EFFECTS.NEBULA_WAVES:
        return (
          <NebulaWaves
            opacity={qualityParams.opacity}
            speed={qualityParams.speed}
          />
        );
      case BACKGROUND_EFFECTS.NEBULA_PARTICLES:
        return (
          <NebulaParticles
            opacity={qualityParams.opacity}
            particleCount={qualityParams.particleCount}
            speed={qualityParams.speed}
          />
        );
      case BACKGROUND_EFFECTS.NEBULA_GRID:
        return (
          <NebulaGrid
            opacity={qualityParams.opacity}
            speed={qualityParams.speed}
            gridSize={30}
          />
        );
      case BACKGROUND_EFFECTS.NEBULA_VOXELS:
        return (
          <NebulaVoxels
            opacity={qualityParams.opacity}
            cubeCount={qualityParams.particleCount}
            speed={qualityParams.speed}
          />
        );
      case BACKGROUND_EFFECTS.NEBULA_LIGHTNING:
        return (
          <NebulaLightning
            opacity={qualityParams.opacity * 2}
            speed={qualityParams.speed}
            intensity={qualityParams.speed * 1.2}
            size={1.5}
          />
        );
      case BACKGROUND_EFFECTS.NEBULA_LIQUID_CHROME:
        return (
          <NebulaLiquidChrome
            opacity={qualityParams.opacity * 2}
            speed={qualityParams.speed * 0.2}
            amplitude={0.5}
            frequencyX={3}
            frequencyY={2}
          />
        );
      case BACKGROUND_EFFECTS.RETRO_GRID:
        const hexToRgbaWithLowOpacity = (hex: string) => {
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          return `rgba(${r}, ${g}, ${b}, 0.05)`;
        };
        return (
          <div 
            className="absolute inset-0"
            style={{ backgroundColor: hexToRgbaWithLowOpacity(themeAccentColor.value) }}
          ></div>
        );
      case BACKGROUND_EFFECTS.PLAIN_BACKGROUND:
        return <PlainBackground accentColorValue={themeAccentColor.value} />;
      default:
        return (
          <div className="absolute inset-0 bg-red-500/20">
            Unknown effect: {currentEffect}
          </div>
        );
    }
  };

  return (
    <div
      ref={launcherRef}
      className="h-screen w-full border-2 overflow-hidden relative flex backdrop-blur-[18px] bg-black/30 shadow-[0_20px_80px_rgba(0,0,0,0.65)]"
      style={{
        backgroundColor: backgroundColor,
        backgroundImage: `
          radial-gradient(circle at 18% 20%, ${hexToRgba(themeAccentColor.value, 0.18)}, transparent 62%),
          radial-gradient(circle at 82% 8%, ${hexToRgba(accentLight, 0.14)}, transparent 55%),
          linear-gradient(135deg, rgba(0, 20, 12, 0.92), rgba(0, 8, 5, 0.94) 60%, rgba(0, 0, 0, 0.95))
        `,
        backgroundBlendMode: "screen, screen, normal",
        backgroundSize: "160% 160%, 140% 140%, 100% 100%",
        backgroundPosition: "0% 0%, 100% 0%, center",
        borderColor: `${themeAccentColor.value}40`,
        boxShadow: `0 0 55px ${hexToRgba(themeAccentColor.value, 0.28)}, inset 0 0 35px ${hexToRgba(accentDark, 0.22)}`,
        transition: "background 0.6s ease, box-shadow 0.6s ease, border-color 0.6s ease",
      }}
    >
      <div
        ref={backgroundPatternRef}
        className="absolute inset-0 pointer-events-none opacity-70 mix-blend-screen"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 35%, ${hexToRgba(themeAccentColor.value, 0.2)}, transparent 60%),
            radial-gradient(circle at 75% 15%, ${hexToRgba(accentLight, 0.16)}, transparent 55%),
            repeating-linear-gradient(135deg, transparent 0, transparent 36px, ${hexToRgba(themeAccentColor.value, 0.08)} 36px, ${hexToRgba(themeAccentColor.value, 0.08)} 72px)
          `,
          backgroundSize: "180% 180%, 160% 160%, 96px 96px",
          backgroundPosition: "0% 0%, 100% 0%, 0% 0%",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          boxShadow: `0 0 120px ${hexToRgba(themeAccentColor.value, 0.3)} inset, 0 0 180px ${hexToRgba(themeAccentColor.value, 0.18)}`,
          background: `radial-gradient(circle at 50% 0%, ${hexToRgba(accentLight, 0.15)}, transparent 65%)`,
        }}
      />
      <BorderGlowEffects accentColor={themeAccentColor.value} />

      <VerticalNavbar
        items={navItems}
        activeItem={activeTab}
        onItemClick={onNavChange}
        className="h-full border-r-2 z-10"
        version={appConfig.version}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <HeaderBar
          minimizeRef={minimizeRef}
          maximizeRef={maximizeRef}
          closeRef={closeRef}
        />

        <div className="flex-1 relative overflow-hidden">
          {renderBackgroundEffect()}

          <div className="relative z-10 h-full overflow-hidden custom-scrollbar">
            {children}
          </div>
        </div>
      </div>
      {/* Global Modals Portal */}
      <SocialsModal />
      <ProfileWizardV2Modal />
      <ProfileSettingsModal />
      <ProfileDuplicateModal />
    </div>
  );
}

function BorderGlowEffects({ accentColor }: { accentColor: string }) {
  const accentWithAlpha = (alpha: number) => {
    const sanitized = accentColor.replace('#', '');
    if (sanitized.length !== 6) {
      return `rgba(0, 255, 102, ${alpha})`;
    }

    const bigint = Number.parseInt(sanitized, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  return (
    <>
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: `linear-gradient(to right, transparent, ${accentColor}70, transparent)`,
        }}
      ></div>
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px]"
        style={{
          background: `linear-gradient(to right, transparent, ${accentColor}70, transparent)`,
        }}
      ></div>
      <div
        className="absolute top-0 bottom-0 left-0 w-[2px]"
        style={{
          background: `linear-gradient(to bottom, transparent, ${accentColor}70, transparent)`,
        }}
      ></div>
      <div
        className="absolute top-0 bottom-0 right-0 w-[2px]"
        style={{
          background: `linear-gradient(to bottom, transparent, ${accentColor}70, transparent)`,
        }}
      ></div>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          boxShadow: `0 0 65px ${accentWithAlpha(0.22)} inset, 0 0 120px ${accentWithAlpha(0.18)}`,
        }}
      ></div>
      <div
        className="absolute inset-12 pointer-events-none blur-3xl opacity-40"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${accentWithAlpha(0.3)}, transparent 70%)`,
        }}
      ></div>
    </>
  );
}

interface HeaderBarProps {
  minimizeRef: React.RefObject<HTMLDivElement>;
  maximizeRef: React.RefObject<HTMLDivElement>;
  closeRef: React.RefObject<HTMLDivElement>;
}

function HeaderBar({ minimizeRef, maximizeRef, closeRef }: HeaderBarProps) {
  const accentColor = useThemeStore((state) => state.accentColor);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [availableUpdate, setAvailableUpdate] = useState<UpdateInfo | null>(null);

  const accentWithAlpha = (alpha: number) => {
    const sanitized = accentColor.value.replace('#', '');
    if (sanitized.length !== 6) {
      return `rgba(0, 255, 102, ${alpha})`;
    }

    const bigint = Number.parseInt(sanitized, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const handleUpdateClick = async () => {
    try {
      await toast.promise(
        downloadAndInstallUpdate(),
        {
          loading: 'Downloading and installing update...',
          success: 'Update installed successfully! Application will restart.',
          error: (err) => `Update failed: ${err instanceof Error ? err.message : String(err)}`,
        }
      );
    } catch (error) {
      console.error("Failed to download and install update:", error);
      // Toast error is already handled by the promise toast
    }
  };

  // Calculate complementary/update highlight color based on current accent
  const getUpdateHighlightColor = () => {
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? {
            r: Number.parseInt(result[1], 16),
            g: Number.parseInt(result[2], 16),
            b: Number.parseInt(result[3], 16),
          }
        : { r: 245, g: 158, b: 11 }; // fallback to amber
    };

    const rgb = hexToRgb(accentColor.value);

    // Calculate a complementary warning color
    // Mix current accent with amber/yellow for good visibility
    const accentWeight = 0.4; // How much of the accent color to include
    const warningWeight = 0.9; // How much of the warning color (amber)

    const warningRgb = { r: 245, g: 158, b: 100 }; // Amber base

    const mixedR = Math.round(rgb.r * accentWeight + warningRgb.r * warningWeight);
    const mixedG = Math.round(rgb.g * accentWeight + warningRgb.g * warningWeight);
    const mixedB = Math.round(rgb.b * accentWeight + warningRgb.b * warningWeight);

    return `rgb(${mixedR}, ${mixedG}, ${mixedB})`;
  };

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const fetchedVersion = await ConfigService.getAppVersion();
        setAppVersion(fetchedVersion);
      } catch (error) {
        console.error("Failed to fetch app version:", error);
        setAppVersion("?.?.?");
      }
    };

  const checkForUpdates = async () => {
    try {
      const updateInfo = await checkUpdateAvailable();
      if (updateInfo) {
        console.log("Update available:", updateInfo);
        setAvailableUpdate(updateInfo);
      }
    } catch (error) {
      console.error("Failed to check for updates:", error);
      // Don't show error to user, just silently fail
    }
  };

    fetchVersion();
    checkForUpdates();

    // Check for updates every 4 hours (4 * 60 * 60 * 1000 = 14,400,000 ms)
    const updateCheckInterval = setInterval(() => {
      console.log("Performing scheduled update check...");
      checkForUpdates();
    }, 4 * 60 * 60 * 1000);

    return () => {
      clearInterval(updateCheckInterval);
    };
  }, []);

  return (
    <div
      className="relative h-20 flex-shrink-0 border-b-2 backdrop-blur-xl flex items-center justify-between px-8 z-10 overflow-hidden"
      style={{
        borderColor: `${accentColor.value}55`,
        background: `linear-gradient(135deg, ${accentWithAlpha(0.22)}, rgba(0, 12, 6, 0.85))`,
        boxShadow: `0 12px 40px ${accentWithAlpha(0.16)} inset`,
      }}
      data-tauri-drag-region
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-70"
        style={{
          background: `radial-gradient(circle at 15% 0%, ${accentWithAlpha(0.18)}, transparent 55%)`,
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none mix-blend-screen opacity-30"
        style={{
          backgroundImage: `repeating-linear-gradient(120deg, transparent, transparent 28px, ${accentWithAlpha(0.08)} 28px, ${accentWithAlpha(0.08)} 56px)`,
        }}
      />
      <div className="relative flex items-center gap-4" data-tauri-drag-region>
        <NavigationHistory />

        <div className="flex flex-col items-start -mt-2.5">
          <div className="flex items-center gap-3">
            <h1
              className="font-minecraft text-4xl tracking-wider font-bold lowercase text-shadow"
              data-tauri-drag-region
            >
              noriskclient
            </h1>
            {availableUpdate && (
              <Tooltip content={`Click to update: ${availableUpdate.version}`}>
                <div className="cursor-pointer mt-2.5" onClick={handleUpdateClick}>
                  <Icon
                    icon="solar:download-minimalistic-bold"
                    className="w-6 h-6 transition-colors"
                    style={{
                      color: accentColor.value,
                    }}
                  />
                </div>
              </Tooltip>
            )}
          </div>
          <span className="text-white/70 font-minecraft-ten text-[8px] font-normal -mt-2.5">
            v{appVersion || "?.?.?"}
          </span>
        </div>
      </div>

      <div className="relative flex items-center gap-4">
        <UserProfileBar />

        <WindowControls
          minimizeRef={minimizeRef}
          maximizeRef={maximizeRef}
          closeRef={closeRef}
        />
      </div>
    </div>
  );
}

interface WindowControlsProps {
  minimizeRef: React.RefObject<HTMLDivElement>;
  maximizeRef: React.RefObject<HTMLDivElement>;
  closeRef: React.RefObject<HTMLDivElement>;
}

function WindowControls({
  minimizeRef,
  maximizeRef,
  closeRef,
}: WindowControlsProps) {
  const accentColor = useThemeStore((state) => state.accentColor);

  const accentWithAlpha = (alpha: number) => {
    const sanitized = accentColor.value.replace('#', '');
    if (sanitized.length !== 6) {
      return `rgba(0, 255, 102, ${alpha})`;
    }

    const bigint = Number.parseInt(sanitized, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  return (
    <div className="flex items-center gap-3 ml-4">
      <div
        ref={minimizeRef}
        className="titlebar-button-borderless group relative w-6 h-6 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer rounded-md overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${accentWithAlpha(0.18)}, rgba(0, 12, 6, 0.6))`,
          border: `1px solid ${accentWithAlpha(0.22)}`,
          boxShadow: `0 6px 16px ${accentWithAlpha(0.18)}`,
        }}
        title="Minimize"
      >
        <span
          className="absolute inset-0 opacity-0 group-hover:opacity-40 transition-opacity"
          style={{ background: `radial-gradient(circle at 50% 0%, ${accentWithAlpha(0.6)}, transparent 70%)` }}
        />
        <Icon icon="pixel:minus-solid" className="w-4 h-4" />
      </div>
      <div
        ref={maximizeRef}
        className="titlebar-button-borderless group relative w-6 h-6 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer rounded-md overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${accentWithAlpha(0.2)}, rgba(0, 12, 6, 0.62))`,
          border: `1px solid ${accentWithAlpha(0.25)}`,
          boxShadow: `0 6px 16px ${accentWithAlpha(0.2)}`,
        }}
        title="Maximize"
      >
        <span
          className="absolute inset-0 opacity-0 group-hover:opacity-45 transition-opacity"
          style={{ background: `radial-gradient(circle at 50% 0%, ${accentWithAlpha(0.6)}, transparent 70%)` }}
        />
        <Icon icon="pixel:expand-solid" className="w-4 h-4" />
      </div>
      <div
        ref={closeRef}
        className="titlebar-button-borderless group relative w-6 h-6 flex items-center justify-center text-white/70 hover:text-red-400 transition-colors cursor-pointer rounded-md overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${accentWithAlpha(0.14)}, rgba(30, 4, 4, 0.8))`,
          border: `1px solid ${accentWithAlpha(0.18)}`,
          boxShadow: `0 6px 16px ${accentWithAlpha(0.16)}`,
        }}
        title="Close"
      >
        <span
          className="absolute inset-0 opacity-0 group-hover:opacity-45 transition-opacity"
          style={{ background: `radial-gradient(circle at 50% 0%, rgba(255, 70, 70, 0.5), transparent 70%)` }}
        />
        <Icon icon="pixel:window-close-solid" className="w-4 h-4" />
      </div>
    </div>
  );
}
