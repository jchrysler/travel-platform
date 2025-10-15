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
  intro?: string;
  sections: ContentSection[];
}

interface ParsedDelimitedResponse {
  intro: string;
  sections: ContentSection[];
  foundDelimiter: boolean;
  hasPartialItem: boolean;
}

const stripCodeFenceLines = (content: string): string => {
  return content
    .split(/\r?\n/)
    .filter(line => !line.trim().startsWith("```"))
    .join("\n");
};

const normalizeWhitespace = (text: string): string => {
  return text.replace(/\s+/g, " ").trim();
};

const tryParseJSON = (content: string): StructuredResponse | null => {
  const cleaned = stripCodeFenceLines(content).trim();
  if (!cleaned) {
    return null;
  }

  const firstBrace = cleaned.indexOf("{");
  if (firstBrace === -1) {
    return null;
  }

  const candidate = cleaned.slice(firstBrace);

  try {
    const parsed = JSON.parse(candidate);
    if (parsed && Array.isArray(parsed.sections)) {
      return parsed as StructuredResponse;
    }
  } catch {
    // ignore parse errors
  }

  return null;
};

const parseDelimitedResponse = (
  content: string,
  isStreaming: boolean
): ParsedDelimitedResponse | null => {
  const cleaned = stripCodeFenceLines(content);
  if (!cleaned.trim()) {
    return null;
  }

  const lines = cleaned.split(/\r?\n/);

  const introLines: string[] = [];
  const sectionsOrder: string[] = [];
  const sectionsMap = new Map<string, RecommendationItem[]>();

  let currentSection: string | null = null;
  let currentItem: RecommendationItem | null = null;
  let collectingTips = false;
  let tipBuffer: string[] = [];
  let foundDelimiter = false;

  const ensureSection = () => {
    if (!currentSection || !currentSection.trim()) {
      currentSection = "Highlights";
    }
    if (!sectionsMap.has(currentSection)) {
      sectionsMap.set(currentSection, []);
      sectionsOrder.push(currentSection);
    }
  };

  const assignDetail = (label: string, value: string) => {
    if (!currentItem) return;
    if (!currentItem.details) {
      currentItem.details = {};
    }
    currentItem.details[label] = value;
  };

  const finalizeCurrentItem = () => {
    if (!currentItem) return;

    if (tipBuffer.length > 0) {
      if (!currentItem.details) {
        currentItem.details = {};
      }
      currentItem.details.tips = tipBuffer.slice();
    }

    const hasCore = Boolean(
      currentItem.name && currentItem.name.trim().length > 0
    );

    if (hasCore) {
      ensureSection();

      if (currentItem.details) {
        const entries = Object.entries(currentItem.details).filter(([_, value]) => {
          if (Array.isArray(value)) {
            return value.length > 0;
          }
          return value !== undefined && String(value).trim().length > 0;
        });

        if (entries.length > 0) {
          currentItem.details = Object.fromEntries(entries);
        } else {
          delete currentItem.details;
        }
      }

      sectionsMap.get(currentSection!)?.push(currentItem);
    }

    currentItem = null;
    tipBuffer = [];
    collectingTips = false;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      collectingTips = false;
      continue;
    }

    if (/^---\s*save this\s*---$/i.test(trimmed)) {
      foundDelimiter = true;
      if (currentItem) {
        finalizeCurrentItem();
      }
      ensureSection();
      currentItem = { name: "", description: "" };
      collectingTips = false;
      tipBuffer = [];
      continue;
    }

    const sectionMatch = trimmed.match(/^Section:\s*(.+)$/i);
    if (sectionMatch) {
      if (currentItem) {
        finalizeCurrentItem();
      }
      currentSection = normalizeWhitespace(sectionMatch[1]);
      if (!currentSection) {
        currentSection = "Highlights";
      }
      ensureSection();
      collectingTips = false;
      continue;
    }

    if (!currentItem) {
      introLines.push(line);
      continue;
    }

    if (collectingTips && /^[-•]\s*(.+)$/.test(trimmed)) {
      const tipText = trimmed.replace(/^[-•]\s*/, "").trim();
      if (tipText.length > 0) {
        tipBuffer.push(tipText);
      }
      continue;
    }

    const keyValueMatch = line.match(/^([A-Za-z ]+):\s*(.*)$/);
    if (keyValueMatch) {
      const rawKey = keyValueMatch[1].trim();
      const value = keyValueMatch[2].trim();
      const key = rawKey.toLowerCase();

      collectingTips = false;

      if (key === "name") {
        currentItem.name = value;
      } else if (key === "description") {
        currentItem.description = value;
      } else if (key === "location") {
        assignDetail("location", value);
      } else if (key === "price") {
        assignDetail("price", value);
      } else if (key === "hours") {
        assignDetail("hours", value);
      } else if (key === "booking") {
        assignDetail("booking", value);
      } else if (key === "tips") {
        collectingTips = true;
        if (value.length > 0) {
          tipBuffer.push(value);
        }
      } else {
        assignDetail(rawKey, value);
      }

      continue;
    }

    if (collectingTips) {
      tipBuffer.push(trimmed);
      continue;
    }

    // Treat any other line as a continuation of the description
    const continuation = trimmed;
    if (continuation.length > 0) {
      if (currentItem.description && currentItem.description.length > 0) {
        currentItem.description = `${currentItem.description} ${continuation}`;
      } else {
        currentItem.description = continuation;
      }
    }
  }

  const hasPartialItem = Boolean(currentItem);

  if (!isStreaming && currentItem) {
    finalizeCurrentItem();
  }

  const sections: ContentSection[] = sectionsOrder.map(title => ({
    title,
    items: sectionsMap.get(title) ?? []
  }));

  const intro = normalizeWhitespace(introLines.join(" "));

  return {
    intro,
    sections,
    foundDelimiter,
    hasPartialItem
  };
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

  // Parse response and render appropriate format (stream-friendly)
  const renderSaveableContent = (content: string): ReactElement[] => {
    if (!content || content.trim().length === 0) {
      return [];
    }

    const elements: ReactElement[] = [];
    const structuredJson = tryParseJSON(content);

    if (structuredJson) {
      if (structuredJson.intro && structuredJson.intro.trim().length > 0) {
        elements.push(
          <div key="intro" className="mb-4 text-base leading-relaxed text-muted-foreground">
            {structuredJson.intro.trim()}
          </div>
        );
      }

      elements.push(...renderStructuredContent(structuredJson));
      return elements;
    }

    const parsed = parseDelimitedResponse(content, Boolean(unit.isStreaming));

    if (parsed) {
      const { intro, sections, foundDelimiter, hasPartialItem } = parsed;

      if (intro.length > 0) {
        elements.push(
          <div key="intro" className="mb-4 text-base leading-relaxed text-muted-foreground">
            {intro}
          </div>
        );
      }

      const hasItems = sections.some(section => section.items.length > 0);

      if (hasItems) {
        elements.push(...renderStructuredContent({ intro, sections }));
        return elements;
      }

      if (unit.isStreaming || foundDelimiter || hasPartialItem || intro.length > 0) {
        return elements;
      }
    }

    return renderMarkdownContent(content);
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
