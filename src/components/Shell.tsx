// src/components/Shell.tsx
"use client";

import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import TopRightBar from "./TopRightBar";
import { getSelectedGradientClasses, getGradientTextClasses } from "@/utils/gradients";

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
    <div className="h-full min-h-screen bg-white overflow-x-hidden" style={{ minHeight: '100vh' }}>
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
        className="h-16 flex justify-between items-center bg-white/50 backdrop-blur-md"
        style={{ 
          paddingLeft: `${isMobile ? 16 : leftPad}px`,
          transition: 'padding-left 300ms ease-in-out'
        }}
      >
        {/* Page title on the left */}
        {pageName && (
          <div className="flex items-center ml-6">
            <div className={`w-1 h-8 rounded-full mr-3 ${getSelectedGradientClasses()}`}></div>
            <span className={`font-extrabold tracking-tight text-3xl ${getGradientTextClasses()}`}>
              {pageName}
            </span>
          </div>
        )}
        
        {/* Top right icons */}
        <TopRightBar mode="inline" />
      </div>

      {/* Enhanced Content area */}
      <main
        className="pb-10 overflow-x-hidden relative"
        style={{ 
          paddingLeft: `${isMobile ? 16 : leftPad}px`,
          transition: 'padding-left 300ms ease-in-out'
        }}
      >
        {/* Subtitle */}
        <div className="px-6 py-5 relative">
          <div className="text-xl font-semibold flex items-center">
            <div className={`w-1 h-6 rounded-full mr-3 ${getSelectedGradientClasses()}`}></div>
            <span className={getGradientTextClasses()}>{title}</span>
          </div>
          {/* Full-width separator line - matches sidebar vertical line */}
          <div 
            className="absolute right-0 mt-4 border-b border-border"
            style={{ 
              left: 0,
              width: `calc(100vw - ${isMobile ? 16 : leftPad}px)`
            }}
          ></div>
        </div>

        {/* Enhanced main content container */}
        <div style={{ paddingTop: '1.5rem' }}></div>
        <div
          className="mx-auto px-6 pt-8 bg-white"
          style={{ maxWidth: 1200, width: "100%" }}
        >
          <div className="space-y-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
