import React, { useEffect, useState } from "react";
import { FaDownload, FaExternalLinkAlt } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { documentsApi } from "@/api/projectDocuments";
import { errorMessage, formatBytes } from "@/lib/documentUtils";

const MAX_TEXT_BYTES = 1024 * 1024;

function useIsMobile() {
  const query = "(max-width: 640px)";
  const [mobile, setMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = (e) => setMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return mobile;
}

export default function PreviewDialog({ open, onOpenChange, doc, onDownload }) {
  const [state, setState] = useState({
    loading: false,
    error: "",
    url: "",
    text: null,
  });
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!open || !doc) return;
    if (!doc.previewable) {
      setState({ loading: false, error: "", url: "", text: null });
      return;
    }
    let cancelled = false;
    setState({ loading: true, error: "", url: "", text: null });
    (async () => {
      try {
        const { url } = await documentsApi.getDownloadUrl(doc._id, {
          inline: true,
        });
        let text = null;
        if (doc.extension === "txt") {
          if (doc.fileSize > MAX_TEXT_BYTES)
            throw new Error(
              `This text file is too large to preview (${formatBytes(
                doc.fileSize,
              )}). Please download it.`,
            );
          const res = await fetch(url);
          if (!res.ok) throw new Error("Could not load the file");
          text = await res.text();
        }
        if (!cancelled) setState({ loading: false, error: "", url, text });
      } catch (err) {
        if (!cancelled)
          setState({
            loading: false,
            error: errorMessage(err, "Preview failed"),
            url: "",
            text: null,
          });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, doc]);

  const { loading, error, url, text } = state;
  const isImage = doc?.fileType === "image";
  const isPdf = doc?.extension === "pdf";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[94vw] max-w-5xl max-h-[90dvh] overflow-hidden flex flex-col gap-3 p-4 sm:p-6">
        <DialogHeader className="text-left shrink-0">
          <DialogTitle className="truncate pr-6 text-base sm:text-lg">
            {doc?.originalName}
          </DialogTitle>
          <DialogDescription>
            {doc
              ? `${doc.extension.toUpperCase()} · ${formatBytes(doc.fileSize)}`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
          {doc && !doc.previewable && (
            <div className="p-6 sm:p-10 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                {doc.fileType === "cad"
                  ? "CAD drawings cannot be previewed in the browser yet. Download the file to open it in your CAD software."
                  : "This file type cannot be previewed in the browser. Download it to open it."}
              </p>
              <Button
                onClick={() => onDownload?.(doc)}
                className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
              >
                <FaDownload size={12} /> Download
              </Button>
            </div>
          )}

          {doc?.previewable && loading && (
            <Skeleton className="h-[55dvh] w-full" />
          )}
          {error && <p className="p-6 text-sm text-red-600">{error}</p>}

          {/* PDF: iframe on desktop, open-in-new-tab on phones */}
          {url && isPdf && !isMobile && (
            <iframe
              title={doc.originalName}
              src={url}
              className="w-full h-[70dvh] bg-white"
            />
          )}
          {url && isPdf && isMobile && (
            <div className="p-6 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                PDFs open best in your phone's viewer.
              </p>
              <Button
                asChild
                className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
              >
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <FaExternalLinkAlt size={12} /> Open PDF
                </a>
              </Button>
            </div>
          )}

          {url && isImage && (
            <div className="flex items-center justify-center p-2">
              <img
                src={url}
                alt={doc.originalName}
                className="max-h-[60dvh] max-w-full object-contain"
              />
            </div>
          )}

          {text !== null && (
            <pre className="p-3 sm:p-4 text-xs whitespace-pre-wrap break-words">
              {text}
            </pre>
          )}
        </div>

        {doc?.previewable && (
          <div className="flex justify-end shrink-0">
            <Button
              variant="outline"
              onClick={() => onDownload?.(doc)}
              className="gap-2 w-full sm:w-auto"
            >
              <FaDownload size={12} /> Download
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
