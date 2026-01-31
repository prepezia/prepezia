"use client";

import { useState, useCallback, useRef, useMemo } from 'react';
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
  expandedNodes: Set<string>;
  toggleNode: (nodeId: string) => void;
}

// Global counter for ID sanitization
let idCounter = 0;
/**
 * Recursively traverses the node tree and replaces all AI-generated IDs
 * with a guaranteed unique, sequential ID. This prevents React key errors.
 */
const sanitizeNodeIds = (node: MindMapNodeData): MindMapNodeData => {
  idCounter++;
  return {
    ...node,
    id: `mindmap-node-${idCounter}`, // Overwrite the ID
    children: node.children?.map(child => sanitizeNodeIds(child)), // Recurse through children
  };
};

const Node: React.FC<MindMapNodeProps> = ({ node, isRoot = false, expandedNodes, toggleNode }) => {
  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="flex items-start min-w-max">
        <div className="flex items-center gap-2 py-2 flex-shrink-0">
            <div className={cn(
              'flex items-center justify-center rounded-lg border p-2 px-3 shadow-sm text-sm whitespace-nowrap',
              isRoot ? 'bg-primary text-primary-foreground font-bold' : 'bg-secondary'
            )}>
                {node.label}
            </div>
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

        {isExpanded && hasChildren && (
            <div className="relative flex flex-col pl-6">
                {/* Vertical trunk line for children */}
                <div className="absolute left-3 top-0 bottom-0 w-px bg-muted-foreground/50" />

                {/* Horizontal line connecting parent node to the vertical trunk */}
                <div className="absolute -left-3 top-[23px] h-px w-3 bg-muted-foreground/50" />

                {node.children!.map((child) => (
                    <div key={child.id} className="relative">
                        {/* Horizontal line connecting the trunk to this child node */}
                        <div className="absolute -left-3 top-[23px] h-px w-3 bg-muted-foreground/50" />
                        <Node
                            node={child}
                            expandedNodes={expandedNodes}
                            toggleNode={toggleNode}
                        />
                    </div>
                ))}
            </div>
        )}
    </div>
  );
};


export const InteractiveMindMap: React.FC<{ data: MindMapNodeData, topic: string }> = ({ data, topic }) => {
  // Sanitize the AI-generated data to ensure all node IDs are unique
  const sanitizedData = useMemo(() => {
    idCounter = 0; // Reset counter on each new render/data change
    return sanitizeNodeIds(data);
  }, [data]);
  
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
      // Initially expand just the root node
      return new Set<string>([sanitizedData.id]);
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
        const nodeToCollapse = findNode(sanitizedData, nodeId);
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
  }, [sanitizedData, findNode, getAllChildIds]);

  const handleDownload = useCallback(() => {
    const getAllIds = (node: MindMapNodeData): string[] => {
      let ids = [node.id];
      if (node.children) {
        ids = ids.concat(...node.children.map(getAllIds));
      }
      return ids;
    };

    const allIds = new Set(getAllIds(sanitizedData));
    const originalExpanded = expandedNodes;
    setExpandedNodes(allIds);

    toast({ title: 'Preparing download...', description: 'Expanding all nodes.' });

    // Wait for the state to update and the component to re-render
    setTimeout(() => {
      if (mindMapRef.current === null) {
        setExpandedNodes(originalExpanded); // Restore on failure
        toast({ variant: 'destructive', title: 'Download failed', description: 'Could not find mind map to render.' });
        return;
      }
      
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
        })
        .finally(() => {
          // Restore the original view
          setExpandedNodes(originalExpanded);
        });
    }, 500); // Delay to allow UI to re-render with all nodes expanded
  }, [sanitizedData, expandedNodes, topic, toast]);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center gap-4">
            <div className="flex-1 min-w-0">
                <CardTitle className="flex items-center gap-2">
                    <GitFork className="h-6 w-6 text-primary shrink-0"/>
                    <span>Mind Map</span>
                </CardTitle>
                <p className="text-sm text-muted-foreground truncate">for &quot;{topic}&quot;</p>
            </div>
            
            <Button variant="outline" onClick={handleDownload} className="shrink-0">
                <Download className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Download</span>
            </Button>
        </div>
        <CardDescription className="pt-2 text-balance">
            Click the +/- icons to expand or collapse branches of the mind map.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto border rounded-lg">
          <div ref={mindMapRef} className="inline-block min-w-full p-4 md:p-6 bg-background">
            <Node
              key={sanitizedData.id}
              node={sanitizedData}
              isRoot
              expandedNodes={expandedNodes}
              toggleNode={toggleNode}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
