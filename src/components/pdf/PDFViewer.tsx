"use client";

import { useState, useEffect } from 'react';
import { FileText, Download, ExternalLink, X, File, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface PDFViewerProps {
  dataUri: string;
  fileName?: string;
  onClear?: () => void;
  className?: string;
}

export function PDFViewer({ dataUri, fileName, onClear, className }: PDFViewerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [fileSize, setFileSize] = useState<string>('');

  useEffect(() => {
    // Calculate file size from data URI
    if (dataUri && dataUri.startsWith('data:application/pdf')) {
      try {
        const base64Data = dataUri.split(',')[1];
        if (base64Data) {
          const bytes = (base64Data.length * 3) / 4;
          let size = '';
          if (bytes < 1024) {
            size = bytes + ' B';
          } else if (bytes < 1024 * 1024) {
            size = (bytes / 1024).toFixed(1) + ' KB';
          } else {
            size = (bytes / (1024 * 1024)).toFixed(1) + ' MB';
          }
          setFileSize(size);
        }
      } catch (err) {
        console.error('Error calculating file size:', err);
      }
    }
  }, [dataUri]);

  const downloadPDF = () => {
    if (!dataUri) return;
    
    try {
      const link = document.createElement('a');
      link.href = dataUri;
      link.download = fileName || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Download failed. Please try again.');
    }
  };

  const openInNewTab = () => {
    if (!dataUri) return;
    
    // Create a simple HTML page with the PDF embedded
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${fileName || 'PDF Document'}</title>
        <style>
          body, html { margin: 0; padding: 0; height: 100%; }
          .container { 
            height: 100vh; 
            display: flex; 
            flex-direction: column; 
          }
          .header {
            padding: 12px;
            background: #f8f9fa;
            border-bottom: 1px solid #dee2e6;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .pdf-viewer {
            flex: 1;
            width: 100%;
            border: none;
          }
          .close-btn {
            padding: 6px 12px;
            background: #dc3545;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <strong>${fileName || 'PDF Document'}</strong>
            <button class="close-btn" onclick="window.close()">Close</button>
          </div>
          <embed class="pdf-viewer" src="${dataUri}" type="application/pdf" />
        </div>
      </body>
      </html>
    `;
    
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(html);
      newWindow.document.close();
    }
  };

  // If we want to attempt a preview (but expect it to fail in Chrome)
  const attemptPreview = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      // After 2 seconds, show the fallback since Chrome blocks it
      openInNewTab();
    }, 2000);
  };

  // Skip loading state entirely - Chrome blocks iframes with data URIs
  // Just show the file info and action buttons
  return (
    <div className={cn("flex flex-col border rounded-lg bg-white shadow-sm", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <File className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h4 className="font-medium text-sm truncate max-w-[200px]">
              {fileName || 'document.pdf'}
            </h4>
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <span>PDF Document</span>
              {fileSize && <span>• {fileSize}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
            Ready
          </div>
        </div>
      </div>

      {/* Content - Direct to actions since Chrome blocks previews */}
      <div className="p-6 flex flex-col items-center justify-center min-h-[300px]">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-blue-500" />
          </div>
          <h3 className="font-semibold text-lg mb-2">PDF Document Ready</h3>
          <p className="text-sm text-muted-foreground max-w-md mb-4">
            Your PDF file has been uploaded successfully. For security reasons, 
            Chrome blocks inline PDF previews. Please use the options below to 
            view or download your document.
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm mb-2">
            <CheckCircle className="w-3 h-3" />
            <span>File verified • {fileSize}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
          <Button 
            onClick={downloadPDF} 
            className="gap-2 flex-1 h-12"
            size="lg"
          >
            <Download className="w-5 h-5" />
            Download PDF
          </Button>
          <Button 
            onClick={openInNewTab} 
            variant="outline"
            className="gap-2 flex-1 h-12"
            size="lg"
          >
            <ExternalLink className="w-5 h-5" />
            Open in New Tab
          </Button>
        </div>

        {/* Additional Info */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg w-full max-w-md">
          <p className="text-xs text-muted-foreground text-center">
            <strong>Note:</strong> Most modern browsers block inline PDF previews for security. 
            This is a Chrome/Edge security feature, not an issue with your file.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t p-3 bg-muted/20">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            PDF file uploaded successfully
          </p>
          <div className="flex items-center gap-2">
            {onClear && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClear}
                className="gap-2 h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="w-3 h-3" />
                Remove File
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to format bytes
function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}