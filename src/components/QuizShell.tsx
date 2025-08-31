// src/components/QuizShell.tsx
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState, useMemo } from "react";
import {
  Menu,
  Home,
  LayoutDashboard,
  FilePlus2,
  BarChart2,
  HelpCircle,
  LogOut,
  UserRound,
} from "lucide-react";
import { signOut } from "next-auth/react";

type Props = {
  pageTitle?: string;
  sectionTitleTop?: string;
  sectionTitleBottom?: string;
  children: React.ReactNode;
};

export default function QuizShell({
  pageTitle = "",
  sectionTitleTop = "Clerkship",
  sectionTitleBottom = "Year 4 QBank",
  children,
}: Props) {
  const [open, setOpen] = useState(true);
  const pathname = usePathname();

  const nav = useMemo(
    () => [
      { href: "/year4", label: "Dashboard", icon: LayoutDashboard },
      { href: "/quiz/new", label: "Create Test", icon: FilePlus2 },
      { href: "/performance", label: "Performance", icon: BarChart2 },
      { href: "/help", label: "Help", icon: HelpCircle },
      { href: "/", label: "Home", icon: Home },
    ],
    []
  );

  const SIDE_W = open ? 260 : 0;

  return (
    <div className="min-h-dvh">
      {/* Top bar */}
      <header className="fixed inset-x-0 top-0 h-14 z-40 border-b bg-[var(--bg)]/90 backdrop-blur">
        <div className="max-w-screen-2xl mx-auto h-full flex items-center gap-3 px-4">
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            className="p-2 rounded-md hover:bg-black/5"
          >
            <Menu className="size-5" />
          </button>

          <div className="text-lg font-semibold truncate">{pageTitle}</div>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/account"
              className="p-2 rounded-full hover:bg-black/5"
              title="My Account"
            >
              <UserRound className="size-5" />
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="p-2 rounded-full hover:bg-black/5"
              title="Log out"
            >
              <LogOut className="size-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className="fixed left-0 top-0 h-dvh z-30 border-r bg-[var(--panel)] transition-[width] duration-200 ease-out overflow-hidden"
        style={{ width: SIDE_W }}
      >
        <div className="px-5 pt-4 pb-5 border-b bg-[var(--panel-strong)]">
          <div className="text-sm font-semibold tracking-wide opacity-80">
            {sectionTitleTop}
          </div>
          <div className="text-base font-bold">{sectionTitleBottom}</div>
        </div>

        <nav className="p-3 space-y-2">
          {nav.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                  active
                    ? "bg-[var(--brand-10)] text-[var(--brand-80)]"
                    : "hover:bg-black/5",
                ].join(" ")}
              >
                <Icon className="size-5 shrink-0" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Page content */}
      <div
        className="pt-14"
        style={{
          marginLeft: SIDE_W,
          transition: "margin-left .2s ease",
        }}
      >
        <div className="max-w-screen-2xl mx-auto px-6 py-6">{children}</div>
      </div>
    </div>
  );
}
