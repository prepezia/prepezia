
'use client';

import * as React from 'react';
import { Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export type MindMapNodeData = {
  title: string;
  note: string;
  children?: MindMapNodeData[];
};

interface InteractiveMindMapProps {
  data: MindMapNodeData;
}

const Node: React.FC<{ node: MindMapNodeData; level: number }> = ({ node, level }) => {
  const [isOpen, setIsOpen] = React.useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className={cn("relative", level > 0 && "pl-6")}>
        <div className="flex items-center gap-2">
            {hasChildren && (
            <Button variant="ghost" size="icon" className="h-6 w-6 -ml-2" onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </Button>
            )}
            <div 
                className={cn(
                    "flex-1 p-3 my-1 rounded-md border", 
                    level === 0 ? "bg-primary/10 border-primary/30" : "bg-card",
                    !hasChildren && `ml-[${(level > 0 ? 1.5 : 0)}rem]` // Indent non-expandable children
                )}
            >
                <p className="font-semibold">{node.title}</p>
                <Separator className="my-1" />
                <p className="text-sm text-muted-foreground">{node.note}</p>
            </div>
        </div>

        {isOpen && hasChildren && (
            <div className="pt-1">
                {node.children!.map((child, index) => (
                    <Node
                        key={index}
                        node={child}
                        level={level + 1}
                    />
                ))}
            </div>
        )}
    </div>
  );
};

export function InteractiveMindMap({ data }: InteractiveMindMapProps) {
  if (!data) return null;

  return (
    <div className="p-4 font-sans">
      <Node node={data} level={0} />
    </div>
  );
}
