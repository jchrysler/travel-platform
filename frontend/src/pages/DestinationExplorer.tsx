import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Search, Sparkles, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { SearchUnit } from "@/components/SearchUnit";
import { SavedItemsList } from "@/components/SavedItemsList";
import type { SavedItem } from "@/components/SaveableContent";

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

interface CityData {
  id: string;
  name: string;
  country: string;
  emoji: string;
  description: string;
  popularQueries: {
    food: string[];
    culture: string[];
    nightlife: string[];
    family: string[];
    budget: string[];
  };
}

const cities: CityData[] = [
  {
    id: "tokyo",
    name: "Tokyo",
    country: "Japan",
    emoji: "🗼",
    description: "A mesmerizing blend of ultra-modern and traditional, from neon-lit skyscrapers to historic temples",
    popularQueries: {
      food: [
        "best restaurants in Tokyo",
        "cheap food in Tokyo",
        "Tokyo food markets",
        "vegetarian restaurants Tokyo",
      ],
      culture: [
        "things to do in Tokyo",
        "Tokyo museums and galleries",
        "traditional experiences Tokyo",
        "Tokyo temples and shrines",
      ],
      nightlife: [
        "Tokyo nightlife guide",
        "best bars in Tokyo",
        "Tokyo clubs and dancing",
        "late night Tokyo activities",
      ],
      family: [
        "family activities in Tokyo",
        "Tokyo with kids",
        "child-friendly restaurants Tokyo",
        "Tokyo theme parks",
      ],
      budget: [
        "budget tours in Tokyo",
        "free things to do Tokyo",
        "cheap hotels Tokyo",
        "Tokyo on a budget",
      ],
    },
  },
  {
    id: "florence",
    name: "Florence",
    country: "Italy",
    emoji: "🏛️",
    description: "The cradle of the Renaissance, where every corner reveals artistic masterpieces and Tuscan charm",
    popularQueries: {
      food: [
        "best restaurants in Florence",
        "Florence food tours",
        "authentic Italian food Florence",
        "Florence wine tasting",
      ],
      culture: [
        "things to do in Florence",
        "Florence art museums",
        "Florence historic sites",
        "Renaissance tours Florence",
      ],
      nightlife: [
        "Florence nightlife guide",
        "best bars in Florence",
        "Florence evening activities",
        "live music Florence",
      ],
      family: [
        "family activities in Florence",
        "Florence with kids",
        "child-friendly restaurants Florence",
        "Florence family tours",
      ],
      budget: [
        "budget tours in Florence",
        "free things to do Florence",
        "cheap hotels Florence",
        "Florence on a budget",
      ],
    },
  },
  {
    id: "nyc",
    name: "New York City",
    country: "USA",
    emoji: "🗽",
    description: "The city that never sleeps, where world-class culture meets incredible diversity",
    popularQueries: {
      food: [
        "best restaurants in New York",
        "NYC food tours",
        "cheap eats NYC",
        "NYC brunch spots",
      ],
      culture: [
        "things to do in New York",
        "NYC museums",
        "Broadway shows NYC",
        "NYC tourist attractions",
      ],
      nightlife: [
        "NYC nightlife guide",
        "best bars in New York",
        "NYC clubs and lounges",
        "rooftop bars NYC",
      ],
      family: [
        "family activities in New York",
        "NYC with kids",
        "child-friendly restaurants NYC",
        "NYC family attractions",
      ],
      budget: [
        "budget tours in NYC",
        "free things to do New York",
        "cheap hotels NYC",
        "New York on a budget",
      ],
    },
  },
];

