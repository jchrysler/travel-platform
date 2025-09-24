import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Sparkles, MapPin, BookOpen, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
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


  const performSearch = async (query: string) => {
    if (!destination) return;

    // If this is the first search and we don't have a draft ID, create one and navigate
    if (searchUnits.length === 0 && !draftId) {
      const newDraftId = `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setDraftId(newDraftId);
      navigate(`/travel/explore/${destination}/draft/${newDraftId}`, { replace: true });
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
    navigate(`/travel/explore/${destination}/${guide.slug}`);
  };

  // Popular queries for any destination
  const popularQueries = [
    `Best things to do in ${destinationName}`,
    `Top restaurants in ${destinationName}`,
    `Hidden gems in ${destinationName}`,
    `${destinationName} travel tips`,
    `Best time to visit ${destinationName}`,
    `Where to stay in ${destinationName}`,
    `Local food to try in ${destinationName}`,
    `Day trips from ${destinationName}`,
    `${destinationName} nightlife guide`,
    `Budget travel ${destinationName}`
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/travel/explore"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Explore Other Destinations
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <MapPin className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold">{destinationName}</h1>
        </div>
        <p className="text-muted-foreground">
          Discover everything about {destinationName} with AI-powered recommendations
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Query Section */}
        <div className="lg:col-span-1 space-y-6">
          {/* Custom Search */}
          <Card className="p-4">
            <div className="flex gap-2">
              <Input
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                placeholder={`Ask about ${destinationName}...`}
                onKeyPress={(e) => e.key === "Enter" && handleCustomSearch()}
                disabled={isSearching}
              />
              <Button
                onClick={handleCustomSearch}
                disabled={isSearching || !customQuery.trim()}
                size="icon"
              >
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </Card>

          {/* Existing Guides */}
          {existingGuides.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Existing Guides
              </h3>
              <div className="space-y-2">
                {existingGuides.map((guide) => (
                  <Link
                    key={guide.id}
                    to={`/travel/explore/${destination}/${guide.slug}`}
                    className="block p-3 rounded-lg border hover:border-primary transition-all group"
                  >
                    <div className="font-medium group-hover:text-primary">
                      {guide.title}
                    </div>
                    {(guide.subtitle || guide.description) && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {guide.subtitle || guide.description}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-2">
                      {guide.views} views • {guide.queries.length} topics
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Removed inline Create Guide - now using floating button */}

          {/* Popular Queries */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Popular Searches</h3>
            <div className="space-y-2">
              {popularQueries.slice(0, 5).map((query, idx) => (
                <button
                  key={idx}
                  onClick={() => performSearch(query)}
                  disabled={isSearching}
                  className="w-full text-left p-3 rounded-lg border hover:border-primary transition-all group text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span>{query}</span>
                    <span className="text-muted-foreground group-hover:text-primary transition-colors">
                      →
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="lg:col-span-2">
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

            {/* Empty State */}
            {searchUnits.length === 0 && !isSearching && (
              <Card className="p-12 text-center">
                <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">
                  Start Exploring {destinationName}
                </h3>
                <p className="text-muted-foreground">
                  Ask any question or choose from popular searches to discover the best of {destinationName}
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>

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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold mb-4">Save Your Research</h2>
            <p className="text-muted-foreground mb-6">
              Save your {destinationName} searches as a personal guide you can reference and share later.
            </p>

            {/* Generate smart title in background */}
            {!smartTitle && !isGeneratingTitle && (() => {
              setIsGeneratingTitle(true);
              generateSmartGuideTitle(
                destinationName,
                searchUnits.map(u => u.query),
                searchUnits.map(u => u.response)
              ).then(result => {
                setSmartTitle(result);
                if (!guideTitle) {
                  setGuideTitle(result.title);
                  setGuideDescription(result.subtitle);
                }
                setIsGeneratingTitle(false);
              });
              return null;
            })()}

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Guide Title</label>
                <Input
                  value={guideTitle}
                  onChange={(e) => setGuideTitle(e.target.value)}
                  placeholder={smartTitle?.title || `My ${destinationName} Guide`}
                  className="text-lg"
                  autoFocus
                />
                {smartTitle && !guideTitle && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Suggested: {smartTitle.title}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Description</label>
                <Input
                  value={guideDescription}
                  onChange={(e) => setGuideDescription(e.target.value)}
                  placeholder={smartTitle?.subtitle || "Brief description of what this guide covers..."}
                />
                {smartTitle && !guideDescription && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Suggested: {smartTitle.subtitle}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Your Guide Sections ({searchUnits.length})
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                  {searchUnits.map((unit, index) => {
                    const refinedTitle = refinedTitles.get(unit.id) || refineQueryToTitle(unit.query, destinationName);
                    return (
                      <div key={unit.id} className="py-2 px-3 bg-muted/50 rounded">
                        <div className="font-medium text-sm">
                          {index + 1}. {refinedTitle}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Original search: "{unit.query}"
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={handleSaveGuide}
                disabled={searchUnits.length === 0}
                className="flex-1"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Guide
              </Button>
              <Button
                onClick={() => {
                  setShowSaveGuide(false);
                  setGuideTitle("");
                  setGuideDescription("");
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}