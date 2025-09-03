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
  { key: "dashboard",  label: "Dashboard",       href: "/year4",                 icon: "Dashboard" },
  { key: "performance",label: "Performance",     href: "/year4/performance",     icon: "Performance" },
  { key: "create",     label: "Create Test",     href: "/year4/create-test",     icon: "Create" },
  { key: "previous",   label: "Previous Tests",  href: "/year4/previous-tests",  icon: "Tests" },
  { key: "schedule",   label: "Schedule",        href: "/year4/schedule",        icon: "Calendar" },
  { key: "help",       label: "Help",            href: "/year4/help",            icon: "Help" },
  { key: "reset",      label: "Reset",           href: "/year4/reset",           icon: "Reset" },
];

export default function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
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
  const items: SidebarItem[] = [...baseItems];

  return (
    <aside
      className={clsx(
        "fixed left-0 top-0 bottom-0 z-40 border-r border-[#E6F0F7] bg-white",
        "transition-all duration-400 ease-in-out overflow-hidden",
        width
      )}
    >
      {/* Header */}
      <div className="flex items-center h-14 px-3">
        <button
          onClick={() => {
            onToggle();
            try {
              const next = !collapsed;
              localStorage.setItem("sidebar-collapsed", next ? "1" : "0");
            } catch {}
          }}
          aria-label="Toggle sidebar"
          className="p-2 rounded hover:bg-[#F3F9FC] text-[#3B82A0]"
        >
          <Icon.Hamburger />
        </button>

        {/* Brand */}
        <div
          className="ml-2 overflow-hidden transition-all duration-400 ease-in-out"
          style={{
            maxWidth: collapsed ? 0 : 220,
            opacity: collapsed ? 0 : 1,
            transform: collapsed ? "translateX(-6px)" : "translateX(0)",
            willChange: "max-width, opacity, transform",
          }}
          aria-hidden={collapsed}
        >
          <div className="text-3xl font-black tracking-tight text-[#56A2CD] select-none">Clerkship</div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="mt-4 space-y-1 px-2">
        {items.map((it) => {
          const ActiveIcon = Icon[it.icon];
          const active = pathname === it.href;
          return (
            <button
              key={it.key}
              onClick={() => router.push(it.href)}
              className={clsx(
                "group w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors duration-200",
                active
                  ? "bg-[#F3F9FC] text-[#2F6F8F] font-semibold"
                  : "text-slate-700 hover:bg-[#F3F9FC]"
              )}
            >
              <ActiveIcon className={clsx("shrink-0", active ? "text-[#2F6F8F]" : "text-[#3B82A0]")} />
              <span
                className="overflow-hidden transition-all duration-400 ease-in-out"
                style={{
                  maxWidth: collapsed ? 0 : 999,
                  opacity: collapsed ? 0 : 1,
                  transform: collapsed ? "translateX(-6px)" : "translateX(0)",
                  willChange: "max-width, opacity, transform",
                }}
              >
                <span className="inline-block truncate align-middle">{it.label}</span>
              </span>
            </button>
          );
        })}

        {/* Admin Settings (role-gated) */}
        {(role === "ADMIN" || role === "MASTER_ADMIN") && (
          <button
            onClick={() => router.push("/year4/admin")}
            className="group w-full mt-2 flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors duration-200 text-slate-700 hover:bg-[#F3F9FC]"
          >
            <Icon.Settings className="text-[#3B82A0]" />
            <span
              className="overflow-hidden transition-all duration-400 ease-in-out"
              style={{
                maxWidth: collapsed ? 0 : 999,
                opacity: collapsed ? 0 : 1,
                transform: collapsed ? "translateX(-6px)" : "translateX(0)",
              }}
            >
              Year 4 Admin Settings
            </span>
          </button>
        )}
      </nav>

      {/* Bottom Home */}
      <div className="absolute bottom-3 left-0 right-0 px-2">
        <button
          onClick={() => router.push("/years")}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors duration-200 text-slate-700 hover:bg-[#F3F9FC]"
        >
          <Icon.Home className="text-[#3B82A0]" />
          <span
            className="overflow-hidden transition-all duration-400 ease-in-out"
            style={{
              maxWidth: collapsed ? 0 : 999,
              opacity: collapsed ? 0 : 1,
              transform: collapsed ? "translateX(-6px)" : "translateX(0)",
            }}
          >
            Home
          </span>
        </button>
      </div>
    </aside>
  );
}