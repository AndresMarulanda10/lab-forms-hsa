"use client";

import { useEffect } from "react";

/**
 * Reads the saved theme from localStorage and applies it to <html>
 * before the first paint — placed at the root layout.
 */
export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const saved = localStorage.getItem("hsa-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (saved === "dark" || (!saved && prefersDark)) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  return <>{children}</>;
}
