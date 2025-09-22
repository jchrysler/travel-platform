import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, ChevronDown, ChevronUp, X, Plus, Check } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { formatMarkdownToHtml } from "@/utils/formatMarkdown";
import type { SavedItem } from "./SaveableContent";

export interface ThreadedQueryProps {
  parentContent: string;
  parentQuery: string;
  cityName: string;
  onClose: () => void;
  onSubmit: (query: string, parentContext: string) => Promise<string>;
  onSaveItem: (item: SavedItem) => void;
  savedItemIds?: Set<string>;
}

interface ThreadResponse {
  id: string;
  query: string;
  response: string;
  timestamp: Date;
}

export function ThreadedQuery({
  parentContent,
  parentQuery,
  cityName,
  onClose,
  onSubmit,
  onSaveItem,
  savedItemIds = new Set()
}: ThreadedQueryProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [threadQuery, setThreadQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [responses, setResponses] = useState<ThreadResponse[]>([]);
  const [savedThreadItems, setSavedThreadItems] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus input when component mounts
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!threadQuery.trim() || isLoading) return;

    setIsLoading(true);
    const query = threadQuery;
    setThreadQuery("");

    try {
      // Create context from parent content
      const context = `Based on this recommendation about ${parentQuery}:\n"${parentContent}"\n\nUser asks: ${query}`;

      const response = await onSubmit(query, context);

      const newResponse: ThreadResponse = {
        id: Date.now().toString(),
        query,
        response,
        timestamp: new Date()
      };

      setResponses(prev => [...prev, newResponse]);
    } catch (error) {
      console.error("Thread query failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-4 border-l-2 border-primary/20 pl-4 ml-2">
      {/* Thread Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MessageCircle className="w-4 h-4" />
          <span>Follow-up thread</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={onClose}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-3">
          {/* Previous Responses */}
          {responses.map((response) => {
            const isSaved = savedItemIds.has(response.id) || savedThreadItems.has(response.id);

            const handleSave = () => {
              const item: SavedItem = {
                id: response.id,
                content: `Q: ${response.query}\n\nA: ${response.response}`,
                queryContext: `${parentQuery} > ${response.query}`,
                timestamp: response.timestamp
              };
              onSaveItem(item);
              setSavedThreadItems(prev => new Set([...prev, response.id]));
            };

            return (
              <Card key={response.id} className="p-3 bg-muted/30 relative group hover:bg-muted/40 transition-colors">
                <div className="text-sm font-medium mb-2 text-primary pr-8">
                  Q: {response.query}
                </div>
                <div
                  className="text-sm prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: formatMarkdownToHtml(response.response)
                  }}
                />
                <div className="text-xs text-muted-foreground mt-2">
                  {new Date(response.timestamp).toLocaleTimeString()}
                </div>

                {/* Save button for thread response */}
                <Button
                  size="icon"
                  variant={isSaved ? "default" : "ghost"}
                  className={`absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity ${
                    isSaved ? 'bg-green-500 hover:bg-green-600' : ''
                  }`}
                  onClick={handleSave}
                  disabled={isSaved}
                >
                  {isSaved ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Plus className="w-3 h-3" />
                  )}
                </Button>
              </Card>
            );
          })}

          {/* Loading State */}
          {isLoading && (
            <Card className="p-3 bg-muted/30">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary" />
                <span className="text-sm text-muted-foreground">
                  Getting more details about {cityName}...
                </span>
              </div>
            </Card>
          )}

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              ref={inputRef}
              value={threadQuery}
              onChange={(e) => setThreadQuery(e.target.value)}
              placeholder="Ask for more details..."
              disabled={isLoading}
              className="flex-1 h-8 text-sm"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
            <Button
              type="submit"
              size="sm"
              disabled={!threadQuery.trim() || isLoading}
              className="h-8"
            >
              <Send className="w-3 h-3" />
            </Button>
          </form>

          {/* Suggested Follow-ups */}
          {responses.length === 0 && !isLoading && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setThreadQuery("More like this")}
                className="text-xs px-2 py-1 bg-muted rounded-md hover:bg-muted/80 transition-colors"
              >
                More like this
              </button>
              <button
                onClick={() => setThreadQuery("Tell me more about this")}
                className="text-xs px-2 py-1 bg-muted rounded-md hover:bg-muted/80 transition-colors"
              >
                Tell me more
              </button>
              <button
                onClick={() => setThreadQuery("How do I get there?")}
                className="text-xs px-2 py-1 bg-muted rounded-md hover:bg-muted/80 transition-colors"
              >
                Directions
              </button>
              <button
                onClick={() => setThreadQuery("What are the prices like?")}
                className="text-xs px-2 py-1 bg-muted rounded-md hover:bg-muted/80 transition-colors"
              >
                Pricing
              </button>
              <button
                onClick={() => setThreadQuery("When is the best time to visit?")}
                className="text-xs px-2 py-1 bg-muted rounded-md hover:bg-muted/80 transition-colors"
              >
                Best time
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}