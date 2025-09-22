import { Globe, MapPin, Sparkles } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { formatMarkdownToHtml } from "@/utils/formatMarkdown";
import { SaveableContent, SavedItem } from "./SaveableContent";
import { ThreadedQuery } from "./ThreadedQuery";
import { useEffect, useRef, useState } from "react";

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
}

interface AdUnit {
  id: string;
  title: string;
  description: string;
  sponsor: string;
  url?: string;
}

interface SearchUnitProps {
  unit: SearchUnitData;
  cityName: string;
  isFirst: boolean;
  isLatest: boolean;
  onSaveItem: (item: SavedItem) => void;
  onThreadQuery: (query: string, context: string) => Promise<string>;
  savedItemIds?: Set<string>;
}

// Generate dynamic ads based on city and query
function generateAds(cityName: string, query: string): AdUnit[] {
  const baseAds: AdUnit[] = [
    {
      id: `ad-1-${Date.now()}`,
      sponsor: "Booking.com",
      title: `Hotels in ${cityName} - Up to 50% Off`,
      description: `Book now and save on ${cityName} hotels. Free cancellation on most rooms. Price guarantee. 24/7 customer service.`
    },
    {
      id: `ad-2-${Date.now()}`,
      sponsor: "GetYourGuide",
      title: `${cityName} Tours & Activities - Book Online`,
      description: `Skip-the-line tickets • Expert guides • Small groups • Free cancellation. Best price guaranteed for all ${cityName} attractions.`
    },
    {
      id: `ad-3-${Date.now()}`,
      sponsor: "TripAdvisor",
      title: `${cityName} Restaurant Reservations`,
      description: `Reserve tables at top-rated restaurants. Read millions of reviews. Find the perfect dining experience in ${cityName}.`
    }
  ];

  // Add query-specific ads
  if (query.toLowerCase().includes("food") || query.toLowerCase().includes("restaurant") || query.toLowerCase().includes("eat")) {
    baseAds.unshift({
      id: `ad-food-${Date.now()}`,
      sponsor: "OpenTable",
      title: `Book ${cityName} Restaurants - Earn Points`,
      description: `Instant confirmation • 1000+ restaurants • Earn dining rewards. Find and book the perfect table.`
    });
  }

  if (query.toLowerCase().includes("hotel") || query.toLowerCase().includes("stay") || query.toLowerCase().includes("accommodation")) {
    baseAds.unshift({
      id: `ad-hotel-${Date.now()}`,
      sponsor: "Expedia",
      title: `${cityName} Hotels + Flight Packages`,
      description: `Save up to 30% when you book flight and hotel together. Member prices available.`
    });
  }

  if (query.toLowerCase().includes("pizza")) {
    baseAds.unshift({
      id: `ad-pizza-${Date.now()}`,
      sponsor: "Uber Eats",
      title: `${cityName} Pizza Delivery - Order Now`,
      description: `Get pizza delivered fast. Track your order in real-time. Special offers available.`
    });
  }

  return baseAds.slice(0, 4);
}

