
"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
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
    // The container for a single node and its children sub-tree
    <div className={cn(
      "flex min-w-max",
      // On mobile, the root becomes a column, stacking its children vertically below it.
      // On desktop (md), it reverts to a row for the horizontal layout.
      isRoot ? "flex-col items-start md:flex-row md:items-start" : "flex-row items-start"
    )}>
        {/* The node itself (label + button) */}
        <div className="flex items-center gap-2 py-2 flex-shrink-0">
            <div className={cn(
              'flex items-center justify-center rounded-lg border p-2 px-3 shadow-sm text-sm whitespace-nowrap',
              isRoot ? 'bg-primary text-primary-foreground font-bold' : 'bg-secondary'
            )}>
                {node.label}
            </div>
            {hasChildren && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleNode(node.id)} aria-label={isExpanded ? 'Collapse node' : 'Expand node'}>
                    {isExpanded ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </Button>
            )}
        </div>

        {/* The container for all children of this node */}
        {isExpanded && hasChildren && (
            <div className={cn(
                "relative flex flex-col",
                // On mobile, root's children don't get extra padding. On desktop they do.
                isRoot ? "pl-0 md:pl-6" : "pl-6"
            )}>
                {/* === CONNECTOR LINES === */}
                
                {/* 1. The main vertical "trunk" line that all children branch from */}
                <div className={cn(
                    "absolute top-0 bottom-0 w-px bg-muted-foreground/50",
                    // For root on mobile, use fixed positioning. For desktop, move it left.
                    isRoot ? "left-4 md:left-3 md:translate-x-0" : "left-3"
                )} />

                {/* 2. The line connecting the parent node to its children's trunk */}
                {isRoot ? (
                    // On mobile, this is a short vertical line pointing down from the parent.
                    <div className="absolute left-4 -top-3 h-3 w-px bg-muted-foreground/50 md:hidden" />
                ) : null}
                {/* On desktop, this is a short horizontal line. For non-root nodes, it's always horizontal. */}
                <div className={cn("absolute top-[23px] h-px w-3 bg-muted-foreground/50", isRoot ? "hidden md:block -left-3" : "-left-3")} />
                
                {/* === CHILDREN NODES === */}
                {node.children!.map((child) => (
                    <div key={child.id} className="relative">
                        {/* 3. The horizontal line connecting the trunk to this specific child */}
                        <div className={cn(
                            "absolute top-[23px] h-px bg-muted-foreground/50",
                             // For root on mobile, it's a left-aligned horizontal line. For desktop and other nodes, it's a short left-aligned line.
                            isRoot ? "w-4 left-0 md:w-3 md:left-auto md:-left-3" : "w-3 -left-3"
                        )} />
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

  const [isDownloading, setIsDownloading] = useState(false);
  const originalExpandedNodesRef = useRef<Set<string> | null>(null);

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

    toast({ title: 'Preparing download...', description: 'Expanding all nodes.' });
    originalExpandedNodesRef.current = new Set(expandedNodes); // Store current state

    const allIds = new Set(getAllIds(sanitizedData));
    
    setExpandedNodes(allIds); // Expand all
    setIsDownloading(true); // Trigger effect for download
  }, [expandedNodes, sanitizedData, toast]);

  useEffect(() => {
    if (!isDownloading) return;

    const performDownload = async () => {
        if (mindMapRef.current === null) {
            toast({ variant: 'destructive', title: 'Download failed', description: 'Could not find mind map to render.' });
        } else {
            try {
                const dataUrl = await toPng(mindMapfRef.current, { cacheBust: true, backgroundColor: 'hsl(var(--background))', pixelRatio: 2 });
                const link = document.createElement('a');
                link.download = `mind-map-${topic.replace(/\s+/g, '_').toLowerCase()}.png`;
                link.href = dataUrl;
                link.click();
            } catch (err) {
                console.error(err);
                toast({ variant: 'destructive', title: 'Download failed', description: 'Could not generate the mind map image.' });
            }
        }
        
        // Restore state regardless of success/failure
        if (originalExpandedNodesRef.current) {
            setExpandedNodes(originalExpandedNodesRef.current);
        }
        setIsDownloading(false);
        originalExpandedNodesRef.current = null;
    };

    // Use a timeout to let the browser paint the newly expanded nodes.
    const timer = setTimeout(performDownload, 500);

    return () => clearTimeout(timer);
  }, [isDownloading, topic, toast]);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start md:items-center gap-4">
            <div className="flex-1 min-w-0">
                <CardTitle className="flex items-center gap-2">
                    <GitFork className="h-6 w-6 text-primary shrink-0"/>
                    Mind Map
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
        <div className="w-full max-w-full min-w-0 overflow-x-auto border rounded-lg">
          <div ref={mindMapRef} className="inline-block p-4 md:p-6 bg-background min-w-full">
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
