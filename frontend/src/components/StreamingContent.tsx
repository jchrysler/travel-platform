import { Button } from "@/components/ui/button";
import { Copy, Download } from "lucide-react";
import { formatMarkdownToHtml } from "@/utils/formatMarkdown";
import { useState } from "react";

interface StreamingContentProps {
  content: string;
  isStreaming: boolean;
  title?: string;
  showActions?: boolean;
  className?: string;
}

export function StreamingContent({
  content,
  isStreaming,
  title,
  showActions = false,
  className = "",
}: StreamingContentProps) {
  const [copied, setCopied] = useState(false);

  if (!content && !isStreaming) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "itinerary"}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`${className}`}>
      {/* Header with actions */}
      {(title || showActions) && (
        <div className="flex items-center justify-between mb-6 pb-4 border-b">
          {title && <h2 className="text-2xl font-bold">{title}</h2>}
          {showActions && !isStreaming && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                {copied ? "Copied!" : "Copy"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Loading indicator */}
      {isStreaming && (
        <div className="flex items-center gap-2 mb-6">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.1s]" />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
          </div>
          <span className="text-sm text-muted-foreground">
            Generating your itinerary...
          </span>
        </div>
      )}

      {/* Content - no container, flows naturally */}
      <div className="travel-content text-base leading-relaxed">
        <style>{`
          .travel-content ul {
            padding-left: 1.5rem;
          }
          .travel-content li {
            padding-left: 0.5rem;
          }
          .travel-content h1 {
            font-size: 1.875rem;
            line-height: 2.25rem;
            font-weight: 700;
            margin-top: 2rem;
            margin-bottom: 1rem;
          }
          .travel-content h2 {
            font-size: 1.5rem;
            line-height: 2rem;
            font-weight: 700;
            margin-top: 2rem;
            margin-bottom: 1rem;
          }
          .travel-content h3 {
            font-size: 1.25rem;
            line-height: 1.75rem;
            font-weight: 600;
            margin-top: 1.5rem;
            margin-bottom: 0.75rem;
          }
          .travel-content h4 {
            font-size: 1.125rem;
            line-height: 1.5rem;
            font-weight: 600;
            margin-top: 1rem;
            margin-bottom: 0.5rem;
          }
          .travel-content p {
            margin-bottom: 1rem;
          }
          .travel-content hr {
            margin: 2rem 0;
            border-color: rgba(0,0,0,0.1);
          }
          .dark .travel-content hr {
            border-color: rgba(255,255,255,0.1);
          }
          .travel-content > *:first-child {
            margin-top: 0;
          }
        `}</style>
        <div
          dangerouslySetInnerHTML={{ __html: formatMarkdownToHtml(content) }}
        />
      </div>
    </div>
  );
}