import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Download } from "lucide-react";
import { formatMarkdownToHtml } from "@/utils/formatMarkdown";

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
  if (!content && !isStreaming) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    // You could add a toast notification here
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
    <Card className={`p-6 ${className}`}>
      {/* Header */}
      {(title || showActions) && (
        <div className="flex items-center justify-between mb-4 pb-2 border-b">
          {title && <h2 className="text-xl font-semibold">{title}</h2>}
          {showActions && !isStreaming && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy
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
        <div className="flex items-center gap-2 mb-4">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.1s]" />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
          </div>
          <span className="text-sm text-muted-foreground">
            Generating content...
          </span>
        </div>
      )}

      {/* Content */}
      <div className={`prose prose-sm max-w-none dark:prose-invert`}>
        <div
          className="travel-content"
          dangerouslySetInnerHTML={{ __html: formatMarkdownToHtml(content) }}
        />
      </div>
    </Card>
  );
}