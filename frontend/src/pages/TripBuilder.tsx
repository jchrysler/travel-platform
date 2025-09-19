import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles, Calendar, MapPin, Clock, DollarSign, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

interface ItineraryDay {
  day: number;
  title: string;
  morning: Activity[];
  afternoon: Activity[];
  evening: Activity[];
  tips: string[];
  estimatedCost: string;
  walkingDistance: string;
}

interface Activity {
  time: string;
  activity: string;
  location?: string;
  cost?: string;
  tip?: string;
}

export default function TripBuilder() {
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState([5]);
  const [interests, setInterests] = useState("");
  const [travelStyle, setTravelStyle] = useState("comfort");
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [itinerary, setItinerary] = useState<ItineraryDay[]>([]);
  const [error, setError] = useState("");

  const exampleQueries = [
    "2 week road trip through New England to see fall colors",
    "Island hopping in Greece for 10 days",
    "Best ramen tour of Japan",
    "Family-friendly Orlando theme parks adventure",
    "Wine tasting through Napa Valley",
  ];

  const handleGenerate = async () => {
    if (!description.trim()) {
      setError("Please describe your trip");
      return;
    }

    setIsGenerating(true);
    setError("");
    setStreamingText("");
    setItinerary([]);

    try {
      const response = await fetch("/api/travel/generate-trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          duration: duration[0],
          interests,
          travelStyle,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate itinerary");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No response stream");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              setIsGenerating(false);
            } else {
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  setStreamingText((prev) => prev + parsed.content);
                }
                if (parsed.itinerary) {
                  setItinerary(parsed.itinerary);
                }
              } catch (e) {
                console.error("Parse error:", e);
              }
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsGenerating(false);
    }
  };

  const handleExampleClick = (example: string) => {
    setDescription(example);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <Link to="/travel" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Travel Hub
        </Link>
        <h1 className="text-4xl font-bold mb-2">Trip Builder</h1>
        <p className="text-muted-foreground">
          Describe your dream trip and let AI create a detailed itinerary
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="space-y-6">
          <Card className="p-6">
            <div className="space-y-6">
              {/* Trip Description */}
              <div>
                <Label htmlFor="description" className="text-base font-semibold mb-2 block">
                  Where do you want to go?
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your trip... (e.g., '2 week road trip through New England to see fall colors')"
                  className="min-h-[120px] resize-none"
                />

                {/* Example Queries */}
                <div className="mt-3 space-y-2">
                  <p className="text-sm text-muted-foreground">Try an example:</p>
                  <div className="flex flex-wrap gap-2">
                    {exampleQueries.map((query, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleExampleClick(query)}
                        className="text-xs px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-full transition-colors"
                      >
                        {query}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Duration Slider */}
              <div>
                <Label className="text-base font-semibold mb-2 block">
                  Duration: {duration[0]} {duration[0] === 1 ? "day" : "days"}
                </Label>
                <Slider
                  value={duration}
                  onValueChange={setDuration}
                  min={1}
                  max={30}
                  step={1}
                  className="mt-3"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>1 day</span>
                  <span>30 days</span>
                </div>
              </div>

              {/* Interests */}
              <div>
                <Label htmlFor="interests" className="text-base font-semibold mb-2 block">
                  Interests & Requirements (optional)
                </Label>
                <Textarea
                  id="interests"
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  placeholder="e.g., 'Traveling with kids, need pools' or 'Photography focused, golden hours'"
                  className="min-h-[80px] resize-none"
                />
              </div>

              {/* Travel Style */}
              <div>
                <Label className="text-base font-semibold mb-3 block">Travel Style</Label>
                <RadioGroup value={travelStyle} onValueChange={setTravelStyle}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="budget" id="budget" />
                    <Label htmlFor="budget" className="font-normal cursor-pointer">
                      Budget - Hostels, street food, public transport
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="comfort" id="comfort" />
                    <Label htmlFor="comfort" className="font-normal cursor-pointer">
                      Comfort - Mid-range hotels, nice restaurants
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="luxury" id="luxury" />
                    <Label htmlFor="luxury" className="font-normal cursor-pointer">
                      Luxury - Premium hotels, fine dining
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !description.trim()}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Generating Itinerary...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Create My Journey
                  </>
                )}
              </Button>

              {error && (
                <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                  {error}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Output Section */}
        <div className="space-y-6">
          {isGenerating && streamingText && (
            <Card className="p-6">
              <div className="animate-pulse space-y-2">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-200" />
                  <span className="text-sm text-muted-foreground ml-2">
                    Crafting your perfect itinerary...
                  </span>
                </div>
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap">{streamingText}</div>
                </div>
              </div>
            </Card>
          )}

          {itinerary.length > 0 && (
            <div className="space-y-4">
              {itinerary.map((day) => (
                <Card key={day.day} className="p-6">
                  <div className="mb-4 pb-4 border-b">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-semibold">
                        Day {day.day}: {day.title}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {day.walkingDistance}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          {day.estimatedCost}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Morning */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                        <span className="text-sm">🌅</span>
                      </div>
                      <h4 className="font-semibold">Morning</h4>
                    </div>
                    <div className="ml-10 space-y-2">
                      {day.morning.map((activity, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                          <div>
                            <span className="font-medium">{activity.time}</span>
                            <span className="mx-2">•</span>
                            <span>{activity.activity}</span>
                            {activity.cost && (
                              <span className="text-muted-foreground ml-2">({activity.cost})</span>
                            )}
                            {activity.tip && (
                              <div className="text-sm text-muted-foreground mt-1">{activity.tip}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Afternoon */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                        <span className="text-sm">☀️</span>
                      </div>
                      <h4 className="font-semibold">Afternoon</h4>
                    </div>
                    <div className="ml-10 space-y-2">
                      {day.afternoon.map((activity, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                          <div>
                            <span className="font-medium">{activity.time}</span>
                            <span className="mx-2">•</span>
                            <span>{activity.activity}</span>
                            {activity.cost && (
                              <span className="text-muted-foreground ml-2">({activity.cost})</span>
                            )}
                            {activity.tip && (
                              <div className="text-sm text-muted-foreground mt-1">{activity.tip}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Evening */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                        <span className="text-sm">🌙</span>
                      </div>
                      <h4 className="font-semibold">Evening</h4>
                    </div>
                    <div className="ml-10 space-y-2">
                      {day.evening.map((activity, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                          <div>
                            <span className="font-medium">{activity.time}</span>
                            <span className="mx-2">•</span>
                            <span>{activity.activity}</span>
                            {activity.cost && (
                              <span className="text-muted-foreground ml-2">({activity.cost})</span>
                            )}
                            {activity.tip && (
                              <div className="text-sm text-muted-foreground mt-1">{activity.tip}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tips */}
                  {day.tips && day.tips.length > 0 && (
                    <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="w-4 h-4 text-yellow-600 dark:text-yellow-500" />
                        <span className="font-medium text-sm">Tips for Today</span>
                      </div>
                      <ul className="text-sm space-y-1 ml-6">
                        {day.tips.map((tip, idx) => (
                          <li key={idx}>• {tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          {!isGenerating && !streamingText && itinerary.length === 0 && (
            <Card className="p-12 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Your Itinerary Will Appear Here</h3>
              <p className="text-muted-foreground">
                Describe your trip and click "Create My Journey" to generate a personalized itinerary
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}