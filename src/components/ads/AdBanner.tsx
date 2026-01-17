"use client";

import { Card } from "@/components/ui/card";

export default function AdBanner() {
  return (
    <Card className="min-h-[100px] flex items-center justify-center bg-secondary/50 border-dashed">
      <div className="text-center text-muted-foreground">
        <p className="font-bold">Advertisement</p>
        <p className="text-sm">Ad placeholder</p>
      </div>
    </Card>
  );
}
