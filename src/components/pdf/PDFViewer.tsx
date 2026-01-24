"use client";

import { useState, useEffect } from 'react';
import { Loader2, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PDFViewerProps {
  dataUri: string;
  fileName?: string;
  onClear?: () => void;
}

export function PDFViewer({ dataUri, fileName, onClear }: PDFViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;

    const loadPDF = async () => {
      try {
        if (dataUri.startsWith('data:application/pdf')) {
          const response = await fetch(dataUri);
          const blob = await response.blob();
          objectUrl = URL.createObjectURL(blob);
          setPdfUrl(objectUrl);
          setError(false);
        } else {
            setError(true);
        }
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError(true);
      }
    };

    loadPDF();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [dataUri]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-4">
        <FileText className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground mb-2">Unable to preview PDF</p>
        <a href={dataUri} download={fileName} className="text-primary hover:underline">
          <Download className="inline mr-1 w-4 h-4" /> Download PDF
        </a>
      </div>
    );
  }

  if (!pdfUrl) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full min-h-[400px] flex flex-col">
      <iframe
        src={`${pdfUrl}#view=FitH`}
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
            <a href={pdfUrl} download={fileName}>Download</a>
          </Button>
          {onClear && (
            <Button variant="outline" size="sm" onClick={onClear}>Clear</Button>
          )}
        </div>
      </div>
    </div>
  );
}
