import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, Sparkles, MapPin, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

interface SearchResult {
  id: string;
  query: string;
  response: string;
  searchResults?: PlaceResult[];
  timestamp: Date;
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
        "Best ramen within walking distance of Shibuya Station",
        "Where do Tokyo salarymen eat lunch in Ginza?",
        "Late-night food options near Shinjuku after midnight",
        "Michelin-starred restaurants under ¥5000 for lunch",
      ],
      culture: [
        "Traditional tea ceremony experiences for beginners",
        "Best time to visit Senso-ji Temple to avoid crowds",
        "Art galleries in Roppongi worth visiting",
        "Sumo practice sessions open to tourists",
      ],
      nightlife: [
        "Rooftop bars with Mount Fuji views",
        "Best izakayas in Golden Gai",
        "Jazz clubs in Shibuya open late",
        "Karaoke places that welcome foreigners",
      ],
      family: [
        "Kid-friendly restaurants near Tokyo Disneyland",
        "Interactive museums for children under 10",
        "Parks with playgrounds in central Tokyo",
        "Family onsen that accept tattoos",
      ],
      budget: [
        "Free observation decks with city views",
        "Best 100-yen shops for souvenirs",
        "Cheap eats in Harajuku under ¥1000",
        "Free walking tours in historic districts",
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
        "Authentic Florentine steak restaurants locals love",
        "Best gelato shops away from tourist areas",
        "Wine bars with Tuscan tastings under €30",
        "Morning markets for fresh produce and local specialties",
      ],
      culture: [
        "Skip-the-line strategies for Uffizi Gallery",
        "Lesser-known Medici sites worth exploring",
        "Artisan workshops open for visitors",
        "Best viewpoints for sunset over the Duomo",
      ],
      nightlife: [
        "Aperitivo spots with river views",
        "Live music venues in Oltrarno",
        "Wine bars open after 11 PM",
        "Dancing clubs popular with students",
      ],
      family: [
        "Hands-on art activities for kids",
        "Gelato-making classes for families",
        "Parks with playgrounds near city center",
        "Kid-friendly trattorias with high chairs",
      ],
      budget: [
        "Free church visits with Renaissance art",
        "Student discounts at major museums",
        "Affordable lunch spots near Santa Croce",
        "Free walking tours of historic center",
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
        "Best pizza by the slice in Brooklyn",
        "Authentic ethnic food in Queens under $15",
        "Brunch spots in West Village worth the wait",
        "Late-night food near Times Square after shows",
      ],
      culture: [
        "Free museum days and hours",
        "Off-Broadway shows worth seeing",
        "Street art tours in Bushwick",
        "Historic sites in Lower Manhattan",
      ],
      nightlife: [
        "Rooftop bars with Empire State views",
        "Jazz clubs in Harlem",
        "Speakeasies in East Village",
        "Dance clubs in Meatpacking District",
      ],
      family: [
        "Playgrounds in Central Park",
        "Interactive museums for kids",
        "Family-friendly restaurants in Tribeca",
        "Free activities for children in summer",
      ],
      budget: [
        "Free events this weekend",
        "Happy hour deals in Midtown",
        "Cheap eats in Chinatown",
        "Free ferry rides with skyline views",
      ],
    },
  },
];

export default function DestinationExplorer() {
  const [selectedCity, setSelectedCity] = useState<CityData | null>(null);
  const [customQuery, setCustomQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchHistory, setSearchHistory] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentResponse, setCurrentResponse] = useState("");

  const categories = [
    { id: "food", name: "Food", emoji: "🍜" },
    { id: "culture", name: "Culture", emoji: "🏛️" },
    { id: "nightlife", name: "Nightlife", emoji: "🌃" },
    { id: "family", name: "Family", emoji: "👨‍👩‍👧" },
    { id: "budget", name: "Budget", emoji: "💰" },
  ];

  const handleCitySelect = (city: CityData) => {
    setSelectedCity(city);
    setSelectedCategory("");
    setSearchHistory([]);
  };

  const handleQuerySelect = async (query: string) => {
    await performSearch(query);
  };

  const handleCustomSearch = async () => {
    if (!customQuery.trim() || !selectedCity) return;
    await performSearch(customQuery);
    setCustomQuery("");
  };

  const performSearch = async (query: string) => {
    if (!selectedCity) return;

    setIsSearching(true);
    setCurrentResponse("");

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
              const result: SearchResult = {
                id: Date.now().toString(),
                query,
                response: fullResponse,
                timestamp: new Date(),
              };
              setSearchHistory(prev => [result, ...prev]);
              setCurrentResponse("");
              setIsSearching(false);
            } else {
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullResponse += parsed.content;
                  setCurrentResponse(fullResponse);
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

          {/* Categories */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Popular Topics</h3>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id === selectedCategory ? "" : cat.id)}
                  className={`p-3 rounded-lg border transition-all ${
                    cat.id === selectedCategory
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="text-2xl mb-1">{cat.emoji}</div>
                  <div className="text-sm font-medium">{cat.name}</div>
                </button>
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
        <div className="lg:col-span-2 space-y-4">
          {/* Current Search */}
          {isSearching && currentResponse && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                <span className="text-sm text-muted-foreground">Searching {selectedCity.name}...</span>
              </div>
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap">{currentResponse}</div>
              </div>
            </Card>
          )}

          {/* Ad Placeholder */}
          {searchHistory.length > 0 && !isSearching && (
            <Card className="p-4 bg-muted/30 border-dashed">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <Info className="w-3 h-3" />
                Sponsored Results
              </div>
              <div className="space-y-2">
                <div className="p-3 bg-background rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">Hotels in {selectedCity.name}</div>
                      <div className="text-xs text-muted-foreground">Compare prices from $89/night</div>
                    </div>
                    <Button size="sm" variant="outline">View Deals</Button>
                  </div>
                </div>
                <div className="p-3 bg-background rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">Tours & Activities</div>
                      <div className="text-xs text-muted-foreground">Skip the line tickets available</div>
                    </div>
                    <Button size="sm" variant="outline">Book Now</Button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Search History */}
          {searchHistory.map((result) => (
            <Card key={result.id} className="p-6">
              <div className="mb-3 pb-3 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{result.query}</h3>
                  <span className="text-xs text-muted-foreground">
                    {new Date(result.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap">{result.response}</div>
              </div>

              {/* Simulated Search Results */}
              {Math.random() > 0.5 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="text-sm font-medium mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Related Places
                  </div>
                  <div className="space-y-2">
                    <div className="p-2 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">Sample Restaurant</div>
                          <div className="text-xs text-muted-foreground">
                            <span className="text-green-600 dark:text-green-400">Open now</span> •
                            <span className="ml-1">4.5★</span> •
                            <span className="ml-1">$$</span>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost">Directions</Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))}

          {/* Empty State */}
          {searchHistory.length === 0 && !isSearching && (
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
  );
}