export default function DestinationExplorer() {
  const [searchParams] = useSearchParams();
  const [selectedCity, setSelectedCity] = useState<CityData | null>(null);
  const [customQuery, setCustomQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  // Check URL params for initial city
  useEffect(() => {
    const cityParam = searchParams.get('city');
    if (cityParam) {
      const city = cities.find(c => c.id.toLowerCase() === cityParam.toLowerCase());
      if (city) {
        setSelectedCity(city);
      }
    }
  }, [searchParams]);
  const [searchUnits, setSearchUnits] = useState<SearchUnitData[]>([]);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [savedItemIds, setSavedItemIds] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [currentStreamingId, setCurrentStreamingId] = useState<string | null>(null);

  const categories = [
    { id: "food", name: "Food" },
    { id: "culture", name: "Culture" },
    { id: "nightlife", name: "Nightlife" },
    { id: "family", name: "Family" },
    { id: "budget", name: "Budget" },
  ];

  const handleCitySelect = (city: CityData) => {
    setSelectedCity(city);
    setSelectedCategory("");
    setSearchUnits([]);
    setSavedItems([]);
    setSavedItemIds(new Set());
  };

  const handleQuerySelect = async (query: string) => {
    await performSearch(query);
  };

  const handleCustomSearch = async () => {
    if (!customQuery.trim() || !selectedCity) return;
    await performSearch(customQuery);
    setCustomQuery("");
  };

  const performThreadQuery = async (query: string, context: string): Promise<string> => {
    if (!selectedCity) return "";

    try {
      const response = await fetch("/api/travel/explore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: selectedCity.name,
          query: context + "\n\n" + query,
        }),
      });

      if (!response.ok) throw new Error("Thread query failed");

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
            if (data !== "[DONE]") {
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullResponse += parsed.content;
                }
              } catch (e) {
                console.error("Parse error:", e);
              }
            }
          }
        }
      }

      return fullResponse;
    } catch (err) {
      console.error("Thread query error:", err);
      return "Failed to get more information. Please try again.";
    }
  };

  const performSearch = async (query: string) => {
    if (!selectedCity) return;

    setIsSearching(true);
    const unitId = Date.now().toString();
    setCurrentStreamingId(unitId);

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
          city: selectedCity.name,
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

  if (!selectedCity) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <Link to="/travel" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Travel Hub
          </Link>
          <h1 className="text-4xl font-bold mb-2">Destination Explorer</h1>
          <p className="text-muted-foreground">
            Choose a city to explore with AI-powered recommendations
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {cities.map((city) => (
            <Card
              key={city.id}
              className="p-6 cursor-pointer hover:border-primary transition-all"
              onClick={() => handleCitySelect(city)}
            >
              <div className="text-center">
                <div className="text-4xl mb-3">{city.emoji}</div>
                <h3 className="text-xl font-semibold mb-1">{city.name}</h3>
                <p className="text-sm text-muted-foreground mb-3">{city.country}</p>
                <p className="text-sm">{city.description}</p>
              </div>
            </Card>
          ))}
        </div>

        <Card className="mt-8 p-8 bg-muted/50">
          <div className="text-center">
            <MapPin className="w-12 h-12 mx-auto mb-4 text-primary" />
            <h3 className="text-xl font-semibold mb-2">More Cities Coming Soon</h3>
            <p className="text-muted-foreground">
              We're expanding to Paris, Barcelona, Bangkok, Dubai, and more.
              Each city will feature local insights, real-time information, and personalized recommendations.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => setSelectedCity(null)}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Choose Another City
        </button>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">{selectedCity.emoji}</span>
          <h1 className="text-4xl font-bold">{selectedCity.name}</h1>
        </div>
        <p className="text-muted-foreground">{selectedCity.description}</p>
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
                placeholder={`Ask about ${selectedCity.name}...`}
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

          {/* Popular Searches */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Popular Searches</h3>
            <div className="space-y-2">
              {categories.map((cat) => (
                <div key={cat.id} className="space-y-1">
                  <button
                    onClick={() => setSelectedCategory(cat.id === selectedCategory ? "" : cat.id)}
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {cat.name}
                  </button>
                  {cat.id === selectedCategory && (
                    <div className="pl-4 space-y-1">
                      {selectedCity.popularQueries[cat.id as keyof typeof selectedCity.popularQueries].map((query, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleQuerySelect(query)}
                          disabled={isSearching}
                          className="block w-full text-left text-sm p-2 rounded hover:bg-muted transition-colors"
                        >
                          {query}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Suggested Queries */}
          {selectedCategory && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Suggested Queries</h3>
              <div className="space-y-2">
                {selectedCity.popularQueries[selectedCategory as keyof typeof selectedCity.popularQueries].map((query, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuerySelect(query)}
                    disabled={isSearching}
                    className="w-full text-left p-3 rounded-lg border hover:border-primary transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{query}</span>
                      <span className="text-muted-foreground group-hover:text-primary transition-colors">
                        →
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="lg:col-span-2">
          {/* Search Units Container */}
          <div className="space-y-4">
            {searchUnits.map((unit, index) => (
              <SearchUnit
                key={unit.id}
                unit={unit}
                cityName={selectedCity.name}
                isFirst={index === searchUnits.length - 1}
                isLatest={index === 0 && unit.id === currentStreamingId}
                onSaveItem={handleSaveItem}
                onThreadQuery={performThreadQuery}
                savedItemIds={savedItemIds}
              />
            ))}

            {/* Empty State */}
            {searchUnits.length === 0 && !isSearching && (
              <Card className="p-12 text-center">
                <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Start Exploring {selectedCity.name}</h3>
                <p className="text-muted-foreground">
                  Choose a category or ask your own question to discover the best of {selectedCity.name}
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
        cityName={selectedCity.name}
      />
    </div>
  );
}