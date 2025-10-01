// src/components/Icons.tsx
import * as React from "react";

type Props = React.SVGProps<SVGSVGElement>;

export const Icon = {
  Hamburger: (p: Props) => (
    <svg viewBox="0 0 24 24" width="24" height="24" {...p}><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  Dashboard: (p: Props) => (
    <svg viewBox="0 0 24 24" width="24" height="24" {...p}><path d="M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z" stroke="currentColor" fill="none" strokeWidth="2"/></svg>
  ),
  Performance: (p: Props) => (
    <svg viewBox="0 0 24 24" width="24" height="24" {...p}><path d="M3 20h18M6 16l3-3 3 3 6-6" stroke="currentColor" strokeWidth="2" fill="none"/><circle cx="18" cy="8" r="1.5" fill="currentColor"/></svg>
  ),
  Create: (p: Props) => (
    <svg viewBox="0 0 24 24" width="24" height="24" {...p}><path d="M4 20h16M6 4h9l3 3v7a4 4 0 0 1-4 4H6z" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M8 9h6M8 13h4" stroke="currentColor" strokeWidth="2"/></svg>
  ),
  Tests: (p: Props) => (
    <svg viewBox="0 0 24 24" width="24" height="24" {...p}><rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M7 8h10M7 12h10M7 16h6" stroke="currentColor" strokeWidth="2"/></svg>
  ),
  Help: (p: Props) => (
    <svg viewBox="0 0 24 24" width="24" height="24" {...p}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.3-1.5 1.2-1.5 1.7V14" stroke="currentColor" strokeWidth="2" fill="none"/><circle cx="12" cy="17" r="1" fill="currentColor"/></svg>
  ),
  Reset: (p: Props) => (
    <svg viewBox="0 0 24 24" width="24" height="24" {...p}><path d="M3 12a9 9 0 1 0 2.64-6.36L3 7" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M3 3v4h4" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
  ),
  Home: (p: Props) => (
    <svg viewBox="0 0 24 24" width="24" height="24" {...p}><path d="M3 12l9-8 9 8v8a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
  ),
  Theme: (p: Props) => (
    <svg viewBox="0 0 24 24" width="24" height="24" {...p}><path d="M21 12.79A9 9 0 1 1 11.21 3A7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
  ),
  User: (p: Props) => (
    <svg viewBox="0 0 24 24" width="24" height="24" {...p}><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M6 20a6 6 0 1 1 12 0" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
  ),
  Logout: (p: Props) => (
    <svg viewBox="0 0 24 24" width="24" height="24" {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
  ),

  /* --- Added icons --- */
  Calendar: (p: Props) => (
    <svg viewBox="0 0 24 24" width="24" height="24" {...p}>
      <rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M8 2v4M16 2v4M3 10h18" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  Settings: (p: Props) => (
    <svg viewBox="0 0 24 24" width="24" height="24" {...p}>
      <path d="M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M3 12h2M19 12h2M12 3v2M12 19v2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M5 19l1.5-1.5" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),
  Bell: (p: Props) => (
    <svg viewBox="0 0 24 24" width="24" height="24" {...p}>
      <path d="M12 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 006 14h12a1 1 0 00.707-1.707L18 11.586V8a6 6 0 00-6-6zm0 20a3 3 0 01-3-3h6a3 3 0 01-3 3z" stroke="currentColor" strokeWidth="2" fill="none"/>
    </svg>
  ),
};