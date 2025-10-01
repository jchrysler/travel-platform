export interface DestinationHeroContent {
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  highlights: string[];
  suggestedSearches: string[];
}

const DEFAULT_HERO: DestinationHeroContent = {
  title: "Discover somewhere unforgettable",
  subtitle: "Plan smarter with real-time travel intelligence",
  description:
    "Tell us what you want to experience and we will stitch together the perfect days, complete with local gems, logistics, and insider intel.",
  imageUrl:
    "https://images.unsplash.com/photo-1505765050516-f72dcac9c60e?auto=format&fit=crop&w=2000&q=80",
  imageAlt: "Scenic coastal road with cliffs and ocean at sunset",
  highlights: ["Choose any destination", "Local intel in seconds", "Save guides you love"],
  suggestedSearches: [
    "48 hours in Copenhagen",
    "Romantic weekend in Napa Valley",
    "Family-friendly Mexico City itinerary",
  ],
};

export const DESTINATION_HERO_CONTENT: Record<string, DestinationHeroContent> = {
  tokyo: {
    title: "Tokyo, reinvent every night",
    subtitle: "Neon skyline, ancient rituals, and endless ramen hunts",
    description:
      "Blend futuristic Shibuya nights with tranquil temple mornings. We keep you on the pulse of pop-ups, reservations, and hidden izakaya counters.",
    imageUrl:
      "https://images.unsplash.com/photo-1549693578-d683be217e58?auto=format&fit=crop&w=2000&q=80",
    imageAlt: "Tokyo skyline at dusk with Tokyo Tower and city lights",
    highlights: ["Seasonal sushi itineraries", "Neighborhood-by-neighborhood guides", "Late-night adventures"],
    suggestedSearches: [
      "Tokyo food crawl in Shimokitazawa",
      "Best art experiences in Tokyo this month",
      "Cherry blossom hotspots away from the crowds",
    ],
  },
  florence: {
    title: "Florence, bask in Renaissance light",
    subtitle: "Michelangelo mornings, Chianti afternoons, Arno sunsets",
    description:
      "We curate masterpieces, artisan workshops, and trattoria tables so you can soak up Tuscany without a single queue surprise.",
    imageUrl:
      "https://images.unsplash.com/photo-1505761671935-60b3a7427bad?auto=format&fit=crop&w=2000&q=80",
    imageAlt: "Florence skyline with the Duomo at sunset",
    highlights: ["Skip-the-line museum strategy", "Wine region day trips", "Hands-on artisan sessions"],
    suggestedSearches: [
      "Florence in three art-filled days",
      "Best Tuscan wineries near Florence",
      "Hidden Oltrarno artisan studios",
    ],
  },
  nyc: {
    title: "New York City, script your own energy",
    subtitle: "Skyscraper views, speakeasy nights, borough food safaris",
    description:
      "From Hudson Yards openings to Queens night markets, we stitch a pace that matches your vibe—whether you want rooftops or riverside respites.",
    imageUrl:
      "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=2000&q=80",
    imageAlt: "New York City skyline with Empire State Building at golden hour",
    highlights: ["Last-minute Broadway seats", "Neighborhood bites in every borough", "Sunrise-to-midnight plans"],
    suggestedSearches: [
      "Design-forward hotels in NYC",
      "Brooklyn weekend for food lovers",
      "NYC holiday itinerary with kids",
    ],
  },
  "new-york-city": {
    title: "New York City, script your own energy",
    subtitle: "Skyscraper views, speakeasy nights, borough food safaris",
    description:
      "From Hudson Yards openings to Queens night markets, we stitch a pace that matches your vibe—whether you want rooftops or riverside respites.",
    imageUrl:
      "https://images.unsplash.com/photo-1494972688394-4cc796f9e4c1?auto=format&fit=crop&w=2000&q=80",
    imageAlt: "New York skyline viewed from Brooklyn Bridge Park",
    highlights: ["Last-minute Broadway seats", "Neighborhood bites in every borough", "Sunrise-to-midnight plans"],
    suggestedSearches: [
      "Design-forward hotels in NYC",
      "Brooklyn weekend for food lovers",
      "NYC holiday itinerary with kids",
    ],
  },
  lisbon: {
    title: "Lisbon, chase the golden light",
    subtitle: "Tile-lined streets, Atlantic breezes, soulful fado nights",
    description:
      "Ride the tram through Alfama, feast on seafood in Cais do Sodré, and escape to Sintra’s palaces—our itineraries keep it effortless.",
    imageUrl:
      "https://images.unsplash.com/photo-1528150177500-1808ace9c570?auto=format&fit=crop&w=2000&q=80",
    imageAlt: "Lisbon viewpoint overlooking colorful buildings and river",
    highlights: ["Hidden miradouros", "Azulejo workshops", "Day trips to Sintra & Cascais"],
    suggestedSearches: [
      "Lisbon weekend for food lovers",
      "Best fado bars with reservations",
      "Sintra day trip without a car",
    ],
  },
  bali: {
    title: "Bali, balance jungle and surf",
    subtitle: "Water temple rituals, cliffside sunsets, mindful escapes",
    description:
      "Craft sunrise hikes, Ubud wellness days, and Seminyak dining scenes that flow together—no more guesswork between beaches and mountains.",
    imageUrl:
      "https://images.unsplash.com/photo-1546484959-f9a53afcb5c9?auto=format&fit=crop&w=2000&q=80",
    imageAlt: "Bali rice terraces at sunrise",
    highlights: ["Floating breakfasts & private villas", "Snorkel with manta rays", "Temple etiquette cheat-sheet"],
    suggestedSearches: [
      "10-day Bali slow travel itinerary",
      "Best cafes in Canggu to work from",
      "How to split time between Ubud and Uluwatu",
    ],
  },
};

export function getDestinationHeroContent(slug: string): DestinationHeroContent {
  const normalized = slug.toLowerCase();
  return DESTINATION_HERO_CONTENT[normalized] ?? DEFAULT_HERO;
}
