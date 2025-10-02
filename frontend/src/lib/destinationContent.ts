export interface DestinationHeroContent {
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  highlights: string[];
  primaryQueries: string[];
  searchBuckets: Array<{ label: string; queries: string[] }>;
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
  primaryQueries: [
    "Best restaurants near the city center",
    "Top boutique hotels with a view",
    "How to spend 3 perfect days here",
    "Kid-friendly activities for a rainy day",
    "Hidden local gems locals love",
    "Plan a sunset photo walk",
  ],
  searchBuckets: [
    {
      label: "Restaurants & bars",
      queries: [
        "Best tasting menus in the city",
        "Late-night spots that stay open past midnight",
        "Where to find authentic street food",
      ],
    },
    {
      label: "Places to stay",
      queries: [
        "Luxury hotels with spa access",
        "Affordable boutique stays under $250",
        "Vacation rentals in the historic district",
      ],
    },
    {
      label: "Things to do",
      queries: [
        "Must-see attractions in two days",
        "Best day trips less than 2 hours away",
        "Outdoor adventures for first-timers",
      ],
    },
    {
      label: "Unexpected twists",
      queries: [
        "Unique classes or workshops to try",
        "Local festivals happening this week",
        "Photo spots only locals know",
      ],
    },
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
    primaryQueries: [
      "Where to book omakase in Tokyo this week",
      "Best boutique hotels in Shinjuku with skyline views",
      "Plan a Ghibli-inspired day for kids in Tokyo",
      "Tokyo hidden cocktail bars that need reservations",
      "Morning markets in Tokyo for fresh seafood",
      "How to spend a rainy day in Tokyo",
    ],
    searchBuckets: [
      {
        label: "Restaurants & bars",
        queries: [
          "Michelin-star ramen worth lining up for",
          "Tokyo izakayas open after midnight",
          "Vegan-friendly restaurants in Shibuya",
        ],
      },
      {
        label: "Places to stay",
        queries: [
          "Design hotels near Tokyo Station",
          "Ryokans with private onsens near Tokyo",
          "Affordable hotels in Ginza for shoppers",
        ],
      },
      {
        label: "Things to do",
        queries: [
          "Cherry blossom viewing spots without the crowds",
          "Anime & gaming itinerary for Akihabara",
          "Day trip ideas from Tokyo by train",
        ],
      },
      {
        label: "Unexpected twists",
        queries: [
          "Tokyo art exhibits opening this month",
          "Best rooftops for sunset photos",
          "Hands-on workshops for making wagashi",
        ],
      },
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
    primaryQueries: [
      "Best trattorias in Florence for bistecca alla fiorentina",
      "Boutique hotels near Ponte Vecchio",
      "Florence itinerary for art lovers in 48 hours",
      "Kid-friendly activities in Florence on a hot day",
      "Sunset aperitivo spots with Arno views",
      "Where to shop for leather goods in Florence",
    ],
    searchBuckets: [
      {
        label: "Restaurants & wine",
        queries: [
          "Wine bars in Florence with sommelier tastings",
          "Pasta-making classes led by locals",
          "Affordable Michelin-star dining in Florence",
        ],
      },
      {
        label: "Places to stay",
        queries: [
          "Historic palazzos converted into hotels",
          "Romantic stays in the Oltrarno neighborhood",
          "Budget-friendly hotels near Santa Maria Novella",
        ],
      },
      {
        label: "Things to do",
        queries: [
          "Skip-the-line museum strategy for Florence",
          "Best day trips from Florence to Chianti",
          "Live music and theatre in Florence this week",
        ],
      },
      {
        label: "Unexpected twists",
        queries: [
          "Artisan workshops for goldsmithing",
          "Secret viewpoints for sunrise photography",
          "Florence underground tours and Medici secrets",
        ],
      },
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
    primaryQueries: [
      "Best rooftop bars in Manhattan right now",
      "Cool boutique hotels in Brooklyn with skyline views",
      "NYC itinerary for families in winter",
      "Where to find late-night slices in the East Village",
      "Perfect Sunday in Williamsburg",
      "Immersive art exhibits in NYC this month",
    ],
    searchBuckets: [
      {
        label: "Restaurants & bars",
        queries: [
          "Hidden speakeasies below 14th Street",
          "Michelin-starred lunch deals in NYC",
          "Best bagel spots by neighborhood",
        ],
      },
      {
        label: "Places to stay",
        queries: [
          "Hotels with rooftop pools in NYC",
          "Budget hotels in Midtown under $250",
          "Trendy boutique stays in SoHo",
        ],
      },
      {
        label: "Things to do",
        queries: [
          "Must-see Broadway shows right now",
          "Central Park experiences by season",
          "Best museums for kids in NYC",
        ],
      },
      {
        label: "Unexpected twists",
        queries: [
          "NYC harbor cruises at sunset",
          "Secret supper clubs and pop-up dinners",
          "Street art walks in Bushwick",
        ],
      },
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
    primaryQueries: [
      "Design-forward hotels in NYC",
      "Brooklyn weekend for food lovers",
      "NYC holiday itinerary with kids",
      "Where to find underground jazz in Harlem",
      "Best brunch spots in Lower Manhattan",
      "Sunrise photography spots overlooking the skyline",
    ],
    searchBuckets: [
      {
        label: "Restaurants & bars",
        queries: [
          "Hidden speakeasies below 14th Street",
          "Michelin-starred lunch deals in NYC",
          "Best bagel spots by neighborhood",
        ],
      },
      {
        label: "Places to stay",
        queries: [
          "Hotels with rooftop pools in NYC",
          "Budget hotels in Midtown under $250",
          "Trendy boutique stays in SoHo",
        ],
      },
      {
        label: "Things to do",
        queries: [
          "Must-see Broadway shows right now",
          "Central Park experiences by season",
          "Best museums for kids in NYC",
        ],
      },
      {
        label: "Unexpected twists",
        queries: [
          "NYC harbor cruises at sunset",
          "Secret supper clubs and pop-up dinners",
          "Street art walks in Bushwick",
        ],
      },
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
    primaryQueries: [
      "Best seafood restaurants in Lisbon by the river",
      "Charming boutique hotels in Alfama",
      "Lisbon itinerary for art and history lovers",
      "Family-friendly activities in Lisbon on a sunny day",
      "Where to hear live fado without a tourist trap",
      "Pastel de nata crawl across Lisbon",
    ],
    searchBuckets: [
      {
        label: "Restaurants & cafes",
        queries: [
          "Top rooftop bars in Lisbon for sunset",
          "Wine bars in Chiado with local pours",
          "Coziest brunch spots in Lisbon",
        ],
      },
      {
        label: "Places to stay",
        queries: [
          "Boutique hotels in Alfama with balconies",
          "Luxury stays in Lisbon with pools",
          "Budget-friendly guesthouses in Bairro Alto",
        ],
      },
      {
        label: "Things to do",
        queries: [
          "Best azulejo workshops for visitors",
          "Itinerary for a Sintra day trip without renting a car",
          "Lisbon street art tours and galleries",
        ],
      },
      {
        label: "Unexpected twists",
        queries: [
          "Lisbon miradouros locals love",
          "Evening sailing cruises on the Tagus",
          "Markets in Lisbon open late",
        ],
      },
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
    primaryQueries: [
      "Luxury villas in Ubud with private pools",
      "Bali cafes with reliable Wi-Fi in Canggu",
      "Two-week Bali itinerary mixing jungle and beach",
      "Family-friendly activities in Bali when it rains",
      "Best sunset beach clubs in Uluwatu",
      "Wellness retreats in Bali with daily yoga",
    ],
    searchBuckets: [
      {
        label: "Restaurants & beach clubs",
        queries: [
          "Seafood dinners on the beach in Jimbaran",
          "Vegan-friendly restaurants in Ubud",
          "Late-night cocktail spots in Seminyak",
        ],
      },
      {
        label: "Places to stay",
        queries: [
          "Boutique stays in Canggu for surfers",
          "Wellness resorts with spa rituals",
          "Budget-friendly guesthouses near Uluwatu",
        ],
      },
      {
        label: "Things to do",
        queries: [
          "Snorkeling with manta rays in Nusa Penida",
          "Temple etiquette tips for first-time visitors",
          "Sunrise hikes to Mount Batur",
        ],
      },
      {
        label: "Unexpected twists",
        queries: [
          "Balinese cooking classes led by locals",
          "Traditional healing experiences in Bali",
          "Secret waterfalls off the main tourist path",
        ],
      },
    ],
  },
};

export function getDestinationHeroContent(slug: string): DestinationHeroContent {
  const normalized = slug.toLowerCase();
  return DESTINATION_HERO_CONTENT[normalized] ?? DEFAULT_HERO;
}
