// src/components/Sidebar.tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "./Icons";
import clsx from "clsx";

export type SidebarItem = {
  key: string;
  label: string;
  href: string;
  icon: keyof typeof Icon;
};

const baseItems: SidebarItem[] = [
  { key: "dashboard",     label: "Dashboard",       href: "/year4",                 icon: "Dashboard" },
  { key: "performance",   label: "Performance",     href: "/year4/performance",     icon: "Performance" },
  { key: "create",        label: "Create Test",     href: "/year4/create-test",     icon: "Create" },
  { key: "previous",      label: "Previous Tests",  href: "/year4/previous-tests",  icon: "Tests" },
  { key: "schedule",      label: "Schedule",        href: "/year4/schedule",        icon: "Calendar" },
  { key: "notifications", label: "Notifications",   href: "/notifications",         icon: "Bell" },
  { key: "help",          label: "Help",            href: "/year4/help",            icon: "Help" },
  { key: "reset",         label: "Reset",           href: "/year4/reset",           icon: "Reset" },
];

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
  const [role, setRole] = useState<"MEMBER" | "ADMIN" | "MASTER_ADMIN" | "">("");

  useEffect(() => {
    fetch("/api/me/role", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setRole(j?.role ?? ""))
      .catch(() => {});
  }, []);

  const width = collapsed ? "w-16" : "w-72";
  const zIndex = isMobile ? "z-50" : "z-40"; // Higher z-index on mobile for overlay
  const items: SidebarItem[] = [...baseItems];

  return (
    <aside
      className={clsx(
        "fixed left-0 top-0 bottom-0 border-r border-[#E6F0F7] bg-gradient-to-b from-white/95 to-[#F8FCFF]/95 backdrop-blur-md",
        "transition-all duration-300 ease-in-out overflow-hidden shadow-xl",
        width,
        zIndex
      )}
    >
      {/* Enhanced Header */}
      <div className="flex items-center h-16 px-3 border-b border-[#E6F0F7] bg-gradient-to-r from-[#F8FCFF] to-white">
        <button
          onClick={toggleSidebarAction}
          aria-label="Toggle sidebar"
          className="group relative p-2 rounded-full hover:bg-[#2F6F8F] focus:outline-none shrink-0 transition-all duration-200 transform hover:scale-105"
        >
          <Icon.Hamburger className="text-[#2F6F8F] group-hover:text-white w-6 h-6" />
        </button>

        {/* Brand */}
        <div className={clsx("ml-1 transition-opacity duration-300", collapsed ? "opacity-0" : "opacity-100")}>
          <div className="brand-title select-none text-4xl font-bold tracking-tight transform -translate-y-0.5">Clerkship</div>
        </div>
      </div>

      {/* Enhanced Nav items */}
      <nav className="mt-4 space-y-1 px-3">
        {items.map((it) => {
          const ActiveIcon = Icon[it.icon];
          const active = pathname === it.href;
          return (
            <button
              key={it.key}
              onClick={() => router.push(it.href)}
              className={clsx(
                "group w-full flex items-center justify-start rounded-xl text-left px-2 py-2.5 gap-2 transition-all duration-200 ease-out btn-hover",
                active
                  ? "bg-gradient-to-r from-[#2F6F8F] to-[#56A2CD] text-white shadow-lg"
                  : "text-[#2F6F8F] hover:bg-gradient-to-r hover:from-[#A5CDE4]/20 hover:to-[#56A2CD]/10"
              )}
            >
              <ActiveIcon className={clsx(
                "shrink-0 w-6 h-6 transition-colors duration-200",
                active ? "text-white" : "text-[#56A2CD] group-hover:text-[#2F6F8F]"
              )} />
              <span className={clsx(
                "font-medium text-lg whitespace-nowrap transition-opacity duration-300",
                collapsed ? "opacity-0" : "opacity-100"
              )}>
                {it.label}
              </span>
            </button>
          );
        })}

        {/* Admin Settings (role-gated) - Only for ADMIN role, not MASTER_ADMIN */}
        {role === "ADMIN" && (
          <button
            onClick={() => router.push("/year4/admin")}
            className="group w-full flex items-center rounded-xl text-left text-[#2F6F8F] hover:bg-gradient-to-r hover:from-[#A5CDE4]/20 hover:to-[#56A2CD]/10 px-2 py-2.5 gap-2 transition-all duration-200 ease-out transform hover:scale-[1.02] hover:shadow-md"
          >
            <Icon.Settings className="text-[#56A2CD] shrink-0 w-6 h-6" />
            <span className={clsx(
              "text-lg whitespace-nowrap transition-opacity duration-300",
              collapsed ? "opacity-0" : "opacity-100"
            )}>
              Year 4 Admin Settings
            </span>
          </button>
        )}

        {/* Master Admin Settings (only for MASTER_ADMIN) */}
        {role === "MASTER_ADMIN" && (
          <button
            onClick={() => router.push("/year4/master-admin")}
            className="group w-full flex items-center rounded-xl text-left text-[#2F6F8F] hover:bg-gradient-to-r hover:from-[#A5CDE4]/20 hover:to-[#56A2CD]/10 px-2 py-2.5 gap-2 transition-all duration-200 ease-out transform hover:scale-[1.02] hover:shadow-md"
          >
            <Icon.Settings className="text-[#56A2CD] shrink-0 w-6 h-6" />
            <span className={clsx(
              "text-lg whitespace-nowrap transition-opacity duration-300",
              collapsed ? "opacity-0" : "opacity-100"
            )}>
              Master Admin
            </span>
          </button>
        )}
      </nav>

      {/* Bottom Home */}
      <div className="absolute bottom-3 left-0 right-0 px-3">
        <button
          onClick={() => router.push("/years")}
          className={clsx(
            "group w-full flex items-center rounded-xl text-left px-2 py-2.5 gap-2 transition-all duration-200 ease-out btn-hover",
            pathname === "/years"
              ? "bg-gradient-to-r from-[#2F6F8F] to-[#56A2CD] text-white shadow-lg"
              : "text-[#2F6F8F] hover:bg-gradient-to-r hover:from-[#A5CDE4]/20 hover:to-[#56A2CD]/10"
          )}
        >
          <Icon.Home className={clsx(
            "shrink-0 w-6 h-6", 
            pathname === "/years" ? "text-white" : "text-[#56A2CD] group-hover:text-[#2F6F8F]"
          )} />
          <span className={clsx(
            "font-medium text-lg whitespace-nowrap transition-opacity duration-300",
            collapsed ? "opacity-0" : "opacity-100"
          )}>
            Home
          </span>
        </button>
      </div>
    </aside>
  );
}