export function SearchUnit({
  unit,
  cityName,
  isFirst: _isFirst,
  isLatest,
  onSaveItem,
  onThreadQuery,
  savedItemIds = new Set()
}: SearchUnitProps) {
  // Generate ads dynamically based on current query - no useState to ensure they update
  const ads = generateAds(cityName, unit.query);
  const unitRef = useRef<HTMLDivElement>(null);
  const [activeThreads, setActiveThreads] = useState<Set<number>>(new Set());

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

    return paragraphs.map((paragraph, index) => {
      const paragraphId = `${unit.id}-p-${index}`;
      const isSaved = savedItemIds.has(paragraphId);
      const hasThread = activeThreads.has(index);

      // Skip very short paragraphs or headers
      if (paragraph.length < 50 || paragraph.startsWith('#')) {
        return (
          <div key={index}>
            <div
              dangerouslySetInnerHTML={{ __html: formatMarkdownToHtml(paragraph) }}
              className="mb-4"
            />
          </div>
        );
      }

      const handleAskMore = () => {
        setActiveThreads(prev => new Set([...prev, index]));
      };

      const handleCloseThread = () => {
        setActiveThreads(prev => {
          const newSet = new Set(prev);
          newSet.delete(index);
          return newSet;
        });
      };

      return (
        <div key={index}>
          <SaveableContent
            content={paragraph}
            queryContext={unit.query}
            onSave={onSaveItem}
            onAskMore={hasThread ? undefined : handleAskMore}
            isSaved={isSaved}
            showThread={hasThread}
          >
            <div
              dangerouslySetInnerHTML={{ __html: formatMarkdownToHtml(paragraph) }}
              className="mb-4"
            />
          </SaveableContent>

          {hasThread && (
            <ThreadedQuery
              parentContent={paragraph}
              parentQuery={unit.query}
              cityName={cityName}
              onClose={handleCloseThread}
              onSubmit={onThreadQuery}
              onSaveItem={onSaveItem}
              savedItemIds={savedItemIds}
            />
          )}
        </div>
      );
    });
  };

  return (
    <div
      ref={unitRef}
      className={`search-unit mb-8 ${isLatest ? 'animate-slide-down' : ''}`}
    >
      {/* Ad Block - Top (always show) */}
      <Card className="mb-4 p-4 bg-slate-50/50 dark:bg-slate-900/20 border">
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
          <Globe className="w-3 h-3" />
          <span>Sponsored</span>
        </div>
        <div className="space-y-3">
          {ads.slice(0, 2).map((ad) => (
            <div
              key={ad.id}
              className="bg-background p-3 rounded-lg border hover:shadow-sm transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 px-2 py-0.5 rounded">
                      Ad
                    </span>
                    <span className="text-xs text-muted-foreground">{ad.sponsor}</span>
                  </div>
                  <h4 className="text-blue-600 dark:text-blue-400 font-medium text-sm hover:underline">
                    {ad.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {ad.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Main Content Unit */}
      <Card className="p-6 shadow-lg hover:shadow-xl transition-shadow">
        {/* Query Header */}
        <div className="pb-4 mb-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              {unit.query}
            </h3>
            <span className="text-xs text-muted-foreground">
              {new Date(unit.timestamp).toLocaleTimeString()}
            </span>
          </div>
        </div>

        {/* Response Content */}
        <div className="travel-content text-base leading-relaxed">
          {unit.isStreaming ? (
            <div className="flex items-center gap-2 mb-4">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
              <span className="text-sm text-muted-foreground">
                Searching {cityName}...
              </span>
            </div>
          ) : null}

          <div className="space-y-2">
            {renderSaveableContent(unit.response)}
          </div>
        </div>

        {/* Related Places (if any) */}
        {unit.searchResults && unit.searchResults.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="text-sm font-medium mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Related Places
            </div>
            <div className="space-y-2">
              {unit.searchResults.map((place, idx) => (
                <div key={idx} className="p-2 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{place.name}</div>
                      <div className="text-xs text-muted-foreground">
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
      </Card>

      {/* Ad Block - Bottom (always show) */}
      <Card className="mt-4 p-4 bg-slate-50/50 dark:bg-slate-900/20 border">
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
          <Globe className="w-3 h-3" />
          <span>Sponsored</span>
        </div>
        <div className="space-y-3">
          {ads.slice(2, 4).map((ad) => (
            <div
              key={ad.id}
              className="bg-background p-3 rounded-lg border hover:shadow-sm transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 px-2 py-0.5 rounded">
                      Ad
                    </span>
                    <span className="text-xs text-muted-foreground">{ad.sponsor}</span>
                  </div>
                  <h4 className="text-blue-600 dark:text-blue-400 font-medium text-sm hover:underline">
                    {ad.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {ad.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}