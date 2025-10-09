import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Search, MapPin, Globe, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

interface HeroImageRecord {
  destination: string;
  destinationSlug: string;
  imageWebp: string;
  imageJpeg?: string | null;
  headline?: string | null;
  subheadline?: string | null;
  updatedAt: string;
}

interface HeroImageListResponse {
  items: HeroImageRecord[];
  total: number;
}

export default function DestinationExplorer() {
  const navigate = useNavigate();
  const [destinationSearch, setDestinationSearch] = useState("");
  const [heroImages, setHeroImages] = useState<HeroImageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchHeroImages() {
      setIsLoading(true);
      try {
        const response = await fetch("/api/hero-images?limit=50");
        if (response.ok) {
          const data: HeroImageListResponse = await response.json();
          setHeroImages(data.items);
        }
      } catch (error) {
        console.error("Failed to fetch hero images", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchHeroImages();
  }, []);

  const handleDestinationSearch = () => {
    if (!destinationSearch.trim()) return;
    const slug = destinationSearch.toLowerCase().trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    navigate(`/explore/${slug}`);
  };

  const quickExamples = heroImages.slice(0, 6).map(h => h.destination);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Travel Hub
        </Link>
        <h1 className="text-4xl font-bold mb-2">Destination Explorer</h1>
        <p className="text-muted-foreground">
          Discover destinations with AI-powered recommendations and real-time intelligence
        </p>
      </div>

      {/* Custom Destination Search */}
      <Card className="mb-8 p-6 border-2">
        <div className="flex items-center gap-3 mb-4">
          <Globe className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold">Search Any Destination</h2>
        </div>
        <div className="flex gap-2">
          <Input
            value={destinationSearch}
            onChange={(e) => setDestinationSearch(e.target.value)}
            placeholder="Enter any city, region, or country..."
            className="h-14 text-lg"
            onKeyPress={(e) => e.key === "Enter" && handleDestinationSearch()}
          />
          <Button
            onClick={handleDestinationSearch}
            disabled={!destinationSearch.trim()}
            size="lg"
            className="h-14 px-8"
          >
            <Search className="w-5 h-5 mr-2" />
            Explore
          </Button>
        </div>
        {quickExamples.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground">Try:</span>
            {quickExamples.map((example) => (
              <button
                key={example}
                onClick={() => {
                  const slug = example.toLowerCase().trim()
                    .replace(/[^\w\s-]/g, '')
                    .replace(/[\s_-]+/g, '-')
                    .replace(/^-+|-+$/g, '');
                  navigate(`/explore/${slug}`);
                }}
                className="text-sm px-3 py-1 rounded-full border hover:border-primary hover:bg-primary/5 transition-all"
              >
                {example}
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Destinations with Hero Images */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Featured Destinations</h2>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : heroImages.length === 0 ? (
          <Card className="p-8 text-center">
            <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No destinations yet</h3>
            <p className="text-muted-foreground mb-4">
              Visit the hero seeder to generate images for destinations, or search for any destination above.
            </p>
            <Button onClick={() => navigate('/hero-seeder')}>Go to Hero Seeder</Button>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {heroImages.map((hero) => (
              <div
                key={hero.destinationSlug}
                onClick={() => navigate(`/explore/${hero.destinationSlug}`)}
                className="group relative h-64 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
              >
                <img
                  src={hero.imageWebp}
                  alt={hero.destination}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <h3 className="text-2xl font-bold mb-1">{hero.destination}</h3>
                  {hero.headline && (
                    <p className="text-sm text-white/90 line-clamp-2">{hero.headline}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Card className="mt-8 p-8 bg-muted/50">
        <div className="text-center">
          <MapPin className="w-12 h-12 mx-auto mb-4 text-primary" />
          <h3 className="text-xl font-semibold mb-2">Explore Anywhere</h3>
          <p className="text-muted-foreground">
            From bustling cities to remote islands, get personalized travel recommendations for any destination on Earth.
            Each destination page features AI-generated guides, real-time suggestions, and curated experiences.
          </p>
        </div>
      </Card>
    </div>
  );
}
