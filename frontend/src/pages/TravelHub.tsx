import { Link } from "react-router-dom";
import { MapPin, Calendar, Compass } from "lucide-react";

export default function TravelHub() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-6xl">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          AI Travel Platform
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Experience the future of travel planning with AI-powered itineraries and intelligent destination discovery
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Trip Builder Card */}
        <Link
          to="/trip"
          className="group relative bg-card rounded-xl border hover:border-primary transition-all duration-300 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-500" />
              </div>
              <h2 className="text-2xl font-semibold">Trip Builder</h2>
            </div>
            <p className="text-muted-foreground mb-6">
              Describe your dream trip in your own words and get a detailed, personalized itinerary. From road trips to city tours, any journey is possible.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Natural language input</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Day-by-day itineraries</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Cost estimates & tips</span>
              </div>
            </div>
            <div className="mt-6 flex items-center gap-2 text-primary font-medium">
              Start Planning
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>
        </Link>

        {/* Destination Explorer Card */}
        <Link
          to="/explore"
          className="group relative bg-card rounded-xl border hover:border-primary transition-all duration-300 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <Compass className="w-6 h-6 text-purple-500" />
              </div>
              <h2 className="text-2xl font-semibold">Destination Explorer</h2>
            </div>
            <p className="text-muted-foreground mb-6">
              Explore specific cities with AI-powered search. Get instant answers about restaurants, attractions, and hidden gems with real-time information.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>City-specific insights</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Pre-built query templates</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Real-time validation</span>
              </div>
            </div>
            <div className="mt-6 flex items-center gap-2 text-primary font-medium">
              Explore Cities
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>
        </Link>
      </div>

      {/* Feature Banner */}
      <div className="mt-16 p-8 bg-muted/50 rounded-xl text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <MapPin className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium text-primary">POWERED BY GEMINI AI</span>
        </div>
        <h3 className="text-2xl font-semibold mb-2">Intelligent Travel Planning</h3>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Our AI understands context, seasons, local customs, and logistics to create immersive, practical itineraries that balance must-see attractions with hidden gems.
        </p>
      </div>
    </div>
  );
}