"use client";

import type React from "react";
import { forwardRef, useRef } from "react";
import { cn } from "../../../lib/utils";
import { useThemeStore } from "../../../store/useThemeStore";

interface NavButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  isActive?: boolean;
  variant?: "default" | "secondary" | "ghost";
}

export const NavButton = forwardRef<HTMLButtonElement, NavButtonProps>(
  (
    { className, icon, isActive = false, variant = "default", ...props },
    ref,
  ) => {
    const buttonRef = useRef<HTMLButtonElement>(null);
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

    const getVariantColors = (): {
      main: string;
      light: string;
      dark: string;
      text: string;
      glow: string;
    } => {
      switch (variant) {
        case "secondary":
          return {
            main: "#6b7280",
            light: "#9ca3af",
            dark: "#4b5563",
            text: "#f3f4f6",
            glow: "rgba(107, 114, 128, 0.35)",
          };
        case "ghost":
          return {
            main: "transparent",
            light: "transparent",
            dark: "transparent",
            text: "#ffffff",
            glow: "rgba(255, 255, 255, 0.2)",
          };
        default:
          return {
            main: accentColor.value,
            light: accentColor.light ?? accentWithAlpha(0.65),
            dark: accentColor.dark ?? accentWithAlpha(0.45),
            text: "#ffffff",
            glow: accentColor.shadowValue ?? accentWithAlpha(0.35),
          };
      }
    };

    const colors = getVariantColors();

    const baseClasses = cn(
      "font-minecraft relative overflow-hidden transition-all duration-300",
      "group w-16 h-16 rounded-xl text-white flex items-center justify-center border",
      "text-shadow-sm",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-1 focus-visible:ring-offset-black/20",
    );

    const activeStateClasses = cn(
      variant !== "ghost" && [
        "border-2 border-b-4",
        "shadow-[0_6px_0_rgba(0,0,0,0.25),0_8px_15px_rgba(0,0,0,0.3)]",
        "hover:translate-y-[-2px] hover:shadow-[0_8px_0_rgba(0,0,0,0.2),0_10px_20px_rgba(0,0,0,0.25)]",
        "active:translate-y-[2px] active:shadow-[0_3px_0_rgba(0,0,0,0.15),0_4px_8px_rgba(0,0,0,0.2)]",
      ],
      "hover:brightness-110 active:brightness-90",
    );
    
    const activeStateStyles: React.CSSProperties =
      variant === "ghost"
        ? {}
        : {
            background: `linear-gradient(155deg, ${accentWithAlpha(0.2)}, ${colors.main}cc)`,
            borderColor: `${colors.main}a0`,
            borderTopColor: colors.light,
            borderBottomColor: colors.dark,
            boxShadow: `0 0 24px ${colors.glow}, 0 12px 24px rgba(0,0,0,0.45), inset 0 1px 0 ${colors.light}55`,
            color: colors.text,
          };

    const nonActiveStateClasses = cn(
      variant !== "ghost" && [
        "hover:translate-y-[-2px]",
        "active:translate-y-[1px]",
      ],
      "hover:brightness-110 active:brightness-90",
    );

    const nonActiveStateStyles: React.CSSProperties =
      variant === "ghost"
        ? {}
        : {
            background: `linear-gradient(155deg, ${accentWithAlpha(0.1)}, rgba(0, 12, 6, 0.65))`,
            borderColor: `${colors.main}40`,
            boxShadow: `0 0 16px ${colors.glow}, inset 0 1px 0 rgba(255,255,255,0.05)`,
          };
    if (isActive) {
      Object.assign(nonActiveStateStyles, activeStateStyles);
    } else {
      nonActiveStateStyles.color = `${colors.text}90`;
    }

    return (
      <button
        ref={ref || buttonRef}
        className={cn(
          baseClasses,
          isActive ? activeStateClasses : nonActiveStateClasses,
          className,
        )}
        style={isActive ? activeStateStyles : { ...nonActiveStateStyles, borderColor: nonActiveStateStyles.borderColor ?? "transparent" }}
        {...props}
      >
        <span
          className={cn(
            "absolute inset-0 bg-gradient-radial from-white/30 via-transparent to-transparent",
            isActive
              ? "opacity-30"
              : "opacity-0 transition-opacity duration-300",
          )}
        />
        <span
          className="absolute inset-0 pointer-events-none mix-blend-screen opacity-0 group-hover:opacity-40 transition-opacity"
          style={{
            background: `radial-gradient(circle at 50% 0%, ${accentWithAlpha(0.4)}, transparent 70%)`,
          }}
        />
        <span className="relative z-10 flex items-center justify-center w-8 h-8">
          {icon}
        </span>
      </button>
    );
  },
);

NavButton.displayName = "NavButton";
