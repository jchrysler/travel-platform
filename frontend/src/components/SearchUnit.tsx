import { MapPin, Trash2, Star } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { formatMarkdownToHtml } from "@/utils/formatMarkdown";
import { SaveableContent, SavedItem } from "./SaveableContent";
import { useEffect, useRef, ReactElement, useState } from "react";

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
  onElaborate?: (snippet: string, unitId: string, itemKey: string) => Promise<string>;
  onMoreLike?: (content: string, query: string, parentUnitId?: string) => void;
  depth?: number;
}

// Structured response interfaces
interface ItemDetail {
  location?: string;
  price?: string;
  hours?: string;
  booking?: string;
  ratingValue?: number;
  ratingCount?: number;
  ratingText?: string;
  reviewsSummary?: string;
  reviewsHighlights?: string[];
  tips?: string[];
  [key: string]: any;
}

interface RecommendationItem {
  name: string;
  description?: string;
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

interface ParsedMarkdownResponse {
  intro: string;
  sections: ContentSection[];
  hasItemHeadings: boolean;
  hasPartialItem: boolean;
}

const buildItemSnippet = (item: RecommendationItem): string => {
  const parts: string[] = [];
  if (item.name) parts.push(item.name);
  if (item.description) parts.push(item.description);
  if (item.details?.location) parts.push(`Located in ${item.details.location}`);
  return parts.join(" – ");
};

const formatRecommendationForSave = (item: RecommendationItem, sectionTitle?: string): string => {
  const lines: string[] = [];
  if (sectionTitle) {
    lines.push(`## ${sectionTitle}`);
  }

  if (item.name) {
    lines.push(`### ${item.name}`);
  }

  if (item.description) {
    lines.push(item.description.trim());
  }

  const detailLines: string[] = [];
  if (item.details?.ratingText) {
    detailLines.push(`- Rating: ${item.details.ratingText}`);
  }
  if (item.details?.location) {
    detailLines.push(`- Location: ${item.details.location}`);
  }
  if (item.details?.price) {
    detailLines.push(`- Price: ${item.details.price}`);
  }
  if (item.details?.hours) {
    detailLines.push(`- Hours: ${item.details.hours}`);
  }
  if (item.details?.booking) {
    detailLines.push(`- Booking: ${item.details.booking}`);
  }
  if (item.details?.reviewsSummary) {
    detailLines.push(`- Review Summary: ${item.details.reviewsSummary}`);
  }

  if (detailLines.length > 0) {
    lines.push("", ...detailLines);
  }

  if (item.details?.reviewsHighlights && item.details.reviewsHighlights.length > 0) {
    lines.push("", "**Review Highlights**");
    item.details.reviewsHighlights.forEach(highlight => {
      lines.push(`- ${highlight}`);
    });
  }

  if (item.details?.tips && item.details.tips.length > 0) {
    lines.push("", "**Insider Tips**");
    item.details.tips.forEach(tip => {
      lines.push(`- ${tip}`);
    });
  }

  return lines.join("\n").trim();
};

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

const parseMarkdownRecommendations = (
  content: string,
  isStreaming: boolean
): ParsedMarkdownResponse | null => {
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
  const bulletBuffers = {
    tips: [] as string[],
    reviewsHighlights: [] as string[],
  };
  let currentBulletKey: keyof typeof bulletBuffers | null = null;
  let descriptionBuffer: string[] = [];
  let hasItemHeadings = false;

  const ensureSection = () => {
    if (!currentSection || !currentSection.trim()) {
      currentSection = "Highlights";
    }
    if (!sectionsMap.has(currentSection)) {
      sectionsMap.set(currentSection, []);
      sectionsOrder.push(currentSection);
    }
  };

  const assignDetail = (
    label: keyof ItemDetail | string,
    value: string | number | string[]
  ) => {
    if (!currentItem) return;
    if (!currentItem.details) {
      currentItem.details = {};
    }
    currentItem.details[label] = value;
  };

  const flushDescriptionBuffer = () => {
    if (!currentItem) return;
    if (descriptionBuffer.length === 0) {
      return;
    }
    const combined = descriptionBuffer.join(" ").trim();
    if (combined.length === 0) {
      descriptionBuffer = [];
      return;
    }
    if (currentItem.description && currentItem.description.length > 0) {
      currentItem.description = `${currentItem.description} ${combined}`.trim();
    } else {
      currentItem.description = combined;
    }
    descriptionBuffer = [];
  };

  const finalizeCurrentItem = () => {
    if (!currentItem) return;

    flushDescriptionBuffer();

    if (bulletBuffers.reviewsHighlights.length > 0) {
      if (!currentItem.details) {
        currentItem.details = {};
      }
      currentItem.details.reviewsHighlights = [...bulletBuffers.reviewsHighlights];
    }

    if (bulletBuffers.tips.length > 0) {
      if (!currentItem.details) {
        currentItem.details = {};
      }
      currentItem.details.tips = [...bulletBuffers.tips];
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
          currentItem.details = Object.fromEntries(entries) as ItemDetail;
        } else {
          delete currentItem.details;
        }
      }

      const trimmedDescription = (currentItem.description ?? "").trim();
      currentItem.description = trimmedDescription.length > 0 ? trimmedDescription : undefined;

      sectionsMap.get(currentSection!)?.push(currentItem);
    }

