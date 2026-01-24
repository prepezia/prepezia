"use client";

import { Loader2, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PDFViewerProps {
  dataUri: string;
  fileName?: string;
  onClear?: () => void;
}

export function PDFViewer({ dataUri, fileName, onClear }: PDFViewerProps) {
  if (!dataUri) {
    return (
     <div className="flex items-center justify-center h-full min-h-[400px]">
       <Loader2 className="w-8 h-8 animate-spin text-primary" />
     </div>
   );
 }

  return (
    <div className="h-full min-h-[400px] flex flex-col">
      <iframe
        src={`${dataUri}#view=FitH`}
        className="w-full h-full flex-1 rounded-md border"
        title={fileName || 'PDF Preview'}
      />
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <p className="font-semibold text-sm truncate max-w-[200px]">{fileName}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={dataUri} download={fileName}>Download</a>
          </Button>
          {onClear && (
            <Button variant="outline" size="sm" onClick={onClear}>Clear</Button>
          )}
        </div>
      </div>
    </div>
  );
}

    