// src/components/Sidebar.tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "./Icons";
import SimpleHamburger from "./SimpleHamburger";
import { getSelectedGradientClasses, getGradientTextClasses, getThemeGlow } from "@/utils/gradients";
import clsx from "clsx";

export type SidebarItem = {
  key: string;
  label: string;
  href: string;
  icon: keyof typeof Icon;
};

export default function Sidebar({
  collapsed,
  toggleSidebarAction,
  isMobile = false,
}: {
  collapsed: boolean;
  toggleSidebarAction: () => void;
  isMobile?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<"MEMBER" | "ADMIN" | "MASTER_ADMIN" | "WEBSITE_CREATOR" | "">("");

  // Detect which year we're in based on the URL
  const currentYear = pathname?.startsWith('/year5') ? 'year5' : 'year4';
  const yearLabel = currentYear === 'year5' ? 'Year 5' : 'Year 4';

  useEffect(() => {
    fetch("/api/me/role", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setRole(j?.role ?? ""))
      .catch(() => {});
  }, []);

  const widthPx = collapsed ? 64 : 288;
  const zIndex = isMobile ? "z-50" : "z-40"; // Higher z-index on mobile for overlay
  
  // Dynamic items based on current year
  const items: SidebarItem[] = [
    { key: "dashboard",     label: "Dashboard",       href: `/${currentYear}`,                 icon: "Dashboard" },
    { key: "performance",   label: "Performance",     href: `/${currentYear}/performance`,     icon: "Performance" },
    { key: "create",        label: "Create Test",     href: `/${currentYear}/create-test`,     icon: "Create" },
    { key: "previous",      label: "Previous Tests",  href: `/${currentYear}/previous-tests`,  icon: "Tests" },
    { key: "schedule",      label: "Schedule",        href: `/${currentYear}/schedule`,        icon: "Calendar" },
    { key: "notifications", label: "Notifications",   href: "/notifications",                  icon: "Bell" },
    { key: "help",          label: "Help",            href: `/${currentYear}/help`,            icon: "Help" },
    { key: "reset",         label: "Reset",           href: `/${currentYear}/reset`,           icon: "Reset" },
  ];

  return (
    <>
      <aside
        className={clsx(
          "fixed left-0 top-0 bottom-0 sidebar-smooth-width",
          zIndex
        )}
        style={{
          backgroundColor: 'transparent', 
          background: 'transparent',
          width: `${widthPx}px`
        }}
      >
      {/* Brand Header */}
      <div className="flex items-center h-16 px-3" style={{backgroundColor: 'transparent'}}>
        <SimpleHamburger 
          onClick={toggleSidebarAction}
        />

        {/* Brand */}
        <div className={clsx("sidebar-brand-container ml-1 sidebar-brand", collapsed ? "sidebar-brand-collapsed" : "sidebar-brand-expanded")}>
          <div className="flex items-baseline gap-2 whitespace-nowrap">
            <div className={`brand-title select-none text-4xl font-extrabold tracking-tight ${getGradientTextClasses()}`}>Clerkship</div>
            <div className={`brand-title select-none text-sm font-bold tracking-tight ${getGradientTextClasses()} opacity-90`}>{yearLabel}</div>
          </div>
        </div>
      </div>
      
      {/* Separating line between brand and navigation */}
      <div className="border-b border-border mx-3"></div>

      {/* Enhanced Nav items */}
      <nav className="mt-4 space-y-2 px-3">
        {items.map((it) => {
          const ActiveIcon = Icon[it.icon];
          const active = pathname === it.href;
          return (
            <button
              key={it.key}
              onClick={() => router.push(it.href)}
              className={clsx(
                "group w-full flex items-center justify-start rounded-xl text-left px-2 py-2.5 gap-2 transition-all duration-300 ease-out btn-hover",
                active
                  ? `${getSelectedGradientClasses()} shadow-lg`
                  : "text-primary hover:shadow-md"
              )}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.boxShadow = getThemeGlow();
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              <ActiveIcon className={clsx(
                "shrink-0 w-6 h-6 transition-colors duration-300",
                active ? "text-inverse" : "text-primary/70 group-hover:text-primary"
              )} />
              <span className={clsx(
                "font-medium text-lg whitespace-nowrap sidebar-text",
                collapsed ? "sidebar-text-collapsed" : "sidebar-text-expanded"
              )}>
                {it.label}
              </span>
            </button>
          );
        })}

        {/* Admin Settings (role-gated) - Only for ADMIN role, not MASTER_ADMIN */}
        {role === "ADMIN" && (
          <button
            onClick={() => router.push(`/${currentYear}/admin`)}
            className="group w-full flex items-center rounded-xl text-left text-primary px-2 py-2.5 gap-2 transition-all duration-300 ease-out transform hover:scale-[1.02] hover:shadow-md"
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = getThemeGlow();
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <Icon.Settings className="text-primary/70 group-hover:text-primary shrink-0 w-6 h-6 transition-colors duration-300" />
            <span className={clsx(
              "text-lg whitespace-nowrap sidebar-text",
              collapsed ? "sidebar-text-collapsed" : "sidebar-text-expanded"
            )}>
              {yearLabel} Admin Settings
            </span>
          </button>
        )}

        {/* Master Admin Settings (only for WEBSITE_CREATOR and MASTER_ADMIN) */}
        {(role === "WEBSITE_CREATOR" || role === "MASTER_ADMIN") && (
          <button
            onClick={() => router.push(`/${currentYear}/master-admin`)}
            className="group w-full flex items-center rounded-xl text-left text-primary px-2 py-2.5 gap-2 transition-all duration-300 ease-out transform hover:scale-[1.02] hover:shadow-md"
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = getThemeGlow();
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <Icon.Settings className="text-primary/70 group-hover:text-primary shrink-0 w-6 h-6 transition-colors duration-300" />
            <span className={clsx(
              "text-lg whitespace-nowrap sidebar-text",
              collapsed ? "sidebar-text-collapsed" : "sidebar-text-expanded"
            )}>
              Master Admin
            </span>
          </button>
        )}
      </nav>
      </aside>
      {/* Vertical separator line */}
      <div 
        className={clsx(
          "fixed top-0 bottom-0 border-r border-border",
          zIndex
        )}
        style={{
          left: `${widthPx}px`,
          transition: 'left 300ms ease-in-out'
        }}
      ></div>
    </>
  );
}