    currentItem = null;
    bulletBuffers.tips = [];
    bulletBuffers.reviewsHighlights = [];
    descriptionBuffer = [];
    currentBulletKey = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      currentBulletKey = null;
      flushDescriptionBuffer();
      continue;
    }

    if (/^##\s+/.test(trimmed)) {
      if (currentItem) {
        finalizeCurrentItem();
      }
      currentSection = trimmed.replace(/^##\s+/, "").trim();
      if (!currentSection) {
        currentSection = "Highlights";
      }
      if (!sectionsMap.has(currentSection)) {
        sectionsMap.set(currentSection, []);
        sectionsOrder.push(currentSection);
      }
      currentBulletKey = null;
      continue;
    }

    if (/^###\s+/.test(trimmed)) {
      hasItemHeadings = true;
      if (currentItem) {
        finalizeCurrentItem();
      }
      ensureSection();
      currentItem = {
        name: trimmed.replace(/^###\s+/, "").trim()
      };
      bulletBuffers.tips = [];
      bulletBuffers.reviewsHighlights = [];
      descriptionBuffer = [];
      currentBulletKey = null;
      continue;
    }

    if (!currentItem) {
      introLines.push(line);
      continue;
    }

    const detailMatch = line.match(/^\*\*(.+?):\*\*\s*(.*)$/);
    if (detailMatch) {
      const rawLabel = detailMatch[1].trim().toLowerCase();
      const value = detailMatch[2].trim();
      currentBulletKey = null;
      flushDescriptionBuffer();

      if (rawLabel === "description") {
        if (value.length > 0) {
          currentItem.description = value;
        }
        continue;
      }

      if (rawLabel === "location") {
        assignDetail("location", value);
        continue;
      }

      if (rawLabel === "price") {
        assignDetail("price", value);
        continue;
      }

      if (rawLabel === "hours") {
        assignDetail("hours", value);
        continue;
      }

      if (rawLabel === "booking") {
        assignDetail("booking", value);
        continue;
      }

      if (rawLabel === "rating") {
        if (!currentItem.details) {
          currentItem.details = {};
        }

        const ratingMatch = value.match(/([0-9]+(?:\.[0-9]+)?)\s*\/\s*5(?:\s*\(([0-9,]+)\s+reviews?\))?/i);
        if (ratingMatch) {
          currentItem.details.ratingValue = parseFloat(ratingMatch[1]);
          if (ratingMatch[2]) {
            const count = parseInt(ratingMatch[2].replace(/,/g, ""), 10);
            if (!Number.isNaN(count)) {
              currentItem.details.ratingCount = count;
            }
          }
        }
        currentItem.details.ratingText = value;
        continue;
      }

      if (rawLabel === "tips") {
        currentBulletKey = "tips";
        if (value.length > 0) {
          const cleanedValue = value.replace(/^[-•]\s*/, "").trim();
          if (cleanedValue.length > 0) {
            bulletBuffers.tips.push(cleanedValue);
          }
        }
        continue;
      }

      if (rawLabel === "reviews summary") {
        assignDetail("reviewsSummary", value);
        continue;
      }

      if (rawLabel === "reviews highlights") {
        currentBulletKey = "reviewsHighlights";
        if (value.length > 0) {
          const cleanedValue = value.replace(/^[-•]\s*/, "").trim();
          if (cleanedValue.length > 0) {
            bulletBuffers.reviewsHighlights.push(cleanedValue);
          }
        }
        continue;
      }

      assignDetail(rawLabel as keyof ItemDetail, value);
      continue;
    }

    if (currentBulletKey && /^[-•]\s*(.+)$/.test(trimmed)) {
      const bulletText = trimmed.replace(/^[-•]\s*/, "").trim();
      if (bulletText.length > 0) {
        bulletBuffers[currentBulletKey].push(bulletText);
      }
      continue;
    }

    if (currentBulletKey && bulletBuffers[currentBulletKey].length > 0) {
      const lastIndex = bulletBuffers[currentBulletKey].length - 1;
      bulletBuffers[currentBulletKey][lastIndex] = `${bulletBuffers[currentBulletKey][lastIndex]} ${trimmed}`.trim();
      continue;
    }

    descriptionBuffer.push(trimmed);
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
    hasItemHeadings,
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
  const [itemExpansions, setItemExpansions] = useState<Record<string, {
    status: 'loading' | 'loaded' | 'error';
    content?: string;
  }>>({});

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
  const renderStructuredContent = (
    data: StructuredResponse,
    options?: { idPrefix?: string; sectionClassName?: string }
  ): ReactElement[] => {
    const baseId = options?.idPrefix ?? unit.id;

    return data.sections.flatMap((section, sectionIndex) => {
      const elements: ReactElement[] = [];

      // Section title
      if (section.title) {
        const defaultSectionTitleClass = "text-xl font-semibold tracking-tight mb-4 mt-8 first:mt-2 text-foreground";
        const sectionTitleClass = options?.sectionClassName
          ? `${defaultSectionTitleClass} ${options.sectionClassName}`
          : defaultSectionTitleClass;

        elements.push(
          <h3
            key={`${baseId}-section-title-${sectionIndex}`}
            className={sectionTitleClass}
          >
            {section.title}
          </h3>
        );
      }

      // Individual items - each wrapped in SaveableContent
      section.items.forEach((item, itemIndex) => {
        const itemId = `${baseId}-s${sectionIndex}-i${itemIndex}`;
        const isSaved = savedItemIds.has(itemId);
        const saveContent = formatRecommendationForSave(item, section.title);
        const rawSnippet = buildItemSnippet(item) || item.name || "";
        const snippet = rawSnippet.length > 280 ? `${rawSnippet.slice(0, 280)}…` : rawSnippet;
        const expansion = itemExpansions[itemId];

        const handleToggleExpansion = () => {
          if (!onElaborate || !snippet) {
            return;
          }

          let shouldFetch = true;
          setItemExpansions(prev => {
            const current = prev[itemId];
            if (current?.status === 'loading') {
              shouldFetch = false;
              return prev;
            }
            if (current?.status === 'loaded') {
              const updated = { ...prev };
              delete updated[itemId];
              shouldFetch = false;
              return updated;
            }
            return { ...prev, [itemId]: { status: 'loading' } };
          });

          if (!shouldFetch) {
            return;
          }

          void onElaborate(snippet, unit.id, itemId)
            .then(result => {
              setItemExpansions(prev => ({
                ...prev,
                [itemId]: { status: 'loaded', content: result }
              }));
            })
            .catch(() => {
              setItemExpansions(prev => ({
                ...prev,
                [itemId]: { status: 'error', content: 'Unable to load additional details right now.' }
              }));
            });
        };

        const ratingValue = item.details?.ratingValue;
        const ratingCount = item.details?.ratingCount;
        const ratingText = item.details?.ratingText;
        const hasRating =
          typeof ratingValue === "number" || (ratingText && ratingText.trim().length > 0);

        elements.push(
          <div
            key={itemId}
            className="mb-8 last:mb-0 transition-transform duration-300 ease-out hover:-translate-y-0.5 animate-in fade-in-50"
          >
            <SaveableContent
              content={saveContent}
              queryContext={unit.query}
              onSave={onSaveItem}
              isSaved={isSaved}
              itemId={itemId}
              onElaborate={onElaborate ? handleToggleExpansion : undefined}
              onMoreLike={onMoreLike && snippet ? () => onMoreLike(snippet, unit.query, unit.id) : undefined}
            >
              <div className="rounded-2xl bg-card/95 p-5 sm:p-6 transition-all duration-300">
                <div className="space-y-4">
                  {/* Item name + rating */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-lg sm:text-xl font-semibold text-foreground leading-tight">
                      {item.name}
                    </div>
                    {hasRating && (
                      <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                        <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                        {typeof ratingValue === "number" ? (
                          <div className="flex items-center gap-1">
                            <span>{ratingValue.toFixed(1)}</span>
                            <span className="text-xs text-primary/80">/5</span>
                            {typeof ratingCount === "number" && (
                              <span className="text-xs text-primary/80">
                                ({ratingCount.toLocaleString()} reviews)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-primary/80">{ratingText}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Item description */}
                  {item.description && (
                    <p className="text-base leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  )}

                  {/* Item details */}
                  {item.details && (
                    <div className="space-y-2 text-sm sm:text-base leading-relaxed">
                      {item.details.location && (
                        <div className="text-muted-foreground">
                          <span className="font-medium text-foreground">Location:</span>{" "}
                          {item.details.location}
                        </div>
                      )}
                      {item.details.price && (
                        <div className="text-muted-foreground">
                          <span className="font-medium text-foreground">Price:</span>{" "}
                          {item.details.price}
                        </div>
                      )}
                      {item.details.hours && (
                        <div className="text-muted-foreground">
                          <span className="font-medium text-foreground">Hours:</span>{" "}
                          {item.details.hours}
                        </div>
                      )}
                      {item.details.booking && (
                        <div className="text-muted-foreground">
                          <span className="font-medium text-foreground">Booking:</span>{" "}
                          {item.details.booking}
                        </div>
                      )}
                      {item.details.reviewsSummary && (
                        <div className="text-muted-foreground">
                          <span className="font-medium text-foreground">Review Summary:</span>{" "}
                          {item.details.reviewsSummary}
                        </div>
                      )}
                      {item.details.reviewsHighlights && item.details.reviewsHighlights.length > 0 && (
                        <div className="pt-1">
                          <div className="font-medium text-foreground mb-1">
                            Review Highlights
                          </div>
                          <ul className="space-y-1.5 text-muted-foreground ml-4 list-disc marker:text-primary/80">
                            {item.details.reviewsHighlights.map((highlight, highlightIndex) => (
                              <li key={`highlight-${highlightIndex}`}>
                                {highlight}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {item.details.tips && item.details.tips.length > 0 && (
                        <div className="pt-1">
                          <div className="font-medium text-foreground mb-1">
                            Tips
                          </div>
                          <ul className="space-y-1.5 text-muted-foreground ml-4 list-disc marker:text-primary">
                            {item.details.tips.map((tip, tipIndex) => (
                              <li key={`tip-${tipIndex}`}>
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {expansion?.status === 'loading' && (
                    <div className="mt-4 rounded-xl border border-dashed border-border/60 bg-muted/40 p-4 text-sm text-muted-foreground">
                      Expanding this recommendation…
                    </div>
                  )}

                  {expansion?.status === 'error' && expansion.content && (
                    <div className="mt-4 rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                      {expansion.content}
                    </div>
                  )}

                  {expansion?.status === 'loaded' && expansion.content && (
                    (() => {
                      const parsedExpansion = parseMarkdownRecommendations(expansion.content, false);
                      const hasStructuredItems = parsedExpansion?.sections.some(section => section.items.length > 0);

                      if (parsedExpansion && hasStructuredItems) {
                        return (
                          <div className="mt-4 space-y-4">
                            {parsedExpansion.intro && (
                              <div
                                className="rounded-xl border border-border/50 bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground"
                                dangerouslySetInnerHTML={{ __html: formatMarkdownToHtml(parsedExpansion.intro) }}
                              />
                            )}
                            {renderStructuredContent(
                              { intro: parsedExpansion.intro, sections: parsedExpansion.sections },
                              { idPrefix: `${itemId}-exp`, sectionClassName: "text-lg font-semibold tracking-tight mb-3 mt-6 first:mt-2 text-foreground" }
                            )}
                          </div>
                        );
                      }

                      return (
                        <div className="mt-4 rounded-xl border border-border/50 bg-muted/30 p-4">
                          <div className="mb-2 text-sm font-semibold text-foreground">Deeper dive</div>
                          <div
                            className="prose prose-sm max-w-none text-muted-foreground"
                            dangerouslySetInnerHTML={{ __html: formatMarkdownToHtml(expansion.content) }}
                          />
                        </div>
                      );
                    })()
                  )}
                </div>
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

    const parsed = parseMarkdownRecommendations(content, Boolean(unit.isStreaming));

    if (parsed) {
      const { intro, sections, hasItemHeadings, hasPartialItem } = parsed;
      const hasItems = sections.some(section => section.items.length > 0);

      if (hasItems) {
        if (intro.length > 0) {
          elements.push(
            <div key="intro" className="mb-4 text-base leading-relaxed text-muted-foreground">
              {intro}
            </div>
          );
        }

        elements.push(...renderStructuredContent({ intro, sections }));
        return elements;
      }

      if (unit.isStreaming) {
        if (intro.length > 0) {
          return [
            <div key="intro-streaming" className="mb-4 text-base leading-relaxed text-muted-foreground">
              {intro}
            </div>
          ];
        }

        if (hasItemHeadings || hasPartialItem) {
          return [];
        }
      } else if (intro.length > 0 && !hasItemHeadings && !hasPartialItem) {
        // Completed stream but only intro prose; fall back to markdown renderer
        return renderMarkdownContent(content);
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
      <Card className="relative overflow-hidden rounded-lg border border-border bg-card transition-all hover:border-primary/30 hover:shadow-lg">
        {unit.isStreaming && (
          <div className="absolute inset-x-0 top-0 h-1 bg-primary/20">
            <div className="h-full w-1/2 animate-pulse rounded-r-full bg-primary/60" />
          </div>
        )}
        <div className="px-6 py-5">
          {/* Query Header */}
          <div className="mb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-primary leading-tight mb-1">
                  {unit.refinedTitle || unit.query}
                </h3>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground/80">
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 font-medium text-primary/80">
                    {unit.query}
                  </span>
                  {unit.isStreaming && (
                    <span className="text-[11px] uppercase tracking-[0.3em] text-primary/70">Live</span>
                  )}
                </div>
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
