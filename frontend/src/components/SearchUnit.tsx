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

interface SuggestionLine {
  text: string;
  indent: number;
}

interface SuggestionBlock {
  lines: SuggestionLine[];
}

const MAX_LABEL_LENGTH = 120;

const indentationClassForLevel = (indent: number): string => {
  if (indent >= 3) return "pl-8";
  if (indent === 2) return "pl-6";
  if (indent === 1) return "pl-4";
  return "";
};

const buildSuggestionBlocks = (lines: string[]): SuggestionBlock[] => {
  const blocks: SuggestionBlock[] = [];
  let current: SuggestionLine[] = [];
  let expectingDetail = false;

  const flushCurrent = () => {
    if (current.length > 0) {
      blocks.push({ lines: current });
      current = [];
    }
    expectingDetail = false;
  };

  lines.forEach(rawLine => {
    const sanitized = rawLine.replace(/\r/g, "");
    if (sanitized.trim().length === 0) {
      flushCurrent();
      return;
    }

    const leadingWhitespace = sanitized.match(/^\s*/)?.[0].length ?? 0;
    const indentLevel = leadingWhitespace > 0 ? Math.floor(leadingWhitespace / 2) : 0;

    let trimmed = sanitized.trim();
    const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);
    if (bulletMatch) {
      trimmed = bulletMatch[1].trim();
    }

    const colonIndex = trimmed.indexOf(":");
    const hasInlineDetail = colonIndex > -1 && colonIndex < trimmed.length - 1;
    const endsWithColon = colonIndex > -1 && colonIndex === trimmed.length - 1;
    const looksLikeLabel = colonIndex > -1 && colonIndex <= MAX_LABEL_LENGTH;

    const isTopLevelBullet = Boolean(bulletMatch) && indentLevel === 0;
    const shouldStartNewBlock =
      current.length === 0 ||
      isTopLevelBullet ||
      (!expectingDetail &&
        indentLevel === 0 &&
        (
          (hasInlineDetail && looksLikeLabel) ||
          (endsWithColon && !hasInlineDetail)
        )
      );

    if (shouldStartNewBlock) {
      if (current.length > 0) {
        flushCurrent();
      }
      current = [{
        text: trimmed,
        indent: 0
      }];
      expectingDetail = endsWithColon && !hasInlineDetail;
      return;
    }

    // Append to current block
    const effectiveIndent = indentLevel > 0 || expectingDetail ? Math.max(indentLevel, 1) : indentLevel;
    current.push({
      text: trimmed,
      indent: effectiveIndent
    });

    expectingDetail = endsWithColon && !hasInlineDetail;
  });

  flushCurrent();

  if (blocks.length === 0) {
    const fallbackSegments = lines.join("\n")
      .split(/\n\s*\n/)
      .map(segment => segment.trim())
      .filter(Boolean);

    if (fallbackSegments.length > 0) {
      return fallbackSegments.map(segment => ({
        lines: segment.split(/\n+/).map(part => ({
          text: part.trim(),
          indent: 0
        }))
      }));
    }

    const combined = lines.join(" ").trim();
    return combined ? [{ lines: [{ text: combined, indent: 0 }] }] : [];
  }

  return blocks;
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

  // Parse response into saveable sections
  const renderSaveableContent = (content: string) => {
    // Split content by numbered sections first (1., 2., 3., etc.)
    // This keeps each numbered section with all its nested content as ONE unit
    const numberedSectionRegex = /(?=^\d+\.\s+)/gm;
    const sections = content.split(numberedSectionRegex).filter(s => s.trim().length > 0);

    return sections.reduce<ReactElement[]>((acc, section, index) => {
      const sectionId = `${unit.id}-section-${index}`;
      const isSaved = savedItemIds.has(sectionId);

      const normalized = section.trim();
      if (!normalized) {
        return acc;
      }

      const isHeaderOnly = normalized.startsWith('#');
      const elementKey = `${unit.id}-chunk-${index}`;

      if (isHeaderOnly) {
        acc.push(
          <div
            key={elementKey}
            className="travel-content font-semibold [&_h1]:text-primary [&_h2]:text-primary [&_h3]:text-primary"
          >
            <div dangerouslySetInnerHTML={{ __html: formatMarkdownToHtml(normalized) }} />
          </div>
        );
        return acc;
      }

      const isNumberedSection = /^\d+\.\s+/.test(normalized);

      if (isNumberedSection) {
        const match = normalized.match(/^(\d+)\.\s*([\s\S]*)$/);
        const sectionNumber = match?.[1] ?? "";
        const remainderRaw = match?.[2] ?? "";
        const remainderLines = remainderRaw.replace(/\r/g, "").split("\n");

        let titleText = "";
        let bodyLinesRaw: string[] = [];

        if (remainderLines.length > 0) {
          const firstContentIndex = remainderLines.findIndex(line => line.trim().length > 0);
          if (firstContentIndex !== -1) {
            const candidate = remainderLines[firstContentIndex];
            const trimmedCandidate = candidate.trim();
            const isLikelyTitle = !/^[-*•]\s+/.test(trimmedCandidate) && !/^\d+\.\s+/.test(trimmedCandidate) && !trimmedCandidate.includes(":");

            if (isLikelyTitle) {
              titleText = trimmedCandidate;
              bodyLinesRaw = remainderLines.slice(firstContentIndex + 1);
            } else {
              bodyLinesRaw = remainderLines.slice(firstContentIndex);
            }
          }
        }

        const suggestionBlocks = buildSuggestionBlocks(bodyLinesRaw);

        if (suggestionBlocks.length === 0) {
          const fallbackBody = remainderRaw.trim();
          acc.push(
            <div key={elementKey} className="mb-6 last:mb-0">
              <SaveableContent
                content={section}
                queryContext={unit.query}
                onSave={onSaveItem}
                isSaved={isSaved}
                onElaborate={onElaborate ? () => onElaborate(section, unit.query, unit.id) : undefined}
                onMoreLike={onMoreLike ? () => onMoreLike(section, unit.query, unit.id) : undefined}
              >
                <div className="flex items-start gap-4">
                  <div className="text-lg font-semibold text-primary leading-none mt-0.5">
                    {sectionNumber}.
                  </div>
                  <div className="flex-1 space-y-4">
                    {titleText && (
                      <div className="text-lg font-semibold text-foreground leading-snug">
                        {titleText}
                      </div>
                    )}
                    {fallbackBody && (
                      <div
                        dangerouslySetInnerHTML={{ __html: formatMarkdownToHtml(fallbackBody) }}
                        className="travel-content text-base leading-relaxed [&_p]:mb-4 [&_p:last-child]:mb-0 [&_a]:text-primary [&_a]:underline [&_strong]:text-foreground [&_em]:text-muted-foreground"
                      />
                    )}
                  </div>
                </div>
              </SaveableContent>
            </div>
          );
          return acc;
        }

        acc.push(
          <div key={elementKey} className="mb-8 last:mb-0">
            <div className="flex items-start gap-4">
              <div className="text-lg font-semibold text-primary leading-none mt-0.5">
                {sectionNumber}.
              </div>
              <div className="flex-1 space-y-4">
                {titleText && (
                  <div className="text-lg font-semibold text-foreground leading-snug">
                    {titleText}
                  </div>
                )}
                <div className="space-y-3">
                  {suggestionBlocks.map((block, suggestionIndex) => {
                    if (block.lines.length === 0) {
                      return null;
                    }

                    const suggestionId = `${sectionId}-suggestion-${suggestionIndex}`;
                    const suggestionContent = block.lines
                      .map(line => `${"  ".repeat(line.indent)}${line.text}`)
                      .join("\n")
                      .trim();
                    const suggestionSaved = savedItemIds.has(suggestionId);

                    const [firstLine, ...detailLines] = block.lines;
                    const firstText = firstLine.text;
                    const firstColonIndex = firstText.indexOf(":");
                    const firstHasInlineDetail = firstColonIndex > -1 && firstColonIndex < firstText.length - 1;
                    const firstEndsWithColon = firstColonIndex > -1 && firstColonIndex === firstText.length - 1;
                    const firstLabel = firstColonIndex > -1 ? firstText.slice(0, firstColonIndex).trim() : firstText.trim();
                    const firstDetail = firstHasInlineDetail ? firstText.slice(firstColonIndex + 1).trim() : "";

                    const detailElements = detailLines
                      .filter(line => line.text.trim().length > 0)
                      .map((detailLine, detailIndex) => {
                        const detailText = detailLine.text;
                        const colonIndex = detailText.indexOf(":");
                        const hasInlineDetail = colonIndex > -1 && colonIndex < detailText.length - 1;
                        const endsWithColon = colonIndex > -1 && colonIndex === detailText.length - 1;
                        const label = colonIndex > -1 ? detailText.slice(0, colonIndex).trim() : detailText.trim();
                        const value = hasInlineDetail ? detailText.slice(colonIndex + 1).trim() : "";
                        const indentClass = indentationClassForLevel(detailLine.indent);

                        return (
                          <div
                            key={`${suggestionId}-detail-${detailIndex}`}
                            className={`${indentClass} text-sm leading-relaxed text-muted-foreground`}
                          >
                            {hasInlineDetail ? (
                              <>
                                <span className="font-medium text-foreground">{label}:</span>{" "}
                                {value}
                              </>
                            ) : endsWithColon ? (
                              <span className="font-medium text-foreground">{label}:</span>
                            ) : (
                              label
                            )}
                          </div>
                        );
                      });

                    return (
                      <SaveableContent
                        key={`${suggestionId}`}
                        content={suggestionContent || firstText}
                        queryContext={unit.query}
                        onSave={onSaveItem}
                        isSaved={suggestionSaved}
                        onElaborate={onElaborate ? () => onElaborate(suggestionContent || firstText, unit.query, unit.id) : undefined}
                        onMoreLike={onMoreLike ? () => onMoreLike(suggestionContent || firstText, unit.query, unit.id) : undefined}
                      >
                        <div className="space-y-1.5">
                          {firstHasInlineDetail ? (
                            <div className="text-base leading-relaxed">
                              <span className="font-semibold text-foreground">{firstLabel}:</span>{" "}
                              <span className="text-muted-foreground">{firstDetail}</span>
                            </div>
                          ) : (
                            <div className="text-base font-semibold text-foreground leading-snug">
                              {firstLabel}
                              {firstEndsWithColon ? ":" : ""}
                            </div>
                          )}
                          {detailElements.length > 0 && (
                            <div className="space-y-1.5 pt-0.5">
                              {detailElements}
                            </div>
                          )}
                        </div>
                      </SaveableContent>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );

        return acc;
      }

      acc.push(
        <div key={elementKey} className="mb-6 last:mb-0">
          <SaveableContent
            content={section}
            queryContext={unit.query}
            onSave={onSaveItem}
            isSaved={isSaved}
            onElaborate={onElaborate ? () => onElaborate(section, unit.query, unit.id) : undefined}
            onMoreLike={onMoreLike ? () => onMoreLike(section, unit.query, unit.id) : undefined}
          >
            <div
              dangerouslySetInnerHTML={{ __html: formatMarkdownToHtml(section) }}
              className="travel-content text-base leading-relaxed [&_p]:mb-4 [&_a]:text-primary [&_a]:underline [&_strong]:text-foreground [&_em]:text-muted-foreground"
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
