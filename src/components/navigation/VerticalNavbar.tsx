"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import { Logo } from "../ui/Logo";
import { NavButton } from "../ui/nav/NavButton";
import { NavTooltip } from "../ui/nav/NavTooltip";
import { CreditsModal } from "../modals/CreditsModal";
import * as ConfigService from "../../services/launcher-config-service";
import { useThemeStore } from "../../store/useThemeStore";
import { createPortal } from "react-dom";

interface NavItem {
  id: string;
  icon: string;
  label: string;
  action?: () => void;
}

interface VerticalNavbarProps {
  className?: string;
  items: NavItem[];
  activeItem?: string;
  onItemClick?: (id: string) => void;
  version?: string;
}

export function VerticalNavbar({
  className,
  items,
  activeItem,
  onItemClick,
  version = "v0.5.22",
}: VerticalNavbarProps) {
  const [active, setActive] = useState(activeItem || items[0]?.id);
  const navRef = useRef<HTMLDivElement>(null);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [appVersion, setAppVersion] = useState<string | null>(null);
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
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [isMounted, setIsMounted] = useState(false);
  const [showCreditsModal, setShowCreditsModal] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    if (activeItem) {
      setActive(activeItem);
    }
  }, [activeItem]);

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const fetchedVersion = await ConfigService.getAppVersion();
        setAppVersion(`v${fetchedVersion}`);
      } catch (error) {
        console.error("Failed to fetch app version:", error);
        setAppVersion("v?.?.?");
      }
    };
    fetchVersion();
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set(".nav-item", { opacity: 0, x: -20 });

      gsap.to(".nav-item", {
        opacity: 1,
        x: 0,
        stagger: 0.05,
        duration: 0.4,
        ease: "power2.out",
        onComplete: () => {
          gsap.set(".nav-item", { clearProps: "all" });
        },
      });
    }, navRef);

    return () => ctx.revert();
  }, []);

  const handleItemClick = (id: string) => {
    setActive(id);
    if (onItemClick) {
      onItemClick(id);
    }
  };

  const handleMouseEnter = (id: string) => {
    const buttonElement = buttonRefs.current[id];
    if (buttonElement) {
      const rect = buttonElement.getBoundingClientRect();
      setTooltipPosition({
        top: rect.top + rect.height / 2,
        left: rect.right + 12,
      });
    }

    setShowTooltip(id);
    if (tooltipRef.current) {
      gsap.fromTo(
        tooltipRef.current,
        { opacity: 0, x: -10 },
        { opacity: 1, x: 0, duration: 0.3, ease: "power2.out" },
      );
    }
  };

  const handleMouseLeave = () => {
    setShowTooltip(null);
  };

  return (
    <>
      <div
        ref={navRef}
        className={cn(
          "relative flex flex-col items-center py-6 w-24 backdrop-blur-2xl overflow-hidden",
          className,
        )}
        style={{
          background: `linear-gradient(180deg, ${accentWithAlpha(0.32)} 0%, rgba(0, 12, 6, 0.85) 70%)`,
          borderRight: `2px solid ${accentWithAlpha(0.4)}`,
          borderLeft: `2px solid ${accentWithAlpha(0.18)}`,
          boxShadow: `inset 0 0 26px ${accentWithAlpha(0.28)}, 0 0 38px ${accentWithAlpha(0.28)}`,
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-45 mix-blend-screen"
          style={{
            backgroundImage: `
              radial-gradient(circle at 50% 0%, ${accentWithAlpha(0.4)}, transparent 55%),
              repeating-linear-gradient(180deg, transparent, transparent 28px, ${accentWithAlpha(0.08)} 28px, ${accentWithAlpha(0.08)} 56px)
            `,
          }}
        />
        <div className="mb-12 relative z-10">
          <Logo size="sm" onClick={() => setShowCreditsModal(true)} />
        </div>

        <div className="flex-1 flex flex-col items-center space-y-4 min-h-[400px] relative z-10">
          {items.map((item) => (
            <div
              key={item.id}
              className="relative group nav-item"
              ref={(el) => (buttonRefs.current[item.id] = el)}
            >
              <NavButton
                icon={<Icon icon={item.icon} className="w-8 h-8" />}
                isActive={active === item.id}
                onClick={() => handleItemClick(item.id)}
                onMouseEnter={() => handleMouseEnter(item.id)}
                onMouseLeave={handleMouseLeave}
                aria-label={item.label}
              />
            </div>
          ))}
        </div>

        <div className="relative z-10 mt-10 text-[10px] font-minecraft-ten tracking-[0.6em] uppercase text-white/50">
          {appVersion ?? version}
        </div>
      </div>
      {isMounted &&
        showTooltip &&
        document.body &&
        createPortal(
          <div
            className="fixed pointer-events-none"
            style={{
              top: `${tooltipPosition.top}px`,
              left: `${tooltipPosition.left}px`,
              zIndex: 9999,
              transform: "translateY(-50%)",
            }}
          >
            <NavTooltip ref={tooltipRef}>
              {items.find((item) => item.id === showTooltip)?.label}
            </NavTooltip>
          </div>,
          document.body,
        )}

      <CreditsModal
        isOpen={showCreditsModal}
        onClose={() => setShowCreditsModal(false)}
      />
    </>
  );
}
