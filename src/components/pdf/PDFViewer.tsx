"use client";

import { useState, useEffect, useRef } from 'react';
import { FileText, Download, ExternalLink, X, File, Maximize2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PDFViewerProps {
  dataUri: string;
  fileName?: string;
  onClear?: () => void;
  className?: string;
}

export function PDFViewer({ dataUri, fileName, onClear, className }: PDFViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string>('');
  const [showNativePreview, setShowNativePreview] = useState(false);
  const embedRef = useRef<HTMLEmbedElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    // Calculate file size
    if (dataUri && dataUri.startsWith('data:application/pdf')) {
      try {
        const base64Data = dataUri.split(',')[1];
        if (base64Data) {
          const bytes = (base64Data.length * 3) / 4;
          setFileSize(formatBytes(bytes));
        }
      } catch (err) {
        console.error('Error calculating file size:', err);
      }
    }

    // Chrome CAN display PDFs from blob URLs in new windows/tabs
    // But not in iframes/embeds on the same page (security restriction)
    // So we'll prepare the blob URL for download/new window opening
    if (dataUri && dataUri.startsWith('data:')) {
      try {
        // Convert data URI to blob
        const base64Data = dataUri.split(',')[1];
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const objectUrl = URL.createObjectURL(blob);
        objectUrlRef.current = objectUrl;
        setPdfUrl(objectUrl);
      } catch (err) {
        console.error('Error creating blob URL:', err);
        setPdfUrl(dataUri); // Fallback to original data URI
      }
    } else {
      setPdfUrl(dataUri);
    }

    return () => {
      // Clean up blob URL
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, [dataUri]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const downloadPDF = () => {
    if (!pdfUrl) return;
    
    try {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = fileName || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  // This is the key function: Open PDF in Chrome's native viewer
  const openInChromeViewer = () => {
    if (!pdfUrl) return;
    
    // Create a new window with the PDF directly
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      // Write a minimal HTML page that embeds the PDF
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${fileName || 'PDF Document'}</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              height: 100vh;
              overflow: hidden;
              background: #f5f5f5;
            }
            .chrome-pdf-viewer {
              width: 100%;
              height: 100vh;
              border: none;
            }
            .header {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              background: white;
              padding: 12px 16px;
              border-bottom: 1px solid #e5e5e5;
              display: flex;
              justify-content: space-between;
              align-items: center;
              z-index: 1000;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .title {
              font-weight: 600;
              font-size: 14px;
              color: #333;
              flex: 1;
              margin-right: 16px;
            }
            .close-btn {
              padding: 8px 16px;
              background: #ef4444;
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 500;
              font-size: 14px;
              transition: background 0.2s;
            }
            .close-btn:hover {
              background: #dc2626;
            }
            .container {
              padding-top: 60px; /* Account for header */
              height: 100vh;
            }
            @media print {
              .header {
                display: none;
              }
              .container {
                padding-top: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">${fileName || 'PDF Document'}</div>
            <button class="close-btn" onclick="window.close()">Close Viewer</button>
          </div>
          <div class="container">
            <embed 
              class="chrome-pdf-viewer" 
              src="${pdfUrl}" 
              type="application/pdf"
            />
          </div>
          <script>
            // Chrome's PDF viewer needs some help sometimes
            window.onload = function() {
              const embed = document.querySelector('.chrome-pdf-viewer');
              if (embed) {
                // Force reload if not loading
                setTimeout(() => {
                  if (!embed.src.includes('#view=')) {
                    embed.src = embed.src + '#view=FitH';
                  }
                }, 100);
              }
            };
          </script>
        </body>
        </html>
      `);
      newWindow.document.close();
    }
  };

  // Alternative: Open directly in Chrome (simplest method)
  const openDirectInChrome = () => {
    if (!pdfUrl) return;
    
    // This should trigger Chrome's built-in PDF viewer
    window.open(pdfUrl, '_blank', 'noopener,noreferrer');
  };

  // Try to show inline preview (may fail in Chrome)
  const attemptInlinePreview = () => {
    setShowNativePreview(true);
    
    // After 2 seconds, if embed didn't load, show fallback
    setTimeout(() => {
      if (embedRef.current) {
        const embed = embedRef.current;
        // Check if PDF loaded (this is tricky to detect reliably)
        // We'll just assume it failed and show the action buttons
      }
    }, 2000);
  };

  // Show action buttons by default, with option to try inline preview
  return (
    <div className={cn("flex flex-col", className)}>
      {/* Always show the action-oriented view */}
      <div className="border rounded-xl overflow-hidden bg-gradient-to-b from-white to-gray-50 shadow-lg">
        {/* Header with file info */}
        <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-white border border-blue-100 flex items-center justify-center shadow-sm">
                <File className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1 text-gray-900">{fileName || 'document.pdf'}</h3>
                <div className="flex items-center gap-3 text-sm">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                    <CheckCircle className="w-3 h-3" />
                    PDF Document
                  </span>
                  {fileSize && (
                    <span className="text-gray-600">• {fileSize}</span>
                  )}
                </div>
              </div>
            </div>
            {onClear && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
                className="h-9 px-3 text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200"
              >
                <X className="w-4 h-4 mr-2" />
                Remove
              </Button>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="p-6">
          <Alert className="mb-6 bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>Browser Security Note:</strong> Chrome blocks inline PDF previews. 
              Use the buttons below to view your PDF in Chrome's native viewer.
            </AlertDescription>
          </Alert>

          {/* Try inline preview section (likely to fail) */}
          {showNativePreview && (
            <div className="mb-6 border rounded-lg overflow-hidden">
              <div className="bg-gray-50 p-2 text-sm text-gray-600 border-b">
                Attempting inline preview (may be blocked)...
              </div>
              <div className="h-[400px]">
                <embed
                  ref={embedRef}
                  src={pdfUrl || ''}
                  type="application/pdf"
                  className="w-full h-full"
                  title={fileName || 'PDF Preview'}
                />
              </div>
            </div>
          )}

          {/* Primary Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Button
              onClick={openInChromeViewer}
              className="h-16 gap-4 text-base"
              size="lg"
            >
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <Maximize2 className="w-5 h-5" />
              </div>
              <div className="text-left flex-1">
                <div className="font-bold">Open in Chrome Viewer</div>
                <div className="text-sm opacity-90">Best experience • Full features</div>
              </div>
            </Button>
            
            <Button
              onClick={downloadPDF}
              variant="outline"
              className="h-16 gap-4 text-base border-2"
              size="lg"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Download className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-left flex-1">
                <div className="font-bold">Download PDF</div>
                <div className="text-sm opacity-90">Save to your device</div>
              </div>
            </Button>
          </div>

          {/* Quick alternative */}
          <div className="text-center mb-2">
            <Button
              onClick={openDirectInChrome}
              variant="ghost"
              size="sm"
              className="gap-2 text-blue-600 hover:text-blue-700"
            >
              <ExternalLink className="w-4 h-4" />
              Open directly in browser tab
            </Button>
          </div>

          {/* Chrome PDF features info */}
          <div className="mt-8 pt-6 border-t">
            <h4 className="font-semibold mb-3 text-gray-700">Chrome PDF Viewer Features:</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center p-3 bg-white border rounded-lg">
                <div className="text-blue-600 font-bold text-lg">✓</div>
                <div className="text-xs text-gray-600 mt-1">Search Text</div>
              </div>
              <div className="text-center p-3 bg-white border rounded-lg">
                <div className="text-blue-600 font-bold text-lg">✓</div>
                <div className="text-xs text-gray-600 mt-1">Zoom Controls</div>
              </div>
              <div className="text-center p-3 bg-white border rounded-lg">
                <div className="text-blue-600 font-bold text-lg">✓</div>
                <div className="text-xs text-gray-600 mt-1">Print & Save</div>
              </div>
              <div className="text-center p-3 bg-white border rounded-lg">
                <div className="text-blue-600 font-bold text-lg">✓</div>
                <div className="text-xs text-gray-600 mt-1">Full Screen</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <FileText className="w-4 h-4" />
              <span>Chrome's built-in PDF viewer will open in a new tab</span>
            </div>
            <div className="text-xs text-gray-500">
              Secure • Native • Full-featured
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}