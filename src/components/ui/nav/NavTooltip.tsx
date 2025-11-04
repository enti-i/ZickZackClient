"use client";

import type React from "react";
import { forwardRef } from "react";
import { cn } from "../../../lib/utils";
import { useThemeStore } from "../../../store/useThemeStore";

interface NavTooltipProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "ghost";
}

export const NavTooltip = forwardRef<HTMLDivElement, NavTooltipProps>(
  ({ className, children, variant = "default", ...props }, ref) => {
    const accentColor = useThemeStore((state) => state.accentColor);

    const getVariantColors = () => {
      switch (variant) {
        case "secondary":
          return {
            main: "#6b7280",
            light: "#9ca3af",
            dark: "#4b5563",
            text: "#f3f4f6",
          };
        case "ghost":
          return {
            main: "transparent",
            light: "transparent",
            dark: "transparent",
            text: "#dfffe9",
          };
        default:
          return {
            main: accentColor.value,
            light: accentColor.hoverValue,
            dark: accentColor.value,
            text: "#dfffe9",
          };
      }
    };

    const colors = getVariantColors();

    return (
      <div
        ref={ref}
        className={cn(
          "font-minecraft relative overflow-hidden backdrop-blur-md",
          "px-4 py-2 rounded-md text-white whitespace-nowrap",
          "text-shadow-sm text-2xl lowercase",
          "border-2 shadow-[0_4px_0_rgba(0,45,25,0.35),0_6px_10px_rgba(0,32,20,0.45)]",
          className,
        )}
        style={{
          backgroundColor:
            variant === "ghost" ? "transparent" : `${colors.main}30`,
          borderColor: variant === "ghost" ? "transparent" : `${colors.main}80`,
          borderBottomColor: variant === "ghost" ? "transparent" : colors.dark,
          boxShadow:
            variant === "ghost"
              ? "none"
              : `0 4px 0 rgba(0, 35, 20, 0.45), 0 6px 10px rgba(0, 45, 25, 0.5), inset 0 1px 0 ${colors.light}40, inset 0 0 0 1px ${colors.main}20`,
          color: colors.text,
        }}
        {...props}
      >
        <span className="absolute inset-0 opacity-20 bg-gradient-radial from-[rgba(var(--accent-rgb),0.18)] via-transparent to-transparent" />
        <span className="relative z-10">{children}</span>
      </div>
    );
  },
);

NavTooltip.displayName = "NavTooltip";
