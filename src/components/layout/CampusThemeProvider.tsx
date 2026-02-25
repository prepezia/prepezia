
'use client';

import { useCampus } from "@/hooks/use-campus";
import { useEffect } from "react";

/**
 * Injects campus-specific CSS variables (like primary colors) 
 * into the document root when a campus is detected.
 */
export function CampusThemeProvider({ children }: { children: React.ReactNode }) {
  const { campus } = useCampus();

  useEffect(() => {
    if (campus?.primaryColor) {
      document.documentElement.style.setProperty('--primary', campus.primaryColor);
      document.documentElement.style.setProperty('--ring', campus.primaryColor);
    } else {
      // Revert to default blue/purple from globals.css
      document.documentElement.style.removeProperty('--primary');
      document.documentElement.style.removeProperty('--ring');
    }
  }, [campus]);

  return <>{children}</>;
}
