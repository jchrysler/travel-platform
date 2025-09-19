import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { StreamingContent } from "@/components/StreamingContent";

// Removed old structured interfaces - now using markdown streaming

export default function TripBuilder() {
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState([5]);
  const [interests, setInterests] = useState("");
  const [travelStyle, setTravelStyle] = useState("comfort");
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [finalItinerary, setFinalItinerary] = useState("");
  const [error, setError] = useState("");
  const accumulatedTextRef = useRef("");

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
    setFinalItinerary("");
    accumulatedTextRef.current = "";

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
        if (done) {
          // Stream ended unexpectedly - save what we have
          if (accumulatedTextRef.current && !finalItinerary) {
            setFinalItinerary(accumulatedTextRef.current);
            setStreamingText("");
            setIsGenerating(false);
          }
          break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();

            if (data === "[DONE]") {
              // Stream completed normally
              const finalText = accumulatedTextRef.current;
              setFinalItinerary(finalText);
              setStreamingText("");
              setIsGenerating(false);
              console.log("Stream complete, saved itinerary:", finalText.substring(0, 100) + "...");
            } else if (data) {
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  accumulatedTextRef.current += parsed.content;
                  setStreamingText(accumulatedTextRef.current);
                }
              } catch (e) {
                console.error("Parse error for data:", data, e);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Stream error:", err);
      // If we have accumulated text, save it
      if (accumulatedTextRef.current) {
        setFinalItinerary(accumulatedTextRef.current);
        setStreamingText("");
      }
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
          {/* Show streaming or final content */}
          {(streamingText || finalItinerary) && (
            <StreamingContent
              content={streamingText || finalItinerary}
              isStreaming={isGenerating}
              title={!isGenerating ? "Your Itinerary" : undefined}
              showActions={!isGenerating && !!finalItinerary}
              className="max-h-[700px] overflow-y-auto"
            />
          )}

          {/* Empty state */}
          {!isGenerating && !streamingText && !finalItinerary && (
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