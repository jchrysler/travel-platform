import { MapPin, Trash2 } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { formatMarkdownToHtml } from "@/utils/formatMarkdown";
import { SaveableContent, SavedItem } from "./SaveableContent";
import { useEffect, useRef, ReactElement } from "react";

interface PlaceResult {
  name: string;
  address: string;
  rating?: number;
  priceLevel?: string;
  isOpen?: boolean;
  hours?: string;
  distance?: string;
  description?: string;
}

interface SearchUnitData {
  id: string;
  query: string;
  response: string;
  searchResults?: PlaceResult[];
  timestamp: Date;
  isStreaming?: boolean;
  refinedTitle?: string;
}

interface SearchUnitProps {
  unit: SearchUnitData;
  cityName: string;
  isFirst: boolean;
  isLatest: boolean;
  onSaveItem: (item: SavedItem) => void;
  savedItemIds?: Set<string>;
  onDelete?: (id: string) => void;
  showDelete?: boolean;
}

export function SearchUnit({
  unit,
  cityName,
  isFirst: _isFirst,
  isLatest,
  onSaveItem,
  savedItemIds = new Set(),
  onDelete,
  showDelete = false
}: SearchUnitProps) {
  const unitRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest unit
  useEffect(() => {
    if (isLatest && unitRef.current) {
      setTimeout(() => {
        unitRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);
    }
  }, [isLatest]);

  // Parse response into saveable sections
  const renderSaveableContent = (content: string) => {
    // Split content into paragraphs for individual saving
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);

    return paragraphs.reduce<ReactElement[]>((acc, paragraph, index) => {
      const paragraphId = `${unit.id}-p-${index}`;
      const isSaved = savedItemIds.has(paragraphId);

      const normalized = paragraph.trim();
      if (!normalized) {
        return acc;
      }

      const isHeaderOnly = normalized.startsWith('#');
      const elementKey = `${unit.id}-chunk-${index}`;

      if (isHeaderOnly) {
        acc.push(
          <div key={elementKey} className="leading-relaxed text-base [&>p]:mb-2">
            <div dangerouslySetInnerHTML={{ __html: formatMarkdownToHtml(normalized) }} />
          </div>
        );
        return acc;
      }

      acc.push(
        <div key={index} className="mb-2">
          <SaveableContent
            content={paragraph}
            queryContext={unit.query}
            onSave={onSaveItem}
            isSaved={isSaved}
          >
            <div
              dangerouslySetInnerHTML={{ __html: formatMarkdownToHtml(paragraph) }}
              className="leading-relaxed text-base [&>p]:mb-2 [&>ul]:ml-4 [&>ul]:my-2 [&>ul>li]:ml-1 [&>ul>li]:py-0.5"
            />
          </SaveableContent>
        </div>
      );

      return acc;
    }, []);
  };

  return (
    <div
      ref={unitRef}
      className={`search-unit ${isLatest ? 'animate-slide-down' : ''}`}
    >
      {/* Main Content Unit */}
      <Card className="rounded-lg border border-border bg-card transition-all hover:border-primary/30 hover:shadow-md">
        <div className="px-6 py-5">
          {/* Query Header */}
          <div className="mb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-primary leading-tight mb-1">
                  {unit.refinedTitle || unit.query}
                </h3>
                {unit.refinedTitle && unit.refinedTitle !== unit.query && (
                  <p className="text-sm text-muted-foreground">
                    Search: "{unit.query}"
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(unit.timestamp).toLocaleTimeString()}
                </span>
                {showDelete && onDelete && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => onDelete(unit.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Response Content */}
          <div className="travel-content">
            {unit.isStreaming ? (
              <div className="flex items-center gap-3 py-2">
                <div className="flex gap-1">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-primary" />
                </div>
                <span className="text-sm text-muted-foreground">
                  Searching {cityName}...
                </span>
              </div>
            ) : null}

            <div>
              {renderSaveableContent(unit.response)}
            </div>
          </div>

          {/* Related Places (if any) */}
          {unit.searchResults && unit.searchResults.length > 0 && (
            <div className="mt-6 pt-4 border-t border-border/60">
              <div className="text-sm font-semibold mb-3 flex items-center gap-2 text-foreground">
                <MapPin className="w-4 h-4 text-primary" />
                Related Places
              </div>
              <div className="space-y-2">
                {unit.searchResults.map((place, idx) => (
                  <div key={idx} className="rounded-md border border-border bg-muted/40 p-3 hover:bg-muted/60 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{place.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {place.isOpen !== undefined && (
                            <span className={place.isOpen ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                              {place.isOpen ? "Open now" : "Closed"}
                            </span>
                          )}
                          {place.rating && <span className="ml-1">• {place.rating}★</span>}
                          {place.priceLevel && <span className="ml-1">• {place.priceLevel}</span>}
                        </div>
                      </div>
                      <Button size="sm" variant="ghost">Directions</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
