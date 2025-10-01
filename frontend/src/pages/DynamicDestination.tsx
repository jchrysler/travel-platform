import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Sparkles, MapPin, BookOpen, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SearchUnit } from "@/components/SearchUnit";
import { SavedItemsList } from "@/components/SavedItemsList";
import type { SavedItem } from "@/components/SaveableContent";
import { deslugify } from "@/utils/slugify";
import {
  trackDestinationVisit,
  getDestinationGuides,
  saveGuide,
  type Guide
} from "@/utils/guideStorage";
import { refineQueryToTitle, generateSmartGuideTitle } from "@/utils/titleRefinement";
import { getDestinationHeroContent } from "@/lib/destinationContent";

interface SearchUnitData {
  id: string;
  query: string;
  response: string;
  searchResults?: PlaceResult[];
  timestamp: Date;
  isStreaming?: boolean;
}

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

export default function DynamicDestination() {
  const { destination, mode, id } = useParams<{ destination: string; mode?: string; id?: string }>();
  const navigate = useNavigate();
  const destinationName = destination ? deslugify(destination) : "";

  const [customQuery, setCustomQuery] = useState("");
  const [searchUnits, setSearchUnits] = useState<SearchUnitData[]>([]);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [savedItemIds, setSavedItemIds] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [currentStreamingId, setCurrentStreamingId] = useState<string | null>(null);
  const [existingGuides, setExistingGuides] = useState<Guide[]>([]);
  const [showSaveGuide, setShowSaveGuide] = useState(false);
  const [guideTitle, setGuideTitle] = useState("");
  const [guideDescription, setGuideDescription] = useState("");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [refinedTitles, setRefinedTitles] = useState<Map<string, string>>(new Map());
  const [smartTitle, setSmartTitle] = useState<{ title: string; subtitle: string } | null>(null);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const heroContent = getDestinationHeroContent(destination ?? "");
  const readableDestination = destinationName || "this destination";
  const combinedPopularQueries = Array.from(
    new Set([
      ...heroContent.suggestedSearches,
      `Best things to do in ${readableDestination}`,
      `Top restaurants in ${readableDestination}`,
      `Hidden gems in ${readableDestination}`,
      `${readableDestination} travel tips`,
      `Best time to visit ${readableDestination}`,
      `Where to stay in ${readableDestination}`,
      `Local food to try in ${readableDestination}`,
      `Day trips from ${readableDestination}`,
      `${readableDestination} nightlife guide`,
      `Budget travel ${readableDestination}`,
    ]),
  );

  const featuredPromotions = [
    {
      tag: "Featured stay",
      title: `Boutique hotels in ${destinationName}`,
      body: "Hand-picked suites with rooftop views, late check-out, and breakfast included. Partner offers refresh daily.",
      cta: "Browse partner stays",
    },
    {
      tag: "Curated experience",
      title: `Top tours running this week`,
      body: "Reserve small-group experiences with instant confirmation. Food crawls, guided art walks, and hidden local workshops.",
      cta: "See experiences",
    },
  ];

  useEffect(() => {
    if (destination) {
      // Track visit
      trackDestinationVisit(destinationName, destination);

      // Load existing guides
      const guides = getDestinationGuides(destination);
      setExistingGuides(guides);

      // If we have a draft ID in the URL, set it
      if (mode === 'draft' && id) {
        setDraftId(id);
        // TODO: Load draft from localStorage if exists
      }
    }
  }, [destination, destinationName, mode, id]);

  const handleCustomSearch = async () => {
    if (!customQuery.trim() || !destination) return;
    await performSearch(customQuery);
    setCustomQuery("");
  };

  const handleSuggestedSearch = async (query: string) => {
    if (!query.trim()) return;
    setCustomQuery("");
    await performSearch(query);
  };


  const performSearch = async (query: string) => {
    if (!destination) return;

    // If this is the first search and we don't have a draft ID, create one and navigate
    if (searchUnits.length === 0 && !draftId) {
      const newDraftId = `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setDraftId(newDraftId);
      navigate(`/explore/${destination}/draft/${newDraftId}`, { replace: true });
    }

    setIsSearching(true);
    const unitId = Date.now().toString();
    setCurrentStreamingId(unitId);

    // Generate refined title for this query
    const refinedTitle = refineQueryToTitle(query, destinationName);
    setRefinedTitles(prev => new Map(prev).set(unitId, refinedTitle));

    // Add new streaming unit immediately
    const newUnit: SearchUnitData = {
      id: unitId,
      query,
      response: "",
      timestamp: new Date(),
      isStreaming: true
    };
    setSearchUnits(prev => [newUnit, ...prev]);
    requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    try {
      const response = await fetch("/api/travel/explore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: destinationName,
          query: query,
        }),
      });

      if (!response.ok) throw new Error("Search failed");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No response stream");

      let fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              // Mark streaming as complete
              setSearchUnits(prev => prev.map(unit =>
                unit.id === unitId
                  ? { ...unit, response: fullResponse, isStreaming: false }
                  : unit
              ));
              setCurrentStreamingId(null);
              setIsSearching(false);
            } else {
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullResponse += parsed.content;
                  // Update the streaming unit's response
                  setSearchUnits(prev => prev.map(unit =>
                    unit.id === unitId
                      ? { ...unit, response: fullResponse }
                      : unit
                  ));
                }
              } catch (e) {
                console.error("Parse error:", e);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Search error:", err);
      setIsSearching(false);
    }
  };

  // Handlers for saved items
  const handleSaveItem = (item: SavedItem) => {
    setSavedItems(prev => [item, ...prev]);
    setSavedItemIds(prev => new Set([...prev, item.id]));
  };

  const handleRemoveItem = (id: string) => {
    setSavedItems(prev => prev.filter(item => item.id !== id));
    setSavedItemIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const handleClearAll = () => {
    setSavedItems([]);
    setSavedItemIds(new Set());
  };

  const handleDeleteSearch = (id: string) => {
    setSearchUnits(prev => prev.filter(unit => unit.id !== id));
  };

  const handleSaveGuide = async () => {
    const finalTitle = guideTitle.trim() || smartTitle?.title || `${destinationName} Guide`;
    const finalDescription = guideDescription.trim() || smartTitle?.subtitle || '';

    if (searchUnits.length === 0) return;

    const queries = searchUnits.map(unit => unit.query);
    const responses = searchUnits.map(unit => unit.response);
    const sectionTitles = searchUnits.map(unit =>
      refinedTitles.get(unit.id) || refineQueryToTitle(unit.query, destinationName)
    );

    const guide = saveGuide(
      destinationName,
      finalTitle,
      queries,
      responses,
      finalDescription,
      sectionTitles
    );

    // Navigate to the new guide
    navigate(`/explore/${destination}/${guide.slug}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroContent.imageUrl}
            alt={heroContent.imageAlt}
            className="h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-background" />
        </div>
        <div className="relative z-10">
          <div className="container mx-auto flex min-h-[520px] max-w-6xl flex-col justify-end gap-8 px-4 py-24">
            <div className="flex flex-col gap-6 text-white md:max-w-3xl">
              <Link
                to="/explore"
                className="inline-flex w-fit items-center gap-2 text-sm font-medium text-white/70 transition hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Explore more destinations
              </Link>

              <div className="flex items-center gap-2 text-sm uppercase tracking-wide text-white/70">
                <MapPin className="h-4 w-4" />
                {destinationName}
              </div>

              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                {heroContent.title}
              </h1>
              <p className="text-xl font-medium text-white/85">{heroContent.subtitle}</p>
              <p className="text-base text-white/80 md:text-lg">
                {heroContent.description}
              </p>

              <div className="flex flex-wrap gap-2">
                {heroContent.highlights.map((highlight) => (
                  <span
                    key={highlight}
                    className="rounded-full border border-white/30 bg-white/10 px-4 py-1 text-sm text-white/85 backdrop-blur"
                  >
                    {highlight}
                  </span>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCustomSearch();
                }}
                className="mt-2 flex flex-col gap-3 sm:flex-row"
              >
                <Input
                  value={customQuery}
                  onChange={(e) => setCustomQuery(e.target.value)}
                placeholder={`What do you want to plan in ${readableDestination}?`}
                  disabled={isSearching}
                  className="h-14 flex-1 border-white/30 bg-white/15 text-lg text-white placeholder:text-white/70 shadow-lg backdrop-blur focus-visible:ring-white/80"
                />
                <Button
                  type="submit"
                  size="lg"
                  disabled={isSearching || !customQuery.trim()}
                  className="h-14 px-8 text-lg shadow-lg"
                >
                  <Search className="mr-2 h-5 w-5" />
                  Start planning
                </Button>
              </form>

              {heroContent.suggestedSearches.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-sm text-white/70">
                  <span className="text-xs uppercase tracking-wide text-white/50">Try:</span>
                  {heroContent.suggestedSearches.map((query) => (
                    <Button
                      key={query}
                      type="button"
                      variant="secondary"
                      onClick={() => handleSuggestedSearch(query)}
                      disabled={isSearching}
                      className="border-white/20 bg-white/15 text-white hover:bg-white/25"
                    >
                      {query}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section ref={resultsRef} className="relative z-10 -mt-16 pb-24">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="grid gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
            <div className="space-y-6">
              <Card className="overflow-hidden border-none bg-gradient-to-br from-primary/20 via-primary/10 to-background p-0 shadow-2xl">
                <div className="space-y-5 px-6 py-6">
                  <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-primary-foreground/80">
                    <Sparkles className="h-4 w-4" />
                    Intelligent trip composer
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-2xl font-semibold text-primary-foreground">
                      Plan your perfect {readableDestination} moment
                    </h2>
                    <p className="text-sm text-primary-foreground/80">
                      Ask for anything—from progressive dinners to sunrise hikes—and we will stitch together the logistics, timing, and insider tips in seconds.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Input
                      value={customQuery}
                      onChange={(e) => setCustomQuery(e.target.value)}
                      placeholder={`Ask about ${readableDestination}...`}
                      onKeyDown={(e) => e.key === "Enter" && handleCustomSearch()}
                      disabled={isSearching}
                      className="h-12 flex-1 border-white/20 bg-white/20 text-base text-primary-foreground placeholder:text-primary-foreground/70 backdrop-blur"
                    />
                    <Button
                      onClick={handleCustomSearch}
                      disabled={isSearching || !customQuery.trim()}
                      className="h-12 px-6 text-base"
                    >
                      <Search className="mr-2 h-4 w-4" />
                      Generate
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {combinedPopularQueries.slice(0, 6).map((query) => (
                      <button
                        key={query}
                        type="button"
                        onClick={() => handleSuggestedSearch(query)}
                        disabled={isSearching}
                        className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium text-primary-foreground/90 transition hover:bg-white/20"
                      >
                        {query}
                      </button>
                    ))}
                  </div>
                </div>
              </Card>

              {existingGuides.length > 0 && (
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                    <BookOpen className="h-4 w-4 text-primary" />
                    Hand-crafted guides
                  </h3>
                  <div className="space-y-2">
                    {existingGuides.map((guide) => (
                      <Link
                        key={guide.id}
                        to={`/explore/${destination}/${guide.slug}`}
                        className="block rounded-lg border bg-card p-3 transition hover:border-primary"
                      >
                        <div className="font-medium">{guide.title}</div>
                        {(guide.subtitle || guide.description) && (
                          <div className="mt-1 text-sm text-muted-foreground">
                            {guide.subtitle || guide.description}
                          </div>
                        )}
                        <div className="mt-2 text-xs text-muted-foreground">
                          {guide.views} views • {guide.queries.length} topics
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <Card className="p-6">
                <h3 className="text-lg font-semibold">Popular sparks</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tap to jump-start ideas locals are searching for right now.
                </p>
                <div className="mt-4 space-y-2">
                  {combinedPopularQueries.slice(0, 8).map((query) => (
                    <button
                      key={query}
                      onClick={() => handleSuggestedSearch(query)}
                      disabled={isSearching}
                      className="flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm font-medium transition hover:border-primary hover:text-primary"
                    >
                      <span>{query}</span>
                      <span className="text-muted-foreground">→</span>
                    </button>
                  ))}
                </div>
              </Card>

              {featuredPromotions.map((promo) => (
                <Card key={promo.title} className="overflow-hidden border-primary/20 shadow-xl">
                  <div className="bg-gradient-to-r from-primary/15 via-primary/10 to-transparent px-6 py-5">
                    <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                      <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
                        {promo.tag}
                      </Badge>
                      <span className="text-primary/90">Sponsored</span>
                    </div>
                    <h3 className="mt-4 text-xl font-semibold text-primary">
                      {promo.title}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {promo.body}
                    </p>
                    <Button className="mt-4" variant="secondary">
                      {promo.cta}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            <div className="lg:col-span-1 lg:col-start-2">
              <div className="space-y-4">
                {searchUnits.map((unit, index) => (
                  <SearchUnit
                    key={unit.id}
                    unit={unit}
                    cityName={destinationName}
                    isFirst={index === searchUnits.length - 1}
                    isLatest={index === 0 && unit.id === currentStreamingId}
                    onSaveItem={handleSaveItem}
                    savedItemIds={savedItemIds}
                    onDelete={handleDeleteSearch}
                    showDelete={searchUnits.length > 0}
                  />
                ))}

                {searchUnits.length === 0 && !isSearching && (
                  <Card className="p-12 text-center">
                    <Sparkles className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">
                      Start exploring {readableDestination}
                    </h3>
                    <p className="text-muted-foreground">
                      Ask any question or tap a suggested idea to generate a ready-to-run plan.
                    </p>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Saved Items Sidebar */}
      <SavedItemsList
        items={savedItems}
        onRemove={handleRemoveItem}
        onClearAll={handleClearAll}
        cityName={destinationName}
        destinationSlug={destination}
      />

      {/* Floating Save Guide Button */}
      {searchUnits.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            size="lg"
            className="shadow-lg"
            onClick={() => setShowSaveGuide(true)}
          >
            <Save className="w-5 h-5 mr-2" />
            Save Guide {searchUnits.length > 0 && `(${searchUnits.length})`}
          </Button>
        </div>
      )}

      {/* Save Guide Modal */}
      {showSaveGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-3xl overflow-hidden border border-border/60 shadow-2xl">
            <div className="flex items-start justify-between border-b border-border/60 bg-muted/50 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Save & share</p>
                <h2 className="mt-2 text-2xl font-semibold">Preserve your {destinationName} blueprint</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Name it, add a note, and we will keep every section intact for future edits or sharing with travel friends.
                </p>
              </div>
              <Badge variant="outline">Beta</Badge>
            </div>

            {/* Generate smart title in background */}
            {!smartTitle && !isGeneratingTitle && (() => {
              setIsGeneratingTitle(true);
              generateSmartGuideTitle(
                destinationName,
                searchUnits.map((u) => u.query),
                searchUnits.map((u) => u.response)
              ).then((result) => {
                setSmartTitle(result);
                if (!guideTitle) {
                  setGuideTitle(result.title);
                  setGuideDescription(result.subtitle);
                }
                setIsGeneratingTitle(false);
              });
              return null;
            })()}

            <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Guide Title</label>
                  <Input
                    value={guideTitle}
                    onChange={(e) => setGuideTitle(e.target.value)}
                    placeholder={smartTitle?.title || `My ${destinationName} guide`}
                    className="h-12 text-lg"
                    autoFocus
                  />
                  {smartTitle && !guideTitle && (
                    <p className="text-xs text-muted-foreground">Suggested: {smartTitle.title}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Companion Notes</label>
                  <Textarea
                    value={guideDescription}
                    onChange={(e) => setGuideDescription(e.target.value)}
                    placeholder={smartTitle?.subtitle || "Add a quick summary, travel dates, or the vibe you’re targeting."}
                    className="min-h-[120px] resize-none"
                  />
                  {smartTitle && !guideDescription && (
                    <p className="text-xs text-muted-foreground">Suggested: {smartTitle.subtitle}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Included sections</label>
                  <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-dashed border-border/70 bg-muted/40 p-3">
                    {searchUnits.map((unit, index) => {
                      const refinedTitle = refinedTitles.get(unit.id) || refineQueryToTitle(unit.query, destinationName);
                      return (
                        <div key={unit.id} className="rounded-lg bg-background/60 p-3 shadow-sm">
                          <div className="text-sm font-semibold">{index + 1}. {refinedTitle}</div>
                          <div className="mt-1 text-xs text-muted-foreground">Query: {unit.query}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    onClick={handleSaveGuide}
                    disabled={searchUnits.length === 0}
                    className="h-12 flex-1 text-base"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save guide
                  </Button>
                  <Button
                    onClick={() => {
                      setShowSaveGuide(false);
                      setGuideTitle("");
                      setGuideDescription("");
                    }}
                    variant="outline"
                    className="h-12 flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>

              <div className="space-y-4 rounded-2xl border border-border/60 bg-muted/30 p-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Snapshot</p>
                  <p className="mt-2 text-3xl font-semibold">{searchUnits.length}</p>
                  <p className="text-sm text-muted-foreground">sections captured</p>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="rounded-lg bg-background/70 p-3 shadow-sm">
                    <p className="font-medium">Sharing-ready</p>
                    <p className="text-muted-foreground">Export the saved guide to share with friends or collaborators.</p>
                  </div>
                  <div className="rounded-lg bg-background/70 p-3 shadow-sm">
                    <p className="font-medium">Keep evolving</p>
                    <p className="text-muted-foreground">Add more questions later—your guide updates automatically.</p>
                  </div>
                </div>
                <div className="rounded-lg border border-border/50 bg-background/60 p-3 text-xs text-muted-foreground">
                  💡 Tip: Save different versions for each traveler or date range you’re considering.
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
