"use client";

import { useState, useEffect } from 'react';
import { Loader2, FileText, Download, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface PDFViewerProps {
  dataUri: string;
  fileName?: string;
  onClear?: () => void;
}

export function PDFViewer({ dataUri, fileName, onClear }: PDFViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;

    const loadPDF = async () => {
      if (!dataUri) {
        setError("No PDF data provided.");
        return;
      }
      
      try {
        if (dataUri.startsWith('data:application/pdf')) {
          const response = await fetch(dataUri);
          const blob = await response.blob();
          objectUrl = URL.createObjectURL(blob);
          setPdfUrl(objectUrl);
          setError(null);
        } else {
            // It might be a blob url already if we didn't get to fix everything
            // Or a regular url in the future
            setPdfUrl(dataUri);
            setError(null);
        }
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError("Could not load the PDF for preview.");
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
      <Alert variant="destructive" className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-4">
        <AlertTriangle className="w-12 h-12 mb-4" />
        <AlertTitle>PDF Preview Failed</AlertTitle>
        <AlertDescription className="mb-4">{error}</AlertDescription>
        <Button asChild>
            <a href={dataUri} download={fileName}>
                <Download className="inline mr-2 w-4 h-4" /> Download PDF
            </a>
        </Button>
      </Alert>
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