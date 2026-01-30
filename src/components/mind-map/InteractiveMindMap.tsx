'use client';

import { useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Plus, Minus, GitFork, Download } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { toPng } from 'html-to-image';
import { useToast } from '@/hooks/use-toast';

export interface MindMapNodeData {
  id: string;
  label: string;
  children?: MindMapNodeData[];
}

interface MindMapNodeProps {
  node: MindMapNodeData;
  isRoot?: boolean;
  isLast?: boolean;
  expandedNodes: Set<string>;
  toggleNode: (nodeId: string) => void;
}

// A recursive component to render each node
const Node: React.FC<MindMapNodeProps> = ({ node, isRoot = false, isLast = true, expandedNodes, toggleNode }) => {
  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className={cn("relative flex items-stretch", isRoot ? '' : 'pl-8')}>
      {/* Connector lines */}
      {!isRoot && (
        <>
          {/* Horizontal line */}
          <div className="absolute left-0 top-1/2 -translate-y-px w-4 h-px bg-muted-foreground" />
          {/* Vertical line */}
          {!isLast && <div className="absolute left-0 top-0 w-px h-full bg-muted-foreground" />}
        </>
      )}

      {/* Node content and children */}
      <div className="flex flex-col items-start gap-2 py-2">
        <div className="flex items-center gap-2">
          {/* The node itself */}
          <div
            className={cn(
              'flex items-center justify-center rounded-lg border p-2 px-3 shadow-sm text-sm',
              isRoot ? 'bg-primary text-primary-foreground font-bold' : 'bg-secondary'
            )}
          >
            {node.label}
          </div>

          {/* Toggle button */}
          {hasChildren && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => toggleNode(node.id)}
              aria-label={isExpanded ? 'Collapse node' : 'Expand node'}
            >
              {isExpanded ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </Button>
          )}
        </div>

        {/* Children nodes */}
        {isExpanded && hasChildren && (
          <div className="relative flex flex-col gap-0 pt-2">
             {/* Vertical line connecting to children */}
            <div className="absolute left-0 -top-2 w-px h-full bg-muted-foreground" />
            {node.children!.map((child, index) => (
              <Node
                key={child.id}
                node={child}
                isLast={index === node.children!.length - 1}
                expandedNodes={expandedNodes}
                toggleNode={toggleNode}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const InteractiveMindMap: React.FC<{ data: MindMapNodeData, topic: string }> = ({ data, topic }) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
      // Initially expand just the root node
      return new Set<string>([data.id]);
  });
  const mindMapRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const getAllChildIds = useCallback((node: MindMapNodeData): string[] => {
    let ids: string[] = [];
    if (node.children) {
      for (const child of node.children) {
        ids.push(child.id);
        ids = ids.concat(getAllChildIds(child));
      }
    }
    return ids;
  }, []);

  const findNode = useCallback((root: MindMapNodeData, nodeId: string): MindMapNodeData | null => {
      if (root.id === nodeId) return root;
      if (!root.children) return null;
      for(const child of root.children) {
          const found = findNode(child, nodeId);
          if (found) return found;
      }
      return null;
  }, []);
  
  const toggleNode = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        // If collapsing, find the node and collapse all its descendants
        const nodeToCollapse = findNode(data, nodeId);
        if (nodeToCollapse) {
            const childIds = getAllChildIds(nodeToCollapse);
            newSet.delete(nodeId);
            childIds.forEach(id => newSet.delete(id));
        }
      } else {
        // If expanding, just add the single node
        newSet.add(nodeId);
      }
      return newSet;
    });
  }, [data, findNode, getAllChildIds]);

  const handleDownload = useCallback(() => {
    if (mindMapRef.current === null) {
      return;
    }

    toast({ title: 'Generating image...', description: 'Please wait a moment.' });

    toPng(mindMapRef.current, { cacheBust: true, backgroundColor: 'hsl(var(--background))', pixelRatio: 2 })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `mind-map-${topic.replace(/\s+/g, '_').toLowerCase()}.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => {
        console.error(err);
        toast({ variant: 'destructive', title: 'Download failed', description: 'Could not generate the mind map image.' });
      });
  }, [mindMapRef, topic, toast]);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><GitFork className="text-primary"/> Mind Map for "{topic}"</CardTitle>
          <CardDescription>Click the +/- icons to expand or collapse branches of the mind map.</CardDescription>
        </div>
        <Button variant="outline" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download
        </Button>
      </CardHeader>
      <CardContent>
        <div ref={mindMapRef} className="p-4 md:p-6 overflow-x-auto bg-background border rounded-lg">
            <Node node={data} isRoot expandedNodes={expandedNodes} toggleNode={toggleNode} />
        </div>
      </CardContent>
    </Card>
  );
};
