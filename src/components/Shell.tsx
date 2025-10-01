// src/components/Shell.tsx
"use client";

import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import TopRightBar from "./TopRightBar";

export default function Shell({
  title,
  pageName,
  children,
}: {
  title: string;
  pageName?: string;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      // On mobile, default to collapsed
      const isMobile = window.innerWidth < 768;
      const saved = localStorage.getItem("sidebar-collapsed");
      return saved ? saved === "1" : isMobile;
    } catch {
      return false;
    }
  });

  const handleToggleSidebar = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    try {
      localStorage.setItem("sidebar-collapsed", newState ? "1" : "0");
    } catch {}
  };

  useEffect(() => {
    try {
      const path = window.location.pathname;
      if (!path.startsWith("/profile")) {
        localStorage.setItem("last-page", path);
      }
    } catch {}

    // Add window resize listener for mobile responsiveness
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      if (isMobile && !collapsed) {
        setCollapsed(true);
        localStorage.setItem("sidebar-collapsed", "1");
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [collapsed]);

  const leftPad = collapsed ? 64 : 288; // px
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="min-h-screen gradient-background-subtle overflow-x-hidden">
      {/* Mobile overlay */}
      {isMobile && !collapsed && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30"
          onClick={() => setCollapsed(true)}
        />
      )}
      
      <Sidebar collapsed={collapsed} toggleSidebarAction={handleToggleSidebar} isMobile={isMobile} />

      {/* Enhanced Top row: icons and page title */}
      <div
        className="h-16 transition-[padding] duration-400 ease-in-out flex justify-between items-center bg-white/50 backdrop-blur-md shadow-sm"
        style={{ paddingLeft: isMobile ? 16 : leftPad }}
      >
        {/* Page title on the left */}
        {pageName && (
          <div className="flex items-center ml-6">
            <div className="w-1 h-8 bg-gradient-to-b from-[#2F6F8F] to-[#56A2CD] rounded-full mr-3"></div>
            <span className="font-extrabold tracking-tight text-3xl bg-gradient-to-r from-[#2F6F8F] to-[#56A2CD] bg-clip-text text-transparent">
              {pageName}
            </span>
          </div>
        )}
        
        {/* Top right icons */}
        <TopRightBar mode="inline" />
      </div>

      {/* Enhanced Content area */}
      <main
        className="pb-10 transition-[padding] duration-400 ease-in-out overflow-x-hidden"
        style={{ paddingLeft: isMobile ? 16 : leftPad }}
      >
        {/* Enhanced Subtitle/title bar */}
        <div className="px-6 py-4 bg-gradient-to-r from-white/80 to-[#F8FCFF]/80 backdrop-blur border-b border-[#E6F0F7]">
          <div className="text-xl font-semibold text-[#2F6F8F] flex items-center">
            <div className="w-0.5 h-6 bg-[#56A2CD] rounded-full mr-3"></div>
            {title}
          </div>
        </div>

        {/* Enhanced main content container */}
        <div
          className="mx-auto px-6 pt-8"
          style={{ maxWidth: 1200, width: "100%" }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
