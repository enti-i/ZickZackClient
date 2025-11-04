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
            text: "#ffffff",
          };
        default:
          return {
            main: accentColor.value,
            light: accentColor.hoverValue,
            dark: accentColor.value,
            text: "#ffffff",
          };
      }
    };

    const colors = getVariantColors();

    return (
      <div
        ref={ref}
        className={cn(
          "font-minecraft relative overflow-hidden backdrop-blur-lg",
          "px-4 py-2 rounded-md text-white whitespace-nowrap",
          "text-shadow-sm text-2xl lowercase",
          "border-2 shadow-[0_4px_0_rgba(0,0,0,0.2),0_6px_10px_rgba(0,0,0,0.25)]",
          className,
        )}
        style={{
          background:
            variant === "ghost"
              ? "transparent"
              : `linear-gradient(135deg, ${accentWithAlpha(0.25)}, ${colors.main}cc)`,
          borderColor: variant === "ghost" ? "transparent" : `${colors.main}a0`,
          borderBottomColor: variant === "ghost" ? "transparent" : colors.dark,
          boxShadow:
            variant === "ghost"
              ? "none"
              : `0 0 24px ${colors.main}55, 0 12px 24px rgba(0,0,0,0.4), inset 0 1px 0 ${colors.light}55`,
          color: colors.text,
        }}
        {...props}
      >
        <span className="absolute inset-0 opacity-30 bg-gradient-radial from-white/25 via-transparent to-transparent" />
        <span
          className="absolute inset-0 opacity-30 mix-blend-screen"
          style={{
            background: `radial-gradient(circle at 50% 0%, ${accentWithAlpha(0.4)}, transparent 65%)`,
          }}
        />
        <span className="relative z-10">{children}</span>
      </div>
    );
  },
);

NavTooltip.displayName = "NavTooltip";
