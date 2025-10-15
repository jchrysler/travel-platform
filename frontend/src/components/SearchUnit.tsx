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
  parentId?: string;
  children?: SearchUnitData[];
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
  onElaborate?: (content: string, query: string, parentUnitId?: string) => void;
  onMoreLike?: (content: string, query: string, parentUnitId?: string) => void;
  depth?: number;
}

// Structured response interfaces
interface ItemDetail {
  location?: string;
  price?: string;
  hours?: string;
  booking?: string;
  tips?: string[];
  [key: string]: any;
}

interface RecommendationItem {
  name: string;
  description: string;
  details?: ItemDetail;
}

interface ContentSection {
  title: string;
  items: RecommendationItem[];
}

interface StructuredResponse {
  sections: ContentSection[];
}

// Helper to extract intro text and JSON parts from response
interface ParsedResponse {
  intro: string;
  jsonContent: string;
  hasJson: boolean;
}

const splitIntroAndJson = (content: string): ParsedResponse => {
  const trimmed = content.trim();

  // Strip markdown code blocks if present
  let cleaned = trimmed;
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '');
    cleaned = cleaned.replace(/\n?```\s*$/, '');
    cleaned = cleaned.trim();
  }

  // Find the start of JSON (first '{' character)
  const jsonStart = cleaned.indexOf('{');

  if (jsonStart === -1) {
    // No JSON found
    return { intro: cleaned, jsonContent: '', hasJson: false };
  }

  if (jsonStart === 0) {
    // JSON starts immediately, no intro
    return { intro: '', jsonContent: cleaned, hasJson: true };
  }

  // Split into intro and JSON parts
  const intro = cleaned.slice(0, jsonStart).trim();
  const jsonContent = cleaned.slice(jsonStart);

  return { intro, jsonContent, hasJson: true };
};

// Helper to parse complete JSON
const tryParseJSON = (content: string): StructuredResponse | null => {
  try {
    const parsed = JSON.parse(content);
    // Validate structure
    if (parsed && Array.isArray(parsed.sections)) {
      return parsed as StructuredResponse;
    }
  } catch {
    // Not valid JSON or incomplete JSON (still streaming)
  }
  return null;
};

// Helper to extract complete items from partial JSON
const extractCompleteItems = (partialJson: string): RecommendationItem[] => {
  const items: RecommendationItem[] = [];

  // Try to parse the whole thing first
  const complete = tryParseJSON(partialJson);
  if (complete) {
    // Return all items from all sections
    return complete.sections.flatMap(section => section.items);
  }

  // If that fails, try to extract individual complete items
  // Look for complete item objects (those that have closing braces)
  // This is a simple heuristic - we look for patterns like: {...}, or {...}]

  try {
    // Try to find items array and extract complete items
    const itemsMatch = partialJson.match(/"items"\s*:\s*\[([\s\S]*?)(?:\]|\s*$)/);
    if (!itemsMatch) return items;

    const itemsContent = itemsMatch[1];
    let depth = 0;
    let currentItem = '';
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < itemsContent.length; i++) {
      const char = itemsContent[i];
      currentItem += char;

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (char === '{') {
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0 && currentItem.trim()) {
          // We have a complete item
          try {
            const parsed = JSON.parse(currentItem.trim().replace(/,\s*$/, ''));
            if (parsed.name && parsed.description) {
              items.push(parsed as RecommendationItem);
            }
          } catch {
            // This item isn't complete yet
          }
          currentItem = '';
        }
      }
    }
  } catch {
    // Parsing failed, return what we have
  }

  return items;
};

export function SearchUnit({
  unit,
  cityName,
  isFirst: _isFirst,
  isLatest,
  onSaveItem,
  savedItemIds = new Set(),
  onDelete,
  showDelete = false,
  onElaborate,
  onMoreLike,
  depth = 0
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

  // Render structured JSON content
  const renderStructuredContent = (data: StructuredResponse): ReactElement[] => {
    return data.sections.flatMap((section, sectionIndex) => {
      const elements: ReactElement[] = [];

      // Section title
      if (section.title) {
        elements.push(
          <h3 key={`section-${sectionIndex}`} className="text-lg font-semibold mb-4 mt-6 first:mt-0 text-foreground">
            {section.title}
          </h3>
        );
      }

      // Individual items - each wrapped in SaveableContent
      section.items.forEach((item, itemIndex) => {
        const itemId = `${unit.id}-s${sectionIndex}-i${itemIndex}`;
        const isSaved = savedItemIds.has(itemId);

        elements.push(
          <div key={itemId} className="mb-6 last:mb-0">
            <SaveableContent
              content={JSON.stringify(item)}
              queryContext={unit.query}
              onSave={onSaveItem}
              isSaved={isSaved}
              onElaborate={onElaborate ? () => onElaborate(JSON.stringify(item), unit.query, unit.id) : undefined}
              onMoreLike={onMoreLike ? () => onMoreLike(JSON.stringify(item), unit.query, unit.id) : undefined}
            >
              <div className="space-y-3">
                {/* Item name */}
                <div className="text-base font-semibold text-foreground leading-snug">
                  {item.name}
                </div>

                {/* Item description */}
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>

                {/* Item details */}
                {item.details && (
                  <div className="space-y-1.5 text-sm">
                    {item.details.location && (
                      <div className="text-muted-foreground">
                        <span className="font-medium text-foreground">Location:</span> {item.details.location}
                      </div>
                    )}
                    {item.details.price && (
                      <div className="text-muted-foreground">
                        <span className="font-medium text-foreground">Price:</span> {item.details.price}
                      </div>
                    )}
                    {item.details.hours && (
                      <div className="text-muted-foreground">
                        <span className="font-medium text-foreground">Hours:</span> {item.details.hours}
                      </div>
                    )}
                    {item.details.booking && (
                      <div className="text-muted-foreground">
                        <span className="font-medium text-foreground">Booking:</span> {item.details.booking}
                      </div>
                    )}
                    {item.details.tips && item.details.tips.length > 0 && (
                      <div className="mt-2">
                        <div className="font-medium text-foreground mb-1">Tips:</div>
                        <ul className="space-y-1 text-muted-foreground">
                          {item.details.tips.map((tip, tipIndex) => (
                            <li key={`tip-${tipIndex}`} className="flex gap-2">
                              <span className="text-primary">•</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </SaveableContent>
          </div>
        );
      });

      return elements;
    });
  };

  // Render markdown content (fallback for old responses)
  const renderMarkdownContent = (content: string): ReactElement[] => {
    // Split by double newlines to get paragraphs/sections
    const sections = content.split(/\n\n+/).filter(s => s.trim().length > 0);

    return sections.map((section, index) => {
      const sectionId = `${unit.id}-section-${index}`;
      const isSaved = savedItemIds.has(sectionId);
      const normalized = section.trim();

      return (
        <div key={`section-${index}`} className="mb-6 last:mb-0">
          <SaveableContent
            content={normalized}
            queryContext={unit.query}
            onSave={onSaveItem}
            isSaved={isSaved}
            onElaborate={onElaborate ? () => onElaborate(normalized, unit.query, unit.id) : undefined}
            onMoreLike={onMoreLike ? () => onMoreLike(normalized, unit.query, unit.id) : undefined}
          >
            <div
              dangerouslySetInnerHTML={{ __html: formatMarkdownToHtml(normalized) }}
              className="travel-content text-base leading-relaxed [&_p]:mb-4 [&_a]:text-primary [&_a]:underline [&_strong]:text-foreground [&_em]:text-muted-foreground"
            />
          </SaveableContent>
        </div>
      );
    });
  };

  // Parse response and render appropriate format (with incremental streaming)
  const renderSaveableContent = (content: string): ReactElement[] => {
    if (!content || content.trim().length === 0) {
      return [];
    }

    const elements: ReactElement[] = [];
    const { intro, jsonContent, hasJson } = splitIntroAndJson(content);

    // Render intro text if it exists (streams character by character)
    if (intro) {
      elements.push(
        <div key="intro" className="mb-4 text-base leading-relaxed text-muted-foreground">
          {intro}
        </div>
      );
    }

    if (!hasJson) {
      // No JSON found - fallback to markdown rendering
      return renderMarkdownContent(content);
    }

    // Try to parse complete JSON first
    const structured = tryParseJSON(jsonContent);
    if (structured) {
      // Fully parsed - render all sections
      elements.push(...renderStructuredContent(structured));
      return elements;
    }

    // JSON is incomplete - try to extract and render complete items incrementally
    const completeItems = extractCompleteItems(jsonContent);

    if (completeItems.length > 0) {
      // Render complete items as they arrive
      completeItems.forEach((item, itemIndex) => {
        const itemId = `${unit.id}-item-${itemIndex}`;
        const isSaved = savedItemIds.has(itemId);

        elements.push(
          <div key={itemId} className="mb-6 last:mb-0">
            <SaveableContent
              content={JSON.stringify(item)}
              queryContext={unit.query}
              onSave={onSaveItem}
              isSaved={isSaved}
              onElaborate={onElaborate ? () => onElaborate(JSON.stringify(item), unit.query, unit.id) : undefined}
              onMoreLike={onMoreLike ? () => onMoreLike(JSON.stringify(item), unit.query, unit.id) : undefined}
            >
              <div className="space-y-3">
                {/* Item name */}
                <div className="text-base font-semibold text-foreground leading-snug">
                  {item.name}
                </div>

                {/* Item description */}
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>

                {/* Item details */}
                {item.details && (
                  <div className="space-y-1.5 text-sm">
                    {item.details.location && (
                      <div className="text-muted-foreground">
                        <span className="font-medium text-foreground">Location:</span> {item.details.location}
                      </div>
                    )}
                    {item.details.price && (
                      <div className="text-muted-foreground">
                        <span className="font-medium text-foreground">Price:</span> {item.details.price}
                      </div>
                    )}
                    {item.details.hours && (
                      <div className="text-muted-foreground">
                        <span className="font-medium text-foreground">Hours:</span> {item.details.hours}
                      </div>
                    )}
                    {item.details.booking && (
                      <div className="text-muted-foreground">
                        <span className="font-medium text-foreground">Booking:</span> {item.details.booking}
                      </div>
                    )}
                    {item.details.tips && item.details.tips.length > 0 && (
                      <div className="mt-2">
                        <div className="font-medium text-foreground mb-1">Tips:</div>
                        <ul className="space-y-1 text-muted-foreground">
                          {item.details.tips.map((tip, tipIndex) => (
                            <li key={`tip-${tipIndex}`} className="flex gap-2">
                              <span className="text-primary">•</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </SaveableContent>
          </div>
        );
      });
    }

    // If still streaming and no complete items yet, don't show raw JSON
    if (unit.isStreaming && elements.length === 0) {
      return [];
    }

    // If not streaming but couldn't parse, show error
    if (!unit.isStreaming && completeItems.length === 0 && !intro) {
      elements.push(
        <div key="json-error" className="mb-6 last:mb-0">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm font-medium text-destructive mb-2">
              Unable to parse response format
            </p>
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-auto max-h-64">
              {content}
            </pre>
          </div>
        </div>
      );
    }

    return elements;
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
        <div className="flex flex-col gap-4">
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

          <div className="flex flex-col">
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

      {/* Nested Children */}
      {unit.children && unit.children.length > 0 && (
        <div className="mt-3 ml-6 space-y-3 border-l-2 border-primary/30 pl-4">
          <div className="text-xs text-muted-foreground italic mb-2">
            In response to: "{unit.query}"
          </div>
          {unit.children.map((child) => (
            <SearchUnit
              key={child.id}
              unit={child}
              cityName={cityName}
              isFirst={false}
              isLatest={false}
              onSaveItem={onSaveItem}
              savedItemIds={savedItemIds}
              onDelete={onDelete}
              showDelete={showDelete}
              onElaborate={onElaborate}
              onMoreLike={onMoreLike}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
