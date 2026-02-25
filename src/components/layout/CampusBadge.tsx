'use client';

import { useCampus } from "@/hooks/use-campus";
import { Badge } from "@/components/ui/badge";
import { School } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

/**
 * A centralized campus personalization badge.
 * Responsive sizing: text-[14px] on mobile (20% increase), sm:text-[18px] on desktop (50% increase).
 */
export function CampusBadge({ className }: { className?: string }) {
  const { campus } = useCampus();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!campus || !isMounted) return null;

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "flex items-center gap-1.5 border-primary/30 text-primary bg-primary/5 py-1 px-3 shrink-0",
        className
      )}
    >
      <School className="h-3.5 w-3.5" />
      <span className="font-bold text-[14px] sm:text-[18px] uppercase tracking-wider">
        {campus.shortName} Edition
      </span>
    </Badge>
  );
}
